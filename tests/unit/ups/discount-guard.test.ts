import { describe, it, expect, vi } from 'vitest';
import { getMaxAllowedZoneDiscount } from '@/lib/ups/discount-guard';

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
