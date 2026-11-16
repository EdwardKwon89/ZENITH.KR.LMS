// TASK-B-354 (Issue #1330): settlement.ts / orders.ts 사용자 도달 오류가 로케일 문장이고
// DB/예외 원문을 포함하지 않으며, logger 가 원문 객체로 호출되는지 검증한다.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

const createChainableMock = (data: any = null, error: any = null) => {
  const mockObj: any = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'filter', 'neq', 'is']) {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  }
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

const mockSupabase: any = { from: vi.fn() };

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
  checkPermission: vi.fn().mockReturnValue(true),
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));
vi.mock('@/lib/repositories', () => {
  const OrderRepository = vi.fn().mockImplementation(function () {
    return {
      findById: vi.fn().mockResolvedValue({
        data: { id: 'order-1', status: 'WAREHOUSED', transport_mode: 'AIR', shipper_id: 'shipper-1', org_id: 'org-1' },
        error: null,
      }),
      findByIdBasic: vi.fn().mockResolvedValue({ data: null }),
      updatePaymentStatus: vi.fn().mockResolvedValue({ data: null, error: null }),
      updateBillingStatusByOrderId: vi.fn(),
    };
  });
  const FinanceRepository = vi.fn().mockImplementation(function () {
    return {
      findByIdBasic: vi.fn().mockResolvedValue({ data: null }),
      findUnpaidSum: vi.fn().mockResolvedValue({ data: [], error: null }),
      findRecentInvoices: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
  });
  return { OrderRepository, FinanceRepository, AdminRepository: vi.fn() };
});
vi.mock('@/lib/finance/settlement', () => ({
  SettlementEngine: vi.fn(),
  InvoiceGenerator: vi.fn().mockImplementation(function () {
    return { generateInvoice: vi.fn().mockResolvedValue({ success: true, invoice: { id: 'inv-1', invoice_no: 'INV-1' } }) };
  }),
}));
vi.mock('@/lib/notifications/email', () => ({ sendInvoiceFinalizedEmail: vi.fn() }));
vi.mock('@/lib/finance/exchange-rate', () => ({ getExchangeRate: vi.fn().mockResolvedValue(1350) }));

import { validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { finalizeInvoice, getOrganizations } from '@/app/actions/finance/settlement';
import { updateOrder } from '@/app/actions/operations/orders';

function mockUser(role: string = USER_ROLES.ADMIN) {
  vi.mocked(validateUserAction).mockResolvedValue({
    supabase: mockSupabase,
    user: { id: 'user-1' },
    profile: { id: 'user-1', role, org_id: 'org-1' },
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('settlement — 반환 오류 로케일 문장 + 원문 은닉 (TASK-B-354)', () => {
  it('finalizeInvoice: 인보이스 없음 → ko 문장 반환, DB 원문 없음', async () => {
    mockUser();
    mockSupabase.from.mockImplementation(() =>
      createChainableMock(null, { message: 'DB_SECRET_INVOICE_3f2' }),
    );

    const result = await finalizeInvoice('inv-missing');

    expect(result).toEqual({ success: false, error: '인보이스를 찾을 수 없습니다.' });
    expect(result.error).not.toContain('DB_SECRET_INVOICE_3f2');
    expect(logger.warn).toHaveBeenCalledWith('finalizeInvoice: invoice not found (inv-missing)');
  });

  it('getOrganizations: DB 오류 → generic(ko)+코드 throw, 원문 미포함, logger.error(에러 객체)', async () => {
    mockUser();
    const dbError = { message: 'DB_SECRET_ORG_77a' };
    mockSupabase.from.mockImplementation(() => createChainableMock(null, dbError));

    let caught: Error | undefined;
    try {
      await getOrganizations();
    } catch (err) {
      caught = err as Error;
    }

    expect(caught?.message).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: ORGANIZATION_LOOKUP)');
    expect(caught?.message).not.toContain('DB_SECRET_ORG_77a');
    expect(logger.error).toHaveBeenCalledWith('getOrganizations: lookup failed', dbError);
  });
});

describe('orders — throw 계약 + 로케일 문장 (TASK-B-354)', () => {
  it('updateOrder: 수정 불가 상태 → reject(정확 ko 문장, 상태 파라미터), logger.warn', async () => {
    mockUser();

    await expect(updateOrder('order-1', {} as any)).rejects.toThrow(
      '현재 상태에서는 오더를 수정할 수 없습니다. (상태: WAREHOUSED)',
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('edit blocked by status WAREHOUSED'));
  });
});
