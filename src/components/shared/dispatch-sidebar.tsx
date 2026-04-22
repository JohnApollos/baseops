"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  LayoutDashboard,
  MapPin,
  PlusCircle,
  Users,
  Truck,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// ============================================================
// Dispatch Sidebar — navigation for dispatchers and owners.
// Includes mobile hamburger menu and sign-out.
// ============================================================

const navItems = [
  { label: "Dashboard", href: "/dispatch", icon: LayoutDashboard },
  { label: "New Parcel", href: "/dispatch/parcels/new", icon: PlusCircle },
  { label: "All Parcels", href: "/dispatch/parcels", icon: Package },
  { label: "Routes", href: "/dispatch/routes", icon: MapPin },
  { label: "Fleet", href: "/dispatch/fleet", icon: Truck },
  { label: "Drivers", href: "/dispatch/drivers", icon: Users },
];

export function DispatchSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-sidebar-primary" />
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            BaseOps
          </span>
        </div>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <Separator />

      {/* Role badge */}
      <div className="px-6 py-3">
        <span className="text-xs px-2 py-1 rounded-full bg-sidebar-primary/20 text-sidebar-primary font-medium">
          Dispatch Center
        </span>
      </div>

      {/* Nav links */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dispatch" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom */}
      <Separator />
      <div className="px-3 py-3 space-y-1">
        <Link
          href="/dispatch/settings"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 border-b bg-sidebar px-4 py-3">
        <button onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5 text-sidebar-foreground" />
        </button>
        <Package className="h-5 w-5 text-sidebar-primary" />
        <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
          BaseOps
        </span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-sidebar border-r transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar shrink-0">
        {navContent}
      </aside>
    </>
  );
}
