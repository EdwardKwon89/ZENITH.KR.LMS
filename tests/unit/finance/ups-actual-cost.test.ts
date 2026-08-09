import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

interface ChainableMock {
  [key: string]: any;
  then: (resolve: any) => void;
}

const createChainableMock = (data: any = null, error: any = null): ChainableMock => {
  const mockObj: ChainableMock = {} as any;
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'not', 'limit', 'order',
    'single', 'maybeSingle', 'ilike', 'is', 'filter', 'neq',
  ];
  methods.forEach((method) => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

const mockSupabase: any = { from: vi.fn() };

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
}));

vi.mock('@/lib/finance/exchange-rate', () => ({
  getExchangeRate: vi.fn(),
}));

vi.mock('@/app/actions/ups/freight', () => ({
  estimateUpsFreight: vi.fn(),
}));

vi.mock('@/app/actions/finance/settlement', () => ({
  createPostFinalizationAdjustment: vi.fn(),
}));

import { validateUserAction } from '@/lib/auth/guards';
import { getExchangeRate } from '@/lib/finance/exchange-rate';
import { estimateUpsFreight } from '@/app/actions/ups/freight';
import { createPostFinalizationAdjustment } from '@/app/actions/finance/settlement';
import {
  recordUpsActualCost,
  previewUpsActualCost,
  getUpsActualCost,
  getOrderReleasedDate,
} from '@/app/actions/finance/ups-actual-cost';

describe('Issue #1009: UPS 사후 원가 확정 (zen_ups_actual_cost)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getExchangeRate as any).mockResolvedValue(150);
  });

  function mockValidateUser(role: string, orgId?: string) {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'user-1' },
      profile: { id: 'user-1', role, org_id: orgId || 'org-1' },
    });
  }

  function baseOrder(overrides: Record<string, any> = {}) {
    return {
      id: 'order-1',
      order_no: 'ZEN-UPS-001',
      status: 'DELIVERED',
      transport_mode: 'UPS',
      shipper_id: 'shipper-1',
      agency_org_id: 'agency-1',
      recipient_country_code: 'US',
      ups_product_code: 'WW_SAVER_NONDOC',
      ups_product_id: 'prod-1',
      incoterms: 'DDU',
      created_at: '2026-07-01T00:00:00.000Z',
      snapshot: [{ metadata: { platform: { totalSellingPrice: 1000 }, agency: { agencyCostPrice: 900 } } }],
      ...overrides,
    };
  }

  function mockTable(table: string, data: any, error: any = null) {
    mockSupabase.from.mockImplementation((t: string) => {
      if (t === table) return createChainableMock(data, error);
      if (t === 'order_status_history') return createChainableMock({ created_at: '2026-07-25T10:00:00.000Z' }, null);
      return createChainableMock();
    });
  }

  it('TC-1009-01: DELIVERED → 원가 확정 성공 (부피/중량 미변경, 재계산 없음)', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    mockTable('zen_orders', baseOrder());
    mockSupabase.from.mockImplementation((t: string) => {
      if (t === 'zen_orders') return createChainableMock(baseOrder());
      if (t === 'order_status_history') return createChainableMock({ created_at: '2026-07-25T10:00:00.000Z' }, null);
      if (t === 'zen_ups_actual_cost') return createChainableMock(null, null);
      return createChainableMock();
    });

    const result = await recordUpsActualCost('order-1', {
      upsInvoiceNo: '1Z-TEST',
      baseFreightHkd: 1000,
      fuelSurchargeHkd: 200,
      surgeFeeHkd: 100,
      otherChargesHkd: 0,
    });

    expect(result.success).toBe(true);
    expect(result.hkdTotal).toBe(1300);
    expect(result.appliedExchangeRate).toBe(150);
    expect(result.totalCostKrw).toBe(195000);
    expect(result.releasedDate).toBe('2026-07-25');
    expect(result.recalc!.weightOrDimsChanged).toBe(false);
  });

  it('TC-1009-02: UPS 아님 → 차단', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    mockTable('zen_orders', baseOrder({ transport_mode: 'AIR' }));

    const result = await recordUpsActualCost('order-1', { baseFreightHkd: 100 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('UPS');
  });

  it('TC-1009-03: REGISTERED 상태 → 차단 (IN_TRANSIT/DELIVERED만)', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    mockTable('zen_orders', baseOrder({ status: 'REGISTERED' }));

    const result = await recordUpsActualCost('order-1', { baseFreightHkd: 100 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('IN_TRANSIT 또는 DELIVERED');
  });

  it('TC-1009-04: 비관리자 → 거부', async () => {
    mockValidateUser(USER_ROLES.CORPORATE);
    mockTable('zen_orders', baseOrder());

    const result = await recordUpsActualCost('order-1', { baseFreightHkd: 100 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('권한');
  });

  it('TC-1009-05: 부피/중량 변경 → 매출 재계산 + 미마감 agency/shipper 인보이스 반영', async () => {
    mockValidateUser(USER_ROLES.ADMIN);

    (estimateUpsFreight as any).mockResolvedValue({
      platform: { baseSellingPrice: 500, fuelSurchargeSellingAmount: 100, surgeFeeSellingAmount: 50, otherChargesSellingTotal: 0 },
      agency: { agencyCostPrice: 1200, baseSellingPrice: 550, fuelSurchargeSellingAmount: 110, surgeFeeSellingAmount: 55, otherChargesSellingTotal: 0 },
      shipper: { finalFreight: 1600 },
    });

    mockSupabase.from.mockImplementation((t: string) => {
      if (t === 'zen_orders') return createChainableMock(baseOrder());
      if (t === 'order_status_history') return createChainableMock({ created_at: '2026-07-25T10:00:00.000Z' }, null);
      if (t === 'zen_ups_actual_cost') return createChainableMock(null, null);
      if (t === 'zen_ups_products') return createChainableMock({ id: 'prod-1' }, null);
      if (t === 'zen_invoices') {
        return createChainableMock([
          {
            id: 'inv-agency', invoice_tier: 'ADMIN_TO_AGENCY', total_amount: 1000,
            is_finalized: false, currency: 'USD', metadata: {},
          },
          {
            id: 'inv-shipper', invoice_tier: 'AGENCY_TO_SHIPPER', total_amount: 1400,
            is_finalized: false, currency: 'USD', metadata: {},
          },
        ]);
      }
      if (t === 'zen_order_costs') return createChainableMock([{ unit_price: 1400, quantity: 1 }], null);
      return createChainableMock();
    });

    const result = await recordUpsActualCost('order-1', {
      baseFreightHkd: 1300,
      actualWeightKg: 20,
      actualLengthCm: 60,
      actualWidthCm: 50,
      actualHeightCm: 40,
    });

    expect(result.success).toBe(true);
    expect(result.recalc!.weightOrDimsChanged).toBe(true);
    expect(result.recalc!.newAgencyTotal).toBe(1200);
    expect(result.recalc!.newShipperTotal).toBe(1600);
    // 매출 재계산 트리거 검증: 실측 부피/중량이 estimateUpsFreight에 실제 전달되어야 함 (되돌리기 검증 — 트리거 제거 시 FAIL)
    expect(estimateUpsFreight).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'prod-1',
        destCountryCode: 'US',
        actualWeightKg: 20,
        dimL: 60,
        dimW: 50,
        dimH: 40,
      })
    );
    // unfinalized agency invoice → total_amount 직접 갱신
    const invUpdate = (mockSupabase.from as any).mock.calls.some(
      ([t]: any[]) => t === 'zen_invoices'
    );
    expect(invUpdate).toBe(true);
    // shipper delta → UPS_ACTUAL_COST_ADJ insert (200 = 1600 - 1400)
    const insCall = (mockSupabase.from as any).mock.calls.find(([t]: any[]) => t === 'zen_order_costs');
    expect(insCall).toBeTruthy();
  });

  it('TC-1009-06: 마감된 agency 인보이스 → createPostFinalizationAdjustment 호출', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    (estimateUpsFreight as any).mockResolvedValue({
      platform: { baseSellingPrice: 500, fuelSurchargeSellingAmount: 100, surgeFeeSellingAmount: 50, otherChargesSellingTotal: 0 },
      agency: { agencyCostPrice: 1200 },
      shipper: { finalFreight: 1600 },
    });
    (createPostFinalizationAdjustment as any).mockResolvedValue({ success: true });

    mockSupabase.from.mockImplementation((t: string) => {
      if (t === 'zen_orders') return createChainableMock(baseOrder());
      if (t === 'order_status_history') return createChainableMock({ created_at: '2026-07-25T10:00:00.000Z' }, null);
      if (t === 'zen_ups_actual_cost') return createChainableMock(null, null);
      if (t === 'zen_ups_products') return createChainableMock({ id: 'prod-1' }, null);
      if (t === 'zen_invoices') {
        return createChainableMock([
          {
            id: 'inv-agency-final', invoice_tier: 'ADMIN_TO_AGENCY', total_amount: 1000,
            is_finalized: true, currency: 'USD', metadata: {},
          },
        ]);
      }
      return createChainableMock();
    });

    const result = await recordUpsActualCost('order-1', {
      baseFreightHkd: 1300,
      actualWeightKg: 20,
    });

    expect(result.success).toBe(true);
    expect(createPostFinalizationAdjustment).toHaveBeenCalled();
    expect(createPostFinalizationAdjustment).toHaveBeenCalledWith(
      'order-1', 200, 'USD', 'user-1', 'inv-agency-final'
    );
  });

  it('TC-1009-07: previewUpsActualCost → 저장 없이 환율/원가/재계산 반환', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    (estimateUpsFreight as any).mockResolvedValue({
      platform: { baseSellingPrice: 500, fuelSurchargeSellingAmount: 100, surgeFeeSellingAmount: 50, otherChargesSellingTotal: 0 },
      agency: { agencyCostPrice: 1200 },
      shipper: { finalFreight: 1600 },
    });
    mockSupabase.from.mockImplementation((t: string) => {
      if (t === 'zen_orders') return createChainableMock(baseOrder());
      if (t === 'order_status_history') return createChainableMock({ created_at: '2026-07-25T10:00:00.000Z' }, null);
      if (t === 'zen_ups_products') return createChainableMock({ id: 'prod-1' }, null);
      return createChainableMock();
    });

    const result = await previewUpsActualCost('order-1', {
      baseFreightHkd: 1300,
      actualWeightKg: 20,
    });

    expect(result.success).toBe(true);
    expect(result.totalCostKrw).toBe(195000);
    expect(result.recalc!.newAgencyTotal).toBe(1200);
    expect(result.recalc!.newShipperTotal).toBe(1600);
  });

  it('TC-1009-08: getUpsActualCost → 저장된 원가 반환', async () => {
    mockValidateUser(USER_ROLES.ADMIN);
    mockSupabase.from.mockImplementation((t: string) => {
      if (t === 'zen_ups_actual_cost') {
        return createChainableMock({
          order_id: 'order-1',
          base_freight_hkd: 1000,
          total_cost_krw: 150000,
          applied_exchange_rate: 150,
        });
      }
      return createChainableMock();
    });

    const rec = await getUpsActualCost('order-1');
    expect(rec).not.toBeNull();
    expect(rec!.total_cost_krw).toBe(150000);
    expect(rec!.applied_exchange_rate).toBe(150);
  });

  it('TC-1009-09: getOrderReleasedDate → next_status=RELEASED 최신 시각 (YYYY-MM-DD)', async () => {
    mockSupabase.from.mockImplementation((t: string) => {
      if (t === 'order_status_history') {
        return createChainableMock({ created_at: '2026-07-25T10:00:00.000Z' });
      }
      return createChainableMock();
    });

    const date = await getOrderReleasedDate(mockSupabase, 'order-1', '2026-07-01T00:00:00.000Z');
    expect(date).toBe('2026-07-25');
  });

  it('TC-1009-10: getOrderReleasedDate → 기록 없으면 fallback created_at 사용', async () => {
    mockSupabase.from.mockImplementation((t: string) => {
      return createChainableMock(null);
    });

    const date = await getOrderReleasedDate(mockSupabase, 'order-1', '2026-07-01T00:00:00.000Z');
    expect(date).toBe('2026-07-01');
  });
});
