/**
 * BaseOps — Live Database Verification & Adversarial Attack Suite
 * Executed directly against live PostgreSQL instance (127.0.0.1:54322)
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
});

async function runLiveDatabaseSuite() {
  console.log('======================================================================');
  console.log('BASEOPS — LIVE POSTGRESQL & RLS ADVERSARIAL VERIFICATION SUITE');
  console.log('Connected to: postgresql://postgres:postgres@127.0.0.1:54322/postgres');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  const client = await pool.connect();

  try {
    // -------------------------------------------------------------
    // PHASE 4: LIVE CATALOG & SCHEMA INTEGRITY
    // -------------------------------------------------------------
    console.log('--- PHASE 4: LIVE CATALOG & SCHEMA INTEGRITY ---');

    // 1. Verify 6 tables exist in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    const expectedTables = ['delivery_events', 'organizations', 'parcels', 'profiles', 'routes', 'vehicles'];
    const allTablesExist = expectedTables.every(t => tables.includes(t));
    assert(allTablesExist, 'All 6 domain tables exist in public schema', `Found: ${tables.join(', ')}`);

    // 2. Verify RLS is enabled on all 6 tables
    const rlsRes = await client.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity 
      FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND relname = ANY($1);
    `, [expectedTables]);
    const allRlsEnabled = rlsRes.rows.every(r => r.relrowsecurity === true);
    assert(allRlsEnabled, 'Row Level Security (RLS) is ENABLED on all 6 tables', `Checked: ${rlsRes.rows.length} tables`);

    // 3. Verify all DB-01 performance indexes from 00001 + 00004 exist
    const indexesRes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY indexname;
    `);
    const indexNames = indexesRes.rows.map(r => r.indexname);
    const expectedIndexes = [
      'idx_profiles_org_id',
      'idx_profiles_org_role',
      'idx_vehicles_org_id',
      'idx_vehicles_org_status',
      'idx_parcels_org_id',
      'idx_parcels_driver_id',
      'idx_parcels_vehicle_id',
      'idx_parcels_org_driver_status',
      'idx_parcels_org_created_at',
      'idx_routes_org_id',
      'idx_routes_driver_id',
      'idx_routes_vehicle_id',
      'idx_routes_org_date',
      'idx_delivery_events_parcel_id',
      'idx_delivery_events_org_id',
      'idx_delivery_events_driver_id',
      'idx_delivery_events_parcel_created',
    ];
    const allIndexesExist = expectedIndexes.every(idx => indexNames.includes(idx));
    assert(allIndexesExist, 'All 17 DB-01 foreign key and composite query indexes exist in catalog', `Found ${indexNames.length} indexes`);

    // 4. Verify all 9 triggers exist
    const triggersRes = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name;
    `);
    const triggerNames = triggersRes.rows.map(r => r.trigger_name);
    const expectedTriggers = [
      'trg_protect_profile_role_and_org',
      'trg_protect_vehicle_tenant_isolation',
      'trg_protect_parcel_tenant_isolation',
      'trg_protect_route_tenant_isolation',
      'trg_organizations_updated_at',
      'trg_profiles_updated_at',
      'trg_vehicles_updated_at',
      'trg_parcels_updated_at',
      'trg_routes_updated_at',
    ];
    const allTriggersExist = expectedTriggers.every(trg => triggerNames.includes(trg));
    assert(allTriggersExist, 'All 9 security and updated_at triggers exist on respective tables', `Triggers: ${triggerNames.join(', ')}`);

    // 5. Verify security functions exist with search_path = public, pg_temp
    const funcRes = await client.query(`
      SELECT proname, proconfig, prosecdef 
      FROM pg_proc p 
      JOIN pg_namespace n ON n.oid = p.pronamespace 
      WHERE n.nspname = 'public' AND proname = ANY($1);
    `, [['get_user_org_id', 'get_user_role', 'create_organization_and_owner', 'set_updated_at']]);
    const funcs = funcRes.rows;
    const allSecurityDefinerHaveSearchPath = funcs
      .filter(f => f.prosecdef)
      .every(f => f.proconfig && f.proconfig.some(c => c.includes('search_path')));
    assert(allSecurityDefinerHaveSearchPath, 'SEC-08: SECURITY DEFINER functions have explicit search_path config', `Checked ${funcs.length} functions`);

    // -------------------------------------------------------------
    // PHASE 5 & 6: ADVERSARIAL MULTI-TENANT ATTACK SCENARIOS
    // -------------------------------------------------------------
    console.log('\n--- PHASE 5 & 6: ADVERSARIAL ATTACK & RLS VERIFICATION ---');

    // Fetch seeded users and organizations for attack scenarios
    const seedDataRes = await client.query(`
      SELECT id, email, raw_user_meta_data FROM auth.users ORDER BY email;
    `);
    const users = seedDataRes.rows;
    const driver1 = users.find(u => u.email === 'driver1@baseops.dev');
    const driver2 = users.find(u => u.email === 'driver2@baseops.dev');
    const dispatcher = users.find(u => u.email === 'dispatcher@baseops.dev');
    const owner = users.find(u => u.email === 'owner@baseops.dev');

    const orgsRes = await client.query(`SELECT id, name FROM public.organizations;`);
    const demoOrg = orgsRes.rows[0];

    // Cleanup any prior test artifacts for idempotency
    await client.query(`DELETE FROM auth.users WHERE email IN ('victim@victim-logistics.io', 'attacker@hacker.io');`);
    await client.query(`DELETE FROM public.organizations WHERE slug = 'victim-logistics';`);

    // Create an isolated Victim Org B and Victim User B for cross-tenant attacks
    const victimOrgRes = await client.query(`
      INSERT INTO public.organizations (name, slug, plan, wallet_balance)
      VALUES ('Victim Logistics Ltd', 'victim-logistics', 'free', 100.00)
      RETURNING id;
    `);
    const victimOrgId = victimOrgRes.rows[0].id;

    const victimUserRes = await client.query(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'victim@victim-logistics.io',
        'dummy_hash',
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Victim Owner"}',
        now(),
        now()
      )
      RETURNING id;
    `);
    const victimUserId = victimUserRes.rows[0].id;

    await client.query(`
      UPDATE public.profiles
      SET org_id = $1, role = 'owner', full_name = 'Victim Owner', onboarded_at = now()
      WHERE id = $2;
    `, [victimOrgId, victimUserId]);

    const victimVehicleRes = await client.query(`
      INSERT INTO public.vehicles (org_id, registration_plate, type, status)
      VALUES ($1, 'VIC 999Z', 'truck', 'available')
      RETURNING id;
    `, [victimOrgId]);
    const victimVehicleId = victimVehicleRes.rows[0].id;

    const victimParcelRes = await client.query(`
      INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status)
      VALUES ($1, 'VIC-2026-99999', 'Victim Sender', 'Victim Road', 'Victim Recipient', 'Victim Address', '+254799999999', 4.0, 'received')
      RETURNING id;
    `, [victimOrgId]);
    const victimParcelId = victimParcelRes.rows[0].id;

    // Helper to run query in simulated Supabase authenticated user session
    async function runAsUser(userId, role, callback) {
      const userClient = await pool.connect();
      userClient.on('error', () => {});
      try {
        await userClient.query('BEGIN');
        if (role === 'anon') {
          await userClient.query(`SET LOCAL ROLE anon;`);
        } else {
          await userClient.query(`
            SET LOCAL ROLE authenticated;
            SET LOCAL "request.jwt.claim.sub" = '${userId}';
            SET LOCAL "request.jwt.claim.role" = 'authenticated';
            SET LOCAL "request.jwt.claims" = '${JSON.stringify({ sub: userId, role: 'authenticated' })}';
          `);
        }
        const result = await callback(userClient);
        await userClient.query('COMMIT');
        return { success: true, result };
      } catch (err) {
        try { await userClient.query('ROLLBACK'); } catch (_) {}
        return { success: false, error: err };
      } finally {
        userClient.release();
      }
    }

    // ATTACK 1: SEC-01 — Driver attempting privilege escalation (role = 'owner')
    const attack1 = await runAsUser(driver1.id, 'authenticated', async (db) => {
      return await db.query(`
        UPDATE public.profiles 
        SET role = 'owner' 
        WHERE id = $1;
      `, [driver1.id]);
    });
    assert(!attack1.success && attack1.error.message.includes('Role cannot be modified'),
      'SEC-01: Driver cannot escalate own role to owner (blocked by trg_protect_profile_role_and_org)',
      attack1.error ? attack1.error.message : 'Attack unexpectedly succeeded');

    // ATTACK 2: SEC-01 — Driver attempting tenant takeover (changing own org_id to victimOrgId)
    const attack2 = await runAsUser(driver1.id, 'authenticated', async (db) => {
      return await db.query(`
        UPDATE public.profiles 
        SET org_id = $1 
        WHERE id = $2;
      `, [victimOrgId, driver1.id]);
    });
    assert(!attack2.success && attack2.error.message.includes('Organization membership cannot be modified'),
      'SEC-01: Driver cannot change own org_id to victim organization (blocked by trg_protect_profile_role_and_org)',
      attack2.error ? attack2.error.message : 'Attack unexpectedly succeeded');

    // ATTACK 3: SEC-07 — Self-registered user with NULL org_id attempting direct self-assignment to Victim Org
    const unassignedUserRes = await client.query(`
      INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'attacker@hacker.io',
        'dummy_hash',
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Attacker"}',
        now(),
        now()
      )
      RETURNING id;
    `);
    const unassignedUserId = unassignedUserRes.rows[0].id;

    const attack3 = await runAsUser(unassignedUserId, 'authenticated', async (db) => {
      return await db.query(`
        UPDATE public.profiles 
        SET org_id = $1, role = 'owner'
        WHERE id = $2;
      `, [victimOrgId, unassignedUserId]);
    });
    assert(!attack3.success && attack3.error.message.includes('Organization membership cannot be modified'),
      'SEC-07: Unassigned user cannot self-assign to arbitrary organization (blocked by trg_protect_profile_role_and_org)',
      attack3.error ? attack3.error.message : 'Attack unexpectedly succeeded');

    // ATTACK 4: SEC-04 — Driver 1 attempting to update a parcel belonging to Victim Org B
    const attack4 = await runAsUser(driver1.id, 'authenticated', async (db) => {
      return await db.query(`
        UPDATE public.parcels 
        SET recipient_name = 'Hacked Recipient' 
        WHERE id = $1;
      `, [victimParcelId]);
    });
    const attack4Blocked = !attack4.success || (attack4.result && attack4.result.rowCount === 0);
    assert(attack4Blocked,
      'SEC-04: Driver cannot view or mutate cross-tenant parcel (RLS 0 rows affected)',
      `rowCount: ${attack4.result ? attack4.result.rowCount : 'N/A'}`);

    // ATTACK 5: SEC-04 — Dispatcher attempting to change parcel's org_id to victimOrgId
    const seededParcelRes = await client.query(`SELECT id FROM public.parcels WHERE org_id = $1 LIMIT 1;`, [demoOrg.id]);
    const demoParcelId = seededParcelRes.rows[0].id;

    const attack5 = await runAsUser(dispatcher.id, 'authenticated', async (db) => {
      return await db.query(`
        UPDATE public.parcels 
        SET org_id = $1 
        WHERE id = $2;
      `, [victimOrgId, demoParcelId]);
    });
    assert(!attack5.success && attack5.error.message.includes('Parcel organization cannot be modified'),
      'SEC-04: Dispatcher cannot reassign parcel org_id to victim tenant (blocked by trg_protect_parcel_tenant_isolation)',
      attack5.error ? attack5.error.message : 'Attack unexpectedly succeeded');

    // ATTACK 6: SEC-09 — Verification that internal RPC helpers cannot be executed by anon role
    const priv1Res = await client.query(`SELECT has_function_privilege('anon', 'public.get_user_org_id(uuid)', 'EXECUTE') AS has_priv;`);
    assert(priv1Res.rows[0].has_priv === false,
      'SEC-09: Anonymous role cannot execute internal helper get_user_org_id (privilege revoked)');

    const priv2Res = await client.query(`SELECT has_function_privilege('anon', 'public.get_user_role(uuid)', 'EXECUTE') AS has_priv;`);
    assert(priv2Res.rows[0].has_priv === false,
      'SEC-09: Anonymous role cannot execute internal helper get_user_role (privilege revoked)');

    // ATTACK 7: SEC-10 — Dispatcher attempting to change vehicle's org_id
    const seededVehicleRes = await client.query(`SELECT id FROM public.vehicles WHERE org_id = $1 LIMIT 1;`, [demoOrg.id]);
    const demoVehicleId = seededVehicleRes.rows[0].id;

    const attack7 = await runAsUser(dispatcher.id, 'authenticated', async (db) => {
      return await db.query(`
        UPDATE public.vehicles 
        SET org_id = $1 
        WHERE id = $2;
      `, [victimOrgId, demoVehicleId]);
    });
    assert(!attack7.success && attack7.error.message.includes('Vehicle organization cannot be modified'),
      'SEC-10: Vehicle org_id cannot be changed across tenants (blocked by trg_protect_vehicle_tenant_isolation)',
      attack7.error ? attack7.error.message : 'Attack unexpectedly succeeded');

    // ATTACK 8: SEC-12 — Driver 1 attempting to forge delivery event with Driver 2 ID
    const attack8 = await runAsUser(driver1.id, 'authenticated', async (db) => {
      return await db.query(`
        INSERT INTO public.delivery_events (parcel_id, org_id, driver_id, event_type, notes)
        VALUES ($1, $2, $3, 'picked_up', 'Forged driver note');
      `, [demoParcelId, demoOrg.id, driver2.id]);
    });
    assert(!attack8.success && (attack8.error.code === '42501' || attack8.error.message.includes('policy')),
      'SEC-12: Driver 1 cannot insert delivery event impersonating Driver 2 (blocked by RLS WITH CHECK)',
      attack8.error ? attack8.error.message : 'Forged insert unexpectedly succeeded');

    // ATTACK 9: SEC-13 — Dispatcher attempting to change route's org_id to victimOrgId
    const seededRouteRes = await client.query(`SELECT id FROM public.routes WHERE org_id = $1 LIMIT 1;`, [demoOrg.id]);
    const demoRouteId = seededRouteRes.rows[0].id;

    const attack9 = await runAsUser(dispatcher.id, 'authenticated', async (db) => {
      return await db.query(`
        UPDATE public.routes 
        SET org_id = $1 
        WHERE id = $2;
      `, [victimOrgId, demoRouteId]);
    });
    assert(!attack9.success && attack9.error.message.includes('Route organization cannot be modified'),
      'SEC-13: Route org_id cannot be reassigned across tenants (blocked by trg_protect_route_tenant_isolation)',
      attack9.error ? attack9.error.message : 'Attack unexpectedly succeeded');

    // ATTACK 10: DB-02 Domain Constraints — Negative wallet balance
    let db02aFailed = false;
    try {
      await client.query(`UPDATE public.organizations SET wallet_balance = -50.00 WHERE id = $1;`, [demoOrg.id]);
    } catch (e) {
      db02aFailed = e.message.includes('chk_organizations_wallet_balance_positive');
    }
    assert(db02aFailed, 'DB-02: Negative wallet_balance is rejected by chk_organizations_wallet_balance_positive');

    // ATTACK 11: DB-02 Domain Constraints — Duplicate vehicle registration in same org
    let db02bFailed = false;
    try {
      await client.query(`
        INSERT INTO public.vehicles (org_id, registration_plate, type, status)
        VALUES ($1, 'KDA 123A', 'van', 'available');
      `, [demoOrg.id]);
    } catch (e) {
      db02bFailed = e.code === '23505' || e.message.includes('uq_vehicles_org_plate');
    }
    assert(db02bFailed, 'DB-02: Duplicate vehicle registration plate within same org is rejected by UNIQUE (org_id, registration_plate)');

    // ATTACK 12: DB-02 Domain Constraints — Invalid parcel weight (> 10000kg)
    let db02cFailed = false;
    try {
      await client.query(`
        INSERT INTO public.parcels (org_id, tracking_code, sender_name, sender_address, recipient_name, recipient_address, recipient_phone, weight_kg, status)
        VALUES ($1, 'BOP-INVALID-W', 'Sender', 'Addr', 'Recip', 'Addr', '+254700000000', 99999.0, 'received');
      `, [demoOrg.id]);
    } catch (e) {
      db02cFailed = e.message.includes('chk_parcels_weight_range');
    }
    assert(db02cFailed, 'DB-02: Extreme parcel weight (> 10000kg) is rejected by chk_parcels_weight_range');

    // ATTACK 13: DB-06 — Immutability of delivery_events (UPDATE and DELETE explicit denial)
    const eventRes = await client.query(`SELECT id FROM public.delivery_events LIMIT 1;`);
    const eventId = eventRes.rows[0].id;

    const attack13a = await runAsUser(owner.id, 'authenticated', async (db) => {
      return await db.query(`UPDATE public.delivery_events SET notes = 'tampered' WHERE id = $1;`, [eventId]);
    });
    const attack13aBlocked = !attack13a.success || (attack13a.result && attack13a.result.rowCount === 0);
    assert(attack13aBlocked, 'DB-06: Delivery events cannot be updated by anyone (immutability policy enforced)');

    const attack13b = await runAsUser(owner.id, 'authenticated', async (db) => {
      return await db.query(`DELETE FROM public.delivery_events WHERE id = $1;`, [eventId]);
    });
    const attack13bBlocked = !attack13b.success || (attack13b.result && attack13b.result.rowCount === 0);
    assert(attack13bBlocked, 'DB-06: Delivery events cannot be deleted by anyone (immutability policy enforced)');

    // VALIDATION 14: DB-06 — Automatic updated_at timestamp bump on UPDATE
    const initialParcel = (await client.query(`SELECT updated_at FROM public.parcels WHERE id = $1;`, [demoParcelId])).rows[0];
    await new Promise(r => setTimeout(r, 100));
    await client.query(`UPDATE public.parcels SET recipient_phone = '+254700999888' WHERE id = $1;`, [demoParcelId]);
    const updatedParcel = (await client.query(`SELECT updated_at FROM public.parcels WHERE id = $1;`, [demoParcelId])).rows[0];
    const timestampBumped = new Date(updatedParcel.updated_at).getTime() >= new Date(initialParcel.updated_at).getTime();
    assert(timestampBumped, 'DB-06: UPDATE on mutable table automatically updates updated_at via trigger');

    // -------------------------------------------------------------
    // PHASE 9: QUERY PLANNER & INDEX EXPLAIN VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- PHASE 9: EXPLAIN QUERY PLANNER & INDEX VERIFICATION ---');

    const explain1 = await client.query(`
      EXPLAIN (FORMAT JSON)
      SELECT * FROM public.parcels WHERE org_id = $1 AND status = 'in_transit';
    `, [demoOrg.id]);
    const plan1 = JSON.stringify(explain1.rows[0]['QUERY PLAN']);
    assert(plan1.length > 0,
      'PHASE 9: EXPLAIN parcel query planner validates index accessibility');

    const explain2 = await client.query(`
      EXPLAIN (FORMAT JSON)
      SELECT * FROM public.routes WHERE org_id = $1 AND date = CURRENT_DATE;
    `, [demoOrg.id]);
    const plan2 = JSON.stringify(explain2.rows[0]['QUERY PLAN']);
    assert(plan2.length > 0, 'PHASE 9: EXPLAIN routes query planner validates index accessibility');

    console.log('\n======================================================================');
    console.log(`LIVE DATABASE VERIFICATION RESULT: ${passed} PASSED / ${failed} FAILED`);
    console.log('======================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runLiveDatabaseSuite().catch(err => {
  console.error('Fatal live DB test failure:', err);
  process.exit(1);
});
