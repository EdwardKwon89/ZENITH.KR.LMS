import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const TEST_PASSWORD = 'password1234';

const ORG_IDS = {
  PLATFORM: '79bab7b4-fc0f-4da8-b1e2-441c1a467ef6'
};

async function seedE2E() {
  console.log('🚀 Seeding E2E Data...');

  // 1. Prepare Admin User
  const adminEmail = 'admin@zenith.kr';
  let { data: { users } } = await supabase.auth.admin.listUsers();
  let adminUser = users.find(u => u.email === adminEmail);

  if (!adminUser) {
    const { data: newData, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Platform Admin', role: 'ZENITH_SUPER_ADMIN' }
    });
    if (error) throw error;
    adminUser = newData.user!;
  }

  await supabase.auth.admin.updateUserById(adminUser.id, {
    app_metadata: { role: 'ZENITH_SUPER_ADMIN', status: 'ACTIVE', org_type: 'PLATFORM' }
  });

  await supabase.from('zen_profiles').upsert({
    id: adminUser.id,
    email: adminEmail,
    full_name: 'Platform Admin',
    role: 'ZENITH_SUPER_ADMIN',
    org_id: ORG_IDS.PLATFORM,
    status: 'ACTIVE'
  });

  // 2. Create E2E-04 Order
  const order04 = {
    id: '3ff5b116-29cd-4d90-8dd0-0e99c36a2155', // Existing ID from check_order_state.ts
    order_no: 'Z-HOU-E2E03-01',
    status: 'WAREHOUSED',
    order_type: 'B2C',
    transport_mode: 'AIR',
    cargo_details: { weight: 10, items: [{ name: 'Test Item', quantity: 1 }] }
  };

  await supabase.from('zen_orders').upsert(order04);
  console.log('Order E2E-03/04 seeded.');

  // 3. Create E2E-04 Tracking Config
  await supabase.from('zen_tracking_configs').upsert({
    order_id: order04.id,
    provider_type: 'API',
    tracking_number: 'TRK-E2E04-API-01',
    is_active: true,
    metadata: { carrier: 'ZENITH_EXPRESS' }
  });
  console.log('Tracking Config seeded.');

  // 4. Create E2E-05 Order
  const order05 = {
    id: 'd197352a-ba9f-4640-9176-c50c852d8138',
    order_no: 'Z-FIN-E2E05-01',
    status: 'MASTERED',
    order_type: 'B2B',
    transport_mode: 'AIR',
    cargo_details: { weight: 50, items: [{ name: 'Heavy Goods', quantity: 1 }] }
  };

  await supabase.from('zen_orders').upsert(order05);
  console.log('Order E2E-05 seeded.');

  console.log('✅ E2E Data Seeding Complete!');
}

seedE2E().catch(console.error);
