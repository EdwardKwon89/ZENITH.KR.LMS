import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrderRateSnapshot } from '@/app/actions/operations/tisa';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: vi.fn(), checkPermission: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { checkPermission } from '@/lib/auth/guards';

function makeQuery() {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };
  return chain;
}

describe('TC-TISA: getOrderRateSnapshot', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn(() => makeQuery()), rpc: vi.fn() };

    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-001', role: 'ADMIN' },
      profile: { id: 'user-001', role: 'ADMIN', org_id: 'org-001' },
      supabase: mockSupabase,
    });
    (checkPermission as any).mockReturnValue(true);
  });

  it('TC-TISA-01: metadata 포함된 스냅샷 조회 시 metadata 필드 반환', async () => {
    const metadata = { platform: { totalSellingPrice: 526236.81, breakdown: { baseFreight: 500000 } } };
    // getOrderRateSnapshot calls from() 3 times: snapshot, rateCard, weight
    const qSnap = makeQuery();
    qSnap.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'snap-001', rate_card_id: 'rc-001', applied_unit_price: 50000,
        applied_currency: 'KRW', applied_rule: 'AUTO', snapshot_at: '2026-07-01T00:00:00Z',
        is_manual: false, override_reason: null, carrier_cost_amount: null,
        platform_fee_amount: null, metadata,
      },
      error: null,
    });
    const qRate = makeQuery();
    qRate.maybeSingle.mockResolvedValueOnce({
      data: { valid_from: '2026-01-01T00:00:00Z', valid_until: null },
      error: null,
    });
    const qWeight = makeQuery();
    qWeight.eq.mockReturnValueOnce(Promise.resolve({
      data: [{ gross_weight: 10 }], error: null,
    }));

    mockSupabase.from
      .mockReturnValueOnce(qSnap)
      .mockReturnValueOnce(qRate)
      .mockReturnValueOnce(qWeight);

    const result = await getOrderRateSnapshot('order-001');
    expect(result).not.toBeNull();
    expect(result!.metadata).toEqual(metadata);
    expect(result!.totalFreight).toBe(500000);
  });

  it('TC-TISA-02: metadata null인 스냅샷 — undefined 반환 (에러 없음)', async () => {
    const qSnap = makeQuery();
    qSnap.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'snap-002', rate_card_id: 'rc-001', applied_unit_price: 30000,
        applied_currency: 'KRW', applied_rule: 'AUTO', snapshot_at: '2026-07-01T00:00:00Z',
        is_manual: false, override_reason: null, carrier_cost_amount: null,
        platform_fee_amount: null, metadata: null,
      },
      error: null,
    });
    const qRate = makeQuery();
    qRate.maybeSingle.mockResolvedValueOnce({
      data: { valid_from: '2026-01-01T00:00:00Z', valid_until: null },
      error: null,
    });
    const qWeight = makeQuery();
    qWeight.eq.mockReturnValueOnce(Promise.resolve({
      data: [{ gross_weight: 5 }], error: null,
    }));

    mockSupabase.from
      .mockReturnValueOnce(qSnap)
      .mockReturnValueOnce(qRate)
      .mockReturnValueOnce(qWeight);

    const result = await getOrderRateSnapshot('order-002');
    expect(result).not.toBeNull();
    expect(result!.metadata).toBeUndefined();
  });

  it('TC-TISA-03: 스냅샷 없음 — null 반환', async () => {
    const qSnap = makeQuery();
    qSnap.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const qRoute = makeQuery();
    qRoute.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    mockSupabase.from
      .mockReturnValueOnce(qSnap)
      .mockReturnValueOnce(qRoute);

    const result = await getOrderRateSnapshot('order-003');
    expect(result).toBeNull();
  });

  it('TC-TISA-04: select 쿼리에 metadata 컬럼 포함 확인', async () => {
    const qSnap = makeQuery();
    qSnap.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'snap-004', rate_card_id: 'rc-001', applied_unit_price: 100,
        applied_currency: 'USD', applied_rule: 'AUTO', snapshot_at: '2026-07-01T00:00:00Z',
        is_manual: false, override_reason: null, carrier_cost_amount: null,
        platform_fee_amount: null, metadata: { test: true },
      },
      error: null,
    });
    const qRate = makeQuery();
    qRate.maybeSingle.mockResolvedValueOnce({
      data: { valid_from: '2026-01-01T00:00:00Z', valid_until: null },
      error: null,
    });
    const qWeight = makeQuery();
    qWeight.eq.mockReturnValueOnce(Promise.resolve({
      data: [{ gross_weight: 1 }], error: null,
    }));

    mockSupabase.from
      .mockReturnValueOnce(qSnap)
      .mockReturnValueOnce(qRate)
      .mockReturnValueOnce(qWeight);

    await getOrderRateSnapshot('order-004');
    const selectArg = qSnap.select.mock.calls[0][0];
    expect(selectArg).toContain('metadata');
  });
});
