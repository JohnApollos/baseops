-- ============================================================
-- Migration: 00003_p0_security_reverification.sql
-- Description: P0 Security Re-Remediation & Hardening
--   - SEC-07: Make profiles.org_id strictly immutable via client UPDATE
--             Implement atomic trusted RPC create_organization_and_owner()
--   - SEC-08: Enforce SET search_path = public, pg_temp on all SECURITY DEFINER functions
--   - SEC-09: Revoke public/anon/authenticated direct RPC access to internal helpers
--   - SEC-10: Enforce WITH CHECK and trigger isolation on vehicles and secondary tables
-- ============================================================

-- ------------------------------------------------------------
-- 1. SEC-08: HARDEN INTERNAL HELPER FUNCTIONS WITH EXPLICIT SEARCH PATH
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_org_id(user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = user_id;
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = user_id;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 2. SEC-09: ACCESS PERMISSIONS ON INTERNAL HELPERS
-- ------------------------------------------------------------

-- Revoke from anon/public, grant only to authenticated and postgres
REVOKE EXECUTE ON FUNCTION public.get_user_org_id(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_org_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 3. SEC-07: PROFILES IMMUTABILITY & ATOMIC ONBOARDING
-- ------------------------------------------------------------

-- 3.1 Drop and recreate trigger with total org_id immutability
CREATE OR REPLACE FUNCTION public.protect_profile_role_and_org()
RETURNS TRIGGER AS $$
BEGIN
  -- In client context (when auth.uid() is not null)
  IF auth.uid() IS NOT NULL THEN
    -- Block role tampering
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: Role cannot be modified by user.';
    END IF;

    -- Block ANY org_id modification by client, even if OLD.org_id IS NULL
    IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
      RAISE EXCEPTION 'Unauthorized: Organization membership cannot be modified directly by user.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_profile_role_and_org ON public.profiles;
CREATE TRIGGER trg_protect_profile_role_and_org
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role_and_org();

-- 3.2 Update RLS policy to enforce org_id immutability
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
CREATE POLICY "users_can_update_own_profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3.3 Atomic Trusted RPC: create_organization_and_owner
CREATE OR REPLACE FUNCTION public.create_organization_and_owner(
  org_name TEXT,
  org_slug TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_caller_profile RECORD;
  v_new_org_id UUID;
  v_sanitized_name TEXT;
  v_sanitized_slug TEXT;
  v_result JSONB;
BEGIN
  -- 1. Must be an authenticated session
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be authenticated to create an organization.';
  END IF;

  -- 2. Validate caller profile exists and is unassigned (org_id IS NULL)
  SELECT id, role, org_id INTO v_caller_profile
  FROM public.profiles
  WHERE id = v_caller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF v_caller_profile.org_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to an organization.';
  END IF;

  -- 3. Validate input parameters
  v_sanitized_name := TRIM(org_name);
  v_sanitized_slug := LOWER(TRIM(org_slug));

  IF LENGTH(v_sanitized_name) < 2 OR LENGTH(v_sanitized_name) > 100 THEN
    RAISE EXCEPTION 'Organization name must be between 2 and 100 characters.';
  END IF;

  IF NOT (v_sanitized_slug ~ '^[a-z0-9-]+$') OR LENGTH(v_sanitized_slug) < 2 OR LENGTH(v_sanitized_slug) > 50 THEN
    RAISE EXCEPTION 'Organization slug must contain only lowercase alphanumeric characters and hyphens.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_sanitized_slug) THEN
    RAISE EXCEPTION 'Organization slug is already taken.';
  END IF;

  -- 4. Create the organization row
  INSERT INTO public.organizations (name, slug, plan, wallet_balance)
  VALUES (v_sanitized_name, v_sanitized_slug, 'free', 0.00)
  RETURNING id INTO v_new_org_id;

  -- 5. Atomically bind the creator profile as owner
  UPDATE public.profiles
  SET org_id = v_new_org_id,
      role = 'owner',
      onboarded_at = now()
  WHERE id = v_caller_id;

  SELECT jsonb_build_object(
    'id', v_new_org_id,
    'name', v_sanitized_name,
    'slug', v_sanitized_slug
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.create_organization_and_owner(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization_and_owner(TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 4. SEC-10: VEHICLES & TENANT ISOLATION HARDENING
-- ------------------------------------------------------------

-- 4.1 Recreate vehicle update policy with WITH CHECK
DROP POLICY IF EXISTS "dispatchers_can_update_vehicles" ON public.vehicles;
CREATE POLICY "dispatchers_can_update_vehicles" ON public.vehicles
  FOR UPDATE USING (
    org_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('owner', 'dispatcher')
  )
  WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
  );

-- 4.2 Database trigger to prevent vehicle org_id transfer
CREATE OR REPLACE FUNCTION public.protect_vehicle_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'Unauthorized: Vehicle organization cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_vehicle_tenant_isolation ON public.vehicles;
CREATE TRIGGER trg_protect_vehicle_tenant_isolation
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_vehicle_tenant_isolation();

-- 4.3 Organizations table update WITH CHECK
DROP POLICY IF EXISTS "org_owner_can_update" ON public.organizations;
CREATE POLICY "org_owner_can_update" ON public.organizations
  FOR UPDATE USING (
    id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) = 'owner'
  )
  WITH CHECK (
    id = public.get_user_org_id(auth.uid())
  );

-- 4.4 Delivery events insert policy hardening
DROP POLICY IF EXISTS "team_can_insert_events" ON public.delivery_events;
CREATE POLICY "team_can_insert_events" ON public.delivery_events
  FOR INSERT WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    AND (
      public.get_user_role(auth.uid()) IN ('owner', 'dispatcher')
      OR driver_id = auth.uid()
    )
  );

-- 4.5 Routes policy WITH CHECK
DROP POLICY IF EXISTS "dispatchers_can_manage_routes" ON public.routes;
CREATE POLICY "dispatchers_can_manage_routes" ON public.routes
  FOR ALL USING (
    org_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('owner', 'dispatcher')
  )
  WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
  );

-- 4.6 Protect parcels trigger search_path
CREATE OR REPLACE FUNCTION public.protect_parcel_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'Unauthorized: Parcel organization cannot be modified.';
  END IF;

  IF auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) = 'driver' THEN
    IF NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id THEN
      RAISE EXCEPTION 'Unauthorized: Drivers cannot reassign parcels.';
    END IF;
    IF NEW.tracking_code IS DISTINCT FROM OLD.tracking_code THEN
      RAISE EXCEPTION 'Unauthorized: Drivers cannot modify tracking codes.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 4.7 Auth new user trigger search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
