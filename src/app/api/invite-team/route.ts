// ============================================================
// BaseOps — Invite Driver/Dispatcher API Route
// ============================================================
// This endpoint allows authenticated owners and dispatchers to
// invite new team members by email into their own organization.
//
// Security Flow:
// 1. Authenticate caller session using server-side cookies
// 2. Query caller's profile to verify role and org_id
// 3. Reject anonymous callers (401) and unauthorized callers (403)
// 4. Reject any attempt to invite into another organization (403)
// 5. Enforce role limits (dispatchers can only invite drivers)
// 6. Perform administrative user creation & magic link generation
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { Resend } from "resend";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase configuration.");
  }
  return createAdminClient(url, serviceKey);
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the caller session
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: You must be signed in to invite team members." },
        { status: 401 }
      );
    }

    // 2. Fetch the caller's trusted profile from the database
    const { data: callerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, org_id, full_name, organizations(name)")
      .eq("id", user.id)
      .single();

    if (profileError || !callerProfile || !callerProfile.org_id) {
      return NextResponse.json(
        { error: "Forbidden: Active organization context is required." },
        { status: 403 }
      );
    }

    // 3. Verify caller has permission to invite (Owner or Dispatcher)
    if (!["owner", "dispatcher"].includes(callerProfile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Drivers are not permitted to invite team members." },
        { status: 403 }
      );
    }

    // 4. Parse and canonicalize input body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role : "";
    const full_name = typeof (body.full_name || body.fullName) === "string" ? String(body.full_name || body.fullName).trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const requestedOrgId = typeof (body.org_id || body.orgId) === "string" ? String(body.org_id || body.orgId) : callerProfile.org_id;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    // 5. Cross-tenant invitation prevention: target org_id must match caller's org_id
    if (requestedOrgId !== callerProfile.org_id) {
      return NextResponse.json(
        { error: "Forbidden: Cannot invite users into an organization other than your own." },
        { status: 403 }
      );
    }

    const org_id = callerProfile.org_id;

    // 6. Role permissions enforcement
    if (!["owner", "dispatcher", "driver"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'owner', 'dispatcher', or 'driver'." },
        { status: 400 }
      );
    }

    if (callerProfile.role === "dispatcher" && role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: Dispatchers are only permitted to invite drivers." },
        { status: 403 }
      );
    }

    // 7. Perform administrative user creation with service-role client
    const supabaseAdmin = getSupabaseAdmin();

    const { data: authData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || "",
          role,
        },
      });

    const targetUserId = authData?.user?.id;

    if (createError) {
      if (
        createError.message.includes("already been registered") ||
        createError.message.includes("already exists")
      ) {
        return NextResponse.json(
          { error: "A user with this email has already been registered." },
          { status: 400 }
        );
      }
      throw createError;
    }

    // 8. Link the invited user profile to the organization
    if (targetUserId) {
      const { error: profileUpsertError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: targetUserId,
          org_id,
          role,
          full_name: full_name || "",
          phone: phone,
          onboarded_at: new Date().toISOString(),
        });

      if (profileUpsertError) {
        console.error("[invite-team] Failed to upsert profile:", profileUpsertError);
      }
    }

    // 9. Generate magic link for invitation acceptance
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError) {
      console.warn("[invite-team] Magic link generation note:", linkError.message);
    }

    // 10. Send invitation email if Resend is configured
    const resendClient = getResend();
    if (resendClient && linkData?.properties?.hashed_token) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const magicLink = `${appUrl}/api/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=magiclink`;
      const orgRecord = callerProfile.organizations as { name?: string } | { name?: string }[] | null;
      const orgName = Array.isArray(orgRecord)
        ? orgRecord[0]?.name || "Your Logistics Team"
        : orgRecord?.name || "Your Logistics Team";
      const inviterName = callerProfile.full_name || "A team administrator";

      try {
        await resendClient.emails.send({
          from: "BaseOps <noreply@baseops.app>",
          to: email,
          subject: `You've been invited to join ${orgName} on BaseOps`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
              <h2 style="color: #1a1a2e;">You're invited! 🚀</h2>
              <p>${inviterName} has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong> on BaseOps.</p>
              <p>Click the button below to accept your invitation and get started:</p>
              <a href="${magicLink}" style="display: inline-block; background: #e67e22; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0;">
                Accept Invitation
              </a>
              <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.warn("[invite-team] Failed to send email via Resend:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email} as ${role}.`,
    });
  } catch (error: unknown) {
    console.error("[invite-team] Server Error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
