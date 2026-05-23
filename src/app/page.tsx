import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Package,
  Shield,
  Wifi,
  WifiOff,
  BarChart3,
  MapPin,
  Users,
  ArrowRight,
  ExternalLink,
  Zap,
} from "lucide-react";

// ============================================================
// BaseOps — Public Landing Page
// ============================================================
// The first thing a visitor, recruiter, or client sees.
// Showcases the product capabilities with a "Get Started" CTA.
// ============================================================

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ===== NAVBAR ===== */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">BaseOps</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="https://github.com" target="_blank" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                GitHub
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center px-6 py-24 md:py-32 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Open-source multi-tenant logistics platform
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Manage deliveries.
            <br />
            <span className="text-primary">Even offline.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            BaseOps is a production-grade PWA for logistics companies to manage
            drivers, parcels, and routes — with offline-first architecture that
            works in dead zones.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-base">
                Start for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="https://github.com" target="_blank">
              <Button variant="outline" size="lg" className="text-base">
                <ExternalLink className="mr-2 h-5 w-5" />
                View Source
              </Button>
            </Link>
          </div>

          {/* Tech badge strip */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4 text-xs text-muted-foreground">
            {[
              "Next.js",
              "Supabase",
              "Tailwind CSS",
              "Dexie.js",
              "Leaflet",
              "Recharts",
            ].map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 rounded-full border bg-card font-code"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight">
            Everything a logistics SaaS needs
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Built with the same architectural patterns that power production
            multi-tenant applications.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Multi-Tenant RBAC",
              description:
                "Row Level Security enforces data isolation. Middleware routes owners, dispatchers, and drivers to their correct dashboards automatically.",
            },
            {
              icon: WifiOff,
              title: "Offline-First",
              description:
                "Drivers can update delivery statuses without connectivity. Mutations queue locally in IndexedDB and sync automatically when back online.",
            },
            {
              icon: Wifi,
              title: "Real-Time Sync",
              description:
                "Supabase Realtime pushes parcel status changes to the dispatch board instantly. No polling, no manual refresh.",
            },
            {
              icon: MapPin,
              title: "Route Mapping",
              description:
                "Leaflet-powered maps show driver locations and delivery routes on the dispatch board. Open source, no API costs.",
            },
            {
              icon: BarChart3,
              title: "Analytics Dashboard",
              description:
                "Recharts-powered visualizations for delivery success rates, daily volume trends, and driver performance metrics.",
            },
            {
              icon: Users,
              title: "Team Invitations",
              description:
                "Invite dispatchers and drivers via email with magic links powered by Resend. They land directly in their role-scoped dashboard.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border bg-card p-6 space-y-3 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="border-t">
        <div className="max-w-4xl mx-auto text-center px-6 py-24 space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to see it in action?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Clone the repo, run the migrations, and you have a fully functional
            multi-tenant logistics platform running locally in minutes.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span>BaseOps</span>
          </div>
          <p>Open source · Built with Next.js & Supabase</p>
        </div>
      </footer>
    </div>
  );
}
