import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  console.log('--- Columns of zen_rate_cards ---');
  const { data: cols, error: colError } = await supabase.rpc('get_rate_cards_columns');
  if (colError) {
    // If RPC doesn't exist, we can use a raw SQL query or select a single row and print its keys
    const { data: rows, error: rowError } = await supabase.from('zen_rate_cards').select('*').limit(1);
    if (rowError) {
      console.error('Error selecting from zen_rate_cards:', rowError);
    } else if (rows && rows.length > 0) {
      console.log('Keys in a row:', Object.keys(rows[0]));
      console.log('Sample row:', JSON.stringify(rows[0], null, 2));
    } else {
      console.log('No rows in zen_rate_cards, trying to query information_schema via postgres functions? No RPC.');
    }
  } else {
    console.log(cols);
  }
}

check().catch(console.error);
