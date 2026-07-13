// Phase 7.1 UPS 요금관리 보완: Agency 할인율 정책 + Zone별 할인율
// TASK-171 IMP-145 / TASK-B-086 Issue #310 (rate_overrides 폐기, Zone별 전환)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('IMP-145: UPS Agency Pricing Policy Integration Tests (TC-UPS-AGPOL-04, TASK-B-086)', () => {
  let supabase: SupabaseClient;
  let testAgencyOrgId: string;
  let testZoneId: string;

  beforeAll(async () => {
    if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in env');
    supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: org, error: orgError } = await supabase
      .from('zen_organizations')
      .insert({ name: 'TC-UPS-AGPOL Test Agency', type: 'AGENCY' })
      .select('id')
      .single();
    if (orgError) throw orgError;
    testAgencyOrgId = org.id;

    const { data: zone } = await supabase
      .from('zen_ups_zones')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();
    testZoneId = zone?.id;
  });

  afterAll(async () => {
    await supabase.from('zen_agency_pricing_policies').delete().eq('agency_org_id', testAgencyOrgId);
    await supabase.from('zen_organizations').delete().eq('id', testAgencyOrgId);
  });

  it('TC-UPS-AGPOL-04: SNTL 대조로 추가된 현지통관/기타 부가수수료 4종이 시드되어 있다', async () => {
    const codes = ['DUTY_AMOUNT', 'TARIFF_LINES_FEE', 'INTL_PROCESSING_FEE', 'DISBURSEMENT_FEE'];
    const { data, error } = await supabase
      .from('zen_ups_other_charges')
      .select('charge_code, fuel_surcharge_applicable')
      .in('charge_code', codes);

    expect(error).toBeNull();
    expect(data).toHaveLength(4);
    expect(data?.every((c) => c.fuel_surcharge_applicable === false)).toBe(true);
  });

  it('TC-UPS-AGPOL-06: Zone별 할인율 정책을 등록하고 조회할 수 있다 (Issue #310)', async () => {
    const discountRate = 0.15;
    const { error: insertError } = await supabase.from('zen_agency_pricing_policies').insert({
      agency_org_id: testAgencyOrgId,
      zone_id: testZoneId,
      discount_rate: discountRate,
      is_active: true,
    });
    expect(insertError).toBeNull();

    const { data, error: selectError } = await supabase
      .from('zen_agency_pricing_policies')
      .select('discount_rate, zone_id')
      .eq('agency_org_id', testAgencyOrgId)
      .eq('zone_id', testZoneId)
      .single();
    expect(selectError).toBeNull();
    expect(Number(data?.discount_rate)).toBeCloseTo(discountRate, 4);
    expect(data?.zone_id).toBe(testZoneId);
  });
});
