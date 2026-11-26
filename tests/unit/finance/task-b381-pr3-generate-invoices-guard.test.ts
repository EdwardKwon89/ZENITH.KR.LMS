import { describe, it, expect, vi, beforeEach } from 'vitest';

const trErrorMock = vi.hoisted(() =>
  vi.fn(async (key: string, params?: Record<string, unknown>) =>
    params?.code ? `${key}:${params.code}` : key,
  ),
);
const loggerMock = vi.hoisted(() => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: loggerMock }));
vi.mock('@/lib/i18n/action-error', () => ({
  trError: trErrorMock,
  actionLocale: async () => 'ko',
}));

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

const generatorMock = vi.hoisted(() => ({ generateInvoice: vi.fn() }));
vi.mock('@/lib/finance/settlement', () => ({
  InvoiceGenerator: class {
    generateInvoice = generatorMock.generateInvoice;
  },
  SettlementEngine: class {},
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));

import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { generateInvoicesForOrder, rejectInvoice } from '@/app/actions/finance/settlement';
import { generateInvoiceAction } from '@/app/actions/finance/invoice';

/** zen_orders(가드) → zen_invoices(마감 확인) 순서만 흉내 내는 최소 client. */
function guardClient(result: { transport?: string | null; guardError?: unknown; finalized?: unknown }) {
  return {
    from(table: string) {
      const node: any = {
        select: () => node,
        eq: () => node,
        neq: () => node,
        filter: () => node,
        maybeSingle: async () => {
          if (table === 'zen_orders') {
            return { data: result.guardError ? null : { transport_mode: result.transport ?? 'AIR' }, error: result.guardError ?? null };
          }
          return { data: result.finalized ?? null, error: null };
        },
      };
      return node;
    },
  };
}

function rejectClient(orderId: string) {
  return {
    from(table: string) {
      const node: any = {
        select: () => node,
        update: () => node,
        eq: () => node,
        insert: async () => ({ error: null }),
        single: async () =>
          table === 'zen_invoices'
            ? { data: { id: 'inv-old', invoice_no: 'INV-OLD', status: 'UNPAID', metadata: { source_order_id: orderId } }, error: null }
            : { data: null, error: null },
        then: (resolve: (value: unknown) => unknown) => resolve({ error: null }),
      };
      return node;
    },
  };
}

const ADMIN = { id: 'user-1', role: 'ADMIN', org_id: 'org-1' };

beforeEach(() => {
  vi.clearAllMocks();
  (validateUserAction as any).mockResolvedValue({
    supabase: guardClient({ transport: 'AIR' }),
    profile: ADMIN,
  });
  (validateAdminAction as any).mockResolvedValue({ profile: ADMIN, user: { id: 'user-1' } });
  generatorMock.generateInvoice.mockResolvedValue({ success: true, invoice: { id: 'inv-1' } });
});

describe('TASK-B-381 PR-3 — generateInvoicesForOrder 내부 UPS 거부', () => {
  it('UPS 오더 직접 호출 → ups_invoice_blocked, warn, 생성기 미호출', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: guardClient({ transport: 'UPS' }),
      profile: ADMIN,
    });

    await expect(generateInvoicesForOrder('order-ups')).rejects.toThrow('ups_invoice_blocked');
    expect(generatorMock.generateInvoice).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('UPS order blocked'));
  });

  it('비UPS 오더는 기존대로 생성기를 호출한다(양성 대조)', async () => {
    const res = await generateInvoicesForOrder('order-air');

    expect(res).toEqual({ success: true, invoice: { id: 'inv-1' } });
    expect(generatorMock.generateInvoice).toHaveBeenCalledWith('order-air');
  });

  it('오더 가드 조회 실패는 generic:ORDER_LOOKUP으로 거부하고 error 로그를 남긴다', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: guardClient({ guardError: { message: 'forced lookup failure' } }),
      profile: ADMIN,
    });

    await expect(generateInvoicesForOrder('order-1')).rejects.toThrow('generic:ORDER_LOOKUP');
    expect(generatorMock.generateInvoice).not.toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenCalledWith(
      '[generateInvoicesForOrder] order guard lookup failed:',
      'forced lookup failure',
    );
  });

  it('AGENCY 역할도 UPS 오더는 거부한다(직접 호출 경로 차단)', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: guardClient({ transport: 'UPS' }),
      profile: { ...ADMIN, role: 'AGENCY', org_id: 'agency-1' },
    });

    await expect(generateInvoicesForOrder('order-ups')).rejects.toThrow('ups_invoice_blocked');
    expect(generatorMock.generateInvoice).not.toHaveBeenCalled();
  });
});

describe('TASK-B-381 PR-3 — 관리자 직접 생성·재발행 경로', () => {
  it('generateInvoiceAction: 생성기가 UPS 거부를 반환하면 인보이스 없이 그대로 반환한다', async () => {
    generatorMock.generateInvoice.mockResolvedValue({ success: false, message: 'ups_invoice_blocked' });

    const res = await generateInvoiceAction('order-ups');

    expect(res).toEqual({ success: false, message: 'ups_invoice_blocked' });
    expect(generatorMock.generateInvoice).toHaveBeenCalledWith('order-ups');
  });

  it('generateInvoiceAction: 비UPS는 기존대로 성공 결과를 반환한다(양성 대조)', async () => {
    const res = await generateInvoiceAction('order-air');

    expect(res).toEqual({ success: true, invoice: { id: 'inv-1' } });
  });

  it('rejectInvoice: UPS는 취소만 하고 재발행하지 않는다(newInvoiceId 없음)', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: rejectClient('order-ups'),
      profile: ADMIN,
      user: { id: 'user-1' },
    });
    generatorMock.generateInvoice.mockResolvedValue({ success: false, message: 'ups_invoice_blocked' });

    const res = await rejectInvoice('inv-old');

    expect(res).toEqual({ success: true, newInvoiceId: undefined });
    expect(generatorMock.generateInvoice).toHaveBeenCalledWith('order-ups');
  });

  it('rejectInvoice: 비UPS는 취소 후 재발행한다(양성 대조)', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: rejectClient('order-air'),
      profile: ADMIN,
      user: { id: 'user-1' },
    });
    generatorMock.generateInvoice.mockResolvedValue({ success: true, invoice: { id: 'inv-new' } });

    const res = await rejectInvoice('inv-old');

    expect(res).toEqual({ success: true, newInvoiceId: 'inv-new' });
    expect(generatorMock.generateInvoice).toHaveBeenCalledWith('order-air');
  });
});
