# BaseOps Changelog & Engineering Evolution

All notable changes, security hardenings, architectural remediations, and forensic verifications in BaseOps are documented in this file.

---

## [0.1.0] - 2026-08-22 — Production Finalization & Complete Release Readiness

### Security & Database Hardening
- **SEC-01 / SEC-07**: Converted `get_user_org_id` and `get_user_role` to hardened `PL/pgSQL SECURITY DEFINER` functions with explicit `SET search_path = public, pg_temp` to eliminate PostgreSQL query planner RLS inlining recursion.
- **SEC-08**: Enforced `search_path = public, pg_temp` across all database functions and triggers.
- **SEC-09**: Revoked execution permissions on internal helper RPCs from `PUBLIC` and `anon` roles.
- **SEC-04 / SEC-10 / SEC-13**: Implemented immutable tenant isolation triggers (`trg_protect_parcel_tenant_isolation`, `trg_protect_vehicle_tenant_isolation`, `trg_protect_route_tenant_isolation`).
- **SEC-12**: Bound delivery audit trail inserts to `driver_id = auth.uid()` via RLS `WITH CHECK`.
- **SEC-14 / SEC-15**: Enforced permanent immutability on `public.delivery_events` via `USING (false)` for UPDATE and DELETE.
- **DB-01**: Deployed 17 multi-column and foreign key performance indexes.
- **DB-02**: Added domain check constraints for non-negative wallet balance, valid parcel weight range, delivery chronological order, and vehicle plate uniqueness within tenant.
- **DB-06**: Attached automated `updated_at` timestamp triggers across all mutable domain tables.

### Application & Client Engineering
- **Offline Sync**: Enhanced Dexie.js / IndexedDB sync engine with non-destructive server state reconciliation (`pullAssignedParcels`) and centralized logout cleanup (`clearLocalDatabase()`).
- **Executive Analytics**: Connected owner overview charts to live Supabase database queries with robust zero-state fallbacks.
- **Environment Management**: Authored production-grade `.env.example` template with strict client-safe vs. server-only secret classification.
- **Test Suite**: Created 23-assertion live PostgreSQL integration test harness (`tests/security/live-db-verification.test.js`) alongside 38 unit and contract tests (61 total).

### Documentation Suite
- Authored complete documentation master plan: `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `AUTHENTICATION.md`, `DEVELOPMENT.md`, `TESTING.md`, `DEPLOYMENT.md`, `ENVIRONMENT.md`, `DBeaver.md`, `TROUBLESHOOTING.md`, `API.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and `PRODUCTION_READINESS.md`.

---

## [0.0.4] - 2026-08-21 — P1 Database Architecture Hardening
- Added migration `00004_p1_database_architecture_hardening.sql`.
- Applied 17 performance indexes for query optimization and RLS evaluation speed.
- Added database-level check constraints and automated timestamp triggers.

---

## [0.0.3] - 2026-08-21 — P0 Security Reverification & PL/pgSQL Hardening
- Added migration `00003_p0_security_reverification.sql`.
- Fixed profile RLS recursion bug by migrating helper SQL functions to `PL/pgSQL`.
- Enforced profile role and organization immutability.
- Implemented `create_organization_and_owner` RPC for atomic onboarding.

---

## [0.0.2] - 2026-08-20 — P0 Security Remediation
- Added migration `00002_p0_security_remediation.sql`.
- Hardened parcel RLS policies to restrict drivers strictly to assigned workloads.
- Secured `/api/invite-team` route handler with server-side authentication and caller profile verification.

---

## [0.0.1] - 2026-08-19 — Initial Architecture
- Created Next.js 16 App Router scaffolding.
- Designed initial PostgreSQL schema (`00001_initial_schema.sql`).
- Built dispatch center, driver mobile PWA, owner portal, and Leaflet map integration.
