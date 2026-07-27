import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Hoisted mock variables ----

const { mockSupabase, mockValidateUserAction } = vi.hoisted(() => ({
  mockSupabase: { from: vi.fn() } as any,
  mockValidateUserAction: vi.fn() as any,
}));

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: mockValidateUserAction,
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/app/actions/finance/settlement', () => ({
  createPostFinalizationAdjustment: vi.fn().mockResolvedValue({ success: true, adjustmentAmount: 10 }),
}));

// ---- Chainable mock helper ----

const createChainableMock = (data: any = null, error: any = null) => {
  const mockObj: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'ilike', 'is', 'filter', 'neq'];
  methods.forEach(method => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

// ---- Test fixtures ----

const ORDER_ID = '44444444-4444-4444-4444-444444444444';
const SHIPPER_ID = '33333333-3333-3333-3333-333333333333';
const AGENCY_ORG_ID = '22222222-2222-2222-2222-222222222222';
const INVOICE_SHIPPER = 'inv-shp-001';
const INVOICE_AGENCY = 'inv-agc-001';

const UPS_ORDER = {
  id: ORDER_ID,
  status: 'IN_TRANSIT',
  transport_mode: 'UPS',
  shipper_id: SHIPPER_ID,
};

const SHIPPER_INVOICE = {
  id: INVOICE_SHIPPER,
  is_finalized: false,
  invoice_tier: 'AGENCY_TO_SHIPPER',
  billed_org_id: SHIPPER_ID,
  metadata: { source_order_id: ORDER_ID },
};

const AGENCY_INVOICE = {
  id: INVOICE_AGENCY,
  is_finalized: false,
  invoice_tier: 'ADMIN_TO_AGENCY',
  billed_org_id: AGENCY_ORG_ID,
  metadata: {
    source_order_id: ORDER_ID,
    platform_breakdown: { baseFreight: 80, fuelSurcharge: 20, surgeFee: 10, otherCharges: 5 },
  },
};

const ORDER_COSTS = [
  { cost_type: 'BASE_FREIGHT', unit_price: 100, quantity: 1 },
  { cost_type: 'FUEL_SURCHARGE', unit_price: 30, quantity: 1 },
];

const CHARGES = [
  { chargeType: 'FUEL_SURCHARGE', amount: 15, currency: 'USD' },
  { chargeType: 'OTHER', amount: 5, currency: 'USD' },
];

// ---- Import after mocks ----

import { recordUpsActualCharges } from '@/app/actions/finance/ups-actual-charges';

describe('TASK-B-236: recordUpsActualCharges 두 인보이스 동시 갱신 (Issue #919)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateUserAction.mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', role: 'ADMIN', org_id: 'org-admin' },
    });
  });

  // TC-1: agency 있는 오더 → 두 인보이스 모두 갱신
  it('TC-919-01: agency 오더 → 두 인보이스(AGENCY_TO_SHIPPER + ADMIN_TO_AGENCY) 모두 total_amount 갱신', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock(UPS_ORDER);
      if (table === 'zen_invoices') return createChainableMock([SHIPPER_INVOICE, AGENCY_INVOICE]);
      if (table === 'zen_ups_actual_charges') return createChainableMock(null);
      if (table === 'zen_order_costs') return createChainableMock(ORDER_COSTS);
      return createChainableMock(null);
    });

    const result = await recordUpsActualCharges(ORDER_ID, CHARGES);

    expect(result.success).toBe(true);
    expect(result.adjustmentAmount).toBe(20); // additionalSum = 15 + 5

    // zen_invoices.update가 2번 호출되었는지 확인
    const invoiceUpdates = mockSupabase.from.mock.calls.filter(
      (call: any[]) => call[0] === 'zen_invoices'
    );
    // from('zen_invoices') 호출: 1회(select for existingInvoices), 2회(update for each invoice)
    const updateCalls = invoiceUpdates.filter((_: any, i: number) => i > 0);
    expect(updateCalls.length).toBe(2);
  });

  // TC-2: agency 없는 오더 → 인보이스 1건만 갱신 (회귀 없음)
  it('TC-919-02: agency 없는 오더 → 인보이스 1건만 갱신 (ADMIN_TO_SHIPPER)', async () => {
    const singleInvoice = { ...SHIPPER_INVOICE, invoice_tier: 'ADMIN_TO_SHIPPER' };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock(UPS_ORDER);
      if (table === 'zen_invoices') return createChainableMock([singleInvoice]);
      if (table === 'zen_ups_actual_charges') return createChainableMock(null);
      if (table === 'zen_order_costs') return createChainableMock(ORDER_COSTS);
      return createChainableMock(null);
    });

    const result = await recordUpsActualCharges(ORDER_ID, CHARGES);

    expect(result.success).toBe(true);
    expect(result.adjustmentAmount).toBe(20);
  });

  // TC-3: 마감된 인보이스 → 두 인보이스 각각 createPostFinalizationAdjustment 경로
  it('TC-919-03: 마감된 인보이스 → 두 인보이스 각각 createPostFinalizationAdjustment 호출', async () => {
    const finalizedShipper = { ...SHIPPER_INVOICE, is_finalized: true };
    const finalizedAgency = { ...AGENCY_INVOICE, is_finalized: true };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock(UPS_ORDER);
      if (table === 'zen_invoices') return createChainableMock([finalizedShipper, finalizedAgency]);
      if (table === 'zen_ups_actual_charges') return createChainableMock(null);
      if (table === 'zen_order_costs') return createChainableMock(ORDER_COSTS);
      return createChainableMock(null);
    });

    const { createPostFinalizationAdjustment } = await import('@/app/actions/finance/settlement');
    const result = await recordUpsActualCharges(ORDER_ID, CHARGES);

    expect(result.success).toBe(true);
    // createPostFinalizationAdjustment이 2번 호출되어야 함 (각 인보이스마다 1회)
    expect(createPostFinalizationAdjustment).toHaveBeenCalledTimes(2);
    expect(createPostFinalizationAdjustment).toHaveBeenCalledWith(
      ORDER_ID, 20, 'USD', 'admin-1', INVOICE_SHIPPER
    );
    expect(createPostFinalizationAdjustment).toHaveBeenCalledWith(
      ORDER_ID, 20, 'USD', 'admin-1', INVOICE_AGENCY
    );
  });

  // TC-4: 마감 후 조정 실패 시 실패 전파 확인
  it('TC-919-04: 마감 후 조정 실패 → success:false + error 전파', async () => {
    const finalizedShipper = { ...SHIPPER_INVOICE, is_finalized: true };
    const finalizedAgency = { ...AGENCY_INVOICE, is_finalized: true };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock(UPS_ORDER);
      if (table === 'zen_invoices') return createChainableMock([finalizedShipper, finalizedAgency]);
      if (table === 'zen_ups_actual_charges') return createChainableMock(null);
      if (table === 'zen_order_costs') return createChainableMock(ORDER_COSTS);
      return createChainableMock(null);
    });

    const { createPostFinalizationAdjustment } = await import('@/app/actions/finance/settlement');
    (createPostFinalizationAdjustment as any)
      .mockResolvedValueOnce({ success: true, adjustmentAmount: 10 })
      .mockResolvedValueOnce({ success: false, error: '추가 인보이스 생성 실패' });

    const result = await recordUpsActualCharges(ORDER_ID, CHARGES);

    expect(result.success).toBe(false);
    expect(result.error).toBe('추가 인보이스 생성 실패');
  });
});
