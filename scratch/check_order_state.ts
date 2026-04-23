import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function checkOrder() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const testOrderId = '3ff5b116-29cd-4d90-8dd0-0e99c36a2155';

  console.log('--- Checking Order ---');
  const { data: order, error: orderError } = await supabase
    .from('zen_orders')
    .select('*')
    .eq('id', testOrderId)
    .single();
  
  if (orderError) {
    console.error('Order Error:', orderError);
  } else {
    console.log('Order found:', order.id, order.tracking_number);
  }

  console.log('--- Checking Tracking Config ---');
  const { data: config, error: configError } = await supabase
    .from('zen_tracking_configs')
    .select('*')
    .eq('order_id', testOrderId)
    .single();

  if (configError) {
    console.error('Config Error:', configError);
  } else {
    console.log('Config found:', config.id, config.provider_type);
  }

  console.log('--- Checking Tracking Raw Logs ---');
  const { data: logs, error: logsError } = await supabase
    .from('zen_tracking_raw_logs')
    .select('count')
    .eq('order_id', testOrderId);
  
  console.log('Raw Logs count:', logs?.length || 0);
}

checkOrder();
