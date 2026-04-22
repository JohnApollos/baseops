-- ============================================================
-- BaseOps — Initial Database Schema Migration
-- ============================================================
-- This migration creates all core tables and their RLS policies.
-- Every table is scoped to an organization (org_id) to enforce
-- multi-tenancy at the database level.
--
-- Run this migration in your Supabase SQL Editor or via the CLI:
--   supabase db push
--
-- Tables created:
--   1. organizations  — the tenant (a logistics company)
--   2. profiles        — user profiles scoped to an org
--   3. vehicles        — fleet vehicles
--   4. parcels         — the core operational unit
--   5. routes          — planned delivery routes
--   6. delivery_events — audit trail for every parcel status change
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
CREATE TABLE public.organizations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  plan       TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organizations IS 'A tenant — a logistics company using BaseOps.';

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Members of an org can read their own org
CREATE POLICY "org_members_can_read_own_org" ON public.organizations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Only the owner can update their org
CREATE POLICY "org_owner_can_update" ON public.organizations
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Authenticated users can insert (during onboarding)
CREATE POLICY "authenticated_can_create_org" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================================
-- 2. PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  role        TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'dispatcher', 'driver')),
  full_name   TEXT NOT NULL DEFAULT '',
  phone       TEXT,
  avatar_url  TEXT,
  onboarded_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users and scoped to an organization.';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_can_read_own_profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Users can read profiles in their org (for team management)
CREATE POLICY "org_members_can_read_team" ON public.profiles
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Users can update their own profile
CREATE POLICY "users_can_update_own_profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Authenticated users can insert their own profile (signup flow)
CREATE POLICY "users_can_insert_own_profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());


-- ============================================================
-- 3. VEHICLES
-- ============================================================
CREATE TABLE public.vehicles (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id             UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  registration_plate TEXT NOT NULL,
  type               TEXT NOT NULL DEFAULT 'van' CHECK (type IN ('motorcycle', 'van', 'truck')),
  status             TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_route', 'maintenance')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vehicles IS 'Vehicles in an organization fleet.';

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Org members can read their own vehicles
CREATE POLICY "org_members_can_read_vehicles" ON public.vehicles
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Owners and dispatchers can insert vehicles
CREATE POLICY "dispatchers_can_insert_vehicles" ON public.vehicles
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- Owners and dispatchers can update vehicles
CREATE POLICY "dispatchers_can_update_vehicles" ON public.vehicles
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- Only owners can delete vehicles
CREATE POLICY "owners_can_delete_vehicles" ON public.vehicles
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );


-- ============================================================
-- 4. PARCELS
-- ============================================================
CREATE TABLE public.parcels (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id             UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tracking_code      TEXT NOT NULL UNIQUE,
  sender_name        TEXT NOT NULL,
  sender_address     TEXT NOT NULL,
  recipient_name     TEXT NOT NULL,
  recipient_address  TEXT NOT NULL,
  recipient_phone    TEXT NOT NULL,
  weight_kg          NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  status             TEXT NOT NULL DEFAULT 'received'
                     CHECK (status IN ('received', 'assigned', 'in_transit', 'delivered', 'failed', 'returned')),
  assigned_driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at       TIMESTAMPTZ
);

COMMENT ON TABLE public.parcels IS 'The core operational unit — a parcel moving through the delivery lifecycle.';

ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's parcels
CREATE POLICY "org_members_can_read_parcels" ON public.parcels
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Dispatchers and owners can insert parcels
CREATE POLICY "dispatchers_can_insert_parcels" ON public.parcels
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );

-- Dispatchers, owners, and drivers can update parcels
-- (Drivers update status; dispatchers assign drivers)
CREATE POLICY "team_can_update_parcels" ON public.parcels
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  );


-- ============================================================
-- 5. ROUTES
-- ============================================================
CREATE TABLE public.routes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id   UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  status       TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  parcel_ids   UUID[] NOT NULL DEFAULT '{}',
  start_coords DOUBLE PRECISION[2],
  end_coords   DOUBLE PRECISION[2],
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.routes IS 'Planned or active delivery routes for a driver.';

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's routes
CREATE POLICY "org_members_can_read_routes" ON public.routes
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Dispatchers and owners can manage routes
CREATE POLICY "dispatchers_can_manage_routes" ON public.routes
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'dispatcher')
    )
  );


-- ============================================================
-- 6. DELIVERY EVENTS (Audit Trail)
-- ============================================================
CREATE TABLE public.delivery_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id   UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('picked_up', 'attempted', 'delivered', 'failed')),
  notes       TEXT,
  coords      DOUBLE PRECISION[2],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.delivery_events IS 'Immutable audit trail — every parcel status change is logged here.';

ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's events
CREATE POLICY "org_members_can_read_events" ON public.delivery_events
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Drivers and dispatchers can insert events
CREATE POLICY "team_can_insert_events" ON public.delivery_events
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  );


-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-generate tracking codes in the format BOP-YYYY-XXXXX
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_code TEXT;
BEGIN
  year_part := TO_CHAR(now(), 'YYYY');

  -- Count existing parcels for this org this year to generate sequence
  SELECT COUNT(*) + 1 INTO seq_num
  FROM public.parcels
  WHERE org_id = NEW.org_id
    AND tracking_code LIKE 'BOP-' || year_part || '-%';

  new_code := 'BOP-' || year_part || '-' || LPAD(seq_num::TEXT, 5, '0');

  -- Handle the rare case where this code already exists
  WHILE EXISTS (SELECT 1 FROM public.parcels WHERE tracking_code = new_code) LOOP
    seq_num := seq_num + 1;
    new_code := 'BOP-' || year_part || '-' || LPAD(seq_num::TEXT, 5, '0');
  END LOOP;

  NEW.tracking_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-assign tracking code when a parcel is inserted
-- Only fires if tracking_code is empty or null
CREATE TRIGGER trg_generate_tracking_code
  BEFORE INSERT ON public.parcels
  FOR EACH ROW
  WHEN (NEW.tracking_code IS NULL OR NEW.tracking_code = '')
  EXECUTE FUNCTION public.generate_tracking_code();


-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
-- This function is triggered by Supabase Auth whenever a new
-- user signs up. It creates a skeleton profile row so the
-- middleware can immediately redirect them to onboarding.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'owner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
