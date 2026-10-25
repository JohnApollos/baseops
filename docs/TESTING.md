# BaseOps Testing & Verification Guide

This document outlines the testing strategy, test suite architecture, and execution procedures for BaseOps.

---

## 1. Testing Strategy & Philosophy

BaseOps enforces a multi-tier testing strategy ensuring that security guarantees, financial settlement accuracy, and multi-tenant isolation are verified through independent, repeatable test harnesses.

```mermaid
graph TD
    subgraph TestPyramid ["BaseOps Test Pyramid (65 Total Tests)"]
        LiveDB["Live Database Adversarial Suite (live-db-verification.test.js) - 23 Tests"]
        SettlementTests["COD Settlement & Collision Suite (settlement-ledger.test.js) - 4 Tests"]
        RLSTests["Domain RLS Contract Tests (parcels, profiles, vehicles) - 23 Tests"]
        APITests["API & Route Handler Security Tests (invite-api.test.js) - 7 Tests"]
        OfflineTests["Offline Storage & Sync Tests (offline-storage.test.js) - 5 Tests"]
        SchemaTests["Catalog & Index Contract Tests (schema-integrity.test.js) - 3 Tests"]
    end
```

---

## 2. Test Suites Directory & Inventory

All test suites are located in `tests/security/`:

### 2.1 [`tests/security/live-db-verification.test.js`](../tests/security/live-db-verification.test.js) (23 Tests)
Direct live PostgreSQL client suite executed against `127.0.0.1:54322`:
- **Catalog Checks**: Verifies all 6 tables exist in `public`, RLS is enabled on all tables, composite indexes exist in catalog, triggers exist, and `SECURITY DEFINER` functions have explicit `search_path`.
- **Live Adversarial Attacks**: Executes simulated attacker queries with `SET LOCAL ROLE` and JWT claims (`SEC-01`, `SEC-04`, `SEC-07`, `SEC-09`, `SEC-10`, `SEC-12`, `SEC-13`).
- **Domain Constraints**: Verifies negative wallet balance rejection, duplicate plate rejection, extreme parcel weight rejection, and delivery event immutability.
- **Query Planner (EXPLAIN)**: Validates query planner index utilization for multi-tenant parcel and route queries.

### 2.2 [`tests/security/settlement-ledger.test.js`](../tests/security/settlement-ledger.test.js) (4 Tests)
- **COD Settlement Variance**: Validates expected vs. collected cash/M-Pesa variance calculation across mixed delivery batches.
- **State Collision Engine (INT-01 / ARCH-01)**: Verifies that replaying an offline delivery on a parcel cancelled on the server appends a collision audit event (`is_collision = true`) and transitions reconciliation status to `disputed`.
- **Manifest Ingestion (PRD-01)**: Verifies CSV manifest parsing, column normalization, and data validation.
- **Domain Bounds**: Verifies rejection of negative COD amounts or collected sums.

### 2.3 [`tests/security/invite-api.test.js`](../tests/security/invite-api.test.js) (7 Tests)
- Enforces authentication requirement on `/api/invite-team` (401 Unauthorized for anonymous requests).
- Enforces caller organization context.
- Rejects driver role attempting to invite members (403 Forbidden).
- Rejects dispatcher role attempting to invite owners (403 Forbidden).
- Rejects cross-tenant invitation attempts (403 Forbidden).
- Validates malformed email or role payloads (400 Bad Request).
- Allows owner inviting dispatcher and dispatcher inviting driver within own organization.

### 2.4 [`tests/security/offline-storage.test.js`](../tests/security/offline-storage.test.js) (5 Tests)
- Validates Dexie.js table schema definitions.
- Validates FIFO mutation deduplication and idempotency key merging (OFF-01).
- Tests optimistic local mutations and non-destructive server state reconciliation (OFF-02).
- Verifies centralized logout cleanup (`clearLocalDatabase()`) wiping customer PII and sync queues.
- Verifies session isolation preventing User A mutations from executing under User B session (SEC-11).

### 2.5 [`tests/security/parcels-rls.test.js`](../tests/security/parcels-rls.test.js) (10 Tests)
- Rejects cross-tenant parcel read/write.
- Restricts driver mutations exclusively to their assigned parcels.
- Rejects driver attempt to modify parcel `org_id` or reassign to another driver.
- Rejects driver parcel deletion while permitting dispatcher deletion.

### 2.6 [`tests/security/profiles-rls.test.js`](../tests/security/profiles-rls.test.js) (7 Tests)
- Rejects driver role escalation (`role = 'owner'`).
- Rejects driver tenant hijacking (`org_id = victimOrg`).
- Rejects unassigned user direct self-assignment to existing organizations (SEC-07).
- Verifies legitimate atomic onboarding through `create_organization_and_owner` RPC.

### 2.7 [`tests/security/vehicles-rls.test.js`](../tests/security/vehicles-rls.test.js) (6 Tests)
- Rejects vehicle cross-tenant transfer.
- Rejects driver attempt to alter vehicle status.
- Rejects public execution of internal helper RPC functions (`get_user_org_id`, `get_user_role`).

### 2.8 [`tests/security/schema-integrity.test.js`](../tests/security/schema-integrity.test.js) (3 Tests)
- Verifies full foreign key index coverage (DB-01).
- Verifies domain check constraint expressions (DB-02).
- Verifies automated `updated_at` trigger attachments (DB-06).

---

## 3. Running the Test Suites

```bash
# 1. Run all unit, security logic, and settlement engine test suites (42 tests)
npm test

# 2. Run the live PostgreSQL database integration suite (23 tests)
npm run test:live

# 3. Run complete test suite (65 tests total)
npm run test:all
```

---

## 4. TypeScript, Linting & Production Build Verification

To guarantee code quality and zero build regressions:

```bash
# Type-check entire TypeScript codebase
npx tsc --noEmit

# Run ESLint across application code
npm run lint

# Execute Next.js 16 production build & route pre-rendering
npm run build
```
