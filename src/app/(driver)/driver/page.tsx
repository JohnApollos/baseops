"use client";

import { useState } from "react";
import { ParcelStatusBadge } from "@/components/dispatch/parcel-status-badge";
import { enqueueSync } from "@/lib/sync-engine";
import { db } from "@/lib/db";
import { toast } from "sonner";
import type { Parcel, ParcelStatus } from "@/types";
import {
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  Package,
  Clock,
} from "lucide-react";

// ============================================================
// Driver Dashboard — mobile-first parcel cards with offline
// status update buttons.
//
// When a driver taps "Delivered" or "Failed":
// 1. The parcel status is updated in Dexie (instant UI update)
// 2. A sync queue entry is created
// 3. When online, the sync engine pushes to Supabase
//
// This is the core offline-first demonstration.
// ============================================================

// Demo data — mirrors seed but from the driver's perspective
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
  const [parcels, setParcels] = useState<Parcel[]>(initialParcels);

  // Count by status for the summary
  const inTransit = parcels.filter((p) => p.status === "in_transit").length;
  const assigned = parcels.filter((p) => p.status === "assigned").length;
  const completed = parcels.filter(
    (p) => p.status === "delivered" || p.status === "failed"
  ).length;

  /**
   * Handle status update — the core offline-first mutation.
   * 1. Update local state (instant UI feedback)
   * 2. Update Dexie (persist locally)
   * 3. Enqueue sync (push to Supabase when online)
   */
  async function handleStatusUpdate(parcelId: string, newStatus: ParcelStatus) {
    // 1. Optimistic UI update
    setParcels((prev) =>
      prev.map((p) =>
        p.id === parcelId
          ? {
              ...p,
              status: newStatus,
              delivered_at:
                newStatus === "delivered" ? new Date().toISOString() : p.delivered_at,
            }
          : p
      )
    );

    // 2. Update Dexie locally
    try {
      await db.parcels.put({
        ...parcels.find((p) => p.id === parcelId)!,
        status: newStatus,
        delivered_at:
          newStatus === "delivered" ? new Date().toISOString() : null,
      });
    } catch {
      // Dexie might not have the parcel yet; that's okay
    }

    // 3. Enqueue sync — this is the magic
    await enqueueSync("parcels", "update", {
      id: parcelId,
      status: newStatus,
      delivered_at:
        newStatus === "delivered" ? new Date().toISOString() : null,
    });

    // 4. Also create a delivery event
    const eventId = `evt-${Date.now()}`;
    await enqueueSync("delivery_events", "insert", {
      id: eventId,
      parcel_id: parcelId,
      org_id: "org1",
      driver_id: "d1",
      event_type: newStatus === "delivered" ? "delivered" : "failed",
      notes:
        newStatus === "delivered"
          ? "Delivered successfully"
          : "Delivery failed — recipient unavailable",
      coords: [-1.2921, 36.8219], // Would use GPS in production
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

  // Separate active from completed
  const activeParcels = parcels.filter(
    (p) => p.status === "in_transit" || p.status === "assigned"
  );
  const completedParcels = parcels.filter(
    (p) => p.status === "delivered" || p.status === "failed"
  );

  return (
    <div className="space-y-5">
      {/* Summary */}
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

              {/* Action buttons — THE OFFLINE MUTATION TRIGGERS */}
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
