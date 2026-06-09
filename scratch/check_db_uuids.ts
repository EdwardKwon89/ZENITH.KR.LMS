import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  const { data: profiles } = await supabase.from('zen_profiles').select('id, email, org_id, role, status');
  console.log('--- PROFILES ---');
  console.log(profiles);

  const { data: orders } = await supabase.from('zen_orders').select('id, shipper_id, order_no, status');
  console.log('--- ORDERS ---');
  console.log(orders);
}

check().catch(console.error);
