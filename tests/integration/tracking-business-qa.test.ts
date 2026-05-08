import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { trackingManager } from '../../src/lib/logistics/tracking';
import path from 'path';
import fs from 'fs';

// Manually parse .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.+)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe('QA-02 Tracking Business Integration', () => {
  let supabase: any;
  const testOrderId = '3ff5b116-29cd-4d90-8dd0-0e99c36a2155'; // Previously identified order

  beforeAll(async () => {
    console.log('[QA-02] Starting beforeAll setup...');
    supabase = createClient(supabaseUrl, supabaseKey);

    // [Cleanup] ALWAYS delete and re-insert to guarantee single, clean configuration.
    // This prevents .single() failures from duplicate rows in any run scenario.
    const { error: delConfigError } = await supabase.from('zen_tracking_configs').delete().eq('order_id', testOrderId);
    const { error: delOrderError } = await supabase.from('zen_orders').delete().eq('id', testOrderId);
    
    console.log('[QA-02] Cleanup done:', { delConfigError, delOrderError });

    const { error: orderError } = await supabase
      .from('zen_orders')
      .insert({
        id: testOrderId,
        order_no: 'TRK-QA-TEST-001',
        cargo_details: {},
        status: 'REGISTERED',
        transport_mode: 'AIR' // [Required] Added for rate matching engine
      });
      
    if (orderError) {
      console.error('[QA-02] Failed to insert mock order:', orderError.message);
    } else {
      console.log('[QA-02] Mock order inserted successfully');
    }

    const { error: insertError } = await supabase
      .from('zen_tracking_configs')
      .insert({
        order_id: testOrderId,
        provider_type: 'API',
        provider_name: 'MockCarrier',
        tracking_no: 'TRK-MOCK-12345'
      });

    if (insertError) {
      console.error('[QA-02] beforeAll config insert failed:', insertError.message);
    } else {
      console.log('[QA-02] Mock config inserted successfully');
    }
  });


  it('should preserve raw JSON logs in zen_tracking_raw_logs', async () => {
    // 1. Clear existing logs for this order to ensure clean test
    await supabase.from('zen_tracking_raw_logs').delete().eq('order_id', testOrderId);

    // 1.5 Verify config exists before sync
    const { data: configCheck, error: checkError } = await supabase
      .from('zen_tracking_configs')
      .select('*')
      .eq('order_id', testOrderId);
    console.log('[QA-02] Direct Config Check:', { count: configCheck?.length, checkError });

    // 2. Execute sync via TrackingManager
    // This will trigger MockCarrierProvider.track() which inserts the raw log
    await trackingManager.getTrackingData(supabase, testOrderId);

    // 3. Verify Raw Log Retention
    const { data: logs, error: logError } = await supabase
      .from('zen_tracking_raw_logs')
      .select('*')
      .eq('order_id', testOrderId)
      .order('created_at', { ascending: false });

    expect(logError).toBeNull();
    expect(logs).toBeDefined();
    expect(logs!.length).toBeGreaterThan(0);
    
    const latestLog = logs![0];
    expect(latestLog.provider_name).toBe('MockCarrier');
    expect(latestLog.raw_data).toBeDefined();
    expect(latestLog.raw_data.carrier).toBe('MOCK_EXPRESS');
    
    console.log(`[QA-02] Verified Raw Log: ${latestLog.id}`);
  });

  it('should maintain sync integrity without duplicating events', async () => {
    // 1. First sync
    await trackingManager.getTrackingData(supabase, testOrderId);
    const { data: events1 } = await supabase.from('zen_tracking_events').select('*').eq('order_id', testOrderId);

    // 2. Second sync (should not add duplicates)
    await trackingManager.getTrackingData(supabase, testOrderId);
    const { data: events2 } = await supabase.from('zen_tracking_events').select('*').eq('order_id', testOrderId);

    expect(events1!.length).toBe(events2!.length);
    console.log(`[QA-02] Verified Sync Integrity: No duplicates for ${testOrderId}`);
  });
});
