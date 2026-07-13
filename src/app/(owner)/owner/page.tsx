"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DeliveryVolumeChart, StatusDistributionPie, FleetPerformanceBar } from "@/components/owner/overview-charts";
import { Package, TrendingUp, Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OwnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVolume: 0,
    successRate: 0,
    activeFleetCount: 0,
    totalFleetCount: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's organization context
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (profileErr || !profile?.org_id) {
          toast.error("Failed to load organization context.");
          setLoading(false);
          return;
        }

        // Query total parcels count
        const { count: totalParcels } = await supabase
          .from("parcels")
          .select("id", { count: "exact", head: true })
          .eq("org_id", profile.org_id);

        // Query delivered parcels count
        const { count: deliveredParcels } = await supabase
          .from("parcels")
          .select("id", { count: "exact", head: true })
          .eq("org_id", profile.org_id)
          .eq("status", "delivered");

        // Query vehicles count
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select("status")
          .eq("org_id", profile.org_id);

        const totalVolume = totalParcels || 0;
        const successRate = totalVolume > 0 ? ((deliveredParcels || 0) / totalVolume) * 100 : 100;
        const activeFleetCount = vehicles ? vehicles.filter((v) => v.status === "on_route").length : 0;
        const totalFleetCount = vehicles ? vehicles.length : 0;

        setStats({
          totalVolume,
          successRate,
          activeFleetCount,
          totalFleetCount,
        });
      } catch (err: any) {
        console.warn("Failed to query live dashboard stats, showing fallbacks.", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-light">Loading organization statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Overview</h1>
        <p className="text-muted-foreground text-sm font-light">
          High-level metrics and performance analytics.
        </p>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Volume */}
        <div className="rounded-xl border bg-card/65 backdrop-blur-sm p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Total Volume (All Time)</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalVolume.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Registered parcels in database
          </p>
        </div>

        {/* Success Rate */}
        <div className="rounded-xl border bg-card/65 backdrop-blur-sm p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg
              className="h-4 w-4 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Success Rate</span>
          </div>
          <p className="text-3xl font-bold">
            {stats.successRate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">
            Ratio of delivered parcels to total
          </p>
        </div>

        {/* Active Fleet */}
        <div className="rounded-xl border bg-card/65 backdrop-blur-sm p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Truck className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">Active Fleet</span>
          </div>
          <p className="text-3xl font-bold">
            {stats.activeFleetCount} / {stats.totalFleetCount}
          </p>
          <p className="text-xs text-muted-foreground">Vehicles currently on route</p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DeliveryVolumeChart />
        <StatusDistributionPie />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FleetPerformanceBar />
      </div>
    </div>
  );
}
