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

import { db } from "@/lib/db";
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
 *
 * Call this whenever a driver performs an action that should be
 * persisted to Supabase. The mutation is stored locally first
 * and will be flushed when the device reconnects.
 *
 * @param tableName - The Supabase table to write to (e.g., "parcels")
 * @param operation - "insert", "update", or "delete"
 * @param payload   - The row data to send to Supabase
 */
export async function enqueueSync(
  tableName: string,
  operation: "insert" | "update" | "delete",
  payload: Record<string, unknown>
) {
  await db.syncQueue.add({
    table_name: tableName,
    operation,
    payload,
    status: "pending",
    retry_count: 0,
    created_at: new Date().toISOString(),
  });

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
 *
 * Items are processed in FIFO order (oldest first). Each item is
 * attempted once per flush cycle. If it fails, the retry_count is
 * incremented and the item remains in the queue for the next cycle.
 */
async function flushQueue() {
  // Guard: don't start multiple flush cycles simultaneously
  if (currentState.isSyncing) return;

  updateState({ isSyncing: true, lastError: null });

  const supabase = createClient();

  // Read all pending items, ordered by creation time (FIFO)
  const pendingItems = await db.syncQueue
    .where("status")
    .equals("pending")
    .sortBy("created_at");

  for (const item of pendingItems) {
    try {
      // Mark as syncing
      await db.syncQueue.update(item.id!, { status: "syncing" as SyncStatus });

      // Attempt the Supabase mutation
      await executeMutation(supabase, item);

      // Success — mark as synced
      await db.syncQueue.update(item.id!, { status: "synced" as SyncStatus });
    } catch (error) {
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

    // Small delay between items to avoid hammering the server
    await new Promise((resolve) => setTimeout(resolve, ITEM_DELAY));
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
 * Executes a single mutation against Supabase.
 *
 * This function maps the sync queue item's `operation` and `table_name`
 * to the appropriate Supabase call.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeMutation(supabase: any, item: SyncQueueItem) {
  const { table_name, operation, payload } = item;

  switch (operation) {
    case "insert": {
      const { error } = await supabase.from(table_name).insert(payload);
      if (error) throw error;
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

// ----- Lifecycle -----

/**
 * Initializes the sync engine.
 *
 * Call this once when the app mounts (e.g., in a root layout effect).
 * It sets up the online/offline event listeners and performs an
 * initial count of pending items.
 */
export async function initSyncEngine() {
  // Count existing pending items
  const pendingCount = await db.syncQueue
    .where("status")
    .equals("pending")
    .count();
  updateState({ pendingCount, isOnline: navigator.onLine });

  // Listen for connectivity changes
  window.addEventListener("online", () => {
    updateState({ isOnline: true });
    // Automatically flush when we come back online
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
 * Useful for "Retry sync" buttons in the UI.
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
