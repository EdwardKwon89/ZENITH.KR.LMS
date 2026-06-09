import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  const { data: carrierRec } = await supabase
    .from('zen_carriers')
    .select('id')
    .eq('code', 'E2E20_CARRIER')
    .single();

  if (!carrierRec) {
    console.error('Carrier E2E20_CARRIER not found');
    return;
  }

  const { data: icnPort } = await supabase.from('zen_ports').select('id').eq('code', 'ICN').single();
  const { data: sinPort } = await supabase.from('zen_ports').select('id').eq('code', 'SIN').single();

  console.log('Inserting rate card for carrier:', carrierRec.id);
  const result = await supabase.from('zen_rate_cards').insert({
    carrier_id: carrierRec.id,
    transport_mode: 'AIR',
    origin_port_id: icnPort.id,
    dest_port_id: sinPort.id,
    transit_days: 1,
    tiers: [{ weight_min: 0, unit_price: 3.5, min_total_price: 50 }],
    carrier_cost: 2.0,
    margin_rate: 10.0,
    platform_fee_rate: 5.0,
    valid_from: '2026-06-01',
    valid_until: '2026-12-31',
    is_active: true
  });

  console.log('Result:', result);
}

check().catch(console.error);
