import { describe, it, expect, vi } from 'vitest';
import { getMaxAllowedZoneDiscount, validateAgencyReverseMargin } from '@/lib/ups/discount-guard';

function makeSingleQuery(resolved: { data: any; error?: any }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolved.data, error: resolved.error ?? null }),
  };
  return chain;
}

function makeQuery(resolved: { data: any; error?: any }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((onFulfilled: any) =>
      Promise.resolve({ data: resolved.data, error: resolved.error ?? null }).then(onFulfilled),
    ),
  };
  return chain;
}

const validProd = { product_id: 'prod-good', cost_price: 40000, selling_price: 50000 };
const badProd  = { product_id: 'prod-bad', cost_price: 200000, selling_price: 5000 };
const tier     = { product_id: 'prod-good', price_per_kg_cost: 4000, price_per_kg_selling: 5000 };
const freight  = { product_id: 'prod-good', min_charge_cost: 30000, min_charge_selling: 45000 };

describe('TC-UPS-DISCOUNT: getMaxAllowedZoneDiscount', () => {
  it('TC-UPS-DISCOUNT-01: productIds 필터 — 대상 상품만 마진 계산', async () => {
    const supabase = { from: vi.fn() } as any;
    supabase.from
      .mockReturnValueOnce(makeQuery({ data: [validProd] }))
      .mockReturnValueOnce(makeQuery({ data: [tier] }))
      .mockReturnValueOnce(makeQuery({ data: [freight] }));

    const result = await getMaxAllowedZoneDiscount(supabase, 'zone-001', ['prod-good']);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });

  it('TC-UPS-DISCOUNT-02: productIds 빈 배열 → 필터 미적용 (더미 상품 포함 전체 검사)', async () => {
    const supabase = { from: vi.fn() } as any;
    supabase.from
      .mockReturnValueOnce(makeQuery({ data: [badProd] }))
      .mockReturnValueOnce(makeQuery({ data: [] }))
      .mockReturnValueOnce(makeQuery({ data: [] }));

    const result = await getMaxAllowedZoneDiscount(supabase, 'zone-001', []);
    expect(result).toBe(0);
  });

  it('TC-UPS-DISCOUNT-03: productIds 미전달 — 전체 상품 검사 (하위 호환)', async () => {
    const supabase = { from: vi.fn() } as any;
    supabase.from
      .mockReturnValueOnce(makeQuery({ data: [validProd, badProd] }))
      .mockReturnValueOnce(makeQuery({ data: [tier] }))
      .mockReturnValueOnce(makeQuery({ data: [freight] }));

    const result = await getMaxAllowedZoneDiscount(supabase, 'zone-001');
    expect(result).not.toBeNull();
  });

  it('TC-UPS-DISCOUNT-04: in() 필터 호출 검증 (productIds 전달 시)', async () => {
    const supabase = { from: vi.fn() } as any;
    const q1 = makeQuery({ data: [] });
    const q2 = makeQuery({ data: [] });
    const q3 = makeQuery({ data: [] });
    supabase.from
      .mockReturnValueOnce(q1)
      .mockReturnValueOnce(q2)
      .mockReturnValueOnce(q3);

    await getMaxAllowedZoneDiscount(supabase, 'zone-001', ['prod-a', 'prod-b']);
    expect(q1.in).toHaveBeenCalledWith('product_id', ['prod-a', 'prod-b']);
    expect(q2.in).toHaveBeenCalledWith('product_id', ['prod-a', 'prod-b']);
    expect(q3.in).toHaveBeenCalledWith('product_id', ['prod-a', 'prod-b']);
  });
});

describe('TC-UPS-DISCOUNT: validateAgencyReverseMargin', () => {
  it('TC-UPS-DISCOUNT-05: shipper_rate <= agency_rate — 정상 통과 (null 반환)', async () => {
    const supabase = { from: vi.fn() } as any;
    supabase.from.mockReturnValueOnce(makeSingleQuery({ data: { discount_rate: 0.15 } }));

    const result = await validateAgencyReverseMargin(supabase, 'agency-001', 'zone-001', 0.1);
    expect(result).toBeNull();
  });

  it('TC-UPS-DISCOUNT-06: shipper_rate === agency_rate — 정상 통과 (null 반환)', async () => {
    const supabase = { from: vi.fn() } as any;
    supabase.from.mockReturnValueOnce(makeSingleQuery({ data: { discount_rate: 0.15 } }));

    const result = await validateAgencyReverseMargin(supabase, 'agency-001', 'zone-001', 0.15);
    expect(result).toBeNull();
  });

  it('TC-UPS-DISCOUNT-07: shipper_rate > agency_rate — 역마진 감지 (에러 메시지 반환)', async () => {
    const supabase = { from: vi.fn() } as any;
    supabase.from.mockReturnValueOnce(makeSingleQuery({ data: { discount_rate: 0.1 } }));

    const result = await validateAgencyReverseMargin(supabase, 'agency-001', 'zone-001', 0.2);
    expect(result).not.toBeNull();
    expect(result).toContain('초과');
    expect(result).toContain('20.0%');
    expect(result).toContain('10.0%');
  });

  it('TC-UPS-DISCOUNT-08: agency 정책 없음 (data=null) — null 반환 (통과)', async () => {
    const supabase = { from: vi.fn() } as any;
    supabase.from.mockReturnValueOnce(makeSingleQuery({ data: null }));

    const result = await validateAgencyReverseMargin(supabase, 'agency-001', 'zone-001', 0.5);
    expect(result).toBeNull();
  });

  it('TC-UPS-DISCOUNT-09: .eq() 호출 인자 검증 — agency_org_id, zone_id, is_active 순서 확인', async () => {
    const supabase = { from: vi.fn() } as any;
    const q = makeSingleQuery({ data: { discount_rate: 0.15 } });
    supabase.from.mockReturnValueOnce(q);

    await validateAgencyReverseMargin(supabase, 'agency-001', 'zone-001', 0.1);
    expect(supabase.from).toHaveBeenCalledWith('zen_agency_pricing_policies');
    expect(q.eq).toHaveBeenNthCalledWith(1, 'agency_org_id', 'agency-001');
    expect(q.eq).toHaveBeenNthCalledWith(2, 'zone_id', 'zone-001');
    expect(q.eq).toHaveBeenNthCalledWith(3, 'is_active', true);
  });
});
