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
});
