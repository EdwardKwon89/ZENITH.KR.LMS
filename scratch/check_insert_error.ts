import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  const { data: shipper } = await supabase
    .from('zen_organizations')
    .select('id')
    .eq('name', 'Global Shipper Corp')
    .single();

  const { data: carrier } = await supabase
    .from('zen_organizations')
    .select('id')
    .eq('name', 'Fast Carrier Ltd')
    .single();

  const { data: icnPort } = await supabase.from('zen_ports').select('id').eq('code', 'ICN').single();
  const { data: sinPort } = await supabase.from('zen_ports').select('id').eq('code', 'SIN').single();

  console.log('Inserting order...');
  const orderResult = await supabase
    .from('zen_orders')
    .insert({
      order_no: 'TC-POLICY-TEST-ERROR-2',
      shipper_id: shipper?.id,
      carrier_id: carrier?.id,
      origin_port_id: icnPort?.id,
      dest_port_id: sinPort?.id,
      transport_mode: 'AIR',
      cargo_details: { total_weight: 50, total_volume: 0.72 },
      status: 'REGISTERED'
    })
    .select()
    .single();

  console.log('Order Insert Result:', orderResult);
}

check().catch(console.error);
