import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  console.log('--- PORTS ---');
  const { data: ports } = await supabase.from('zen_ports').select('id, code, name');
  console.log(ports);

  console.log('--- CARRIERS ---');
  const { data: carriers } = await supabase.from('zen_carriers').select('id, code, name, org_id');
  console.log(carriers);

  console.log('--- RATE CARDS ---');
  const { data: rateCards } = await supabase.from('zen_rate_cards').select('id, carrier_id, transport_mode, origin_port_id, dest_port_id, is_active');
  console.log(rateCards);

  console.log('--- ORGANIZATIONS ---');
  const { data: orgs } = await supabase.from('zen_organizations').select('id, name, type');
  console.log(orgs);
}

check().catch(console.error);
