"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ParcelStatusBadge } from "@/components/dispatch/parcel-status-badge";
import { enqueueSync } from "@/lib/sync-engine";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Parcel, ParcelStatus } from "@/types";
import {
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  Package,
  Clock,
  RefreshCw,
} from "lucide-react";

// ============================================================
// Driver Dashboard — mobile-first parcel cards with offline
// status update buttons.
//
// 1. Reactively binds to Dexie (IndexedDB) as single source of truth.
// 2. On mount, seeds mock data if local DB is empty.
// 3. Fetches assigned parcels from Supabase when online.
// ============================================================

const initialParcels: Parcel[] = [
  {
    id: "p1",
    org_id: "org1",
    tracking_code: "BOP-2025-00001",
    sender_name: "Jumia Kenya",
    sender_address: "Mombasa Rd, Nairobi",
    recipient_name: "Peter Kamau",
    recipient_address: "Kilimani, Nairobi",
    recipient_phone: "+254711111111",
    weight_kg: 2.5,
    status: "in_transit",
    assigned_driver_id: "d1",
    assigned_vehicle_id: "v1",
    notes: "Leave with security if not home",
    created_at: new Date().toISOString(),
    delivered_at: null,
  },
  {
    id: "p6",
    org_id: "org1",
    tracking_code: "BOP-2025-00006",
    sender_name: "Shopify KE",
    sender_address: "Upperhill, Nairobi",
    recipient_name: "Lucy Njeri",
    recipient_address: "Roysambu, Nairobi",
    recipient_phone: "+254766666666",
    weight_kg: 1.8,
    status: "in_transit",
    assigned_driver_id: "d1",
    assigned_vehicle_id: "v1",
    notes: null,
    created_at: new Date().toISOString(),
    delivered_at: null,
  },
  {
    id: "p2",
    org_id: "org1",
    tracking_code: "BOP-2025-00002",
    sender_name: "Amazon KE",
    sender_address: "Westlands, Nairobi",
    recipient_name: "Grace Muthoni",
    recipient_address: "Karen, Nairobi",
    recipient_phone: "+254722222222",
    weight_kg: 1.0,
    status: "assigned",
    assigned_driver_id: "d1",
    assigned_vehicle_id: "v2",
    notes: "Call before delivery",
    created_at: new Date().toISOString(),
    delivered_at: null,
  },
];

export default function DriverDashboardPage() {
  const [isPulling, setIsPulling] = useState(false);

  // Bind UI directly to Dexie. Resolves as empty array during loading
  const parcels = useLiveQuery(() => db.parcels.toArray()) ?? [];

  // Seeding and Sync Effect
  useEffect(() => {
    async function seedAndSync() {
      // 1. Seed IndexedDB with initial mock data if empty (gives instantly usable UI)
      const count = await db.parcels.count();
      if (count === 0) {
        await db.parcels.bulkAdd(initialParcels);
      }

      // 2. Fetch latest data from Supabase if online and session is valid
      await pullFromSupabase();
    }
    seedAndSync();
  }, []);

  async function pullFromSupabase() {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setIsPulling(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsPulling(false);
        return;
      }

      // Query database for driver's assigned parcels
      const { data: remoteParcels, error } = await supabase
        .from("parcels")
        .select("*")
        .eq("assigned_driver_id", user.id);

      if (error) throw error;

      if (remoteParcels && remoteParcels.length > 0) {
        // Clear old records and save current ones
        await db.parcels.clear();
        await db.parcels.bulkPut(remoteParcels);
        toast.success("Synced tasks with server");
      }
    } catch (e: unknown) {
      console.warn("Could not sync with Supabase (normal if using mock auth):", e);
    } finally {
      setIsPulling(false);
    }
  }

  // Count by status
  const inTransit = parcels.filter((p) => p.status === "in_transit").length;
  const assigned = parcels.filter((p) => p.status === "assigned").length;
  const completed = parcels.filter(
    (p) => p.status === "delivered" || p.status === "failed"
  ).length;

  /**
   * Handle status update — the core offline-first mutation.
   * 1. Update Dexie locally (triggers useLiveQuery for instant visual feedback)
   * 2. Enqueue sync task (pushes to Supabase whenever online)
   */
  async function handleStatusUpdate(parcelId: string, newStatus: ParcelStatus) {
    const targetParcel = parcels.find((p) => p.id === parcelId);
    if (!targetParcel) return;

    const deliveredAt = newStatus === "delivered" ? new Date().toISOString() : null;

    // 1. Update Dexie locally
    try {
      await db.parcels.update(parcelId, {
        status: newStatus,
        delivered_at: deliveredAt,
      });
    } catch (err) {
      console.error("Dexie local update error:", err);
    }

    // 2. Enqueue sync
    await enqueueSync("parcels", "update", {
      id: parcelId,
      status: newStatus,
      delivered_at: deliveredAt,
    });

    // 3. Create delivery audit event
    const eventId = `evt-${Date.now()}`;
    await enqueueSync("delivery_events", "insert", {
      id: eventId,
      parcel_id: parcelId,
      org_id: targetParcel.org_id,
      driver_id: targetParcel.assigned_driver_id || "d1",
      event_type: newStatus === "delivered" ? "delivered" : "failed",
      notes:
        newStatus === "delivered"
          ? "Delivered successfully"
          : "Delivery failed — recipient unavailable",
      coords: [-1.2921, 36.8219], // Standard GPS fallback
      created_at: new Date().toISOString(),
    });

    toast.success(
      newStatus === "delivered"
        ? "Marked as delivered ✓"
        : "Marked as failed ✗",
      {
        description: navigator.onLine
          ? "Syncing to server…"
          : "Saved locally. Will sync when online.",
      }
    );
  }

  // Filter lists
  const activeParcels = parcels.filter(
    (p) => p.status === "in_transit" || p.status === "assigned"
  );
  const completedParcels = parcels.filter(
    (p) => p.status === "delivered" || p.status === "failed"
  );

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Today&apos;s Deliveries
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {assigned} assigned
            </span>
            <span className="flex items-center gap-1">
              <Package className="h-3.5 w-3.5 text-warning" />
              {inTransit} in transit
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              {completed} done
            </span>
          </div>
        </div>
        <button
          onClick={pullFromSupabase}
          disabled={isPulling}
          className="p-2 rounded-lg border bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Refresh assignments"
        >
          <RefreshCw className={`h-4 w-4 ${isPulling ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Active parcels */}
      {activeParcels.length > 0 && (
        <div className="space-y-3">
          {activeParcels.map((parcel, i) => (
            <div
              key={parcel.id}
              className="rounded-xl border bg-card p-4 space-y-3 animate-slide-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="font-code text-sm text-primary">
                  {parcel.tracking_code}
                </span>
                <ParcelStatusBadge status={parcel.status} />
              </div>

              {/* Recipient info */}
              <div className="space-y-1">
                <p className="font-medium">{parcel.recipient_name}</p>
                <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{parcel.recipient_address}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <a
                    href={`tel:${parcel.recipient_phone}`}
                    className="hover:text-primary transition-colors"
                  >
                    {parcel.recipient_phone}
                  </a>
                </div>
              </div>

              {/* Notes */}
              {parcel.notes && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  📝 {parcel.notes}
                </p>
              )}

              {/* Weight + sender */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>From: {parcel.sender_name}</span>
                <span className="font-code">{parcel.weight_kg} kg</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleStatusUpdate(parcel.id, "delivered")}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2.5 rounded-lg bg-success/15 text-success font-medium hover:bg-success/25 active:bg-success/35 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Delivered
                </button>
                <button
                  onClick={() => handleStatusUpdate(parcel.id, "failed")}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2.5 rounded-lg bg-destructive/15 text-destructive font-medium hover:bg-destructive/25 active:bg-destructive/35 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Failed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed section */}
      {completedParcels.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Completed
          </h2>
          {completedParcels.map((parcel) => (
            <div
              key={parcel.id}
              className="rounded-xl border bg-card/50 p-4 space-y-2 opacity-70"
            >
              <div className="flex items-center justify-between">
                <span className="font-code text-xs text-muted-foreground">
                  {parcel.tracking_code}
                </span>
                <ParcelStatusBadge status={parcel.status} />
              </div>
              <p className="text-sm">{parcel.recipient_name}</p>
              <p className="text-xs text-muted-foreground">
                {parcel.recipient_address}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {parcels.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No deliveries today</p>
          <p className="text-sm">Check back later for new assignments.</p>
        </div>
      )}
    </div>
  );
}
