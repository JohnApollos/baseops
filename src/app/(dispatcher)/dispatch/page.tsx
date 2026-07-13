"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatsBar } from "@/components/dispatch/stats-bar";
import { ParcelBoard } from "@/components/dispatch/parcel-board";
import { DispatchMap, type DriverPin } from "@/components/dispatch/dispatch-map";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Parcel } from "@/types";

// Helper to generate deterministic jitter coordinates around Nairobi center
// so fallback pins do not stack exactly on top of each other
function getJitteredCoords(id: string, index: number): [number, number] {
  const baseLat = -1.2921;
  const baseLng = 36.8219;
  
  // Simple hashing of the UUID to get unique offsets
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 15) - 7.5) * 0.004;
  const lngOffset = (((hash * 17) % 15) - 7.5) * 0.004;
  
  return [baseLat + latOffset, baseLng + lngOffset];
}

export default function DispatchDashboardPage() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [drivers, setDrivers] = useState<DriverPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  const supabase = createClient();

  const loadDashboardData = useCallback(async (currentOrgId: string) => {
    try {
      // 1. Fetch all parcels for the organization
      const { data: parcelsData, error: parcelsErr } = await supabase
        .from("parcels")
        .select("*")
        .eq("org_id", currentOrgId);

      if (parcelsErr) throw parcelsErr;
      const loadedParcels = parcelsData || [];
      setParcels(loadedParcels);

      // 2. Fetch driver profiles
      const { data: driversData, error: driversErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("org_id", currentOrgId)
        .eq("role", "driver");

      if (driversErr) throw driversErr;

      // 3. Fetch latest delivery events containing GPS coords for the organization
      const { data: eventsData } = await supabase
        .from("delivery_events")
        .select("driver_id, coords, created_at")
        .eq("org_id", currentOrgId)
        .order("created_at", { ascending: false });

      // Build driver pins mapping
      const driverPins: DriverPin[] = (driversData || []).map((driver, index) => {
        // Find latest coordinates for this driver
        const driverEvent = eventsData?.find(
          (evt) => evt.driver_id === driver.id && evt.coords && evt.coords.length === 2
        );
        const coords: [number, number] = driverEvent?.coords 
          ? [driverEvent.coords[0], driverEvent.coords[1]] 
          : getJitteredCoords(driver.id, index);

        // Count driver's active parcels
        const activeParcelsCount = loadedParcels.filter(
          (p) => p.assigned_driver_id === driver.id && !["delivered", "failed", "returned"].includes(p.status)
        ).length;

        return {
          id: driver.id,
          name: driver.full_name || "Pending Onboarding",
          coords,
          status: activeParcelsCount > 0 ? "active" : "idle",
          parcelsCount: activeParcelsCount,
        };
      });

      setDrivers(driverPins);
    } catch (err: any) {
      console.error("Dashboard reload error:", err);
    }
  }, [supabase]);

  // Initial load
  useEffect(() => {
    async function initDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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

        setOrgId(profile.org_id);
        await loadDashboardData(profile.org_id);
      } catch (err: any) {
        toast.error("Error initializing dashboard: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [supabase, loadDashboardData]);

  // Real-time updates subscription
  useEffect(() => {
    if (!orgId) return;

    // Subscribe to all changes in the parcels table
    const parcelsChannel = supabase
      .channel("dispatch-dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parcels",
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          // Trigger silent reload of state when any parcel changes
          loadDashboardData(orgId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(parcelsChannel);
    };
  }, [orgId, supabase, loadDashboardData]);

  const handleRefresh = async () => {
    if (!orgId) return;
    setIsRefreshing(true);
    await loadDashboardData(orgId);
    setIsRefreshing(false);
    toast.success("Dashboard metrics refreshed");
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Syncing dispatch dashboard...</p>
      </div>
    );
  }

  // Calculate stats from dynamic data
  const total = parcels.length;
  const inTransit = parcels.filter((p) => p.status === "in_transit").length;
  const delivered = parcels.filter((p) => p.status === "delivered").length;
  const failed = parcels.filter((p) => p.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dispatch Center</h1>
          <p className="text-muted-foreground">
            Real-time parcel board, route planning, and driver locations.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <StatsBar
        total={total}
        inTransit={inTransit}
        delivered={delivered}
        failed={failed}
      />

      {/* Map + Board layout */}
      <div className="space-y-6">
        {/* Map */}
        <div className="rounded-xl border p-1 bg-card/40 backdrop-blur-sm">
          <div className="px-4 py-3">
            <h2 className="text-lg font-semibold">Live Driver Coordinates</h2>
            <p className="text-xs text-muted-foreground">Showing active routes and coordinate events.</p>
          </div>
          <DispatchMap drivers={drivers} />
        </div>

        {/* Kanban Board */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Parcel Kanban Board</h2>
          <ParcelBoard parcels={parcels} />
        </div>
      </div>
    </div>
  );
}
