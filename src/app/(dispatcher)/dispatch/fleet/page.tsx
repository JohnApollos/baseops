"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Truck, Plus, Loader2, AlertCircle } from "lucide-react";
import type { Vehicle, VehicleType, VehicleStatus } from "@/types";

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Form state
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<VehicleType>("van");
  const [status, setStatus] = useState<VehicleStatus>("available");

  const supabase = createClient();

  useEffect(() => {
    async function loadOrgAndFleet() {
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
          toast.error("Failed to load your organization context.");
          setLoading(false);
          return;
        }

        setOrgId(profile.org_id);

        // Fetch vehicles
        const { data: fleetData, error: fleetErr } = await supabase
          .from("vehicles")
          .select("*")
          .eq("org_id", profile.org_id)
          .order("created_at", { ascending: false });

        if (fleetErr) throw fleetErr;
        setVehicles(fleetData || []);
      } catch (err: any) {
        toast.error("Error loading fleet data: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadOrgAndFleet();
  }, []);

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;

    if (!plate.trim()) {
      toast.error("Registration plate is required.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .insert({
          org_id: orgId,
          registration_plate: plate.trim().toUpperCase(),
          type,
          status,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Vehicle ${plate.toUpperCase()} registered successfully!`);
      setVehicles((prev) => [data, ...prev]);
      setPlate("");
    } catch (err: any) {
      toast.error("Failed to register vehicle: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fleet Management</h1>
        <p className="text-muted-foreground">
          Manage your organization&apos;s delivery vehicles and operational status.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Register Form */}
        <div className="md:col-span-1">
          <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b pb-3">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Add New Vehicle</h2>
            </div>
            
            <form onSubmit={handleAddVehicle} className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label htmlFor="plate">Registration Plate</Label>
                <Input
                  id="plate"
                  placeholder="e.g. KDA 123A"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  disabled={submitting || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Vehicle Type</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as VehicleType)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={submitting || loading}
                >
                  <option value="motorcycle">Motorcycle (Boda Boda)</option>
                  <option value="van">Delivery Van</option>
                  <option value="truck">Distribution Truck</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Initial Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={submitting || loading}
                >
                  <option value="available">Available</option>
                  <option value="on_route">On Route</option>
                  <option value="maintenance">Under Maintenance</option>
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={submitting || loading}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Register Vehicle
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Side: Active Fleet Table */}
        <div className="md:col-span-2">
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Active Fleet ({vehicles.length})</h3>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span>Loading fleet directory...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : vehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 py-4">
                          <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                          <p className="font-medium text-base">No vehicles registered</p>
                          <p className="text-sm">Use the form on the left to add your first delivery vehicle.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicles.map((v) => (
                      <TableRow key={v.id} className="hover:bg-muted/30">
                        <TableCell className="font-code text-sm font-semibold uppercase text-primary">
                          {v.registration_plate}
                        </TableCell>
                        <TableCell className="capitalize text-sm text-foreground/80">
                          {v.type === "motorcycle" ? "Motorcycle 🏍️" : v.type === "van" ? "Van 🚐" : "Truck 🚚"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              v.status === "available"
                                ? "border-success text-success bg-success/5"
                                : v.status === "on_route"
                                ? "border-warning text-warning bg-warning/5"
                                : "border-destructive text-destructive bg-destructive/5"
                            }
                          >
                            {v.status === "available"
                              ? "Available"
                              : v.status === "on_route"
                              ? "On Route"
                              : "Maintenance"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {new Date(v.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
