import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function debugTracking() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const testOrderId = '3ff5b116-29cd-4d90-8dd0-0e99c36a2155';

  console.log('--- Orders ---');
  const { data: orders } = await supabase.from('zen_orders').select('*').eq('id', testOrderId);
  console.log(JSON.stringify(orders, null, 2));

  console.log('--- Tracking Configs ---');
  const { data: configs } = await supabase.from('zen_tracking_configs').select('*').eq('order_id', testOrderId);
  console.log(JSON.stringify(configs, null, 2));
}

debugTracking();
