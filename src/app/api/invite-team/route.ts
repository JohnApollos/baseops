// ============================================================
// BaseOps — Invite Driver/Dispatcher API Route
// ============================================================
// This endpoint allows owners and dispatchers to invite new
// team members by email. It uses:
//   1. Supabase Admin API to create the user with a role
//   2. Resend to send the invitation email
//
// The invited user's profile is pre-created with the org_id
// and role, so when they accept, the middleware routes them
// directly to the correct dashboard.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Service role client — lazy-initialized to avoid crashing
// at build time when environment variables aren't set.
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const resendClient = getResend();

    const body = await request.json();
    const { email, role, full_name, org_id, org_name, inviter_name } = body;

    // Validate required fields
    if (!email || !role || !org_id) {
      return NextResponse.json(
        { error: "Missing required fields: email, role, org_id" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["dispatcher", "driver"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'dispatcher' or 'driver'." },
        { status: 400 }
      );
    }

    // 1. Create the user via Supabase Admin API
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || "",
          role,
        },
      });

    if (authError) {
      // If user already exists, we might want to just update their org
      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "This email is already registered." },
          { status: 409 }
        );
      }
      throw authError;
    }

    // 2. Link the new user to the organization
    if (authData.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: authData.user.id,
        org_id,
        role,
        full_name: full_name || "",
        onboarded_at: new Date().toISOString(),
      });
    }

    // 3. Generate a magic link for the invited user
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError) throw linkError;

    // 4. Send the invitation email via Resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const magicLink = `${appUrl}/api/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=magiclink`;

    await resendClient.emails.send({
      from: "BaseOps <noreply@baseops.app>",
      to: email,
      subject: `You've been invited to join ${org_name || "a team"} on BaseOps`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1a1a2e;">You're invited! 🚀</h2>
          <p>${inviter_name || "A team member"} has invited you to join <strong>${org_name || "their organization"}</strong> as a <strong>${role}</strong> on BaseOps.</p>
          <p>Click the button below to accept your invitation and get started:</p>
          <a href="${magicLink}" style="display: inline-block; background: #e67e22; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0;">
            Accept Invitation
          </a>
          <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email} as ${role}.`,
    });
  } catch (error: unknown) {
    console.error("[invite-team] Error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
