-- ============================================================
-- BaseOps — Seed Data for Local Development
-- ============================================================
-- This seed file creates a demo organization with dispatchers,
-- drivers, vehicles, parcels, and delivery events so anyone
-- who clones the repo can run it immediately with realistic data.
--
-- NOTE: This assumes you have created the following test users
-- in Supabase Auth (Dashboard > Authentication > Users):
--
--   1. owner@baseops.dev      (password: baseops123)
--   2. dispatcher@baseops.dev (password: baseops123)
--   3. driver1@baseops.dev    (password: baseops123)
--   4. driver2@baseops.dev    (password: baseops123)
--
-- After creating those users, copy their UUIDs into the
-- variables below.
-- ============================================================

-- Replace these with actual auth.users UUIDs after creating accounts
DO $$
DECLARE
  owner_id      UUID := '00000000-0000-0000-0000-000000000001'; -- Replace me
  dispatcher_id UUID := '00000000-0000-0000-0000-000000000002'; -- Replace me
  driver1_id    UUID := '00000000-0000-0000-0000-000000000003'; -- Replace me
  driver2_id    UUID := '00000000-0000-0000-0000-000000000004'; -- Replace me
  org_id        UUID;
  vehicle1_id   UUID;
  vehicle2_id   UUID;
  vehicle3_id   UUID;
  parcel1_id    UUID;
  parcel2_id    UUID;
  parcel3_id    UUID;
  parcel4_id    UUID;
  parcel5_id    UUID;
BEGIN

  -- ---- Organization ----
  INSERT INTO public.organizations (name, slug, plan, wallet_balance)
  VALUES ('QuickShip Logistics', 'quickship', 'pro', 5000.00)
  RETURNING id INTO org_id;

  -- ---- Profiles ----
  INSERT INTO public.profiles (id, org_id, role, full_name, phone, onboarded_at) VALUES
    (owner_id,      org_id, 'owner',      'Alex Mbugua',      '+254700100100', now()),
    (dispatcher_id, org_id, 'dispatcher', 'Faith Wanjiku',     '+254700200200', now()),
    (driver1_id,    org_id, 'driver',     'James Ochieng',     '+254700300300', now()),
    (driver2_id,    org_id, 'driver',     'Mary Akinyi',       '+254700400400', now());

  -- ---- Vehicles ----
  INSERT INTO public.vehicles (org_id, registration_plate, type, status)
  VALUES (org_id, 'KDA 123A', 'van', 'available')
  RETURNING id INTO vehicle1_id;

  INSERT INTO public.vehicles (org_id, registration_plate, type, status)
  VALUES (org_id, 'KDB 456B', 'motorcycle', 'on_route')
  RETURNING id INTO vehicle2_id;

  INSERT INTO public.vehicles (org_id, registration_plate, type, status)
  VALUES (org_id, 'KDC 789C', 'truck', 'maintenance')
  RETURNING id INTO vehicle3_id;

  -- ---- Parcels ----
  INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status, assigned_driver_id, assigned_vehicle_id)
  VALUES (org_id, 'BOP-2025-00001', 'Jumia Kenya', 'Mombasa Rd, Nairobi', 'Peter Kamau', 'Kilimani, Nairobi', '+254711111111', 2.5, 'in_transit', driver1_id, vehicle1_id)
  RETURNING id INTO parcel1_id;

  INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status, assigned_driver_id, assigned_vehicle_id)
  VALUES (org_id, 'BOP-2025-00002', 'Amazon KE', 'Westlands, Nairobi', 'Grace Muthoni', 'Karen, Nairobi', '+254722222222', 1.0, 'assigned', driver2_id, vehicle2_id)
  RETURNING id INTO parcel2_id;

  INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status)
  VALUES (org_id, 'BOP-2025-00003', 'Masoko', 'CBD, Nairobi', 'John Otieno', 'Langata, Nairobi', '+254733333333', 5.0, 'received')
  RETURNING id INTO parcel3_id;

  INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status, assigned_driver_id, assigned_vehicle_id, delivered_at)
  VALUES (org_id, 'BOP-2025-00004', 'Glovo', 'Lavington, Nairobi', 'Ann Wairimu', 'South B, Nairobi', '+254744444444', 0.5, 'delivered', driver1_id, vehicle1_id, now() - interval '2 hours')
  RETURNING id INTO parcel4_id;

  INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status, assigned_driver_id, assigned_vehicle_id)
  VALUES (org_id, 'BOP-2025-00005', 'Sky Garden', 'Kilimani, Nairobi', 'David Mwangi', 'Embakasi, Nairobi', '+254755555555', 3.2, 'failed', driver2_id, vehicle2_id)
  RETURNING id INTO parcel5_id;

  -- ---- Delivery Events (Audit Trail) ----
  INSERT INTO public.delivery_events (parcel_id, org_id, driver_id, event_type, notes, coords) VALUES
    (parcel1_id, org_id, driver1_id, 'picked_up', 'Picked up from Mombasa Rd warehouse', ARRAY[-1.3044, 36.8264]),
    (parcel4_id, org_id, driver1_id, 'picked_up', 'Collected from Lavington hub', ARRAY[-1.2741, 36.7666]),
    (parcel4_id, org_id, driver1_id, 'delivered', 'Left with security at the gate', ARRAY[-1.3077, 36.8365]),
    (parcel5_id, org_id, driver2_id, 'picked_up', 'Picked up from Kilimani', ARRAY[-1.2921, 36.7831]),
    (parcel5_id, org_id, driver2_id, 'attempted', 'Recipient not available, gate locked', ARRAY[-1.3244, 36.8948]),
    (parcel5_id, org_id, driver2_id, 'failed', 'Failed delivery after 2 attempts', ARRAY[-1.3244, 36.8948]);

  -- ---- Routes ----
  INSERT INTO public.routes (org_id, driver_id, vehicle_id, date, status, parcel_ids, start_coords, end_coords) VALUES
    (org_id, driver1_id, vehicle1_id, CURRENT_DATE, 'active', ARRAY[parcel1_id, parcel4_id], ARRAY[-1.2921, 36.8219], ARRAY[-1.3077, 36.8365]),
    (org_id, driver2_id, vehicle2_id, CURRENT_DATE, 'completed', ARRAY[parcel2_id, parcel5_id], ARRAY[-1.2921, 36.7831], ARRAY[-1.3244, 36.8948]);

END $$;
