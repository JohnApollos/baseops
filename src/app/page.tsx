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
  Truck,
  Database,
  Globe,
  Fingerprint,
} from "lucide-react";

// ============================================================
// BaseOps — Premium Product Landing Page
// ============================================================
// Designed to look recruiter-ready and highly professional.
// Features ambient blur effects, glassmorphic cards, and
// an interactive CSS dashboard mockup.
// ============================================================

export default function LandingPage() {
  const projectGithub = "https://github.com/JohnApollos/baseops";
  const apollosDigitalUrl = "https://apollos-digital.vercel.app";

  return (
    <div className="dark min-h-screen bg-background text-foreground relative overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[10%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-primary/10 rounded-full blur-[80px] sm:blur-[120px]" />
        <div className="absolute top-[20%] right-[5%] w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-warning/5 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] left-[30%] w-[250px] sm:w-[350px] h-[250px] sm:h-[350px] bg-info/5 rounded-full blur-[80px]" />
      </div>

      {/* ===== NAVBAR ===== */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              BaseOps
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Link href={projectGithub} target="_blank" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm" className="hover:bg-accent/60 transition-colors">
                <ExternalLink className="h-4 w-4 mr-2" />
                GitHub
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-border/60 hover:bg-accent/60 transition-colors">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-primary hover:bg-primary/95 shadow-md shadow-primary/10 transition-all active:scale-[0.98]">
                Get Started
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative pt-16 md:pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Content */}
          <div className="lg:col-span-6 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary tracking-wide uppercase animate-pulse-dot">
              <Zap className="h-3.5 w-3.5" />
              SaaS logistics starter kit
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-foreground">
              Fleet management,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-amber-500">
                engineered offline-first.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              BaseOps is a professional-grade multi-tenant PWA for last-mile delivery. It features database-level Row Level Security, instant real-time sync, and an offline mutation queue that keeps drivers moving through cell dead zones.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-6 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/30 transition-all duration-300">
                  Deploy Fleet Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href={projectGithub} target="_blank">
                <Button variant="outline" size="lg" className="h-12 px-6 border-border/60 hover:bg-accent/60 transition-colors font-medium">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Source Code
                </Button>
              </Link>
            </div>

            {/* Badges strip */}
            <div className="pt-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Enterprise Stack</p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 text-xs">
                {["Next.js 16", "Supabase RLS", "Tailwind CSS v4", "IndexedDB", "Leaflet Maps", "Recharts"].map((tech) => (
                  <span key={tech} className="px-3 py-1 rounded-md border border-border/50 bg-card/40 text-muted-foreground font-code font-medium">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Hero Visual Mockup (Interactive CSS Dashboard) */}
          <div className="lg:col-span-6 w-full max-w-lg mx-auto lg:max-w-none">
            <div className="relative rounded-2xl border border-border/40 bg-card/60 p-1.5 shadow-2xl backdrop-blur-xl">
              {/* Colored headers mockup */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/20 rounded-t-xl">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                </div>
                <div className="text-[11px] font-code text-muted-foreground flex items-center gap-1 bg-background/50 px-2 py-0.5 rounded border border-border/30">
                  <Wifi className="h-3 w-3 text-success" />
                  <span>ops.baseops.app/dispatch</span>
                </div>
              </div>

              {/* Mock Dashboard Layout */}
              <div className="p-4 space-y-4 font-sans text-left">
                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Assigned", val: "14", color: "text-info" },
                    { label: "In Transit", val: "8", color: "text-warning animate-pulse" },
                    { label: "Delivered", val: "128", color: "text-success" },
                  ].map((s) => (
                    <div key={s.label} className="bg-background/40 p-2.5 rounded-lg border border-border/20">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{s.label}</p>
                      <p className={`text-lg font-bold font-code mt-0.5 ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>

                {/* Map + Kanban Area mockup */}
                <div className="grid grid-cols-12 gap-3">
                  {/* Left Column: Mini Map */}
                  <div className="col-span-5 rounded-lg border border-border/20 bg-muted/30 h-[140px] relative overflow-hidden flex items-center justify-center">
                    {/* Simulated Map lines */}
                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:24px_24px]" />
                    <div className="absolute top-[30%] left-[20%] w-3 h-3 rounded-full bg-primary border-2 border-background animate-pulse" />
                    <div className="absolute top-[60%] right-[30%] w-3 h-3 rounded-full bg-warning border-2 border-background animate-pulse" />
                    <div className="absolute bottom-[20%] left-[40%] w-2.5 h-2.5 rounded-full bg-gray-500 border border-background" />
                    <span className="text-[10px] font-code text-muted-foreground/80 bg-background/80 px-1.5 py-0.5 rounded border border-border/30 z-10">
                      Nairobi Area Map
                    </span>
                  </div>

                  {/* Right Column: Mini Kanban */}
                  <div className="col-span-7 space-y-2 h-[140px] overflow-y-hidden">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase border-b border-border/30 pb-1">
                      <span>Dispatch Board</span>
                      <span>Active</span>
                    </div>
                    {/* Mock Kanban cards */}
                    {[
                      { code: "BOP-0012", dest: "Kilimani, Peter", status: "In Transit", color: "bg-warning/20 text-warning" },
                      { code: "BOP-0013", dest: "Karen, Grace", status: "Assigned", color: "bg-info/20 text-info" },
                    ].map((card) => (
                      <div key={card.code} className="p-2 rounded-md border border-border/20 bg-background/50 space-y-1 hover:border-primary/20 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-code font-bold text-primary">{card.code}</span>
                          <span className={`text-[8px] font-medium px-1 rounded ${card.color}`}>{card.status}</span>
                        </div>
                        <p className="text-[11px] font-medium truncate text-foreground">{card.dest}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Offline Device Sync Alert Simulator */}
                <div className="p-2 rounded-lg border border-warning/20 bg-warning/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-warning">
                    <WifiOff className="h-4 w-4 animate-bounce" />
                    <span>Driver offline · <strong>2 updates pending sync</strong></span>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ===== FEATURES SECTIONS ===== */}
      <section className="border-t border-border/40 bg-muted/10 relative">
        <div className="max-w-6xl mx-auto px-6 py-24">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Production-Grade Architecture
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              BaseOps isn&apos;t a basic demo. It implements the exact database, sync, and security topologies required of commercial SaaS platforms.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "Multi-Tenant isolation",
                desc: "Every record is scoped with an org_id. PostgreSQL Row Level Security (RLS) policies block cross-tenant read/write attempts directly at the database layer.",
              },
              {
                icon: WifiOff,
                title: "Offline-First Sync Engine",
                desc: "Drivers modify statuses instantly without network coverage. Mutations buffer inside IndexedDB via Dexie.js and auto-flush in FIFO order when connectivity returns.",
              },
              {
                icon: Wifi,
                title: "Supabase Realtime Sync",
                desc: "Dispatcher dashboards subscribe to Supabase database changes. As drivers progress through their routes, the dispatch board updates instantly without api polling.",
              },
              {
                icon: MapPin,
                title: "Visual Route Mapping",
                desc: "Utilizes React-Leaflet to project active driver coordinates and routes onto a dark-mode tiled map. Zero map API request costs.",
              },
              {
                icon: BarChart3,
                title: "Executive Analytics",
                desc: "Interactive Recharts line and pie charts monitor fleet performance, status distributions, and logistics volume, rendering server-safe.",
              },
              {
                icon: Users,
                title: "Secure Team Invitations",
                desc: "Invite drivers and dispatchers via Resend magic links. Pre-created profile templates ensure invited team members bypass onboarding directly into their dashboards.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-border/30 bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TECHNICAL SPEC HIGHLIGHT ===== */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-border/40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Robust Data Security & Role Guards
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              BaseOps secures all operations using custom Next.js 16 route proxies and middleware. Route groups are restricted dynamically based on the profile roles of the authenticated session.
            </p>
            <div className="space-y-3.5">
              {[
                { title: "Owner Portal", detail: "Billing tiers, team invite controls, and organization metrics." },
                { title: "Dispatch Center", detail: "Kanban board access, parcel creations, and real-time Leaflet tracking." },
                { title: "Driver App", detail: "Mobile-first delivery tasks, offline mode support, and IndexedDB sync." }
              ].map((role) => (
                <div key={role.title} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✓</div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{role.title}</h4>
                    <p className="text-xs text-muted-foreground">{role.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/30 bg-card p-6 font-code text-xs text-muted-foreground/90 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-border/30 pb-2">
              <span className="font-bold text-foreground">supabase/migrations/00001_initial_schema.sql</span>
              <span className="text-success font-semibold">RLS Active</span>
            </div>
            <pre className="overflow-x-auto text-[10px] sm:text-[11px] leading-relaxed">
{`-- Enforce Organization Isolation
CREATE POLICY "org_members_can_read_parcels" 
  ON public.parcels FOR SELECT 
  USING (
    org_id IN (
      SELECT org_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Route Guard Logic (Next.js 16 Proxy)
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { user } = await updateSession(request);
  
  if (!user && isProtectedRoute) {
    return NextResponse.redirect("/login");
  }
}`}
            </pre>
          </div>

        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="border-t border-border/40 bg-gradient-to-t from-primary/5 via-transparent to-transparent">
        <div className="max-w-4xl mx-auto text-center px-6 py-24 space-y-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Deploy Your Logistics Platform Today
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Download the repository, run the schema migration in your Supabase SQL Editor, configure Resend API, and run the project locally in minutes.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href={projectGithub} target="_blank">
              <Button variant="outline" size="lg" className="h-12 px-6 border-border/60 hover:bg-accent/60 transition-colors font-medium">
                View Repository
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border/30 bg-card/20 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Package className="h-4 w-4" />
            </div>
            <span className="font-bold text-foreground">BaseOps</span>
          </div>

          <p className="text-center md:text-left">
            Powered by{" "}
            <Link
              href={apollosDigitalUrl}
              target="_blank"
              className="text-foreground hover:text-primary font-semibold underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-all"
            >
              Apollos Digital
            </Link>
          </p>

          <div className="flex items-center gap-4">
            <Link href={projectGithub} target="_blank" className="hover:text-foreground transition-colors font-medium">
              GitHub Project
            </Link>
            <span>·</span>
            <p>Open Source (MIT)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
