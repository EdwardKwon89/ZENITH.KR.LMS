import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

interface ChainableMock {
  [key: string]: any;
  then: (resolve: any) => void;
}

const createChainableMock = (data: any = null, error: any = null): ChainableMock => {
  const mockObj: ChainableMock = {} as any;
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'ilike', 'is', 'filter', 'neq'];
  methods.forEach(method => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

const mockSupabase: any = {
  from: vi.fn(),
};

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
}));

import { validateAdminAction, validateUserAction } from '@/lib/auth/guards';
import { recordUpsActualCharges, getUpsActualCharges, getUpsChargeReconciliation, searchDeliveredUpsOrders } from '@/app/actions/finance/ups-actual-charges';

describe('UPS 사후 청구 반영 Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recordUpsActualCharges - 오더가 존재하지 않거나 UPS가 아니면 에러 반환', async () => {
    (validateAdminAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'admin-user-id' },
      profile: { id: 'admin-user-id', role: USER_ROLES.ADMIN },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        return createChainableMock(null, new Error('Not found'));
      }
      return createChainableMock();
    });

    const result = await recordUpsActualCharges('order-1', []);
    expect(result.success).toBe(false);
    expect(result.error).toContain('오더를 찾을 수 없습니다');
  });

  it('recordUpsActualCharges - 오더가 DELIVERED 상태가 아니면 에러 반환', async () => {
    (validateAdminAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'admin-user-id' },
      profile: { id: 'admin-user-id', role: USER_ROLES.ADMIN },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        return createChainableMock({ status: 'SHIPPED', transport_mode: 'UPS' });
      }
      return createChainableMock();
    });

    const result = await recordUpsActualCharges('order-1', []);
    expect(result.success).toBe(false);
    expect(result.error).toContain('배송 완료(DELIVERED) 상태일 때만');
  });

  it('recordUpsActualCharges - 정산이 마감된 오더면 마감 후 조정 경로로 위임', async () => {
    (validateAdminAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'admin-user-id' },
      profile: { id: 'admin-user-id', role: USER_ROLES.ADMIN },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        return createChainableMock({ status: 'DELIVERED', transport_mode: 'UPS' });
      }
      if (table === 'zen_invoices') {
        return createChainableMock({ id: 'inv-1', is_finalized: true });
      }
      return createChainableMock();
    });

    const mockCreateAdjustment = vi.fn().mockResolvedValue({ success: true, adjustmentAmount: 0 });
    vi.doMock('@/app/actions/finance/settlement', () => ({
      createPostFinalizationAdjustment: mockCreateAdjustment,
    }));

    const result = await recordUpsActualCharges('order-1', []);
    expect(result.success).toBe(true);
    expect(mockCreateAdjustment).toHaveBeenCalled();
  });

  it('recordUpsActualCharges - 성공적으로 등록 및 차액 계산 (예상 200 vs 실제 250 -> 차액 50)', async () => {
    (validateAdminAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'admin-user-id' },
      profile: { id: 'admin-user-id', role: USER_ROLES.ADMIN },
    });

    let orderCostsCallCount = 0;

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        return createChainableMock({ status: 'DELIVERED', transport_mode: 'UPS' });
      }
      if (table === 'zen_invoices') {
        return createChainableMock({ id: 'inv-1', is_finalized: false });
      }
      if (table === 'zen_order_costs') {
        const mockObj = createChainableMock();
        mockObj.then = (resolve: any) => {
          orderCostsCallCount++;
          if (orderCostsCallCount === 1) {
            // First call: estimated costs list
            return resolve({
              data: [
                { cost_type: 'BASE_FREIGHT', unit_price: 150, quantity: 1 },
                { cost_type: 'FUEL_SURCHARGE', unit_price: 50, quantity: 1 },
              ],
              error: null,
            });
          } else if (orderCostsCallCount === 2) {
            // Second call: existing adjustment ID check
            return resolve({ data: null, error: null });
          } else if (orderCostsCallCount === 3) {
            // Third call: link adjustment to invoice (UPDATE SET invoice_id)
            return resolve({ data: null, error: null });
          } else if (orderCostsCallCount === 4) {
            // Fourth call: select linked costs for recalculation
            return resolve({
              data: [
                { unit_price: 150, quantity: 1 },
                { unit_price: 50, quantity: 1 },
                { unit_price: 50, quantity: 1 },
              ],
              error: null,
            });
          } else {
            return resolve({ data: [], error: null });
          }
        };
        return mockObj;
      }
      if (table === 'zen_ups_actual_charges') {
        return createChainableMock(null, null);
      }
      return createChainableMock();
    });

    const result = await recordUpsActualCharges('order-1', [
      { chargeType: 'BASE', amount: 200, currency: 'USD' },
      { chargeType: 'FUEL', amount: 50, currency: 'USD' },
    ]);

    expect(result.success).toBe(true);
    expect(result.adjustmentAmount).toBe(50);
  });

  it('searchDeliveredUpsOrders - 빈 쿼리 입력 시 빈 배열 반환 및 정상 검색 작동', async () => {
    const emptyResult = await searchDeliveredUpsOrders('');
    expect(emptyResult).toEqual([]);

    (validateAdminAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'admin-user-id' },
      profile: { id: 'admin-user-id', role: USER_ROLES.ADMIN },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        return createChainableMock([{ id: 'order-1', order_no: 'ORD-123', status: 'DELIVERED', transport_mode: 'UPS' }]);
      }
      if (table === 'zen_tracking_configs') {
        return createChainableMock([{ order_id: 'order-1', tracking_no: '1Z12345' }]);
      }
      return createChainableMock();
    });

    const searchResult = await searchDeliveredUpsOrders('ORD-123');
    expect(searchResult.length).toBeGreaterThan(0);
    expect(searchResult[0].order_no).toBe('ORD-123');
  });
});
