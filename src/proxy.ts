// ============================================================
// BaseOps — RBAC Proxy
// ============================================================
// This proxy intercepts EVERY request and performs four
// operations in sequence:
//
// 1. Refreshes the Supabase session (updates JWT cookies).
// 2. Reads the user's role from their profile.
// 3. Redirects users who hit the wrong role's route group.
// 4. Forces users without a completed onboarding (no org_id)
//    back to the /onboarding flow.
//
// Public routes (landing page, auth pages, API routes, static
// assets) are excluded from protection.
// ============================================================

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import type { UserRole } from "@/types";

// ----- Route classification -----

/** Routes that do not require authentication. */
const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password"];

/** Prefixes that are always public (API, static, PWA assets). */
const PUBLIC_PREFIXES = ["/api/", "/_next/", "/icons/", "/manifest"];

/** Map each role to its home dashboard path. */
const ROLE_HOME: Record<UserRole, string> = {
  owner: "/owner",
  dispatcher: "/dispatch",
  driver: "/driver",
};

/** Map each route group prefix to the role(s) that may access it. */
const ROUTE_ROLE_MAP: Record<string, UserRole[]> = {
  "/owner": ["owner"],
  "/dispatch": ["owner", "dispatcher"],
  "/driver": ["driver"],
  "/admin": [], // handled separately — superadmin email check
};

/** The super-admin email — platform-level management access. */
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "";

// ----- Proxy logic -----

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip public routes and static assets
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    // Still refresh session cookies even on public routes (if Supabase is configured)
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // 2. Refresh session and get the authenticated user
  const { user, supabaseResponse, supabase } = await updateSession(request);

  // If Supabase isn't configured, redirect protected routes to login
  if (!supabase) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // If there is no authenticated user, redirect to login
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Fetch the user's profile to determine their role and org
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id, onboarded_at")
    .eq("id", user.id)
    .single();

  // If no profile exists yet (edge case — freshly signed up),
  // redirect to onboarding so the profile gets created.
  if (!profile) {
    if (!pathname.startsWith("/onboarding")) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = "/onboarding";
      return NextResponse.redirect(onboardingUrl);
    }
    return supabaseResponse;
  }

  const role = profile.role as UserRole;
  const isOnboarded = !!profile.org_id && !!profile.onboarded_at;

  // 4. Force incomplete onboarding
  if (!isOnboarded && !pathname.startsWith("/onboarding")) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    return NextResponse.redirect(onboardingUrl);
  }

  // If the user IS onboarded but tries to visit onboarding again, bounce home
  if (isOnboarded && pathname.startsWith("/onboarding")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = ROLE_HOME[role] || "/dispatch";
    return NextResponse.redirect(homeUrl);
  }

  // 5. Admin portal — only the super-admin email
  if (pathname.startsWith("/admin")) {
    if (user.email !== SUPER_ADMIN_EMAIL) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = ROLE_HOME[role] || "/dispatch";
      return NextResponse.redirect(homeUrl);
    }
    return supabaseResponse;
  }

  // 6. Role-based route group enforcement
  for (const [prefix, allowedRoles] of Object.entries(ROUTE_ROLE_MAP)) {
    if (pathname.startsWith(prefix) && !allowedRoles.includes(role)) {
      // User is trying to access a route they shouldn't — redirect them home
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = ROLE_HOME[role] || "/dispatch";
      return NextResponse.redirect(homeUrl);
    }
  }

  return supabaseResponse;
}

// ----- Matcher -----
// Run middleware on all routes except Next.js internals and static files.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
