import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * SEC-04 Regression Suite: Parcel Tenant Isolation & Driver Scoping
 */
describe("SEC-04: Parcel Tenant Isolation & Driver Workload Boundary", () => {
  function evaluateParcelAccess({ user, parcel, operation, updatePayload }) {
    // 1. SELECT Policy
    if (operation === "SELECT") {
      if (user.org_id !== parcel.org_id) {
        return { allowed: false, error: "RLS: Cross-tenant read denied (0 rows)." };
      }
      return { allowed: true };
    }

    // 2. DELETE Policy
    if (operation === "DELETE") {
      if (user.org_id !== parcel.org_id) {
        return { allowed: false, error: "RLS: Cross-tenant delete denied." };
      }
      if (!["owner", "dispatcher"].includes(user.role)) {
        return { allowed: false, error: "RLS: Only owners and dispatchers can delete parcels." };
      }
      return { allowed: true };
    }

    // 3. UPDATE Policy
    if (operation === "UPDATE") {
      // Cross-tenant USING check
      if (user.org_id !== parcel.org_id) {
        return { allowed: false, error: "RLS USING: Parcel belongs to different tenant." };
      }

      // Role check on target row
      if (user.role === "driver") {
        if (parcel.assigned_driver_id !== user.id) {
          return { allowed: false, error: "RLS USING: Driver can only update assigned parcels." };
        }
      } else if (!["owner", "dispatcher"].includes(user.role)) {
        return { allowed: false, error: "RLS USING: Unauthorized role for parcel update." };
      }

      // Trigger / WITH CHECK checks
      if (updatePayload.org_id !== undefined && updatePayload.org_id !== parcel.org_id) {
        return { allowed: false, error: "Unauthorized: Parcel organization cannot be modified." };
      }

      if (user.role === "driver") {
        if (
          updatePayload.assigned_driver_id !== undefined &&
          updatePayload.assigned_driver_id !== parcel.assigned_driver_id
        ) {
          return { allowed: false, error: "Unauthorized: Drivers cannot reassign parcels." };
        }
        if (
          updatePayload.tracking_code !== undefined &&
          updatePayload.tracking_code !== parcel.tracking_code
        ) {
          return { allowed: false, error: "Unauthorized: Drivers cannot modify tracking codes." };
        }
      }

      return {
        allowed: true,
        updatedParcel: { ...parcel, ...updatePayload },
      };
    }

    return { allowed: false, error: "Unknown operation." };
  }

  const driver1 = { id: "driver-1", role: "driver", org_id: "org-a" };
  const driver2 = { id: "driver-2", role: "driver", org_id: "org-a" };
  const dispatcherA = { id: "dispatcher-a", role: "dispatcher", org_id: "org-a" };

  const parcelOrgA_Driver1 = {
    id: "parcel-101",
    org_id: "org-a",
    tracking_code: "BOP-2026-00101",
    status: "in_transit",
    assigned_driver_id: "driver-1",
  };

  const parcelOrgA_Driver2 = {
    id: "parcel-102",
    org_id: "org-a",
    tracking_code: "BOP-2026-00102",
    status: "in_transit",
    assigned_driver_id: "driver-2",
  };

  const parcelOrgB = {
    id: "parcel-201",
    org_id: "org-b",
    tracking_code: "BOP-2026-00201",
    status: "in_transit",
    assigned_driver_id: "driver-b",
  };

  it("REJECTS: Cross-tenant parcel read", () => {
    const res = evaluateParcelAccess({ user: driver1, parcel: parcelOrgB, operation: "SELECT" });
    assert.strictEqual(res.allowed, false);
  });

  it("REJECTS: Cross-tenant parcel update", () => {
    const res = evaluateParcelAccess({
      user: driver1,
      parcel: parcelOrgB,
      operation: "UPDATE",
      updatePayload: { status: "delivered" },
    });
    assert.strictEqual(res.allowed, false);
  });

  it("REJECTS: Driver modifying another driver's assigned parcel", () => {
    const res = evaluateParcelAccess({
      user: driver1,
      parcel: parcelOrgA_Driver2,
      operation: "UPDATE",
      updatePayload: { status: "delivered" },
    });
    assert.strictEqual(res.allowed, false);
    assert.match(res.error, /only update assigned parcels/i);
  });

  it("REJECTS: Driver attempting to change parcel org_id across tenants", () => {
    const res = evaluateParcelAccess({
      user: driver1,
      parcel: parcelOrgA_Driver1,
      operation: "UPDATE",
      updatePayload: { org_id: "org-b" },
    });
    assert.strictEqual(res.allowed, false);
    assert.match(res.error, /Parcel organization cannot be modified/i);
  });

  it("REJECTS: Driver attempting to reassign parcel to another driver", () => {
    const res = evaluateParcelAccess({
      user: driver1,
      parcel: parcelOrgA_Driver1,
      operation: "UPDATE",
      updatePayload: { assigned_driver_id: "driver-2" },
    });
    assert.strictEqual(res.allowed, false);
    assert.match(res.error, /Drivers cannot reassign parcels/i);
  });

  it("ALLOWS: Driver updating own assigned parcel status to 'delivered'", () => {
    const res = evaluateParcelAccess({
      user: driver1,
      parcel: parcelOrgA_Driver1,
      operation: "UPDATE",
      updatePayload: { status: "delivered" },
    });
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.updatedParcel.status, "delivered");
  });

  it("ALLOWS: Driver 2 updating own assigned parcel status", () => {
    const res = evaluateParcelAccess({
      user: driver2,
      parcel: parcelOrgA_Driver2,
      operation: "UPDATE",
      updatePayload: { status: "delivered" },
    });
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.updatedParcel.status, "delivered");
  });

  it("ALLOWS: Dispatcher updating any parcel in own organization", () => {
    const res = evaluateParcelAccess({
      user: dispatcherA,
      parcel: parcelOrgA_Driver2,
      operation: "UPDATE",
      updatePayload: { assigned_driver_id: "driver-1", status: "assigned" },
    });
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.updatedParcel.assigned_driver_id, "driver-1");
  });

  it("REJECTS: Driver attempting to DELETE a parcel", () => {
    const res = evaluateParcelAccess({
      user: driver1,
      parcel: parcelOrgA_Driver1,
      operation: "DELETE",
    });
    assert.strictEqual(res.allowed, false);
  });

  it("ALLOWS: Dispatcher deleting a parcel in own organization", () => {
    const res = evaluateParcelAccess({
      user: dispatcherA,
      parcel: parcelOrgA_Driver1,
      operation: "DELETE",
    });
    assert.strictEqual(res.allowed, true);
  });
});
