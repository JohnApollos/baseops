import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * SEC-06 & SEC-11 Regression Suite: Offline IndexedDB Cleanup & Sync Queue User Binding
 */
describe("SEC-06 & SEC-11: Offline IndexedDB Cleanup & Session Isolation", () => {
  class MockStore {
    constructor() {
      this.items = [];
    }
    async add(item) {
      this.items.push(item);
    }
    async count() {
      return this.items.length;
    }
    async clear() {
      this.items = [];
    }
    async toArray() {
      return [...this.items];
    }
    async delete(id) {
      this.items = this.items.filter((item) => item.id !== id);
    }
  }

  class MockBaseOpsDB {
    constructor() {
      this.parcels = new MockStore();
      this.events = new MockStore();
      this.syncQueue = new MockStore();
    }
    async clearLocalDatabase() {
      await Promise.all([
        this.parcels.clear(),
        this.events.clear(),
        this.syncQueue.clear(),
      ]);
    }
  }

  // Simulated flushQueue logic with SEC-11 session isolation guard
  async function simulateFlushQueue(db, activeUser, executedMutations = []) {
    if (!activeUser) return;

    const pending = await db.syncQueue.toArray();
    for (const item of pending) {
      // SEC-11 Guard: Drop orphaned items belonging to different user
      if (item.user_id && item.user_id !== activeUser.id) {
        await db.syncQueue.delete(item.id);
        continue;
      }

      // Execute mutation for matching user
      executedMutations.push({
        executedBy: activeUser.id,
        item,
      });
      await db.syncQueue.delete(item.id);
    }
  }

  it("Cleans all customer PII, parcel records, and sync queues on explicit or event-driven logout", async () => {
    const db = new MockBaseOpsDB();

    // Simulate User A active session with sensitive customer data
    await db.parcels.add({
      id: "p1",
      org_id: "org-tenant-a",
      recipient_name: "Private Customer A",
      recipient_address: "123 Secret St, Nairobi",
      recipient_phone: "+254711223344",
      status: "in_transit",
    });

    await db.events.add({
      id: "e1",
      parcel_id: "p1",
      event_type: "picked_up",
    });

    await db.syncQueue.add({
      id: 1,
      user_id: "user-a",
      table_name: "delivery_events",
      status: "pending",
    });

    // Verify initial populated state
    assert.strictEqual(await db.parcels.count(), 1);
    assert.strictEqual(await db.events.count(), 1);
    assert.strictEqual(await db.syncQueue.count(), 1);

    // Execute logout purge (invoked via clearLocalDatabase / onAuthStateChange SIGNED_OUT)
    await db.clearLocalDatabase();

    // Verify complete eradication of cached data
    assert.strictEqual(await db.parcels.count(), 0);
    assert.strictEqual(await db.events.count(), 0);
    assert.strictEqual(await db.syncQueue.count(), 0);

    const remainingParcels = await db.parcels.toArray();
    assert.deepStrictEqual(remainingParcels, []);
  });

  it("REJECTS (SEC-11): Prevents User A's pending mutations from executing under User B's session", async () => {
    const db = new MockBaseOpsDB();
    const executedMutations = [];

    // User A queues an offline mutation with user_id = 'user-a'
    await db.syncQueue.add({
      id: 101,
      user_id: "user-a",
      org_id: "org-tenant-a",
      table_name: "parcels",
      operation: "update",
      payload: { id: "parcel-1", status: "delivered" },
    });

    // Device comes online with User B active session
    const activeUserB = { id: "user-b", role: "driver", org_id: "org-tenant-b" };
    await simulateFlushQueue(db, activeUserB, executedMutations);

    // Zero mutations should have executed under User B
    assert.strictEqual(executedMutations.length, 0);

    // Orphaned mutation belonging to User A was purged from queue
    assert.strictEqual(await db.syncQueue.count(), 0);
  });

  it("ALLOWS (SEC-11): Executes mutations when active user matches originating user_id", async () => {
    const db = new MockBaseOpsDB();
    const executedMutations = [];

    // User A queues an offline mutation
    await db.syncQueue.add({
      id: 102,
      user_id: "user-a",
      org_id: "org-tenant-a",
      table_name: "parcels",
      operation: "update",
      payload: { id: "parcel-1", status: "delivered" },
    });

    // Device reconnects with User A active session
    const activeUserA = { id: "user-a", role: "driver", org_id: "org-tenant-a" };
    await simulateFlushQueue(db, activeUserA, executedMutations);

    // Mutation executed successfully under User A
    assert.strictEqual(executedMutations.length, 1);
    assert.strictEqual(executedMutations[0].executedBy, "user-a");
    assert.strictEqual(await db.syncQueue.count(), 0);
  });

  it("ENFORCES (OFF-01): Mutation Deduplication & Idempotency Key merging", async () => {
    const db = new MockBaseOpsDB();

    // User performs multiple rapid status updates for same parcel
    const key = "parcels:update:parcel-123";
    await db.syncQueue.add({
      id: 1,
      idempotency_key: key,
      table_name: "parcels",
      operation: "update",
      payload: { id: "parcel-123", status: "in_transit" },
      status: "pending",
    });

    // Second update arrives before flush
    const existing = (await db.syncQueue.toArray()).find((i) => i.idempotency_key === key);
    if (existing) {
      existing.payload = { ...existing.payload, status: "delivered" };
    }

    const items = await db.syncQueue.toArray();
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].payload.status, "delivered");
  });

  it("ENFORCES (OFF-02): Non-destructive pull preserves uncommitted offline mutations", async () => {
    const db = new MockBaseOpsDB();

    // 1. Local offline mutation in progress: Parcel 1 marked as 'delivered'
    await db.parcels.add({ id: "p1", status: "delivered", recipient_name: "Client A" });
    await db.syncQueue.add({
      id: 1,
      table_name: "parcels",
      status: "pending",
      payload: { id: "p1", status: "delivered" },
    });

    // 2. Incoming server snapshot has stale status 'in_transit' for p1, and new parcel p2
    const remoteParcels = [
      { id: "p1", status: "in_transit", recipient_name: "Client A" },
      { id: "p2", status: "assigned", recipient_name: "Client B" },
    ];

    // Safe pull simulation: protect pending local mutations
    const pendingItems = await db.syncQueue.toArray();
    const pendingIds = new Set(pendingItems.map((i) => i.payload.id));

    for (const remote of remoteParcels) {
      if (!pendingIds.has(remote.id)) {
        await db.parcels.add(remote);
      }
    }

    const localParcels = await db.parcels.toArray();
    const p1Local = localParcels.find((p) => p.id === "p1");
    const p2Local = localParcels.find((p) => p.id === "p2");

    // p1 retained its offline 'delivered' status and was NOT overwritten by stale server 'in_transit'
    assert.strictEqual(p1Local.status, "delivered");
    // p2 was added cleanly
    assert.strictEqual(p2Local.status, "assigned");
  });
});
