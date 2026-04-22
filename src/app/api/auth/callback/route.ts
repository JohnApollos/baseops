// ============================================================
// BaseOps — Auth Callback API Route
// ============================================================
// Handles the redirect from Supabase Auth email confirmations
// and magic links. Exchanges the auth code for a session and
// redirects the user to the appropriate dashboard.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dispatch";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If there's no code or the exchange failed, redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
