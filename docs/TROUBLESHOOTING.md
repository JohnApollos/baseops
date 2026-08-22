# BaseOps Troubleshooting & Common Issues Guide

This document captures real-world edge cases, troubleshooting scenarios, symptoms, root causes, and verified solutions encountered during BaseOps development and operations.

---

## 1. Docker & Local Supabase Stack Issues

### 1.1 Local Supabase Startup Hangs or Container Healthcheck Timeouts
- **Symptom**: `npx supabase start` stalls or fails with `timed out waiting for healthy container`.
- **Cause**: On Windows Docker Desktop, non-essential services (`storage-api`, `analytics`, `edge-runtime`) can experience slow I/O during startup.
- **Solution**: In `supabase/config.toml`, disable non-critical local services for faster, stable database startup:
  ```toml
  [storage]
  enabled = false

  [analytics]
  enabled = false

  [edge_runtime]
  enabled = false
  ```
- **Verification**: Run `npx supabase start` — stack starts in under 20 seconds.

### 1.2 Port Conflicts (`54321` or `54322` Already in Use)
- **Symptom**: `supabase start` errors with `bind: address already in use`.
- **Cause**: An existing PostgreSQL service, Docker container, or orphaned Supabase process is holding port 54321 or 54322.
- **Solution**:
  ```powershell
  # Stop running Supabase containers
  npx supabase stop
  # Verify port availability
  Get-NetTCPConnection -LocalPort 54322 -ErrorAction SilentlyContinue
  ```
- **Verification**: `npx supabase start` initializes without port collision.

---

## 2. PostgreSQL, RLS & Migration Issues

### 2.1 Circular Subquery Evaluation / RLS Infinite Recursion on Profiles
- **Symptom**: Queries against `public.profiles` hang or error with `infinite recursion detected in policy for relation "profiles"`.
- **Cause**: An RLS policy on `profiles` calling `public.get_user_org_id()` which internally queried `public.profiles` using `LANGUAGE sql`, allowing the PostgreSQL 17 query planner to inline the function recursively.
- **Solution**:
  1. Converted `get_user_org_id` and `get_user_role` to `PL/pgSQL` with `SECURITY DEFINER` and explicit `search_path = public, pg_temp` to prevent planner inlining.
  2. Streamlined the profile self-update policy to `USING (id = auth.uid()) WITH CHECK (id = auth.uid())` and delegated role/tenant immutability enforcement to `trg_protect_profile_role_and_org`.
- **Verification**: Execute `SELECT * FROM public.profiles;` as authenticated user — returns instantly with 0 recursion errors.

### 2.2 Migration Reset Check Constraint Failure (`chk_parcels_delivery_time_order`)
- **Symptom**: `supabase db reset` fails during `seed.sql` execution with `new row for relation "parcels" violates check constraint "chk_parcels_delivery_time_order"`.
- **Cause**: Synthetic seed rows inserted `delivered_at` timestamps earlier than `created_at = now()`.
- **Solution**: Updated `supabase/seed.sql` to explicitly supply `created_at` timestamps older than `delivered_at`.
- **Verification**: `npx supabase db reset` completes 100% cleanly without errors.

---

## 3. Windows & PowerShell Shell Quirk

### 3.1 `&&` Token Error in Windows PowerShell
- **Symptom**: Executing `git add . && git commit` in PowerShell fails with `The token '&&' is not a valid statement separator`.
- **Cause**: PowerShell 5.1 / 7.x handles chaining via semicolon (`;`) or requires PowerShell 7+ syntax.
- **Solution**: Use semicolon or separate lines:
  ```powershell
  git add . ; git commit -m "commit message" ; git push origin main
  ```

---

## 4. DBeaver Connection Issues

### 4.1 Connection Refused on `127.0.0.1:54322`
- **Symptom**: DBeaver displays `Connection to 127.0.0.1:54322 refused`.
- **Cause**: Local Supabase stack is stopped, or Docker is not running.
- **Solution**:
  1. Verify Docker Desktop is running (`docker info`).
  2. Run `npx supabase start`.
  3. Verify port `54322` is listening.
- **Verification**: Test Connection in DBeaver reports successful PostgreSQL connection.

---

## 5. Next.js & Client Sync Issues

### 5.1 Driver Offline Changes Not Appearing in Dispatch Center
- **Symptom**: Driver marked a parcel as delivered offline, but dispatch board still shows `in_transit`.
- **Cause**: Driver device has not yet re-established internet connectivity, or sync queue has not flushed.
- **Solution**:
  1. Ensure network connectivity is restored on driver device.
  2. The sync engine automatically listens for `window.addEventListener('online')` and triggers `flushQueue()`.
  3. Dispatch center subscribes to Supabase Realtime and updates automatically upon receiving PostgreSQL change events.
