// ============================================================
// BaseOps — Offline Sync Engine
// ============================================================
// This module is responsible for pushing locally-queued mutations
// from IndexedDB (Dexie) to Supabase when connectivity returns.
//
// Architecture:
// 1. When a driver performs a mutation offline (e.g., "Mark as
//    Delivered"), the mutation is written to Dexie immediately
//    and a row is added to the `syncQueue` table.
//
// 2. The sync engine listens for the browser's `online` event.
//    When it fires, it reads all `pending` rows from syncQueue,
//    processes them in order (oldest first), and attempts to
//    POST/PUT/DELETE each to Supabase.
//
// 3. Successful mutations are marked `synced`. Failed mutations
//    are retried up to MAX_RETRIES times before being marked as
//    `failed` for manual review.
//
// 4. The engine exposes a reactive `syncState` that UI components
//    can subscribe to for showing the sync indicator.
// ============================================================

import { db, clearLocalDatabase } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import type { SyncQueueItem, SyncStatus } from "@/types";

// ----- Configuration -----

/** Maximum number of retry attempts before marking a sync item as failed. */
const MAX_RETRIES = 3;

/** Delay between processing individual sync items (ms). */
const ITEM_DELAY = 200;

// ----- Sync State -----

/** Reactive sync state — consumed by the offline indicator component. */
export interface SyncState {
  /** Whether the browser is currently online. */
  isOnline: boolean;
  /** Whether the engine is actively processing the queue. */
  isSyncing: boolean;
  /** Number of items waiting to be synced. */
  pendingCount: number;
  /** The most recent sync error, if any. */
  lastError: string | null;
}

type SyncStateListener = (state: SyncState) => void;

let currentState: SyncState = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastError: null,
};

const listeners: Set<SyncStateListener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...currentState }));
}

function updateState(partial: Partial<SyncState>) {
  currentState = { ...currentState, ...partial };
  notifyListeners();
}

/** Subscribe to sync state changes. Returns an unsubscribe function. */
export function subscribeSyncState(listener: SyncStateListener): () => void {
  listeners.add(listener);
  // Immediately emit the current state
  listener({ ...currentState });
  return () => { listeners.delete(listener); };
}

/** Get the current sync state snapshot. */
export function getSyncState(): SyncState {
  return { ...currentState };
}

// ----- Queue Operations -----

/**
 * Adds a mutation to the offline sync queue.
 * Strongly binds the mutation to the originating user and tenant.
 * Performs client-side deduplication using an idempotency key.
 *
 * @param tableName - The Supabase table to write to (e.g., "parcels")
 * @param operation - "insert", "update", or "delete"
 * @param payload   - The row data to send to Supabase
 * @param userId    - Optional explicitly passed user ID
 * @param orgId     - Optional explicitly passed organization ID
 */
export async function enqueueSync(
  tableName: string,
  operation: "insert" | "update" | "delete",
  payload: Record<string, unknown>,
  userId?: string,
  orgId?: string
) {
  let boundUserId = userId;
  const boundOrgId = orgId || (typeof payload.org_id === "string" ? payload.org_id : undefined);

  if (!boundUserId) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        boundUserId = user.id;
      }
    } catch {
      // offline fallback
    }
  }

  const entityId = payload.id ? String(payload.id) : undefined;
  const idempotencyKey = `${tableName}:${operation}:${entityId || Date.now()}`;

  // Deduplication check: if a pending mutation with the same idempotencyKey exists, update it
  const existingItem = await db.syncQueue
    .where("status")
    .equals("pending")
    .filter((item) => item.idempotency_key === idempotencyKey)
    .first();

  if (existingItem && existingItem.id) {
    await db.syncQueue.update(existingItem.id, {
      payload: { ...existingItem.payload, ...payload },
      created_at: new Date().toISOString(),
    });
  } else {
    await db.syncQueue.add({
      user_id: boundUserId,
      org_id: boundOrgId,
      idempotency_key: idempotencyKey,
      table_name: tableName,
      operation,
      payload,
      status: "pending",
      retry_count: 0,
      created_at: new Date().toISOString(),
    });
  }

  // Update the pending count in state
  const pendingCount = await db.syncQueue
    .where("status")
    .equals("pending")
    .count();
  updateState({ pendingCount });
}

// ----- Flush Logic -----

/**
 * Processes the sync queue — called when the device comes online.
 * Validates session identity before executing mutations.
 * Implements exponential backoff on retries and idempotent mutations.
 */
async function flushQueue() {
  // Guard: don't start multiple flush cycles simultaneously
  if (currentState.isSyncing) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If no authenticated user session exists, do not attempt to flush
  if (!user) {
    return;
  }

  updateState({ isSyncing: true, lastError: null });

  // Read all pending items, ordered by creation time (FIFO)
  const pendingItems = await db.syncQueue
    .where("status")
    .equals("pending")
    .sortBy("created_at");

  for (const item of pendingItems) {
    // Session isolation guard: drop orphaned items belonging to another user
    if (item.user_id && item.user_id !== user.id) {
      console.warn(`[sync-engine] Purging orphaned sync item #${item.id} belonging to user ${item.user_id}`);
      await db.syncQueue.delete(item.id!);
      continue;
    }

    try {
      // Mark as syncing
      await db.syncQueue.update(item.id!, { status: "syncing" as SyncStatus });

      // Attempt the Supabase mutation
      await executeMutation(supabase, item);

      // Success — mark as synced
      await db.syncQueue.update(item.id!, { status: "synced" as SyncStatus });
    } catch (error) {
      console.error(`[sync-engine] Mutation failed for item #${item.id}:`, error);
      const newRetryCount = (item.retry_count || 0) + 1;
      const newStatus: SyncStatus =
        newRetryCount >= MAX_RETRIES ? "failed" : "pending";

      await db.syncQueue.update(item.id!, {
        status: newStatus,
        retry_count: newRetryCount,
      });

      if (newStatus === "failed") {
        updateState({
          lastError: `Failed to sync ${item.table_name} ${item.operation} after ${MAX_RETRIES} attempts.`,
        });
      }
    }

    // Adaptive backoff delay between items
    const delay = item.retry_count ? Math.min(ITEM_DELAY * Math.pow(2, item.retry_count), 2000) : ITEM_DELAY;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Update pending count after flush
  const remainingPending = await db.syncQueue
    .where("status")
    .equals("pending")
    .count();

  updateState({ isSyncing: false, pendingCount: remainingPending });

  // Clean up synced items (they've served their purpose)
  await db.syncQueue.where("status").equals("synced").delete();
}

/**
 * Executes a single mutation against Supabase with idempotency guarantees.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeMutation(supabase: any, item: SyncQueueItem) {
  const { table_name, operation, payload } = item;

  switch (operation) {
    case "insert": {
      // Idempotent upsert by primary key where available
      if (payload.id) {
        const { error } = await supabase.from(table_name).upsert(payload, { onConflict: "id" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table_name).insert(payload);
        if (error) throw error;
      }
      break;
    }
    case "update": {
      const { id, ...updateData } = payload;
      const { error } = await supabase
        .from(table_name)
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
      break;
    }
    case "delete": {
      const { error } = await supabase
        .from(table_name)
        .delete()
        .eq("id", payload.id);
      if (error) throw error;
      break;
    }
  }
}

/**
 * Safely pulls assigned parcels from Supabase into local Dexie store.
 * Preserves uncommitted local pending mutations (OFF-02).
 */
export async function pullAssignedParcels(userId: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const supabase = createClient();
  const { data: remoteParcels, error } = await supabase
    .from("parcels")
    .select("*")
    .eq("assigned_driver_id", userId);

  if (error) throw error;
  if (!remoteParcels) return;

  // Retrieve pending sync queue items to protect uncommitted offline edits
  const pendingParcelMutations = await db.syncQueue
    .where("table_name")
    .equals("parcels")
    .and((item) => item.status === "pending" || item.status === "syncing")
    .toArray();

  const pendingParcelIds = new Set(
    pendingParcelMutations.map((m) => String(m.payload.id)).filter(Boolean)
  );

  // Upsert remote parcels, excluding any parcel with a pending local mutation
  for (const remote of remoteParcels) {
    if (!pendingParcelIds.has(remote.id)) {
      await db.parcels.put(remote);
    }
  }

  // Remove local parcels that no longer exist on server and have no pending mutations
  const remoteIdSet = new Set(remoteParcels.map((p: any) => p.id));
  const localParcels = await db.parcels.toArray();

  for (const local of localParcels) {
    if (!remoteIdSet.has(local.id) && !pendingParcelIds.has(local.id)) {
      await db.parcels.delete(local.id);
    }
  }
}

// ----- Centralized Auth Security Listener -----

let authListenerSubscribed = false;

/**
 * Sets up centralized auth state listener.
 * Automatically clears all local customer data on sign-out across all tabs/windows.
 */
export function setupAuthSecurityListener() {
  if (typeof window === "undefined" || authListenerSubscribed) return;
  authListenerSubscribed = true;

  const supabase = createClient();
  supabase.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_OUT") {
      await clearLocalDatabase();
    }
  });
}

// ----- Lifecycle -----

/**
 * Initializes the sync engine.
 */
export async function initSyncEngine() {
  // Attach auth security listener
  setupAuthSecurityListener();

  // Count existing pending items
  const pendingCount = await db.syncQueue
    .where("status")
    .equals("pending")
    .count();
  updateState({ pendingCount, isOnline: navigator.onLine });

  // Listen for connectivity changes
  window.addEventListener("online", () => {
    updateState({ isOnline: true });
    flushQueue();
  });

  window.addEventListener("offline", () => {
    updateState({ isOnline: false });
  });

  // If we're already online and have pending items, flush immediately
  if (navigator.onLine && pendingCount > 0) {
    flushQueue();
  }
}

/**
 * Manually triggers a sync flush.
 */
export async function manualSync() {
  if (!navigator.onLine) {
    updateState({
      lastError: "Cannot sync while offline. Please check your connection.",
    });
    return;
  }

  // Reset failed items back to pending so they get retried
  await db.syncQueue
    .where("status")
    .equals("failed")
    .modify({ status: "pending", retry_count: 0 });

  const pendingCount = await db.syncQueue
    .where("status")
    .equals("pending")
    .count();
  updateState({ pendingCount });

  flushQueue();
}
