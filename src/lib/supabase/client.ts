// ============================================================
// Supabase Browser Client — for use in Client Components.
// ============================================================
// This client stores tokens in the browser and handles
// automatic token refresh on the client side. It should be
// used in any component that has "use client" at the top.
// ============================================================

import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for browser-side usage.
 *
 * Call this inside Client Components (files with "use client").
 * The client automatically reads/writes cookies from the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
