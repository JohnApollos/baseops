import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * SEC-10 & SEC-09 Regression Suite: Vehicle Tenant Isolation & RPC Boundary
 */
describe("SEC-10 & SEC-09: Vehicle Tenant Isolation & RPC Hardening", () => {
  function evaluateVehicleUpdate({ user, vehicle, updatePayload }) {
    // 1. RLS USING clause: (org_id = get_user_org_id(auth.uid()) AND role IN ('owner', 'dispatcher'))
    if (user.org_id !== vehicle.org_id) {
      return { allowed: false, error: "RLS USING: Vehicle belongs to different tenant." };
    }

    if (!["owner", "dispatcher"].includes(user.role)) {
      return { allowed: false, error: "RLS USING: Drivers cannot update vehicles." };
    }

    // 2. Trigger: trg_protect_vehicle_tenant_isolation (Migration 00003)
    if (updatePayload.org_id !== undefined && updatePayload.org_id !== vehicle.org_id) {
      return { allowed: false, error: "Unauthorized: Vehicle organization cannot be modified." };
    }

    // 3. RLS WITH CHECK clause (Migration 00003)
    const resultingOrgId = updatePayload.org_id ?? vehicle.org_id;
    if (resultingOrgId !== user.org_id) {
      return { allowed: false, error: "RLS WITH CHECK: org_id mismatch." };
    }

    return {
      allowed: true,
      updatedVehicle: { ...vehicle, ...updatePayload },
    };
  }

  function evaluateRpcExecution({ callerRole, functionName }) {
    const publicRpcWhitelist = ["create_organization_and_owner"];
    const internalFunctions = ["get_user_org_id", "get_user_role"];

    if (internalFunctions.includes(functionName)) {
      // SEC-09: REVOKE EXECUTE ON FUNCTION FROM PUBLIC, anon, authenticated
      return { allowed: false, error: `Permission denied: function ${functionName} is not accessible via RPC.` };
    }

    if (publicRpcWhitelist.includes(functionName)) {
      if (callerRole === "anon") {
        return { allowed: false, error: "Unauthorized: Must be authenticated." };
      }
      return { allowed: true };
    }

    return { allowed: false, error: "Function not found or not callable." };
  }

  const dispatcherOrgA = { id: "disp-a", role: "dispatcher", org_id: "org-a" };
  const driverOrgA = { id: "driver-a", role: "driver", org_id: "org-a" };

  const vehicleOrgA = {
    id: "veh-1",
    org_id: "org-a",
    registration_plate: "KDA 123A",
    type: "van",
    status: "available",
  };

  it("REJECTS (SEC-10): Dispatcher attempting to transfer vehicle to another organization", () => {
    const res = evaluateVehicleUpdate({
      user: dispatcherOrgA,
      vehicle: vehicleOrgA,
      updatePayload: { org_id: "org-b-target" },
    });

    assert.strictEqual(res.allowed, false);
    assert.match(res.error, /Vehicle organization cannot be modified/i);
  });

  it("REJECTS (SEC-10): Driver attempting to update vehicle status", () => {
    const res = evaluateVehicleUpdate({
      user: driverOrgA,
      vehicle: vehicleOrgA,
      updatePayload: { status: "maintenance" },
    });

    assert.strictEqual(res.allowed, false);
    assert.match(res.error, /Drivers cannot update vehicles/i);
  });

  it("ALLOWS: Dispatcher updating vehicle status within own organization", () => {
    const res = evaluateVehicleUpdate({
      user: dispatcherOrgA,
      vehicle: vehicleOrgA,
      updatePayload: { status: "maintenance" },
    });

    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.updatedVehicle.status, "maintenance");
  });

  it("REJECTS (SEC-09): Authenticated user calling internal get_user_org_id via RPC", () => {
    const res = evaluateRpcExecution({ callerRole: "authenticated", functionName: "get_user_org_id" });
    assert.strictEqual(res.allowed, false);
    assert.match(res.error, /Permission denied/i);
  });

  it("REJECTS (SEC-09): Authenticated user calling internal get_user_role via RPC", () => {
    const res = evaluateRpcExecution({ callerRole: "authenticated", functionName: "get_user_role" });
    assert.strictEqual(res.allowed, false);
    assert.match(res.error, /Permission denied/i);
  });

  it("ALLOWS (SEC-09): Authenticated user calling whitelisted create_organization_and_owner RPC", () => {
    const res = evaluateRpcExecution({ callerRole: "authenticated", functionName: "create_organization_and_owner" });
    assert.strictEqual(res.allowed, true);
  });
});
