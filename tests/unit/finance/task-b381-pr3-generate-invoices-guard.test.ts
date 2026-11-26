import { describe, it, expect, vi, beforeEach } from 'vitest';

const trErrorMock = vi.hoisted(() => vi.fn(async (key: string) => key));
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

import { validateUserAction } from '@/lib/auth/guards';
import { generateInvoicesForOrder } from '@/app/actions/finance/settlement';

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

beforeEach(() => {
  vi.clearAllMocks();
  (validateUserAction as any).mockResolvedValue({
    supabase: guardClient({ transport: 'AIR' }),
    profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
  });
  generatorMock.generateInvoice.mockResolvedValue({ success: true, invoice: { id: 'inv-1' } });
});

describe('TASK-B-381 PR-3 — generateInvoicesForOrder 내부 UPS 거부', () => {
  it('UPS 오더 직접 호출 → ups_invoice_blocked, 생성기 미호출', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: guardClient({ transport: 'UPS' }),
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    });

    await expect(generateInvoicesForOrder('order-ups')).rejects.toThrow('ups_invoice_blocked');
    expect(generatorMock.generateInvoice).not.toHaveBeenCalled();
  });

  it('비UPS 오더는 기존대로 생성기를 호출한다(양성 대조)', async () => {
    const res = await generateInvoicesForOrder('order-air');

    expect(res).toEqual({ success: true, invoice: { id: 'inv-1' } });
    expect(generatorMock.generateInvoice).toHaveBeenCalledWith('order-air');
  });

  it('오더 가드 조회 실패는 generic으로 거부하고 생성기를 호출하지 않는다', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: guardClient({ guardError: { message: 'forced lookup failure' } }),
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    });

    await expect(generateInvoicesForOrder('order-1')).rejects.toThrow('generic');
    expect(generatorMock.generateInvoice).not.toHaveBeenCalled();
  });

  it('AGENCY 역할도 UPS 오더는 거부한다(직접 호출 경로 차단)', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: guardClient({ transport: 'UPS' }),
      profile: { id: 'user-1', role: 'AGENCY', org_id: 'agency-1' },
    });

    await expect(generateInvoicesForOrder('order-ups')).rejects.toThrow('ups_invoice_blocked');
    expect(generatorMock.generateInvoice).not.toHaveBeenCalled();
  });
});
