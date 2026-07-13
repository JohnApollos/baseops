"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Loader2, AlertCircle } from "lucide-react";

interface RouteWithRelations {
  id: string;
  org_id: string;
  driver_id: string;
  vehicle_id: string;
  date: string;
  status: "planned" | "active" | "completed";
  parcel_ids: string[];
  start_coords: [number, number] | null;
  end_coords: [number, number] | null;
  created_at: string;
  driver: { full_name: string } | null;
  vehicle: { registration_plate: string } | null;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteWithRelations[]>([]);
  const [parcelsMap, setParcelsMap] = useState<Record<string, string>>({}); // Maps parcel ID to tracking code
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadRoutesData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's organization
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

        // Fetch routes with driver name and vehicle registration plate
        const { data: routesData, error: routesErr } = await supabase
          .from("routes")
          .select("*, driver:profiles(full_name), vehicle:vehicles(registration_plate)")
          .eq("org_id", profile.org_id)
          .order("date", { ascending: false });

        if (routesErr) throw routesErr;
        setRoutes((routesData as any) || []);

        // Fetch all parcels in the org to map parcel_ids to tracking_codes
        const { data: parcelsData } = await supabase
          .from("parcels")
          .select("id, tracking_code")
          .eq("org_id", profile.org_id);

        if (parcelsData) {
          const map: Record<string, string> = {};
          parcelsData.forEach((p) => {
            map[p.id] = p.tracking_code;
          });
          setParcelsMap(map);
        }
      } catch (err: any) {
        toast.error("Error loading routes: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadRoutesData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delivery Routes</h1>
        <p className="text-muted-foreground">
          View active, completed, and planned delivery routes for your drivers.
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-4 border-b">
          <h3 className="font-semibold">All Routes ({routes.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route ID</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Parcels Count</TableHead>
                <TableHead>Parcels (Tracking Codes)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Route Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span>Loading delivery routes...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : routes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2 py-4">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                      <p className="font-medium text-base">No routes planned</p>
                      <p className="text-sm">Routes are created automatically when parcels are assigned to drivers.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                routes.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="font-code text-xs text-primary font-semibold">
                      {r.id.substring(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {r.driver?.full_name || "Unassigned"}
                    </TableCell>
                    <TableCell className="font-code text-xs uppercase text-foreground/80">
                      {r.vehicle?.registration_plate || "—"}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      {r.parcel_ids?.length || 0}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      <div className="flex flex-wrap gap-1">
                        {r.parcel_ids && r.parcel_ids.length > 0 ? (
                          r.parcel_ids.map((pid) => (
                            <span
                              key={pid}
                              className="inline-block text-[10px] font-code bg-secondary text-secondary-foreground rounded px-1.5 py-0.5"
                              title={parcelsMap[pid] || pid}
                            >
                              {parcelsMap[pid] || pid.substring(0, 8)}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          r.status === "completed"
                            ? "border-success text-success bg-success/5"
                            : r.status === "active"
                            ? "border-warning text-warning bg-warning/5"
                            : "border-muted text-muted-foreground bg-muted/5"
                        }
                      >
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(r.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
