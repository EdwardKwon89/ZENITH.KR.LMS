import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  const shipperOrgId = 'dfc9127c-be76-4843-8fb0-8a53f5d19e7a';
  const carrierOrgId = '68942a57-daae-4754-95a0-4dc23ff64a28';

  const { data: icnPort } = await supabase.from('zen_ports').select('id').eq('code', 'ICN').single();
  const { data: sinPort } = await supabase.from('zen_ports').select('id').eq('code', 'SIN').single();

  console.log('Inserting order...');
  const orderResult = await supabase.from('zen_orders').insert({
    order_no: 'ZEN-2026-E2E20-04',
    shipper_id: shipperOrgId,
    carrier_id: carrierOrgId,
    status: 'REGISTERED',
    transport_mode: 'AIR',
    origin_port_id: icnPort.id,
    dest_port_id: sinPort.id,
    recipient_name: 'Visibility Test',
    recipient_address: '123 Test St',
    recipient_phone: '1234'
  }).select().single();

  console.log('Order Insert Result:', orderResult);
}

check().catch(console.error);
