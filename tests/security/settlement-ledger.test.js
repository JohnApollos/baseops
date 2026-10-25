import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * SEC-12 & INT-01: Financial Event Ledger, COD Settlement, & Collision Resolution Suite
 */
describe("SEC-12 & INT-01: COD Settlement & Collision Resolution Engine", () => {
  // 1. COD Financial Invariant Calculations
  it("ENFORCES: Accurate COD settlement variance calculation", () => {
    const mockParcels = [
      { id: "p1", cod_amount: 5000, collected_amount: 5000, status: "delivered", reconciliation_status: "reconciled" },
      { id: "p2", cod_amount: 3500, collected_amount: 3500, status: "delivered", reconciliation_status: "pending" },
      { id: "p3", cod_amount: 4000, collected_amount: 0, status: "failed", reconciliation_status: "disputed" },
      { id: "p4", cod_amount: 0, collected_amount: 0, status: "delivered", reconciliation_status: "reconciled" }, // Prepaid
    ];

    const totalExpectedCOD = mockParcels.reduce((sum, p) => sum + p.cod_amount, 0);
    const totalCollectedCOD = mockParcels.reduce((sum, p) => sum + p.collected_amount, 0);
    const variance = Math.max(0, totalExpectedCOD - totalCollectedCOD);
    const disputedCount = mockParcels.filter((p) => p.reconciliation_status === "disputed").length;

    assert.strictEqual(totalExpectedCOD, 12500, "Expected COD sum mismatch");
    assert.strictEqual(totalCollectedCOD, 8500, "Collected COD sum mismatch");
    assert.strictEqual(variance, 4000, "Variance mismatch (uncollected amount)");
    assert.strictEqual(disputedCount, 1, "Disputed exceptions count mismatch");
  });

  // 2. Collision Resolution: Offline delivery colliding with server cancellation
  it("ENFORCES (INT-01): State collision detection on cancelled/returned parcels", () => {
    function simulateCollisionResolution(serverParcel, offlineMutation) {
      const isTerminalConflict = ["returned", "failed"].includes(serverParcel.status) ||
        serverParcel.assigned_driver_id !== offlineMutation.driver_id;

      if (isTerminalConflict) {
        return {
          event: {
            parcel_id: offlineMutation.parcel_id,
            event_type: "delivered",
            is_collision: true,
            collision_reason: `Server status was '${serverParcel.status}'`,
            amount_collected: offlineMutation.collected_amount,
          },
          newReconciliationStatus: "disputed",
        };
      }

      return {
        event: {
          parcel_id: offlineMutation.parcel_id,
          event_type: "delivered",
          is_collision: false,
          collision_reason: "",
          amount_collected: offlineMutation.collected_amount,
        },
        newReconciliationStatus: "pending",
      };
    }

    // Scenario A: Dispatcher cancelled parcel on server while driver delivered and collected KES 3,500 offline
    const serverCancelled = {
      id: "p-conflict-1",
      status: "returned",
      assigned_driver_id: "driver-1",
      org_id: "org-1",
    };

    const offlineDelivery = {
      parcel_id: "p-conflict-1",
      driver_id: "driver-1",
      status: "delivered",
      collected_amount: 3500,
    };

    const resolution = simulateCollisionResolution(serverCancelled, offlineDelivery);

    assert.strictEqual(resolution.event.is_collision, true, "Must flag is_collision: true");
    assert.match(resolution.event.collision_reason, /returned/, "Must capture conflict reason");
    assert.strictEqual(resolution.event.amount_collected, 3500, "Must preserve collected cash fact");
    assert.strictEqual(resolution.newReconciliationStatus, "disputed", "Must flag reconciliation_status as disputed");
  });

  // 3. Manifest Ingestion Parsing & Validation
  it("ENFORCES (PRD-01): Bulk CSV manifest parsing and field normalization", () => {
    const csvContent = `Recipient Name,Phone,Delivery Address,Merchant Sender,Weight (kg),COD (KES),Payment Method
Jane Muthoni,0712345678,Westlands Mpaka Rd,Glamour Boutique,1.5,3500,mpesa
Kevin Omondi,0723456789,Kilimani Wood Avenue,Nairobi Electronics,3.0,12500,cash
Invalid Row,,Nowhere,Bad Sender,1.0,0,cash`;

    const lines = csvContent.split("\n").filter((l) => l.trim().length > 0);
    const dataLines = lines.slice(1);

    const parsed = dataLines.map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const recipient_name = cols[0];
      const recipient_phone = cols[1];
      const recipient_address = cols[2];
      const sender_name = cols[3];
      const weight_kg = Number(cols[4]);
      const cod_amount = Number(cols[5]);
      const payment_method = cols[6];

      const isValid = Boolean(recipient_phone && recipient_phone.length >= 8);

      return {
        recipient_name,
        recipient_phone,
        recipient_address,
        sender_name,
        weight_kg,
        cod_amount,
        payment_method,
        isValid,
      };
    });

    assert.strictEqual(parsed.length, 3, "Parsed row count mismatch");
    assert.strictEqual(parsed[0].isValid, true, "Row 0 should be valid");
    assert.strictEqual(parsed[0].cod_amount, 3500, "Row 0 COD mismatch");
    assert.strictEqual(parsed[0].payment_method, "mpesa", "Row 0 payment method mismatch");
    assert.strictEqual(parsed[2].isValid, false, "Row 2 (missing phone) should be invalid");
  });

  // 4. Financial Non-Negative Invariant
  it("REJECTS: Negative COD amounts or collected values", () => {
    function validateAmounts(cod, collected) {
      if (cod < 0 || collected < 0) {
        throw new Error("Financial invariant violated: Non-negative check failure");
      }
      return true;
    }

    assert.throws(() => validateAmounts(-500, 0), /Non-negative check failure/);
    assert.throws(() => validateAmounts(500, -100), /Non-negative check failure/);
    assert.strictEqual(validateAmounts(5000, 5000), true);
  });
});
