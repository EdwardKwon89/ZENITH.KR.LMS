import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const testOrderId = '3ff5b116-29cd-4d90-8dd0-0e99c36a2155';

import { describe, it } from 'vitest';

describe('DB Cleanup', () => {
  it('should cleanup duplicate configs', async () => {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`Checking configs for order: ${testOrderId}`);
    const { data, error } = await supabase
      .from('zen_tracking_configs')
      .select('*')
      .eq('order_id', testOrderId);
      
    if (error) {
      console.error('Error fetching configs:', error);
      return;
    }
    
    console.log(`Found ${data.length} configs.`);
    if (data.length > 1) {
      console.log('Multiple configs found. Deleting all and recreating one.');
      await supabase.from('zen_tracking_configs').delete().eq('order_id', testOrderId);
      
      const { error: insertError } = await supabase.from('zen_tracking_configs').insert({
        order_id: testOrderId,
        provider_type: 'API',
        provider_name: 'MockCarrier',
        tracking_no: 'TRK-MOCK-12345'
      });
      
      if (insertError) {
        console.error('Error recreating config:', insertError);
      } else {
        console.log('Successfully recreated single config.');
      }
    } else if (data.length === 0) {
      console.log('No config found. Creating one.');
      await supabase.from('zen_tracking_configs').insert({
        order_id: testOrderId,
        provider_type: 'API',
        provider_name: 'MockCarrier',
        tracking_no: 'TRK-MOCK-12345'
      });
    } else {
      console.log('Single config exists. Ready for test.');
    }
  });
});
