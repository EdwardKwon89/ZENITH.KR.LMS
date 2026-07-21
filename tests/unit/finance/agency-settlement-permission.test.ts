import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

const createChainableMock = (data: any = null, error: any = null) => {
  const mockObj: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'filter', 'neq', 'is'];
  methods.forEach((method) => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

const mockSupabase: any = {
  from: vi.fn(),
};

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

vi.mock('@/lib/repositories', () => {
  return {
    FinanceRepository: vi.fn().mockImplementation(function () {
      return {
        findByIdBasic: vi.fn().mockResolvedValue({ data: { id: 'inv-1', status: 'UNPAID', metadata: { source_order_id: 'ord-1' } } }),
        updatePaymentStatus: vi.fn().mockResolvedValue({ data: { id: 'inv-1', status: 'PAID', metadata: { source_order_id: 'ord-1' } }, error: null }),
        updateBillingStatusByOrderId: vi.fn().mockResolvedValue({ success: true }),
        findByOrderId: vi.fn().mockResolvedValue({ data: [], error: null }),
        findFullByOrderId: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  };
});

vi.mock('@/lib/finance/settlement', () => ({
  SettlementEngine: vi.fn().mockImplementation(function () {
    return {
      calculateOrderCosts: vi.fn().mockResolvedValue({ success: true }),
    };
  }),
  InvoiceGenerator: vi.fn().mockImplementation(function () {
    return {
      generateInvoice: vi.fn().mockResolvedValue({ success: true }),
    };
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { validateUserAction } from '@/lib/auth/guards';
import { generateInvoicesForOrder, finalizeInvoice, updatePaymentStatus, calculateSettlementAction } from '@/app/actions/finance/settlement';

describe('Agency 정산 권한 검증 단위 테스트 (Issue #603)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateInvoicesForOrder', () => {
    it('Agency가 본인 소속 화주 오더 인보이스 생성 시 성공', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'agency-usr-1', role: USER_ROLES.AGENCY, org_id: 'agency-org-1' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_agency_shippers') {
          return createChainableMock([{ shipper_org_id: 'shipper-1' }]);
        }
        if (table === 'zen_orders') {
          return createChainableMock({ shipper_id: 'shipper-1' });
        }
        return createChainableMock();
      });

      const res = await generateInvoicesForOrder('ord-1');
      expect(res.success).toBe(true);
    });

    it('Agency가 타 소속 화주 오더 인보이스 생성 시 에러 발생', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'agency-usr-1', role: USER_ROLES.AGENCY, org_id: 'agency-org-1' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_agency_shippers') {
          return createChainableMock([{ shipper_org_id: 'shipper-other' }]);
        }
        if (table === 'zen_orders') {
          return createChainableMock({ shipper_id: 'shipper-1' });
        }
        return createChainableMock();
      });

      await expect(generateInvoicesForOrder('ord-1')).rejects.toThrow('본인 소속 화주의 오더에 대해서만 인보이스를 생성할 수 있습니다.');
    });
  });

  describe('updatePaymentStatus', () => {
    it('Agency가 본인 소속 화주 오더 인보이스 결제 상태 변경 시 성공', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'agency-usr-1' },
        profile: { id: 'agency-usr-1', role: USER_ROLES.AGENCY, org_id: 'agency-org-1' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_agency_shippers') {
          return createChainableMock([{ shipper_org_id: 'shipper-1' }]);
        }
        if (table === 'zen_orders') {
          return createChainableMock({ shipper_id: 'shipper-1' });
        }
        if (table === 'zen_invoice_history') {
          return createChainableMock();
        }
        return createChainableMock();
      });

      const res = await updatePaymentStatus('inv-1', 'PAID', 1000);
      expect(res.success).toBe(true);
    });

    it('권한 없는 역할이 결제 상태 변경 시 에러 발생', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'corp-usr-1' },
        profile: { id: 'corp-usr-1', role: USER_ROLES.CORPORATE, org_id: 'corp-org-1' },
      });

      await expect(updatePaymentStatus('inv-1', 'PAID', 1000)).rejects.toThrow('결제 상태를 수정할 권한이 없습니다.');
    });
  });

  describe('calculateSettlementAction', () => {
    it('Agency가 본인 소속 화주 오더 정산 재계산 시 성공', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { email: 'agency@test.com', role: USER_ROLES.AGENCY, org_id: 'agency-org-1' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_agency_shippers') {
          return createChainableMock([{ shipper_org_id: 'shipper-1' }]);
        }
        if (table === 'zen_orders') {
          return createChainableMock({ shipper_id: 'shipper-1' });
        }
        return createChainableMock();
      });

      const res = await calculateSettlementAction('ord-1');
      expect(res.success).toBe(true);
    });
  });

  describe('finalizeInvoice', () => {
    it('Admin이 인보이스 마감 시 성공', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'admin-usr-1' },
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock({
            id: 'inv-1',
            status: 'UNPAID',
            is_finalized: false,
            metadata: { source_order_id: 'ord-1' },
          });
        }
        if (table === 'zen_order_costs') {
          return createChainableMock([
            { unit_price: 500, quantity: 2 },
            { unit_price: 200, quantity: 1 },
          ]);
        }
        if (table === 'zen_invoice_history') {
          return createChainableMock();
        }
        return createChainableMock();
      });

      const res = await finalizeInvoice('inv-1');
      expect(res.success).toBe(true);
    });

    it('Admin이 이유와 함께 인보이스 마감 시 성공', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'admin-usr-1' },
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock({
            id: 'inv-1',
            status: 'UNPAID',
            is_finalized: false,
            metadata: { source_order_id: 'ord-1' },
          });
        }
        if (table === 'zen_order_costs') {
          return createChainableMock([{ unit_price: 500, quantity: 2 }]);
        }
        if (table === 'zen_invoice_history') {
          return createChainableMock();
        }
        return createChainableMock();
      });

      const res = await finalizeInvoice('inv-1', '긴급 업데이트');
      expect(res.success).toBe(true);
    });

    it('Agency가 본인 소속 화주 인보이스 마감 시 성공', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'agency-usr-1' },
        profile: { id: 'agency-usr-1', role: USER_ROLES.AGENCY, org_id: 'agency-org-1' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock({
            id: 'inv-1',
            status: 'UNPAID',
            is_finalized: false,
            metadata: { source_order_id: 'ord-1' },
          });
        }
        if (table === 'zen_agency_shippers') {
          return createChainableMock([{ shipper_org_id: 'shipper-1' }]);
        }
        if (table === 'zen_orders') {
          return createChainableMock({ shipper_id: 'shipper-1' });
        }
        if (table === 'zen_order_costs') {
          return createChainableMock([{ unit_price: 1000, quantity: 1 }]);
        }
        if (table === 'zen_invoice_history') {
          return createChainableMock();
        }
        return createChainableMock();
      });

      const res = await finalizeInvoice('inv-1');
      expect(res.success).toBe(true);
    });

    it('이미 마감된 인보이스 재마감 시 에러 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'admin-usr-1' },
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock({
            id: 'inv-1',
            status: 'UNPAID',
            is_finalized: true,
            metadata: { source_order_id: 'ord-1' },
          });
        }
        return createChainableMock();
      });

      const res = await finalizeInvoice('inv-1');
      expect(res.success).toBe(false);
      expect(res.error).toContain('이미 정산이 마감된 인보이스');
    });

    it('Agency가 타 소속 화주 인보이스 마감 시 에러 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'agency-usr-1' },
        profile: { id: 'agency-usr-1', role: USER_ROLES.AGENCY, org_id: 'agency-org-1' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock({
            id: 'inv-1',
            status: 'UNPAID',
            is_finalized: false,
            metadata: { source_order_id: 'ord-1' },
          });
        }
        if (table === 'zen_agency_shippers') {
          return createChainableMock([{ shipper_org_id: 'shipper-other' }]);
        }
        if (table === 'zen_orders') {
          return createChainableMock({ shipper_id: 'shipper-1' });
        }
        return createChainableMock();
      });

      const res = await finalizeInvoice('inv-1');
      expect(res.success).toBe(false);
      expect(res.error).toContain('본인 소속 화주의 인보이스만 마감할 수 있습니다.');
    });

    it('권한 없는 역할(CORPORATE) 마감 시 에러 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'corp-usr-1' },
        profile: { id: 'corp-usr-1', role: USER_ROLES.CORPORATE, org_id: 'corp-org-1' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock({
            id: 'inv-1',
            status: 'UNPAID',
            is_finalized: false,
            metadata: { source_order_id: 'ord-1' },
          });
        }
        return createChainableMock();
      });

      const res = await finalizeInvoice('inv-1');
      expect(res.success).toBe(false);
      expect(res.error).toContain('정산 마감 권한이 없습니다.');
    });

    it('인보이스 미조회 시 에러 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'admin-usr-1' },
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock(null, { message: 'Not found' });
        }
        return createChainableMock();
      });

      const res = await finalizeInvoice('inv-nonexistent');
      expect(res.success).toBe(false);
      expect(res.error).toContain('인보이스를 찾을 수 없습니다.');
    });
  });
});
