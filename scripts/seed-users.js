const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error("Could not find .env.local file. Run this from within the baseops directory.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    envVars[key] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log("Starting user & operational seed process...");

  // 1. Fetch current auth users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }

  const emailsToSeed = ['owner@baseops.dev', 'dispatcher@baseops.dev', 'driver1@baseops.dev', 'driver2@baseops.dev'];
  
  // 2. Delete existing users to ensure clean state
  for (const user of users) {
    if (emailsToSeed.includes(user.email)) {
      console.log(`Deleting existing auth user: ${user.email}`);
      await supabase.auth.admin.deleteUser(user.id);
    }
  }

  // 3. Setup organization
  let orgId;
  const { data: orgs } = await supabase.from('organizations').select('id').eq('slug', 'quickship');
  if (orgs && orgs.length > 0) {
    orgId = orgs[0].id;
    console.log(`Found existing organization ID: ${orgId}`);
  } else {
    const { data: newOrg, error: orgErr } = await supabase.from('organizations').insert({
      name: 'QuickShip Logistics',
      slug: 'quickship',
      plan: 'pro',
      wallet_balance: 45000.00
    }).select().single();
    
    if (orgErr) {
      console.error("Error creating organization:", orgErr);
      return;
    }
    orgId = newOrg.id;
    console.log(`Created new organization ID: ${orgId}`);
  }

  // 4. Create auth accounts via Admin API
  const seedData = [
    {
      email: 'owner@baseops.dev',
      password: 'baseops123',
      fullName: 'Alex Mbugua',
      role: 'owner',
      phone: '+254700100100'
    },
    {
      email: 'dispatcher@baseops.dev',
      password: 'baseops123',
      fullName: 'Faith Wanjiku',
      role: 'dispatcher',
      phone: '+254700200200'
    },
    {
      email: 'driver1@baseops.dev',
      password: 'baseops123',
      fullName: 'James Ochieng',
      role: 'driver',
      phone: '+254700300300'
    },
    {
      email: 'driver2@baseops.dev',
      password: 'baseops123',
      fullName: 'Mary Akinyi',
      role: 'driver',
      phone: '+254700400400'
    }
  ];

  const createdUserIds = {};

  for (const item of seedData) {
    console.log(`Creating user: ${item.email}...`);
    const { data: { user }, error: createErr } = await supabase.auth.admin.createUser({
      email: item.email,
      password: item.password,
      email_confirm: true,
      user_metadata: {
        full_name: item.fullName,
        role: item.role
      }
    });

    if (createErr) {
      console.error(`Failed to create ${item.email}:`, createErr.message);
      continue;
    }

    createdUserIds[item.email] = user.id;
    console.log(`Created user: ${item.email} (ID: ${user.id})`);

    // Update profile
    const { error: profileErr } = await supabase.from('profiles').update({
      org_id: orgId,
      role: item.role,
      full_name: item.fullName,
      phone: item.phone,
      onboarded_at: new Date().toISOString()
    }).eq('id', user.id);

    if (profileErr) {
      console.error(`Failed to update profile for ${item.email}:`, profileErr.message);
    }
  }

  const driver1Id = createdUserIds['driver1@baseops.dev'];
  const driver2Id = createdUserIds['driver2@baseops.dev'];

  // 5. Clean up old records from operational tables
  console.log("Cleaning up old operational records...");
  await supabase.from('delivery_events').delete().eq('org_id', orgId);
  await supabase.from('routes').delete().eq('org_id', orgId);
  await supabase.from('parcels').delete().eq('org_id', orgId);
  await supabase.from('vehicles').delete().eq('org_id', orgId);

  // 6. Seed Fleet Vehicles
  console.log("Seeding fleet vehicles...");
  const { data: vehiclesData, error: vehErr } = await supabase.from('vehicles').insert([
    { org_id: orgId, registration_plate: 'KDA 123A', type: 'van', status: 'available' },
    { org_id: orgId, registration_plate: 'KDB 456B', type: 'motorcycle', status: 'on_route' },
    { org_id: orgId, registration_plate: 'KDC 789C', type: 'truck', status: 'maintenance' }
  ]).select();

  if (vehErr) {
    console.error("Error seeding vehicles:", vehErr.message);
    return;
  }

  const vehicle1Id = vehiclesData.find(v => v.registration_plate === 'KDA 123A').id;
  const vehicle2Id = vehiclesData.find(v => v.registration_plate === 'KDB 456B').id;

  // 7. Seed Parcels
  console.log("Seeding parcels...");
  const parcelsToInsert = [
    {
      org_id: orgId,
      tracking_code: 'BOP-2026-00001',
      sender_name: 'Jumia Kenya',
      sender_address: 'Mombasa Rd, Nairobi',
      recipient_name: 'Peter Kamau',
      recipient_address: 'Kilimani, Nairobi',
      recipient_phone: '+254711111111',
      weight_kg: 2.5,
      status: 'in_transit',
      assigned_driver_id: driver1Id,
      assigned_vehicle_id: vehicle1Id
    },
    {
      org_id: orgId,
      tracking_code: 'BOP-2026-00002',
      sender_name: 'Amazon KE',
      sender_address: 'Westlands, Nairobi',
      recipient_name: 'Grace Muthoni',
      recipient_address: 'Karen, Nairobi',
      recipient_phone: '+254722222222',
      weight_kg: 1.0,
      status: 'assigned',
      assigned_driver_id: driver2Id,
      assigned_vehicle_id: vehicle2Id
    },
    {
      org_id: orgId,
      tracking_code: 'BOP-2026-00003',
      sender_name: 'Masoko',
      sender_address: 'CBD, Nairobi',
      recipient_name: 'John Otieno',
      recipient_address: 'Langata, Nairobi',
      recipient_phone: '+254733333333',
      weight_kg: 5.0,
      status: 'received'
    },
    {
      org_id: orgId,
      tracking_code: 'BOP-2026-00004',
      sender_name: 'Glovo',
      sender_address: 'Lavington, Nairobi',
      recipient_name: 'Ann Wairimu',
      recipient_address: 'South B, Nairobi',
      recipient_phone: '+254744444444',
      weight_kg: 0.5,
      status: 'delivered',
      assigned_driver_id: driver1Id,
      assigned_vehicle_id: vehicle1Id,
      delivered_at: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
    },
    {
      org_id: orgId,
      tracking_code: 'BOP-2026-00005',
      sender_name: 'Sky Garden',
      sender_address: 'Kilimani, Nairobi',
      recipient_name: 'David Mwangi',
      recipient_address: 'Embakasi, Nairobi',
      recipient_phone: '+254755555555',
      weight_kg: 3.2,
      status: 'failed',
      assigned_driver_id: driver2Id,
      assigned_vehicle_id: vehicle2Id
    }
  ];

  const { data: parcelsData, error: parcErr } = await supabase.from('parcels').insert(parcelsToInsert).select();
  if (parcErr) {
    console.error("Error seeding parcels:", parcErr.message);
    return;
  }

  const parcel1Id = parcelsData.find(p => p.tracking_code === 'BOP-2026-00001').id;
  const parcel2Id = parcelsData.find(p => p.tracking_code === 'BOP-2026-00002').id;
  const parcel4Id = parcelsData.find(p => p.tracking_code === 'BOP-2026-00004').id;
  const parcel5Id = parcelsData.find(p => p.tracking_code === 'BOP-2026-00005').id;

  // 8. Seed Delivery Events
  console.log("Seeding delivery audit events...");
  const { error: evErr } = await supabase.from('delivery_events').insert([
    { parcel_id: parcel1Id, org_id: orgId, driver_id: driver1Id, event_type: 'picked_up', notes: 'Picked up from Mombasa Rd warehouse', coords: [-1.3044, 36.8264] },
    { parcel_id: parcel4Id, org_id: orgId, driver_id: driver1Id, event_type: 'picked_up', notes: 'Collected from Lavington hub', coords: [-1.2741, 36.7666] },
    { parcel_id: parcel4Id, org_id: orgId, driver_id: driver1Id, event_type: 'delivered', notes: 'Left with security at the gate', coords: [-1.3077, 36.8365] },
    { parcel_id: parcel5Id, org_id: orgId, driver_id: driver2Id, event_type: 'picked_up', notes: 'Picked up from Kilimani', coords: [-1.2921, 36.7831] },
    { parcel_id: parcel5Id, org_id: orgId, driver_id: driver2Id, event_type: 'attempted', notes: 'Recipient not available, gate locked', coords: [-1.3244, 36.8948] },
    { parcel_id: parcel5Id, org_id: orgId, driver_id: driver2Id, event_type: 'failed', notes: 'Failed delivery after 2 attempts', coords: [-1.3244, 36.8948] }
  ]);

  if (evErr) {
    console.error("Error seeding delivery events:", evErr.message);
  }

  // 9. Seed Routes
  console.log("Seeding routes...");
  const { error: routeErr } = await supabase.from('routes').insert([
    { org_id: orgId, driver_id: driver1Id, vehicle_id: vehicle1Id, date: new Date().toISOString().split('T')[0], status: 'active', parcel_ids: [parcel1Id, parcel4Id], start_coords: [-1.2921, 36.8219], end_coords: [-1.3077, 36.8365] },
    { org_id: orgId, driver_id: driver2Id, vehicle_id: vehicle2Id, date: new Date().toISOString().split('T')[0], status: 'completed', parcel_ids: [parcel2Id, parcel5Id], start_coords: [-1.2921, 36.7831], end_coords: [-1.3244, 36.8948] }
  ]);

  if (routeErr) {
    console.error("Error seeding routes:", routeErr.message);
  }

  console.log("Seeding completed successfully! All data is correctly aligned.");
}

main();
