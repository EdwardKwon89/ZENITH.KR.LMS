import { it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const testOrderId = '3ff5b116-29cd-4d90-8dd0-0e99c36a2155';
const testOrgId = '00000000-0000-0000-0000-000000000001';

it('seeds data for QA-02', async () => {
  // 1. Create Organization
  const { error: orgError } = await supabase.from('zen_organizations').upsert({
    id: testOrgId,
    name: 'QA Test Corp',
    business_no: '000-00-00000',
    type: 'SHIPPER',
    status: 'APPROVED' // Changed from ACTIVE to APPROVED based on typical logistics status
  });
  if (orgError) console.error('Org Seed Error:', orgError);

  // 2. Create Order
  const { error: orderError } = await supabase.from('zen_orders').upsert({
    id: testOrderId,
    order_no: 'QA-ORDER-001',
    shipper_id: testOrgId,
    status: 'REGISTERED',
    transport_mode: 'AIR',
    cargo_details: { description: 'Electronic Components', weight: 150, volume: 0.8 }
  });
  if (orderError) console.error('Order Seed Error:', orderError);

  // 3. Create Tracking Config
  const { error: configError } = await supabase.from('zen_tracking_configs').upsert({
    order_id: testOrderId,
    tracking_no: 'MOCK123456789',
    provider_type: 'API',
    provider_name: 'MockCarrier',
    is_active: true
  });
  if (configError) console.error('Config Seed Error:', configError);

  console.log('Seeding complete for Order:', testOrderId);
});
