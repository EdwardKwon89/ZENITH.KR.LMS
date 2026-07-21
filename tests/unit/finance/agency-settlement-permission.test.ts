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
      generateInvoice: vi.fn().mockResolvedValue({
        success: true,
        invoice: { id: 'inv-reissued', invoice_no: 'INV-REISSUED', metadata: {} },
      }),
    };
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/params/service', () => ({
  getNumericParam: vi.fn().mockResolvedValue(1350),
}));

import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { generateInvoicesForOrder, finalizeInvoice, updatePaymentStatus, calculateSettlementAction, createPostFinalizationAdjustment, rejectInvoice } from '@/app/actions/finance/settlement';

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

    it('마감된 오더의 인보이스 생성 차단 가드 정상 동작', async () => {
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
        if (table === 'zen_invoices') {
          return createChainableMock({ id: 'inv-1' });
        }
        return createChainableMock();
      });

      await expect(generateInvoicesForOrder('ord-1')).rejects.toThrow('이미 정산이 마감된 오더');
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
    it('Admin이 사유 없이 마감 시 실패', async () => {
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
        return createChainableMock();
      });

      const res = await finalizeInvoice('inv-1');
      expect(res.success).toBe(false);
      expect(res.error).toContain('사유를 입력');
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

  describe('createPostFinalizationAdjustment (TASK-194-C)', () => {
    it('마감 후 조정 시 신규 추가 인보이스 발행', async () => {
      (validateAdminAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'admin-usr-1' },
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          callCount++;
          if (callCount === 1) {
            // 원 인보이스 조회
            return createChainableMock({ id: 'inv-orig', shipper_id: 'shipper-1', metadata: { source_order_id: 'ord-1' }, invoice_no: 'INV-20260721-0001' });
          }
          if (callCount === 2) {
            // 신규 인보이스 생성
            return createChainableMock({ id: 'inv-new', invoice_no: 'INV-20260721-0002' });
          }
          // total_amount 갱신
          return createChainableMock();
        }
        if (table === 'zen_orders') {
          return createChainableMock({ order_no: 'ORD-2026-001' });
        }
        if (table === 'zen_order_costs') {
          // linkAdjustmentCosts: 연결할 비용 없음
          return createChainableMock([]);
        }
        return createChainableMock();
      });

      const { createPostFinalizationAdjustment } = await import('@/app/actions/finance/settlement');
      const res = await createPostFinalizationAdjustment('ord-1', 50, 'USD', 'admin-usr-1', 'inv-orig');
      expect(res.success).toBe(true);
      expect(res.adjustmentAmount).toBe(50);
    });

    it('조정 금액 0일 때 인보이스 미생성', async () => {
      (validateAdminAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'admin-usr-1' },
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock({ id: 'inv-orig', shipper_id: 'shipper-1', metadata: {}, invoice_no: 'INV-001' });
        }
        return createChainableMock();
      });

      const { createPostFinalizationAdjustment } = await import('@/app/actions/finance/settlement');
      const res = await createPostFinalizationAdjustment('ord-1', 0, 'USD', 'admin-usr-1', 'inv-orig');
      expect(res.success).toBe(true);
      expect(res.adjustmentAmount).toBe(0);
    });
  });

  describe('rejectInvoice (TASK-194-C)', () => {
    it('화주 거부 시 인보이스 CANCELED 전환 + 재발행', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'admin-usr-1' },
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      let invoiceCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          invoiceCallCount++;
          if (invoiceCallCount === 1) {
            return createChainableMock({
              id: 'inv-1', status: 'UNPAID', is_finalized: true,
              metadata: { source_order_id: 'ord-1' }, invoice_no: 'INV-001',
            });
          }
          return createChainableMock();
        }
        if (table === 'zen_order_costs') {
          return createChainableMock([]);
        }
        return createChainableMock();
      });

      const { rejectInvoice } = await import('@/app/actions/finance/settlement');
      const res = await rejectInvoice('inv-1');
      expect(res.success).toBe(true);
      expect(res.newInvoiceId).toBeDefined();
    });

    it('이미 취소된 인보이스 거부 시 에러', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'admin-usr-1' },
        profile: { id: 'admin-usr-1', role: USER_ROLES.ADMIN },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock({
            id: 'inv-1', status: 'CANCELED',
            metadata: { source_order_id: 'ord-1' },
          });
        }
        return createChainableMock();
      });

      const { rejectInvoice } = await import('@/app/actions/finance/settlement');
      const res = await rejectInvoice('inv-1');
      expect(res.success).toBe(false);
      expect(res.error).toContain('이미 취소된 인보이스');
    });

    it('권한 없는 사용자가 거부 시 에러', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'corp-usr-1' },
        profile: { id: 'corp-usr-1', role: USER_ROLES.CORPORATE, org_id: 'corp-org-1' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_invoices') {
          return createChainableMock({
            id: 'inv-1', status: 'UNPAID',
            metadata: { source_order_id: 'ord-1' },
          });
        }
        return createChainableMock();
      });

      const { rejectInvoice } = await import('@/app/actions/finance/settlement');
      const res = await rejectInvoice('inv-1');
      expect(res.success).toBe(false);
    });
  });
});
