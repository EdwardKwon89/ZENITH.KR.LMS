import { describe, it, expect, vi } from 'vitest';
import { applySchedule, expireSchedule } from '@/lib/ups/pricing-schedule-apply';

function makeUpsertingClient() {
  const calls: Array<{ table: string; method: string; data?: any; options?: any; filters?: any[] }> = [];

  function recorder(table: string) {
    const chain: any = {};
    const filters: any[] = [];
    const push = (method: string, data?: any, options?: any) => {
      calls.push({ table, method, data, options, filters });
    };
    chain.select = () => chain;
    chain.single = () => Promise.resolve({ data: null, error: null });
    chain.eq = (k: string, v: any) => { filters.push([k, v]); return chain; };
    chain.upsert = (data: any, options?: any) => { push('upsert', data, options); return Promise.resolve({ error: null }); };
    chain.update = (data: any) => { push('update', data); return chain; };
    chain.delete = () => { push('delete'); return chain; };
    chain.insert = (data: any) => { push('insert', data); return Promise.resolve({ error: null }); };
    chain.from = (t: string) => recorder(t);
    return chain;
  }

  const client: any = {};
  client.from = (t: string) => recorder(t);
  return { client, calls };
}

describe('TC-1021: pricing-schedule-apply 공용 모듈 (Issue #1021)', () => {
  it('TC-1021-04: applySchedule(AGENCY_DISCOUNT) → 정책 upsert + APPLIED 전환 + APPLY audit', async () => {
    const { client, calls } = makeUpsertingClient();

    await applySchedule(client, {
      id: 'sched-1',
      setting_type: 'AGENCY_DISCOUNT',
      target_ref: { agency_org_id: 'agency-1', zone_id: 'zone-1', cargo_type: 'ALL' },
      new_value: 0.25,
    });

    const upsert = calls.find(c => c.table === 'zen_agency_pricing_policies' && c.method === 'upsert');
    expect(upsert).toBeDefined();
    expect(upsert!.options).toEqual({ onConflict: 'agency_org_id,zone_id,cargo_type' });
    expect(upsert!.data).toMatchObject({
      agency_org_id: 'agency-1',
      zone_id: 'zone-1',
      discount_rate: 0.25,
      is_active: true,
    });

    const statusUpdate = calls.find(c => c.table === 'zen_ups_pricing_schedule' && c.method === 'update');
    expect(statusUpdate!.data).toEqual({ status: 'APPLIED' });
    expect(statusUpdate!.filters).toContainEqual(['id', 'sched-1']);

    const audit = calls.find(c => c.table === 'zen_ups_pricing_setting_audit_log' && c.method === 'insert');
    expect(audit!.data).toMatchObject({
      action: 'APPLY',
      new_data: { new_value: 0.25 },
      changed_by: null,
    });
  });

  it('TC-1021-05: applySchedule(VOLUMETRIC_DIVISOR) → zen_organizations 갱신', async () => {
    const { client, calls } = makeUpsertingClient();

    await applySchedule(client, {
      id: 'sched-2',
      setting_type: 'VOLUMETRIC_DIVISOR',
      target_ref: { agency_org_id: 'agency-1' },
      new_value: 5500,
    });

    const orgUpdate = calls.find(c => c.table === 'zen_organizations' && c.method === 'update');
    expect(orgUpdate!.data).toEqual({ volumetric_divisor: 5500 });
    expect(orgUpdate!.filters).toContainEqual(['id', 'agency-1']);

    const audit = calls.find(c => c.table === 'zen_ups_pricing_setting_audit_log' && c.method === 'insert');
    expect(audit!.data.action).toBe('APPLY');
  });

  it('TC-1021-06: expireSchedule(SHIPPER_DISCOUNT) → 할인율 삭제 + CANCELLED + EXPIRE audit', async () => {
    const { client, calls } = makeUpsertingClient();

    await expireSchedule(client, {
      id: 'sched-3',
      setting_type: 'SHIPPER_DISCOUNT',
      target_ref: { agency_org_id: 'agency-1', shipper_org_id: 'shipper-1', zone_id: 'zone-1', cargo_type: 'ALL' },
      valid_until: '2026-08-10',
    });

    const del = calls.find(c => c.table === 'zen_agency_shipper_zone_discounts' && c.method === 'delete');
    expect(del).toBeDefined();
    expect(del!.filters).toContainEqual(['shipper_org_id', 'shipper-1']);

    const statusUpdate = calls.find(c => c.table === 'zen_ups_pricing_schedule' && c.method === 'update');
    expect(statusUpdate!.data).toEqual({ status: 'CANCELLED' });

    const audit = calls.find(c => c.table === 'zen_ups_pricing_setting_audit_log' && c.method === 'insert');
    expect(audit!.data.action).toBe('EXPIRE');
  });
});
