import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

/**
 * DB-01, DB-02, DB-06 Regression Suite: Schema Integrity & Index Coverage
 */
describe("DB-01, DB-02, DB-06: Schema Integrity, Domain Constraints & Indexes", () => {
  const migrationsDir = path.resolve("supabase/migrations");
  const migrationFiles = fs.readdirSync(migrationsDir).sort();
  const allSql = migrationFiles
    .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
    .join("\n");

  it("ENFORCES (DB-01): Index coverage for all foreign keys and RLS filters", () => {
    // Indexes on org_id across all tenant tables
    assert.match(allSql, /idx_profiles_org_id/i, "Missing idx_profiles_org_id");
    assert.match(allSql, /idx_vehicles_org_id/i, "Missing idx_vehicles_org_id");
    assert.match(allSql, /idx_parcels_org_id/i, "Missing idx_parcels_org_id");
    assert.match(allSql, /idx_routes_org_id/i, "Missing idx_routes_org_id");
    assert.match(allSql, /idx_delivery_events_org_id/i, "Missing idx_delivery_events_org_id");

    // Indexes on driver_id / vehicle_id
    assert.match(allSql, /idx_parcels_driver_id/i, "Missing idx_parcels_driver_id");
    assert.match(allSql, /idx_parcels_vehicle_id/i, "Missing idx_parcels_vehicle_id");
    assert.match(allSql, /idx_routes_driver_id/i, "Missing idx_routes_driver_id");
    assert.match(allSql, /idx_delivery_events_parcel_id/i, "Missing idx_delivery_events_parcel_id");
  });

  it("ENFORCES (DB-02): Data integrity domain CHECK constraints", () => {
    // Non-negative wallet balance
    assert.match(allSql, /chk_organizations_wallet_balance_positive/i);
    assert.match(allSql, /wallet_balance >= 0/i);

    // Vehicle plate length and scoped per-tenant uniqueness
    assert.match(allSql, /chk_vehicles_plate_length/i);
    assert.match(allSql, /uq_vehicles_org_plate/i);

    // Parcel weight and chronological timestamp checks
    assert.match(allSql, /chk_parcels_weight_range/i);
    assert.match(allSql, /chk_parcels_delivery_time_order/i);
  });

  it("ENFORCES (DB-06): Automated updated_at triggers and audit immutability", () => {
    assert.match(allSql, /set_updated_at/i);
    assert.match(allSql, /trg_organizations_updated_at/i);
    assert.match(allSql, /trg_profiles_updated_at/i);
    assert.match(allSql, /trg_vehicles_updated_at/i);
    assert.match(allSql, /trg_parcels_updated_at/i);
    assert.match(allSql, /trg_routes_updated_at/i);

    // Immutable delivery events policies
    assert.match(allSql, /delivery_events_immutable_no_update/i);
    assert.match(allSql, /delivery_events_immutable_no_delete/i);
  });
});
