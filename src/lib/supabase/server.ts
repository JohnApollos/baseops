// ============================================================
// Supabase Server Client — for use in Server Components,
// Server Actions, Route Handlers, and Middleware.
// ============================================================
// This client reads and writes cookies via the Next.js `cookies()`
// API, which means it can maintain a Supabase session server-side
// across requests without exposing the refresh token to the browser.
// ============================================================

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for server-side usage.
 *
 * Call this inside:
 * - Server Components
 * - Server Actions
 * - Route Handlers (`app/api/...`)
 *
 * Do NOT call this in client components — use the browser client instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component where
            // cookies cannot be set. This is expected during the initial
            // page load when the session is being refreshed. The middleware
            // will handle refreshing the session in this case.
          }
        },
      },
    }
  );
}
