import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  console.log('--- POLICIES FOR zen_orders ---');
  const { data: orderPolicies } = await supabase.rpc('get_policies_for_table', { table_name: 'zen_orders' });
  console.log(orderPolicies);

  // If RPC doesn't exist, query pg_policies directly via select
  const { data: pgPolicies } = await supabase.from('pg_policies').select('*').in('tablename', ['zen_orders', 'zen_order_services']);
  console.log('--- ALL POLICIES ---');
  console.log(pgPolicies);
}

check().catch(console.error);
