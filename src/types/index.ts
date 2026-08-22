// ============================================================
// BaseOps — Core TypeScript Interfaces
// ============================================================
// Every entity in the system is scoped to an organization (org_id).
// This file is the single source of truth for all shared types.
// ============================================================

// ----- Enums -----

/** Roles determine what route group a user can access. */
export type UserRole = "owner" | "dispatcher" | "driver";

/** Subscription tier for an organization. */
export type PlanTier = "free" | "pro";

/** Lifecycle status for a parcel. */
export type ParcelStatus =
  | "received"
  | "assigned"
  | "in_transit"
  | "delivered"
  | "failed"
  | "returned";

/** Current state of a vehicle in the fleet. */
export type VehicleStatus = "available" | "on_route" | "maintenance";

/** Type of vehicle in the fleet. */
export type VehicleType = "motorcycle" | "van" | "truck";

/** Route status. */
export type RouteStatus = "planned" | "active" | "completed";

/** Events that can occur during a delivery lifecycle. */
export type DeliveryEventType =
  | "picked_up"
  | "attempted"
  | "delivered"
  | "failed";

/** Status of a mutation in the offline sync queue. */
export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

// ----- Database Row Types -----

/** A tenant — a logistics company using BaseOps. */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
  wallet_balance: number;
  created_at: string;
}

/** A user profile linked to Supabase Auth and scoped to an org. */
export interface Profile {
  id: string; // matches auth.users.id
  org_id: string | null;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  onboarded_at: string | null;
  created_at: string;
}

/** A vehicle in an organization's fleet. */
export interface Vehicle {
  id: string;
  org_id: string;
  registration_plate: string;
  type: VehicleType;
  status: VehicleStatus;
  created_at: string;
}

/** The core operational unit — a parcel moving through the delivery lifecycle. */
export interface Parcel {
  id: string;
  org_id: string;
  tracking_code: string; // e.g. BOP-2025-00412
  sender_name: string;
  sender_address: string;
  recipient_name: string;
  recipient_address: string;
  recipient_phone: string;
  weight_kg: number;
  status: ParcelStatus;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  notes: string | null;
  created_at: string;
  delivered_at: string | null;
}

/** A planned or active delivery route for a driver. */
export interface Route {
  id: string;
  org_id: string;
  driver_id: string;
  vehicle_id: string;
  date: string;
  status: RouteStatus;
  parcel_ids: string[];
  start_coords: [number, number] | null;
  end_coords: [number, number] | null;
  created_at: string;
}

/** An immutable audit trail entry — every parcel status change is logged here. */
export interface DeliveryEvent {
  id: string;
  parcel_id: string;
  org_id: string;
  driver_id: string;
  event_type: DeliveryEventType;
  notes: string | null;
  coords: [number, number] | null;
  created_at: string;
}

// ----- Dexie (Local) Types -----

/** An entry in the offline sync queue — lives in IndexedDB only, never Supabase. */
export interface SyncQueueItem {
  id?: number; // Auto-incremented by Dexie
  user_id?: string; // Originating user ID for strong session binding
  org_id?: string;  // Originating tenant ID
  table_name: string;
  operation: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  status: SyncStatus;
  retry_count: number;
  created_at: string;
}

// ----- Utility / UI Types -----

/** Simplified profile info embedded in JWTs and used by the middleware. */
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  org_id: string | null;
  onboarded: boolean;
}
