"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================================
// Dispatch Sidebar — navigation for dispatchers and owners.
// Shows the operational command center links.
// ============================================================

const navItems = [
  {
    label: "Dashboard",
    href: "/dispatch",
    icon: LayoutDashboard,
  },
  {
    label: "New Parcel",
    href: "/dispatch/parcels/new",
    icon: PlusCircle,
  },
  {
    label: "All Parcels",
    href: "/dispatch/parcels",
    icon: Package,
  },
  {
    label: "Routes",
    href: "/dispatch/routes",
    icon: MapPin,
  },
  {
    label: "Fleet",
    href: "/dispatch/fleet",
    icon: Truck,
  },
  {
    label: "Drivers",
    href: "/dispatch/drivers",
    icon: Users,
  },
];

export function DispatchSidebar() {
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
              (item.href !== "/dispatch" &&
                pathname.startsWith(item.href));
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
          href="/dispatch/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
