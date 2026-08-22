-- ============================================================
-- Migration: 00002_p0_security_remediation.sql
-- Description: Remediate P0 Security Blockers
--   - SEC-01: Profile privilege escalation & organization takeover
--   - SEC-04: Parcel tenant isolation & driver update scoping
-- ============================================================

-- ------------------------------------------------------------
-- 1. SEC-01: PROFILE PROTECTION
-- ------------------------------------------------------------

-- Replace insecure UPDATE policy with a strict policy
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;

CREATE POLICY "users_can_update_own_profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND (
      (SELECT org_id FROM public.profiles WHERE id = auth.uid()) IS NULL
      OR org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Database-level trigger to strictly block role tampering and org_id hijacking
CREATE OR REPLACE FUNCTION public.protect_profile_role_and_org()
RETURNS TRIGGER AS $$
BEGIN
  -- If executed in an authenticated user context
  IF auth.uid() IS NOT NULL THEN
    -- Block role tampering by ordinary users
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: Role cannot be modified by user.';
    END IF;

    -- Block changing org_id once assigned (allow initial setting only during onboarding)
    IF OLD.org_id IS NOT NULL AND NEW.org_id IS DISTINCT FROM OLD.org_id THEN
      RAISE EXCEPTION 'Unauthorized: Organization membership cannot be modified by user.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role_and_org ON public.profiles;
CREATE TRIGGER trg_protect_profile_role_and_org
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role_and_org();


-- ------------------------------------------------------------
-- 2. SEC-04: PARCEL TENANT ISOLATION & DRIVER WORKLOAD SCOPING
-- ------------------------------------------------------------

-- Drop insecure team-wide UPDATE policy
DROP POLICY IF EXISTS "team_can_update_parcels" ON public.parcels;

-- 2.1 Dispatchers and Owners can update any parcel in their organization
CREATE POLICY "dispatchers_and_owners_can_update_parcels" ON public.parcels
  FOR UPDATE USING (
    org_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('owner', 'dispatcher')
  )
  WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
  );

-- 2.2 Drivers can ONLY update parcels assigned to them within their organization
CREATE POLICY "drivers_can_update_assigned_parcels" ON public.parcels
  FOR UPDATE USING (
    org_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) = 'driver'
    AND assigned_driver_id = auth.uid()
  )
  WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    AND assigned_driver_id = auth.uid()
  );

-- 2.3 Dispatchers and Owners can delete parcels in their organization
DROP POLICY IF EXISTS "owners_and_dispatchers_can_delete_parcels" ON public.parcels;
CREATE POLICY "owners_and_dispatchers_can_delete_parcels" ON public.parcels
  FOR DELETE USING (
    org_id = public.get_user_org_id(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('owner', 'dispatcher')
  );

-- 2.4 Database trigger to prevent parcel cross-tenant movement & driver overreach
CREATE OR REPLACE FUNCTION public.protect_parcel_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent modifying org_id on existing parcel
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'Unauthorized: Parcel organization cannot be modified.';
  END IF;

  -- Drivers cannot reassign parcel or change tracking code
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_parcel_tenant_isolation ON public.parcels;
CREATE TRIGGER trg_protect_parcel_tenant_isolation
  BEFORE UPDATE ON public.parcels
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_parcel_tenant_isolation();
