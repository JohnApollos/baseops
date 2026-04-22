"use client";

import { StatsBar } from "@/components/dispatch/stats-bar";
import { ParcelBoard } from "@/components/dispatch/parcel-board";
import { DispatchMap, type DriverPin } from "@/components/dispatch/dispatch-map";
import type { Parcel } from "@/types";

// ============================================================
// Dispatcher Dashboard — the hero page of BaseOps.
// Combines stats bar, Kanban board, and live map.
//
// In production, these would be fetched from Supabase with
// realtime subscriptions. For the skeleton, we use demo data
// that mirrors the seed.sql structure.
// ============================================================

// Demo parcels matching seed data
const demoParcels: Parcel[] = [
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
    assigned_driver_id: "d2",
    assigned_vehicle_id: "v2",
    notes: null,
    created_at: new Date().toISOString(),
    delivered_at: null,
  },
  {
    id: "p3",
    org_id: "org1",
    tracking_code: "BOP-2025-00003",
    sender_name: "Masoko",
    sender_address: "CBD, Nairobi",
    recipient_name: "John Otieno",
    recipient_address: "Langata, Nairobi",
    recipient_phone: "+254733333333",
    weight_kg: 5.0,
    status: "received",
    assigned_driver_id: null,
    assigned_vehicle_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    delivered_at: null,
  },
  {
    id: "p4",
    org_id: "org1",
    tracking_code: "BOP-2025-00004",
    sender_name: "Glovo",
    sender_address: "Lavington, Nairobi",
    recipient_name: "Ann Wairimu",
    recipient_address: "South B, Nairobi",
    recipient_phone: "+254744444444",
    weight_kg: 0.5,
    status: "delivered",
    assigned_driver_id: "d1",
    assigned_vehicle_id: "v1",
    notes: null,
    created_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
  },
  {
    id: "p5",
    org_id: "org1",
    tracking_code: "BOP-2025-00005",
    sender_name: "Sky Garden",
    sender_address: "Kilimani, Nairobi",
    recipient_name: "David Mwangi",
    recipient_address: "Embakasi, Nairobi",
    recipient_phone: "+254755555555",
    weight_kg: 3.2,
    status: "failed",
    assigned_driver_id: "d2",
    assigned_vehicle_id: "v2",
    notes: null,
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
    id: "p7",
    org_id: "org1",
    tracking_code: "BOP-2025-00007",
    sender_name: "Copia",
    sender_address: "Industrial Area, Nairobi",
    recipient_name: "Moses Kipchoge",
    recipient_address: "Kasarani, Nairobi",
    recipient_phone: "+254777777777",
    weight_kg: 4.0,
    status: "received",
    assigned_driver_id: null,
    assigned_vehicle_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    delivered_at: null,
  },
];

// Demo driver pins for the map
const demoDrivers: DriverPin[] = [
  {
    id: "d1",
    name: "James Ochieng",
    coords: [-1.2944, 36.8232],
    status: "active",
    parcelsCount: 3,
  },
  {
    id: "d2",
    name: "Mary Akinyi",
    coords: [-1.3077, 36.8365],
    status: "active",
    parcelsCount: 2,
  },
  {
    id: "d3",
    name: "Brian Wekesa",
    coords: [-1.2741, 36.7666],
    status: "idle",
    parcelsCount: 0,
  },
];

export default function DispatchDashboardPage() {
  // Calculate stats from demo data
  const total = demoParcels.length;
  const inTransit = demoParcels.filter((p) => p.status === "in_transit").length;
  const delivered = demoParcels.filter((p) => p.status === "delivered").length;
  const failed = demoParcels.filter((p) => p.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dispatch Center</h1>
        <p className="text-muted-foreground">
          Real-time parcel board, route planning, and driver assignment.
        </p>
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
        <div>
          <h2 className="text-lg font-semibold mb-3">Driver Locations</h2>
          <DispatchMap drivers={demoDrivers} />
        </div>

        {/* Kanban Board */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Parcel Board</h2>
          <ParcelBoard parcels={demoParcels} />
        </div>
      </div>
    </div>
  );
}
