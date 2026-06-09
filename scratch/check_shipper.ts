import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  const { data: authUsersRes } = await supabase.auth.admin.listUsers();
  const shipperAuth = authUsersRes?.users.find(u => u.email === 'test_shipper_e2e20@zenith.kr');
  console.log('--- SHIPPER AUTH USER ---');
  console.log(JSON.stringify(shipperAuth, null, 2));

  if (shipperAuth) {
    const { data: profile } = await supabase.from('zen_profiles').select('*').eq('id', shipperAuth.id).single();
    console.log('--- SHIPPER PROFILE ---');
    console.log(profile);
  }
}

check().catch(console.error);
