-- ============================================================
-- Migration: 00004_p1_database_architecture_hardening.sql
-- Description: Phase 4 P1 Database & Architecture Hardening
--   - DB-01: Foreign key, RLS filter, and composite query indexes
--   - DB-02: Domain & integrity constraints (wallet, weight, timestamps, plates)
--   - DB-06: Schema-level updated_at triggers and audit immutability
-- ============================================================

-- ------------------------------------------------------------
-- 1. DB-01: HIGH-PERFORMANCE INDEXES FOR MULTI-TENANCY & RLS
-- ------------------------------------------------------------

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_role ON public.profiles(org_id, role);

-- Vehicles indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_org_id ON public.vehicles(org_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_org_status ON public.vehicles(org_id, status);

-- Parcels indexes (Multi-column for high-frequency RLS and dispatcher filtering)
CREATE INDEX IF NOT EXISTS idx_parcels_org_id ON public.parcels(org_id);
CREATE INDEX IF NOT EXISTS idx_parcels_driver_id ON public.parcels(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_parcels_vehicle_id ON public.parcels(assigned_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_parcels_org_driver_status ON public.parcels(org_id, assigned_driver_id, status);
CREATE INDEX IF NOT EXISTS idx_parcels_org_created_at ON public.parcels(org_id, created_at DESC);

-- Routes indexes
CREATE INDEX IF NOT EXISTS idx_routes_org_id ON public.routes(org_id);
CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON public.routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON public.routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_org_date ON public.routes(org_id, date);

-- Delivery Events indexes
CREATE INDEX IF NOT EXISTS idx_delivery_events_parcel_id ON public.delivery_events(parcel_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_org_id ON public.delivery_events(org_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_driver_id ON public.delivery_events(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_parcel_created ON public.delivery_events(parcel_id, created_at DESC);

-- ------------------------------------------------------------
-- 2. DB-02: DATA INTEGRITY & DOMAIN CONSTRAINTS
-- ------------------------------------------------------------

-- 2.1 Organizations: Non-negative wallet balance
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS chk_organizations_wallet_balance_positive,
  ADD CONSTRAINT chk_organizations_wallet_balance_positive CHECK (wallet_balance >= 0.00);

-- 2.2 Vehicles: Plate length validation & scoped uniqueness per organization
ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS chk_vehicles_plate_length,
  ADD CONSTRAINT chk_vehicles_plate_length CHECK (length(trim(registration_plate)) >= 2 AND length(registration_plate) <= 30);

ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS uq_vehicles_org_plate,
  ADD CONSTRAINT uq_vehicles_org_plate UNIQUE (org_id, registration_plate);

-- 2.3 Parcels: Non-negative weight and timestamp chronological sanity
ALTER TABLE public.parcels
  DROP CONSTRAINT IF EXISTS chk_parcels_weight_range,
  ADD CONSTRAINT chk_parcels_weight_range CHECK (weight_kg >= 0.00 AND weight_kg <= 10000.00);

ALTER TABLE public.parcels
  DROP CONSTRAINT IF EXISTS chk_parcels_delivery_time_order,
  ADD CONSTRAINT chk_parcels_delivery_time_order CHECK (delivered_at IS NULL OR delivered_at >= created_at);

-- 2.4 Routes: Tenant isolation trigger on UPDATE
CREATE OR REPLACE FUNCTION public.protect_route_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'Unauthorized: Route organization cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_route_tenant_isolation ON public.routes;
CREATE TRIGGER trg_protect_route_tenant_isolation
  BEFORE UPDATE ON public.routes
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_route_tenant_isolation();

-- 2.5 Delivery Events: Block direct UPDATE and DELETE to ensure audit immutability
CREATE POLICY "delivery_events_immutable_no_update" ON public.delivery_events
  FOR UPDATE USING (false);

CREATE POLICY "delivery_events_immutable_no_delete" ON public.delivery_events
  FOR DELETE USING (false);

-- ------------------------------------------------------------
-- 3. DB-06: AUTOMATED UPDATED_AT TIMESTAMP TRIGGERS
-- ------------------------------------------------------------

-- Universal updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 3.1 Organizations updated_at
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3.2 Profiles updated_at
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3.3 Vehicles updated_at
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3.4 Parcels updated_at
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_parcels_updated_at ON public.parcels;
CREATE TRIGGER trg_parcels_updated_at
  BEFORE UPDATE ON public.parcels
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3.5 Routes updated_at
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_routes_updated_at ON public.routes;
CREATE TRIGGER trg_routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
