import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { describe, it } from 'vitest';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe('Check Schema', () => {
  it('should list columns of zen_tracking_configs', async () => {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Use an invalid query to trigger an error that might list columns or just select * and see
    const { data, error } = await supabase.from('zen_tracking_configs').select('*').limit(1);
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('No data found to check columns.');
    }
  });
});
