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

const adminClientMock = vi.hoisted(() => ({ current: null as any }));
vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn(async () => adminClientMock.current),
}));
vi.mock('@/lib/params/service', () => ({ getNumericParam: vi.fn().mockResolvedValue(1350) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));

import { InvoiceGenerator } from '@/lib/finance/settlement/invoice-generator';

/** 가드(zen_orders.maybeSingle)와 이후 조회를 구분하는 최소 client. */
function adminClient(options: { transport?: string | null; guardError?: { message: string } | null }) {
  return {
    from(table: string) {
      const node: any = {
        select: () => node,
        insert: () => node,
        update: () => node,
        eq: () => node,
        in: () => node,
        neq: () => node,
        is: () => node,
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => {
          if (table === 'zen_orders') {
            return { data: options.guardError ? null : { transport_mode: options.transport ?? 'AIR' }, error: options.guardError ?? null };
          }
          return { data: null, error: null };
        },
        then: (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null }),
      };
      return node;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TASK-B-381 PR-3 — InvoiceGenerator 공통 진입점 UPS 거부', () => {
  it('UPS 오더 → ups_invoice_blocked, warn 기록, 이후 생성 로직 미실행', async () => {
    adminClientMock.current = adminClient({ transport: 'UPS' });
    const generator = new InvoiceGenerator();

    const res = await generator.generateInvoice('order-ups');

    expect(res).toEqual({ success: false, message: 'ups_invoice_blocked' });
    expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('[InvoiceGenerator] UPS order blocked'));
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it('가드 조회 실패 → generic:ORDER_LOOKUP(fail-closed), error 기록', async () => {
    adminClientMock.current = adminClient({ guardError: { message: 'forced guard failure' } });
    const generator = new InvoiceGenerator();

    const res = await generator.generateInvoice('order-1');

    expect(res).toEqual({ success: false, message: 'generic:ORDER_LOOKUP' });
    expect(loggerMock.error).toHaveBeenCalledWith(
      '[InvoiceGenerator] order guard lookup failed:',
      'forced guard failure',
    );
    expect(loggerMock.error).toHaveBeenCalledWith('InvoiceGenerator Error:', expect.any(Error));
  });

  it('비UPS 오더는 가드에서 막히지 않는다(양성 대조)', async () => {
    adminClientMock.current = adminClient({ transport: 'AIR' });
    const generator = new InvoiceGenerator();

    const res = await generator.generateInvoice('order-air');

    expect(res.success).toBe(false);
    expect((res as { message?: string }).message).not.toBe('ups_invoice_blocked');
    expect(loggerMock.warn).not.toHaveBeenCalledWith(expect.stringContaining('UPS order blocked'));
  });
});
