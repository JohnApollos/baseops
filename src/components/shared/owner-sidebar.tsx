"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Package,
  BarChart3,
  Users,
  Settings,
  CreditCard,
  Building2,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Overview", href: "/owner", icon: BarChart3 },
  { label: "Team", href: "/owner/team", icon: Users },
  { label: "Organization", href: "/owner/organization", icon: Building2 },
  { label: "Billing", href: "/owner/billing", icon: CreditCard },
];

export function OwnerSidebar() {
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
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-sidebar-primary" />
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            BaseOps
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <Separator />
      <div className="px-6 py-3">
        <span className="text-xs px-2 py-1 rounded-full bg-warning/20 text-warning font-medium">
          Owner Portal
        </span>
      </div>
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/owner" && pathname.startsWith(item.href));
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
      <Separator />
      <div className="px-3 py-3 space-y-1">
        <Link
          href="/owner/settings"
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 border-b bg-sidebar px-4 py-3">
        <button onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5 text-sidebar-foreground" />
        </button>
        <Package className="h-5 w-5 text-sidebar-primary" />
        <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
          BaseOps
        </span>
      </div>
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-sidebar border-r transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar shrink-0">
        {navContent}
      </aside>
    </>
  );
}
