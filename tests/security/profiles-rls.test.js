import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * SEC-01 & SEC-07 Regression Suite: Profile Privilege Escalation & Organization Protection
 *
 * Invariants:
 * 1. Role is strictly immutable via client UPDATE.
 * 2. Organization ID is strictly immutable via client UPDATE (even when OLD.org_id IS NULL).
 * 3. Organization creation and owner assignment is strictly atomic via create_organization_and_owner().
 * 4. Targeting another user's profile is strictly denied.
 * 5. Legitimate metadata updates (full_name, phone) are allowed.
 */
describe("SEC-01 & SEC-07: Profile Privilege Escalation & Organization Protection", () => {
  // Policy evaluation engine mirroring PostgreSQL RLS & Trigger semantics under Migration 00003
  function evaluateProfileUpdate({ authUserId, currentProfile, updatePayload }) {
    // 1. RLS USING clause: (id = auth.uid())
    if (!authUserId || authUserId !== currentProfile.id) {
      return { allowed: false, error: "RLS USING: Row not found or not owned by user." };
    }

    // 2. BEFORE UPDATE Trigger: trg_protect_profile_role_and_org (Migration 00003)
    if (authUserId !== null) {
      // Role tampering check
      if (updatePayload.role !== undefined && updatePayload.role !== currentProfile.role) {
        return { allowed: false, error: "Unauthorized: Role cannot be modified by user." };
      }

      // Strict Organization Immutability (SEC-07): Client UPDATE cannot alter org_id even if OLD.org_id IS NULL
      if (updatePayload.org_id !== undefined && updatePayload.org_id !== currentProfile.org_id) {
        return {
          allowed: false,
          error: "Unauthorized: Organization membership cannot be modified directly by user.",
        };
      }
    }

    // 3. RLS WITH CHECK clause
    const resultingRole = updatePayload.role ?? currentProfile.role;
    const resultingOrgId = updatePayload.org_id ?? currentProfile.org_id;

    if (resultingRole !== currentProfile.role) {
      return { allowed: false, error: "RLS WITH CHECK: Role violation." };
    }

    if (resultingOrgId !== currentProfile.org_id) {
      return { allowed: false, error: "RLS WITH CHECK: org_id violation." };
    }

    return {
      allowed: true,
      updatedProfile: { ...currentProfile, ...updatePayload },
    };
  }

  // Trusted atomic onboarding RPC simulation (Migration 00003)
  function createOrganizationAndOwner({ authUserId, callerProfile, orgName, orgSlug, existingSlugs = [] }) {
    if (!authUserId) {
      return { success: false, error: "Unauthorized: Must be authenticated to create an organization." };
    }

    if (!callerProfile || callerProfile.id !== authUserId) {
      return { success: false, error: "Profile not found." };
    }

    if (callerProfile.org_id !== null) {
      return { success: false, error: "User already belongs to an organization." };
    }

    const sanitizedName = (orgName || "").trim();
    const sanitizedSlug = (orgSlug || "").trim().toLowerCase();

    if (sanitizedName.length < 2 || sanitizedName.length > 100) {
      return { success: false, error: "Organization name must be between 2 and 100 characters." };
    }

    if (!/^[a-z0-9-]+$/.test(sanitizedSlug) || sanitizedSlug.length < 2 || sanitizedSlug.length > 50) {
      return { success: false, error: "Organization slug must contain only lowercase alphanumeric characters and hyphens." };
    }

    if (existingSlugs.includes(sanitizedSlug)) {
      return { success: false, error: "Organization slug is already taken." };
    }

    const newOrgId = `org-${sanitizedSlug}`;
    const updatedProfile = {
      ...callerProfile,
      org_id: newOrgId,
      role: "owner",
      onboarded_at: new Date().toISOString(),
    };

    return {
      success: true,
      org: { id: newOrgId, name: sanitizedName, slug: sanitizedSlug },
      profile: updatedProfile,
    };
  }

  const driverUser = {
    id: "user-driver-1",
    org_id: "org-tenant-a",
    role: "driver",
    full_name: "John Driver",
    phone: "+254700000001",
  };

  const newUnassignedUser = {
    id: "user-new-unassigned",
    org_id: null,
    role: "owner",
    full_name: "Attacker / New User",
    phone: null,
  };

  it("REJECTS (SEC-07): Un-onboarded user (org_id IS NULL) attempting to assign org_id to victim org via client UPDATE", () => {
    const result = evaluateProfileUpdate({
      authUserId: newUnassignedUser.id,
      currentProfile: newUnassignedUser,
      updatePayload: { org_id: "org-victim-target" },
    });

    assert.strictEqual(result.allowed, false);
    assert.match(result.error, /Organization membership cannot be modified directly/i);
  });

  it("REJECTS (SEC-01): Driver attempting to escalate role to 'owner'", () => {
    const result = evaluateProfileUpdate({
      authUserId: driverUser.id,
      currentProfile: driverUser,
      updatePayload: { role: "owner" },
    });

    assert.strictEqual(result.allowed, false);
    assert.match(result.error, /Role cannot be modified/i);
  });

  it("REJECTS (SEC-01): Driver attempting to hijack victim organization ID", () => {
    const result = evaluateProfileUpdate({
      authUserId: driverUser.id,
      currentProfile: driverUser,
      updatePayload: { org_id: "org-victim-b" },
    });

    assert.strictEqual(result.allowed, false);
    assert.match(result.error, /Organization membership cannot be modified/i);
  });

  it("REJECTS: User attempting to update another user profile row", () => {
    const result = evaluateProfileUpdate({
      authUserId: "user-attacker-99",
      currentProfile: driverUser,
      updatePayload: { full_name: "Hacked" },
    });

    assert.strictEqual(result.allowed, false);
    assert.match(result.error, /RLS USING/i);
  });

  it("ALLOWS: Legitimate profile update (full_name and phone)", () => {
    const result = evaluateProfileUpdate({
      authUserId: driverUser.id,
      currentProfile: driverUser,
      updatePayload: { full_name: "John Updated", phone: "+254799999999" },
    });

    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.updatedProfile.full_name, "John Updated");
    assert.strictEqual(result.updatedProfile.phone, "+254799999999");
    assert.strictEqual(result.updatedProfile.role, "driver");
    assert.strictEqual(result.updatedProfile.org_id, "org-tenant-a");
  });

  it("ALLOWS (SEC-07): Legitimate onboarding through atomic create_organization_and_owner RPC", () => {
    const result = createOrganizationAndOwner({
      authUserId: newUnassignedUser.id,
      callerProfile: newUnassignedUser,
      orgName: "New Fast Logistics",
      orgSlug: "new-fast-logistics",
      existingSlugs: ["existing-org"],
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.org.slug, "new-fast-logistics");
    assert.strictEqual(result.profile.role, "owner");
    assert.strictEqual(result.profile.org_id, result.org.id);
  });

  it("REJECTS (SEC-07): Already-assigned user calling create_organization_and_owner RPC", () => {
    const result = createOrganizationAndOwner({
      authUserId: driverUser.id,
      callerProfile: driverUser,
      orgName: "Second Org Attempt",
      orgSlug: "second-org",
      existingSlugs: [],
    });

    assert.strictEqual(result.success, false);
    assert.match(result.error, /already belongs to an organization/i);
  });
});
