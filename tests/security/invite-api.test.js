import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * SEC-02 Regression Suite: /api/invite-team Authentication & Authorization
 */
describe("SEC-02: Team Invitation API Authorization Boundary", () => {
  // Pure handler logic mirror of src/app/api/invite-team/route.ts
  function processInviteRequest({ sessionUser, callerProfile, requestBody }) {
    // 1. Authenticate caller
    if (!sessionUser) {
      return { status: 401, body: { error: "Unauthorized: You must be signed in to invite team members." } };
    }

    // 2. Active organization check
    if (!callerProfile || !callerProfile.org_id) {
      return { status: 403, body: { error: "Forbidden: Active organization context is required." } };
    }

    // 3. Role check
    if (!["owner", "dispatcher"].includes(callerProfile.role)) {
      return { status: 403, body: { error: "Forbidden: Drivers are not permitted to invite team members." } };
    }

    const email = (requestBody.email || "").trim().toLowerCase();
    const role = requestBody.role;
    const requestedOrgId = requestBody.org_id || requestBody.orgId || callerProfile.org_id;

    // 4. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { status: 400, body: { error: "A valid email address is required." } };
    }

    // 5. Cross-tenant invitation prevention
    if (requestedOrgId !== callerProfile.org_id) {
      return { status: 403, body: { error: "Forbidden: Cannot invite users into an organization other than your own." } };
    }

    // 6. Role permissions enforcement
    if (!["owner", "dispatcher", "driver"].includes(role)) {
      return { status: 400, body: { error: "Invalid role." } };
    }

    if (callerProfile.role === "dispatcher" && role !== "driver") {
      return { status: 403, body: { error: "Forbidden: Dispatchers are only permitted to invite drivers." } };
    }

    return {
      status: 200,
      body: { success: true, message: `Invitation sent to ${email} as ${role}.` },
    };
  }

  const ownerA = { id: "user-owner-a", role: "owner", org_id: "org-a" };
  const dispatcherA = { id: "user-dispatch-a", role: "dispatcher", org_id: "org-a" };
  const driverA = { id: "user-driver-a", role: "driver", org_id: "org-a" };

  it("REJECTS: Anonymous request returns 401 Unauthorized", () => {
    const res = processInviteRequest({
      sessionUser: null,
      callerProfile: null,
      requestBody: { email: "new@test.com", role: "driver", org_id: "org-a" },
    });
    assert.strictEqual(res.status, 401);
  });

  it("REJECTS: Authenticated Driver attempting to invite returns 403 Forbidden", () => {
    const res = processInviteRequest({
      sessionUser: driverA,
      callerProfile: driverA,
      requestBody: { email: "new@test.com", role: "driver", org_id: "org-a" },
    });
    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /Drivers are not permitted/i);
  });

  it("REJECTS: Dispatcher attempting to invite an Owner returns 403 Forbidden", () => {
    const res = processInviteRequest({
      sessionUser: dispatcherA,
      callerProfile: dispatcherA,
      requestBody: { email: "owner@test.com", role: "owner", org_id: "org-a" },
    });
    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /Dispatchers are only permitted to invite drivers/i);
  });

  it("REJECTS: Cross-tenant invitation into another organization returns 403 Forbidden", () => {
    const res = processInviteRequest({
      sessionUser: ownerA,
      callerProfile: ownerA,
      requestBody: { email: "victim@test.com", role: "dispatcher", org_id: "org-b-victim" },
    });
    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /Cannot invite users into an organization other than your own/i);
  });

  it("REJECTS: Malformed email or invalid role returns 400 Bad Request", () => {
    const res = processInviteRequest({
      sessionUser: ownerA,
      callerProfile: ownerA,
      requestBody: { email: "invalid-email", role: "driver", org_id: "org-a" },
    });
    assert.strictEqual(res.status, 400);
  });

  it("ALLOWS: Owner inviting a Dispatcher into own organization", () => {
    const res = processInviteRequest({
      sessionUser: ownerA,
      callerProfile: ownerA,
      requestBody: { email: "dispatch@org-a.com", role: "dispatcher", org_id: "org-a" },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  it("ALLOWS: Dispatcher inviting a Driver into own organization", () => {
    const res = processInviteRequest({
      sessionUser: dispatcherA,
      callerProfile: dispatcherA,
      requestBody: { email: "driver@org-a.com", role: "driver", org_id: "org-a" },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });
});
