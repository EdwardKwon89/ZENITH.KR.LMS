// TASK-B-366 (Issue #1376): 오더정산 액션 거부 사유·목록 필터·정산 후 잠금·DEF-B-159(자식 행 삭제) 단위 검증
import { describe, it, expect, vi, beforeEach } from 'vitest';

type State = {
  order: any;
  costRow: any;
  legacyInvoices: any[];
  orders: any[];
  history: any[];
  costRows: any[];
  released: any;
  updatedPayload: any;
  otherDelete: number;
  otherInsert: number;
  errors: { history: any; cost: any; invoice: any };
};

const state: State = {
  order: null,
  costRow: null,
  legacyInvoices: [],
  orders: [],
  history: [],
  costRows: [],
  released: null,
  updatedPayload: null,
  otherDelete: 0,
  otherInsert: 0,
  errors: { history: null, cost: null, invoice: null },
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
  getExchangeRate: vi.fn(async (from: string) => (from === 'HKD' ? 150 : 1350)),
}));
vi.mock('@/app/actions/ups/freight', () => ({ estimateUpsFreight: vi.fn() }));
vi.mock('@/app/actions/finance/settlement', () => ({
  finalizeInvoice: vi.fn().mockResolvedValue({ success: true }),
}));

/** Supabase 체이너블 쿼리 mock — 어떤 체인 순서로도 최종 await/단건 조회가 가능하다. */
function query(data: any, opts: { single?: any; maybeSingle?: any; error?: any } = {}) {
  const result = { data, error: opts.error ?? null };
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    ilike: () => chain,
    in: () => chain,
    filter: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => ({ data: opts.single ?? null, error: null }),
    maybeSingle: async () => ({ data: opts.maybeSingle ?? null, error: null }),
    then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

const mockSupabase: any = {
  from: vi.fn((table: string) => {
    if (table === 'zen_orders') {
      return {
        select: () => query(state.orders, { single: state.order }),
        update: (payload: any) => {
          state.updatedPayload = payload;
          return {
            eq: () => ({
              eq: () => ({
                select: async () => ({ data: [{ id: state.order?.id }], error: null }),
              }),
            }),
          };
        },
      };
    }
    if (table === 'zen_ups_actual_cost') {
      return {
        select: () => query(state.costRows, { maybeSingle: state.costRow, error: state.errors.cost }),
        upsert: async () => ({ error: null }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
    }
    if (table === 'zen_invoices') {
      return { select: () => query(state.legacyInvoices, { error: state.errors.invoice }) };
    }
    if (table === 'order_status_history') {
      return { select: () => query(state.history, { maybeSingle: state.released, error: state.errors.history }) };
    }
    if (table === 'zen_ups_actual_other_charges') {
      return {
        delete: () => ({ eq: async () => { state.otherDelete += 1; return { error: null }; } }),
        insert: async () => { state.otherInsert += 1; return { error: null }; },
      };
    }
    return { select: () => query([]) };
  }),
};

import { validateUserAction } from '@/lib/auth/guards';
import {
  getOrdersForCostSettlement,
  markOrderCostSettled,
  recordActualCostAndFinalize,
  recordUpsActualCost,
} from '@/app/actions/finance/ups-actual-cost';

function order(overrides: Record<string, any> = {}) {
  return {
    id: 'order-1',
    status: 'DELIVERED',
    transport_mode: 'UPS',
    cost_settlement_status: 'NOT_SETTLED',
    created_at: '2026-07-01',
    order_no: 'ORD-1',
    ...overrides,
  };
}

beforeEach(() => {
  state.order = order();
  state.costRow = { id: 'cost-1' };
  state.legacyInvoices = [];
  state.orders = [];
  state.history = [];
  state.costRows = [];
  state.released = { created_at: '2026-07-25T00:00:00.000Z' };
  state.updatedPayload = null;
  state.otherDelete = 0;
  state.otherInsert = 0;
  state.errors = { history: null, cost: null, invoice: null };
  vi.mocked(validateUserAction).mockResolvedValue({
    supabase: mockSupabase,
    user: { id: 'user-1' },
    profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
  } as any);
});

describe('markOrderCostSettled 거부 사유 (TASK-B-366)', () => {
  it('UPS 오더가 아니면 not_ups_order', async () => {
    state.order = order({ transport_mode: 'AIR' });
    const res = await markOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe('UPS 오더가 아닙니다.');
  });

  it('DELIVERED가 아니면 ups_actual_cost_status_invalid', async () => {
    state.order = order({ status: 'IN_TRANSIT' });
    const res = await markOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe('오더가 IN_TRANSIT 또는 DELIVERED 상태일 때만 실제 원가를 입력할 수 있습니다.');
  });

  it('이미 정산된 오더는 already_settled', async () => {
    state.order = order({ cost_settlement_status: 'SETTLED' });
    const res = await markOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe('이미 오더정산이 완료되었습니다.');
  });

  it('원가 미입력 오더는 cost_not_entered', async () => {
    state.costRow = null;
    const res = await markOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe('실제 원가를 먼저 입력해야 합니다.');
  });

  it('레거시 오더별 인보이스가 있으면 legacy_invoiced_order', async () => {
    state.legacyInvoices = [{ id: 'inv-1' }];
    const res = await markOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe('기존 오더별 인보이스가 발행된 오더입니다. 신규 정산 대상이 아닙니다.');
  });

  it('정상 케이스는 SETTLED·처리시각·처리자를 조건부 UPDATE로 기록한다', async () => {
    const res = await markOrderCostSettled('order-1');
    expect(res.success).toBe(true);
    expect(state.updatedPayload.cost_settlement_status).toBe('SETTLED');
    expect(state.updatedPayload.cost_settled_by).toBe('user-1');
    expect(typeof state.updatedPayload.cost_settled_at).toBe('string');
  });
});

describe('getOrdersForCostSettlement 필터 (TASK-B-366)', () => {
  it('기간 역전은 DATE_RANGE_INVALID', async () => {
    const res = await getOrdersForCostSettlement({ status: 'ALL', from: '2026-12-31', to: '2026-01-01' });
    expect(res.success).toBe(false);
    expect(res.error).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: DATE_RANGE_INVALID)');
  });

  it('레거시 인보이스 오더는 목록에 표시되고 정산 대상 제외로 표기된다', async () => {
    state.orders = [order({ id: 'order-1', order_no: 'ORD-1', shipper: { name: 'S' }, agency: { name: 'A' } })];
    state.history = [{ order_id: 'order-1', created_at: '2026-11-18T10:00:00Z' }];
    state.costRows = [{ order_id: 'order-1', ups_invoice_no: 'INV-1' }];
    state.legacyInvoices = [{ metadata: { source_order_id: 'order-1' } }];

    const res = await getOrdersForCostSettlement({ status: 'ALL', from: '2026-11-01', to: '2026-11-30' });
    expect(res.success).toBe(true);
    expect(res.total).toBe(1);
    expect(res.orders?.[0].legacyInvoiced).toBe(true);
    expect(res.orders?.[0].excludedReason).toBe('LEGACY_INVOICED');
    expect(res.orders?.[0].hasActualCost).toBe(true);
  });

  it('배송완료일 보조 조회가 실패하면 success=false (HISTORY_LOOKUP)', async () => {
    state.orders = [order({ id: 'order-1', order_no: 'ORD-1' })];
    state.errors.history = { message: 'history boom' };

    const res = await getOrdersForCostSettlement({ status: 'ALL', from: '2026-11-01', to: '2026-11-30' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('HISTORY_LOOKUP');
  });

  it('원가 보조 조회가 실패하면 success=false (COST_LOOKUP)', async () => {
    state.orders = [order({ id: 'order-1', order_no: 'ORD-1' })];
    state.errors.cost = { message: 'cost boom' };

    const res = await getOrdersForCostSettlement({ status: 'ALL', from: '2026-11-01', to: '2026-11-30' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('COST_LOOKUP');
  });

  it('레거시 인보이스 조회가 실패하면 success=false (LEGACY_INVOICE_LOOKUP)', async () => {
    state.orders = [order({ id: 'order-1', order_no: 'ORD-1' })];
    state.errors.invoice = { message: 'invoice boom' };

    const res = await getOrdersForCostSettlement({ status: 'ALL', from: '2026-11-01', to: '2026-11-30' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('LEGACY_INVOICE_LOOKUP');
  });

  it('배송완료일이 기간 밖이면 목록에서 제외한다', async () => {
    state.orders = [order({ id: 'order-1', order_no: 'ORD-1' })];
    state.history = [{ order_id: 'order-1', created_at: '2026-10-01T00:00:00Z' }];

    const res = await getOrdersForCostSettlement({ status: 'ALL', from: '2026-11-01', to: '2026-11-30' });
    expect(res.success).toBe(true);
    expect(res.total).toBe(0);
  });
});

describe('정산 후 수정 잠금 (TASK-B-366)', () => {
  it('SETTLED 오더는 recordUpsActualCost(B)가 cost_settled_locked 로 거부한다', async () => {
    state.order = order({ cost_settlement_status: 'SETTLED' });
    const res = await recordUpsActualCost('order-1', { baseFreightHkd: 100 });
    expect(res.success).toBe(false);
    expect(res.error).toBe('오더정산이 완료된 오더는 원가·중량을 수정할 수 없습니다. 먼저 정산을 해제하세요.');
  });

  it('SETTLED 오더는 recordActualCostAndFinalize(A)가 cost_settled_locked 로 거부한다', async () => {
    state.order = order({ cost_settlement_status: 'SETTLED' });
    const res = await recordActualCostAndFinalize('order-1', {
      baseFreightKrw: 1000,
      baseFreightCurrency: 'KRW',
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('오더정산이 완료된 오더는 원가·중량을 수정할 수 없습니다. 먼저 정산을 해제하세요.');
  });
});

describe('DEF-B-159 — 기타부가운임 빈 목록 저장 시 자식 행 삭제 (TASK-B-366)', () => {
  it('목록이 비어도 delete를 호출하고 insert는 하지 않는다', async () => {
    const res = await recordActualCostAndFinalize('order-1', {
      baseFreightKrw: 1000,
      baseFreightCurrency: 'KRW',
      fuelSurchargeKrw: 0,
      surgeFeeKrw: 0,
      otherChargesKrw: 0,
      otherCharges: [],
    });

    expect(res.success).toBe(true);
    expect(state.otherDelete).toBe(1);
    expect(state.otherInsert).toBe(0);
  });
});
