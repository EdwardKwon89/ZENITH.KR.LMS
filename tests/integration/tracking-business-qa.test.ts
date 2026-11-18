import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestOrg, getServiceClient } from './helpers/db';
import { trackingManager } from '../../src/lib/logistics/tracking';

// TASK-1161 / Issue #1347 — 파일럿 이전: 수동 .env.local 파싱과 고정 order ID를
// 공용 헬퍼(createTestOrg/getServiceClient)로 대체. 아래 it() 블록의 단언은 한 줄도 변경하지 않는다.
// 로컬 전용 가드가 원격 .env.local을 구조적으로 차단한다(Aiden 조건 ①).

describe('QA-02 Tracking Business Integration', () => {
  let supabase: any;
  let identity: Awaited<ReturnType<typeof createTestOrg>>;
  let testOrderId: string;

  beforeAll(async () => {
    console.log('[QA-02] Starting beforeAll setup...');
    supabase = getServiceClient();
    identity = await createTestOrg({ prefix: 'trk_qa' });
    testOrderId = randomUUID();

    // 헬퍼 정리에 등록 — trackingManager가 만든 이벤트·로그까지 역순으로 제거
    identity.addCleanup(async () => {
      await supabase.from('zen_tracking_raw_logs').delete().eq('order_id', testOrderId);
      await supabase.from('zen_tracking_events').delete().eq('order_id', testOrderId);
      await supabase.from('zen_tracking_configs').delete().eq('order_id', testOrderId);
    });

    // [Cleanup] ALWAYS delete and re-insert to guarantee single, clean configuration.
    // This prevents .single() failures from duplicate rows in any run scenario.
    const { error: delConfigError } = await supabase.from('zen_tracking_configs').delete().eq('order_id', testOrderId);
    const { error: delOrderError } = await supabase.from('zen_orders').delete().eq('id', testOrderId);
    
    console.log('[QA-02] Cleanup done:', { delConfigError, delOrderError });

    const { error: orderError } = await supabase
      .from('zen_orders')
      .insert({
        id: testOrderId,
        order_no: `TRK-QA-${identity.prefix.toUpperCase()}`,
        shipper_id: identity.orgId,
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
        tracking_no: `TRK-MOCK-${identity.prefix.toUpperCase()}`
      });

    if (insertError) {
      console.error('[QA-02] beforeAll config insert failed:', insertError.message);
    } else {
      console.log('[QA-02] Mock config inserted successfully');
    }
  });

  afterAll(async () => {
    await identity.cleanup();
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
