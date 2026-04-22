// ============================================================
// Supabase Middleware Client — for use in Next.js Middleware.
// ============================================================
// The middleware client is responsible for refreshing the
// Supabase session on every request. It reads cookies from the
// incoming request and writes updated cookies to the response.
// ============================================================

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Updates the Supabase session by refreshing tokens if needed.
 * Returns the authenticated user (or null) and the response
 * with updated cookies attached.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Guard: if Supabase env vars aren't configured yet, skip session refresh.
  // This allows the app to render public pages during local dev without
  // a Supabase project connected.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, supabaseResponse, supabase: null };
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // First, update the request cookies so downstream handlers see them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          // Clone the response to carry forward any headers already set
          supabaseResponse = NextResponse.next({
            request,
          });

          // Then set cookies on the outgoing response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT call supabase.auth.getSession() inside middleware.
  // getUser() triggers a network call that validates the JWT, while
  // getSession() only reads the JWT from cookies without validation.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabaseResponse, supabase };
}
