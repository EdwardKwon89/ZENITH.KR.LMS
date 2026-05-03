import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function seed() {
  console.log('Force Seeding...');
  const testOrderId = '3ff5b116-29cd-4d90-8dd0-0e99c36a2155';
  const orgId = '79bab7b4-fc0f-4da8-b1e2-441c1a467ef6';
  
  await supabase.from('zen_tracking_configs').delete().eq('order_id', testOrderId);
  await supabase.from('zen_orders').delete().eq('id', testOrderId);
  
  const { data: order, error: orderError } = await supabase.from('zen_orders').insert({
    id: testOrderId,
    order_no: 'Z-HOU-E2E03-01',
    status: 'PACKED',
    order_type: 'B2B',
    transport_mode: 'AIR',
    cargo_details: { weight: 10 },
    shipper_id: orgId
  }).select().single();
  
  if (orderError) {
    console.error('Order Insert Error:', orderError);
    return;
  }
  console.log('Order Inserted:', order.order_no);
  
  const { error: configError } = await supabase.from('zen_tracking_configs').insert({
    order_id: testOrderId,
    provider_type: 'API',
    tracking_no: 'TRK-E2E04-API-01',
    is_active: true
  });
  
  if (configError) console.error('Config Insert Error:', configError);
  else console.log('Config Inserted.');
}
seed();
