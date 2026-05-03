import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TEST_PASSWORD = 'password1234';

const ORG_IDS = {
  PLATFORM: '79bab7b4-fc0f-4da8-b1e2-441c1a467ef6',
  CARRIER: 'adb68722-1482-4d70-8ff5-c35b8fa6e7d1'
};

const usersToCreate = [
  { email: 'admin@zenith.kr', role: 'ADMIN', full_name: 'Platform Operator', org_id: ORG_IDS.PLATFORM },
  { email: 'super_admin@zenith.kr', role: 'ZENITH_SUPER_ADMIN', full_name: 'SUPUE Admin', org_id: ORG_IDS.PLATFORM },
  { email: 'corporate@zenith.kr', role: 'CORPORATE', full_name: 'Corporate User', org_id: null },
  { email: 'individual@zenith.kr', role: 'INDIVIDUAL', full_name: 'Individual User', org_id: null },
  { email: 'carrier@zenith.kr', role: 'CARRIER', full_name: 'Carrier User', org_id: ORG_IDS.CARRIER },
];

async function prepareUsers() {
  console.log('🚀 Starting E2E User Preparation...');

  for (const userData of usersToCreate) {
    console.log(`Checking user: ${userData.email}...`);
    
    // 1. Check if user exists in auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    let user = users.find(u => u.email === userData.email);

    if (!user) {
      console.log(`Creating user: ${userData.email}...`);
      const { data: newData, error: createError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: userData.full_name, role: userData.role }
      });

      if (createError) {
        console.error(`Failed to create user ${userData.email}:`, createError);
        continue;
      }
      user = newData.user;
      console.log(`User created: ${user.id}`);
    } else {
      console.log(`User ${userData.email} already exists. Updating password and metadata...`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: TEST_PASSWORD,
        user_metadata: { full_name: userData.full_name, role: userData.role },
        app_metadata: { 
          role: userData.role, 
          status: 'ACTIVE',
          org_type: userData.role === 'ADMIN' || userData.role === 'ZENITH_SUPER_ADMIN' ? 'PLATFORM' : (userData.role === 'CARRIER' ? 'CARRIER' : 'SHIPPER')
        }
      });
      if (updateError) console.error(`Failed to update user ${userData.email}:`, updateError);
    }

    // Also update app_metadata for newly created users
    if (user) {
      await supabase.auth.admin.updateUserById(user.id, {
        app_metadata: { 
          role: userData.role, 
          status: 'ACTIVE',
          org_type: userData.role === 'ADMIN' || userData.role === 'ZENITH_SUPER_ADMIN' ? 'PLATFORM' : (userData.role === 'CARRIER' ? 'CARRIER' : 'SHIPPER')
        }
      });
    }

    // 2. Sync with public.zen_profiles
    console.log(`Syncing profile for ${userData.email} (Role: ${userData.role})...`);
    const { error: profileError } = await supabase
      .from('zen_profiles')
      .upsert({
        id: user.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        org_id: userData.org_id,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error(`Failed to sync profile for ${userData.email}:`, profileError);
    } else {
      console.log(`Profile synced successfully for ${userData.email}`);
    }
  }

  console.log('✅ E2E User Preparation Complete!');
}

prepareUsers();
