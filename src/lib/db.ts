// ============================================================
// BaseOps — Dexie (IndexedDB) Local Database
// ============================================================
// This is the offline-first layer. Dexie wraps IndexedDB to
// provide a clean, Promise-based API for storing data locally.
//
// We mirror three critical Supabase tables locally:
//   - parcels     → Driver's assigned parcels for the day
//   - events      → Delivery events created while offline
//   - syncQueue   → Mutations waiting to be pushed to Supabase
//
// The sync_queue table is LOCAL ONLY — it never exists in
// Supabase. It is the heart of the offline sync architecture.
// ============================================================

import Dexie, { type EntityTable } from "dexie";
import type { Parcel, DeliveryEvent, SyncQueueItem } from "@/types";

/**
 * BaseOpsDB — the local IndexedDB database.
 *
 * Version 1 schema establishes the three core offline stores.
 * Dexie uses a simple format to define indexes:
 *   - `++id` = auto-incremented primary key
 *   - `&field` = unique index
 *   - `field` = non-unique index
 *   - `[a+b]` = compound index
 */
class BaseOpsDB extends Dexie {
  parcels!: EntityTable<Parcel, "id">;
  events!: EntityTable<DeliveryEvent, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;

  constructor() {
    super("BaseOpsDB");

    this.version(1).stores({
      // Parcels — indexed by org, driver, and status for fast lookups
      parcels: "id, org_id, assigned_driver_id, status, &tracking_code",

      // Delivery events — indexed by parcel and driver
      events: "id, parcel_id, org_id, driver_id, event_type, created_at",

      // Sync queue — the offline mutation buffer
      // ++id auto-increments, status is indexed for querying pending items
      syncQueue: "++id, table_name, status, created_at",
    });
  }
}

/** Singleton database instance. */
export const db = new BaseOpsDB();

/**
 * Purges all tables in the local IndexedDB database.
 * Used during logout to prevent sensitive customer/parcel data leakage on shared devices.
 */
export async function clearLocalDatabase(): Promise<void> {
  try {
    await Promise.all([
      db.parcels.clear(),
      db.events.clear(),
      db.syncQueue.clear(),
    ]);
  } catch (err) {
    console.error("[db] Failed to clear local database:", err);
  }
}
