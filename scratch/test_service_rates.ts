import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  // Sign in as shipper
  const { data: signInRes, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'test_shipper_e2e20@zenith.kr',
    password: 'password1234'
  });

  if (signInErr) {
    console.error('Sign in failed:', signInErr);
    return;
  }

  const shipperClient = createClient(SUPABASE_URL, key, {
    global: {
      headers: {
        Authorization: `Bearer ${signInRes.session.access_token}`
      }
    }
  });

  // Query origin port
  const { data: originPort } = await shipperClient
    .from("zen_ports")
    .select("id, code")
    .eq("code", "ICN")
    .maybeSingle();

  const { data: destPort } = await shipperClient
    .from("zen_ports")
    .select("id, code")
    .eq("code", "SIN")
    .maybeSingle();

  console.log('Origin Port:', originPort);
  console.log('Dest Port:', destPort);

  // Query rate cards
  let rateQuery = shipperClient
    .from("zen_rate_cards")
    .select("id, carrier_id, transport_mode, tiers, currency, origin_port_id, dest_port_id, carrier:zen_carriers!carrier_id(name)")
    .eq("is_active", true)
    .eq("transport_mode", "AIR");

  if (originPort?.id) {
    rateQuery = rateQuery.eq("origin_port_id", originPort.id);
  }
  if (destPort?.id) {
    rateQuery = rateQuery.eq("dest_port_id", destPort.id);
  }

  const { data: transportRates, error: transportError } = await rateQuery;
  console.log('Transport Rates:', transportRates);
  console.log('Transport Error:', transportError);
}

check().catch(console.error);
