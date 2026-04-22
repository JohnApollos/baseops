"use client";

import { Package, TrendingUp, Truck, AlertTriangle } from "lucide-react";

// ============================================================
// Stats Bar — summary cards at the top of the dispatch dashboard.
// Shows today's delivery metrics at a glance.
// ============================================================

interface StatsBarProps {
  total: number;
  inTransit: number;
  delivered: number;
  failed: number;
}

export function StatsBar({ total, inTransit, delivered, failed }: StatsBarProps) {
  const stats = [
    {
      label: "Total Today",
      value: total,
      icon: Package,
      color: "text-foreground",
      bg: "bg-foreground/5",
    },
    {
      label: "In Transit",
      value: inTransit,
      icon: Truck,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Delivered",
      value: delivered,
      icon: TrendingUp,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Failed",
      value: failed,
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border bg-card p-4 space-y-2 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </div>
          <p className={`text-3xl font-bold font-code ${stat.color}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
