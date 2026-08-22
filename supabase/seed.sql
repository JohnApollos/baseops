-- ============================================================
-- BaseOps — Seed Data for Local Development
-- ============================================================
-- This seed file inserts mock auth accounts into auth.users
-- and then populates organizations, profiles, vehicles, and parcels.
-- ============================================================

-- 1. Seed auth.users with static UUIDs, password 'baseops123' (bcrypt hash),
-- and default GoTrue instance_id ('00000000-0000-0000-0000-000000000000').
INSERT INTO auth.users (
  id, 
  instance_id,
  email, 
  encrypted_password, 
  email_confirmed_at, 
  role, 
  raw_app_meta_data, 
  raw_user_meta_data, 
  aud, 
  created_at, 
  updated_at,
  is_sso_user
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001', 
    '00000000-0000-0000-0000-000000000000', 
    'owner@baseops.dev', 
    '$2a$10$Y1/n1m42/9hP2nE5cK2/r.yqE3k5cK2/rYq62aP8S0t.6w2fR0tS', 
    now(), 
    'authenticated', 
    '{"provider":"email","providers":["email"]}', 
    '{"full_name":"Alex Mbugua","role":"owner"}', 
    'authenticated', 
    now(), 
    now(),
    false
  ),
  (
    '00000000-0000-0000-0000-000000000002', 
    '00000000-0000-0000-0000-000000000000', 
    'dispatcher@baseops.dev', 
    '$2a$10$Y1/n1m42/9hP2nE5cK2/r.yqE3k5cK2/rYq62aP8S0t.6w2fR0tS', 
    now(), 
    'authenticated', 
    '{"provider":"email","providers":["email"]}', 
    '{"full_name":"Faith Wanjiku","role":"dispatcher"}', 
    'authenticated', 
    now(), 
    now(),
    false
  ),
  (
    '00000000-0000-0000-0000-000000000003', 
    '00000000-0000-0000-0000-000000000000', 
    'driver1@baseops.dev', 
    '$2a$10$Y1/n1m42/9hP2nE5cK2/r.yqE3k5cK2/rYq62aP8S0t.6w2fR0tS', 
    now(), 
    'authenticated', 
    '{"provider":"email","providers":["email"]}', 
    '{"full_name":"James Ochieng","role":"driver"}', 
    'authenticated', 
    now(), 
    now(),
    false
  ),
  (
    '00000000-0000-0000-0000-000000000004', 
    '00000000-0000-0000-0000-000000000000', 
    'driver2@baseops.dev', 
    '$2a$10$Y1/n1m42/9hP2nE5cK2/r.yqE3k5cK2/rYq62aP8S0t.6w2fR0tS', 
    now(), 
    'authenticated', 
    '{"provider":"email","providers":["email"]}', 
    '{"full_name":"Mary Akinyi","role":"driver"}', 
    'authenticated', 
    now(), 
    now(),
    false
  )
ON CONFLICT (id) DO UPDATE SET
  instance_id = EXCLUDED.instance_id,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at),
  is_sso_user = EXCLUDED.is_sso_user;

-- 3. Populate operational tables scoped to a demo organization
DO $$
DECLARE
  v_owner_id      UUID := '00000000-0000-0000-0000-000000000001';
  v_dispatcher_id UUID := '00000000-0000-0000-0000-000000000002';
  v_driver1_id    UUID := '00000000-0000-0000-0000-000000000003';
  v_driver2_id    UUID := '00000000-0000-0000-0000-000000000004';
  v_org_id        UUID;
  v_vehicle1_id   UUID;
  v_vehicle2_id   UUID;
  v_vehicle3_id   UUID;
  v_parcel1_id    UUID;
  v_parcel2_id    UUID;
  v_parcel3_id    UUID;
  v_parcel4_id    UUID;
  v_parcel5_id    UUID;
BEGIN

  -- ---- Organization ----
  -- Create or retrieve existing organization
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'quickship';
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug, plan, wallet_balance)
    VALUES ('QuickShip Logistics', 'quickship', 'pro', 45000.00)
    RETURNING id INTO v_org_id;
  END IF;

  -- ---- Profiles ----
  -- Update profiles auto-created by the trigger to link them to the organization
  UPDATE public.profiles 
  SET org_id = v_org_id, role = 'owner', full_name = 'Alex Mbugua', phone = '+254700100100', onboarded_at = now()
  WHERE id = v_owner_id;

  UPDATE public.profiles 
  SET org_id = v_org_id, role = 'dispatcher', full_name = 'Faith Wanjiku', phone = '+254700200200', onboarded_at = now()
  WHERE id = v_dispatcher_id;

  UPDATE public.profiles 
  SET org_id = v_org_id, role = 'driver', full_name = 'James Ochieng', phone = '+254700300300', onboarded_at = now()
  WHERE id = v_driver1_id;

  UPDATE public.profiles 
  SET org_id = v_org_id, role = 'driver', full_name = 'Mary Akinyi', phone = '+254700400400', onboarded_at = now()
  WHERE id = v_driver2_id;

  -- ---- Vehicles ----
  DELETE FROM public.vehicles WHERE org_id = v_org_id;
  INSERT INTO public.vehicles (org_id, registration_plate, type, status)
  VALUES (v_org_id, 'KDA 123A', 'van', 'available')
  RETURNING id INTO v_vehicle1_id;

  INSERT INTO public.vehicles (org_id, registration_plate, type, status)
  VALUES (v_org_id, 'KDB 456B', 'motorcycle', 'on_route')
  RETURNING id INTO v_vehicle2_id;

  INSERT INTO public.vehicles (org_id, registration_plate, type, status)
  VALUES (v_org_id, 'KDC 789C', 'truck', 'maintenance')
  RETURNING id INTO v_vehicle3_id;

  -- ---- Parcels ----
  DELETE FROM public.parcels WHERE org_id = v_org_id;
  
  INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status, assigned_driver_id, assigned_vehicle_id)
  VALUES (v_org_id, 'BOP-2026-00001', 'Jumia Kenya', 'Mombasa Rd, Nairobi', 'Peter Kamau', 'Kilimani, Nairobi', '+254711111111', 2.5, 'in_transit', v_driver1_id, v_vehicle1_id)
  RETURNING id INTO v_parcel1_id;

  INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status, assigned_driver_id, assigned_vehicle_id)
  VALUES (v_org_id, 'BOP-2026-00002', 'Amazon KE', 'Westlands, Nairobi', 'Grace Muthoni', 'Karen, Nairobi', '+254722222222', 1.0, 'assigned', v_driver2_id, v_vehicle2_id)
  RETURNING id INTO v_parcel2_id;

  INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status)
  VALUES (v_org_id, 'BOP-2026-00003', 'Masoko', 'CBD, Nairobi', 'John Otieno', 'Langata, Nairobi', '+254733333333', 5.0, 'received')
  RETURNING id INTO v_parcel3_id;

  INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status, assigned_driver_id, assigned_vehicle_id, created_at, delivered_at)
  VALUES (v_org_id, 'BOP-2026-00004', 'Glovo', 'Lavington, Nairobi', 'Ann Wairimu', 'South B, Nairobi', '+254744444444', 0.5, 'delivered', v_driver1_id, v_vehicle1_id, now() - interval '4 hours', now() - interval '2 hours')
  RETURNING id INTO v_parcel4_id;

  INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status, assigned_driver_id, assigned_vehicle_id)
  VALUES (v_org_id, 'BOP-2026-00005', 'Sky Garden', 'Kilimani, Nairobi', 'David Mwangi', 'Embakasi, Nairobi', '+254755555555', 3.2, 'failed', v_driver2_id, v_vehicle2_id)
  RETURNING id INTO v_parcel5_id;

  -- ---- Delivery Events (Audit Trail) ----
  DELETE FROM public.delivery_events WHERE org_id = v_org_id;
  
  INSERT INTO public.delivery_events (parcel_id, org_id, driver_id, event_type, notes, coords) VALUES
    (v_parcel1_id, v_org_id, v_driver1_id, 'picked_up', 'Picked up from Mombasa Rd warehouse', ARRAY[-1.3044, 36.8264]),
    (v_parcel4_id, v_org_id, v_driver1_id, 'picked_up', 'Collected from Lavington hub', ARRAY[-1.2741, 36.7666]),
    (v_parcel4_id, v_org_id, v_driver1_id, 'delivered', 'Left with security at the gate', ARRAY[-1.3077, 36.8365]),
    (v_parcel5_id, v_org_id, v_driver2_id, 'picked_up', 'Picked up from Kilimani', ARRAY[-1.2921, 36.7831]),
    (v_parcel5_id, v_org_id, v_driver2_id, 'attempted', 'Recipient not available, gate locked', ARRAY[-1.3244, 36.8948]),
    (v_parcel5_id, v_org_id, v_driver2_id, 'failed', 'Failed delivery after 2 attempts', ARRAY[-1.3244, 36.8948]);

  -- ---- Routes ----
  DELETE FROM public.routes WHERE org_id = v_org_id;
  
  INSERT INTO public.routes (org_id, driver_id, vehicle_id, date, status, parcel_ids, start_coords, end_coords) VALUES
    (v_org_id, v_driver1_id, v_vehicle1_id, CURRENT_DATE, 'active', ARRAY[v_parcel1_id, v_parcel4_id], ARRAY[-1.2921, 36.8219], ARRAY[-1.3077, 36.8365]),
    (v_org_id, v_driver2_id, v_vehicle2_id, CURRENT_DATE, 'completed', ARRAY[v_parcel2_id, v_parcel5_id], ARRAY[-1.2921, 36.7831], ARRAY[-1.3244, 36.8948]);

END $$;
