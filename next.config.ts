import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// ============================================================
// BaseOps — Next.js Configuration
// ============================================================
// PWA is configured here to generate the service worker and
// cache the application shell. In development, PWA is disabled
// to avoid caching issues during hot-reloads.
//
// Next.js 16 defaults to Turbopack. The PWA plugin injects a
// webpack config, so we add an empty turbopack key to signal
// that we're aware and want the build to proceed.
// ============================================================

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  // Turbopack config — empty is fine, signals intentional usage
  turbopack: {},

  // Allow Supabase storage images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withPWA(nextConfig);
