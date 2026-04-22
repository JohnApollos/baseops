"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  BarChart3,
  Users,
  Settings,
  CreditCard,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================================
// Owner Sidebar — navigation for organization owners.
// Shows management, analytics, billing, and team links.
// ============================================================

const navItems = [
  {
    label: "Overview",
    href: "/owner",
    icon: BarChart3,
  },
  {
    label: "Team",
    href: "/owner/team",
    icon: Users,
  },
  {
    label: "Organization",
    href: "/owner/organization",
    icon: Building2,
  },
  {
    label: "Billing",
    href: "/owner/billing",
    icon: CreditCard,
  },
];

export function OwnerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-4">
        <Package className="h-6 w-6 text-sidebar-primary" />
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
          BaseOps
        </span>
      </div>
      <Separator />

      {/* Role badge */}
      <div className="px-6 py-3">
        <span className="text-xs px-2 py-1 rounded-full bg-warning/20 text-warning font-medium">
          Owner Portal
        </span>
      </div>

      {/* Nav links */}
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
      <div className="px-3 py-3">
        <Link
          href="/owner/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
