// TASK-B-364 (Issue #1374): A(청구확정)·B(원가 폼) 경로 동일 결과 + KRW/기타부가운임 저장 검증
import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: { upsert: any[]; update: any[]; otherInsert: any[][]; otherDelete: number } = {
  upsert: [],
  update: [],
  otherInsert: [],
  otherDelete: 0,
};

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn().mockResolvedValue({
    supabase: null,
    user: { id: 'user-1' },
    profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
  }),
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));
vi.mock('@/lib/finance/exchange-rate', () => ({
  getExchangeRate: vi.fn(async (from: string) => (from === 'HKD' ? 150 : from === 'USD' ? 1350 : 1)),
}));
vi.mock('@/app/actions/finance/settlement', () => ({
  finalizeInvoice: vi.fn().mockResolvedValue({ success: true }),
}));

const orderRow = {
  id: 'order-1',
  order_no: 'ORD-1',
  status: 'DELIVERED',
  transport_mode: 'UPS',
  shipper_id: 'shipper-1',
  agency_org_id: 'agency-1',
  recipient_country_code: 'US',
  ups_product_code: 'WW_SAVER_NONDOC',
  ups_product_id: 'prod-1',
  incoterms: 'DDU',
  created_at: '2026-07-01T00:00:00.000Z',
  snapshot: [{ metadata: {} }],
};

function tableMock(table: string): any {
  if (table === 'zen_orders') {
    return { select: () => ({ eq: () => ({ single: async () => ({ data: orderRow, error: null }) }) }) };
  }
  if (table === 'order_status_history') {
    return { select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { created_at: '2026-07-25T00:00:00.000Z' }, error: null }) }) }) }) }) }) };
  }
  if (table === 'zen_ups_actual_cost') {
    return {
      upsert: async (payload: any) => { calls.upsert.push(payload); return { error: null }; },
      update: (payload: any) => { calls.update.push(payload); return { eq: async () => ({ error: null }) }; },
    };
  }
  if (table === 'zen_ups_actual_other_charges') {
    return {
      delete: () => ({ eq: async () => { calls.otherDelete += 1; return { error: null }; } }),
      insert: async (rows: any[]) => { calls.otherInsert.push(rows); return { error: null }; },
    };
  }
  return {
    select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }), maybeSingle: async () => ({ data: null, error: null }) }) }),
    insert: async () => ({ error: null }),
    update: () => ({ eq: async () => ({ error: null }) }),
  };
}

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

const mockSupabase: any = { from: vi.fn((table: string) => tableMock(table)) };

import { validateUserAction } from '@/lib/auth/guards';
import { recordUpsActualCost, recordActualCostAndFinalize } from '@/app/actions/finance/ups-actual-cost';

beforeEach(() => {
  calls.upsert = [];
  calls.update = [];
  calls.otherInsert = [];
  calls.otherDelete = 0;
  vi.mocked(validateUserAction).mockResolvedValue({
    supabase: mockSupabase,
    user: { id: 'user-1' },
    profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
  } as any);
});

describe('A·B 경로 동일 결과 (TASK-B-364)', () => {
  it('T1: 같은 청구서 값을 경로별 통화로 표현하면 total이 동일하다', async () => {
    // B: 기본 1,000 HKD + 유류 300 HKD + 급증 50 HKD (rate 150)
    const b = await recordUpsActualCost('order-1', {
      baseFreightHkd: 1000,
      fuelSurchargeHkd: 300,
      surgeFeeHkd: 50,
      otherChargesHkd: 0,
    });
    // A: 기본 1,000 HKD + 유류 45,000 KRW + 급증 7,500 KRW (= B의 HKD 금액 × 150)
    const a = await recordActualCostAndFinalize('order-1', {
      baseFreightKrw: 1000,
      baseFreightCurrency: 'HKD',
      fuelSurchargeKrw: 45000,
      surgeFeeKrw: 7500,
      otherChargesKrw: 0,
    });

    expect(b.success).toBe(true);
    expect(a.success).toBe(true);
    expect(b.totalCostKrw).toBe(213000);
    expect(a.totalCostKrw).toBe(213000);
    expect(calls.update[0].total_cost_krw).toBe(213000);
    // A 경로는 upsert에 total을 직접 저장한다(B는 update). A upsert는 두 번째 호출이다.
    const aUpsert = calls.upsert.find((payload) => payload.total_cost_krw != null);
    expect(aUpsert.total_cost_krw).toBe(213000);
  });

  it('T3: KRW 기본운임은 환율 1로 계산하고 applied_exchange_rate=1 저장', async () => {
    const result = await recordActualCostAndFinalize('order-1', {
      baseFreightKrw: 100000,
      baseFreightCurrency: 'KRW',
      fuelSurchargeKrw: 0,
      surgeFeeKrw: 0,
      otherChargesKrw: 0,
    });

    expect(result.totalCostKrw).toBe(107000);
    expect(calls.upsert[0].applied_exchange_rate).toBe(1);
    expect(calls.upsert[0].total_cost_krw).toBe(107000);
  });

  it('T5: 기타부가운임 2행 → 자식 2행 + 메인 KRW 합계', async () => {
    const result = await recordActualCostAndFinalize('order-1', {
      baseFreightKrw: 0,
      baseFreightCurrency: 'KRW',
      fuelSurchargeKrw: 0,
      surgeFeeKrw: 0,
      otherChargesKrw: 65000,
      otherCharges: [
        { name: 'A', amount: 100, currency: 'HKD' },
        { name: 'B', amount: 50000, currency: 'KRW' },
      ],
    });

    expect(result.success).toBe(true);
    expect(calls.upsert[0].other_charges_hkd).toBe(65000);
    expect(calls.otherInsert[0]).toEqual([
      { order_id: 'order-1', charge_name: 'A', amount: 100, currency: 'HKD' },
      { order_id: 'order-1', charge_name: 'B', amount: 50000, currency: 'KRW' },
    ]);
    expect(calls.otherDelete).toBe(1);
  });
});
