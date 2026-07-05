// Phase 7.1 UPS 요금관리 보완: Agency 할인율 정책 + 원가 자동계산 트리거
// TASK-171 IMP-145 (R-09 회귀 테스트 신규 추가) — An-14 §3-1~§3-3·§3-7
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('IMP-145: UPS Agency Pricing Policy Integration Tests (TC-UPS-AGPOL-01~05)', () => {
  let supabase: SupabaseClient;
  let testAgencyOrgId: string;
  let testBaseRateId: string;
  let testBaseRateSellingPrice: number;

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

    const { data: rate, error: rateError } = await supabase
      .from('zen_ups_base_rates')
      .select('id, selling_price')
      .eq('is_active', true)
      .limit(1)
      .single();
    if (rateError) throw rateError;
    testBaseRateId = rate.id;
    testBaseRateSellingPrice = Number(rate.selling_price);
  });

  afterAll(async () => {
    await supabase.from('zen_agency_rate_overrides').delete().eq('agency_org_id', testAgencyOrgId);
    await supabase.from('zen_agency_other_charges').delete().eq('agency_org_id', testAgencyOrgId);
    await supabase.from('zen_agency_pricing_policies').delete().eq('agency_org_id', testAgencyOrgId);
    await supabase.from('zen_organizations').delete().eq('id', testAgencyOrgId);
  });

  it('TC-UPS-AGPOL-01: 할인율 정책이 없는 대리점은 요율 오버라이드 등록이 차단된다', async () => {
    const { error } = await supabase.from('zen_agency_rate_overrides').insert({
      agency_org_id: testAgencyOrgId,
      base_rate_id: testBaseRateId,
      selling_price: 99999,
      cost_price: 1,
      valid_from: '2026-07-05',
    });
    expect(error).not.toBeNull();
    expect(error?.message).toContain('할인율 정책');
  });

  it('TC-UPS-AGPOL-02: 할인율 정책 등록 후 cost_price가 (판매가 x (1-할인율))로 자동 계산된다', async () => {
    const discountRate = 0.1;
    const { error: policyError } = await supabase.from('zen_agency_pricing_policies').insert({
      agency_org_id: testAgencyOrgId,
      discount_rate: discountRate,
    });
    expect(policyError).toBeNull();

    const { data, error } = await supabase
      .from('zen_agency_rate_overrides')
      .insert({
        agency_org_id: testAgencyOrgId,
        base_rate_id: testBaseRateId,
        selling_price: testBaseRateSellingPrice + 5000,
        cost_price: 1, // Agency가 임의로 보낸 값 — 트리거가 무시하고 재계산해야 함
        valid_from: '2026-07-05',
      })
      .select('cost_price')
      .single();

    expect(error).toBeNull();
    const expectedCost = Math.round(testBaseRateSellingPrice * (1 - discountRate) * 100) / 100;
    expect(Number(data?.cost_price)).toBeCloseTo(expectedCost, 2);
    expect(Number(data?.cost_price)).not.toBe(1);
  });

  it('TC-UPS-AGPOL-03: cost_price 갱신 시에도 Agency가 보낸 값이 아닌 트리거 계산값이 적용된다', async () => {
    const { data, error } = await supabase
      .from('zen_agency_rate_overrides')
      .update({ cost_price: 777777 })
      .eq('agency_org_id', testAgencyOrgId)
      .eq('base_rate_id', testBaseRateId)
      .select('cost_price')
      .single();

    expect(error).toBeNull();
    expect(Number(data?.cost_price)).not.toBe(777777);
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

  it('TC-UPS-AGPOL-05: fn_get_ups_agency_selling_price가 등록된 override의 selling_price를 반환한다', async () => {
    const { data, error } = await supabase.rpc('fn_get_ups_agency_selling_price', {
      p_agency_org_id: testAgencyOrgId,
      p_base_rate_id: testBaseRateId,
    });

    expect(error).toBeNull();
    expect(Number(data)).toBe(testBaseRateSellingPrice + 5000);
  });
});
