import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  console.log('--- Selecting from zen_rate_tiers ---');
  const { data: tiers, error: tierError } = await supabase.from('zen_rate_tiers').select('*').limit(5);
  console.log('Tiers count/error:', tierError || tiers?.length);
  console.log('Sample tiers:', tiers);

  console.log('--- Selecting from zen_rate_cards ---');
  const { data: cards, error: cardError } = await supabase.from('zen_rate_cards').select('*').limit(5);
  console.log('Cards count/error:', cardError || cards?.length);
  if (cards && cards.length > 0) {
    console.log('Sample card tiers field:', cards[0].tiers);
  }
}

check().catch(console.error);
