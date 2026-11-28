import { describe, it, expect, vi, beforeEach } from 'vitest';

const loggerMock = vi.hoisted(() => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }));
const adminFactory = vi.hoisted(() => ({ current: null as any }));

vi.mock('@/lib/logger', () => ({ logger: loggerMock }));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: vi.fn(async () => adminFactory.current) }));
vi.mock('@/lib/i18n/action-error', () => ({
  trNotification: async (key: string, params?: Record<string, unknown>) =>
    params?.orderNo ? `${key}:${params.orderNo}` : key,
}));

import { notifyUpsSettlementAdmins } from '@/lib/ups/settlement/notify-admins.server';

function client(options: {
  lookupError?: { message: string } | null;
  ids?: string[];
  insertError?: { message: string } | null;
  insertThrows?: boolean;
}) {
  const inserted: any[] = [];
  return {
    inserted,
    from(table: string) {
      if (table === 'zen_profiles') {
        return {
          select: () => ({
            in: async () => ({
              data: options.lookupError ? null : (options.ids ?? []).map((id) => ({ id })),
              error: options.lookupError ?? null,
            }),
          }),
        };
      }
      return {
        insert: async (payload: unknown) => {
          if (options.insertThrows) throw new Error('forced insert exception');
          inserted.push(payload);
          return { error: options.insertError ?? null };
        },
      };
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  adminFactory.current = client({ ids: ['user-1'] });
});

// TASK-B-381 PR-4a — 알림 헬퍼 best-effort 3경로(조회/설정/저장)가 throw하지 않고 warn만 남긴다.
describe('notifyUpsSettlementAdmins — best-effort', () => {
  it('정상: 수신자에게 SYSTEM 알림을 저장한다', async () => {
    await notifyUpsSettlementAdmins({ orderNo: 'ORD-1', orderId: 'order-1' });

    const fake = adminFactory.current;
    expect(fake.inserted).toEqual([expect.objectContaining({
      user_id: 'user-1',
      order_id: 'order-1',
      type: 'SYSTEM',
      title: 'title',
      message: 'body:ORD-1',
      channel: 'IN_APP',
    })]);
  });

  it('수신자 조회 실패: warn 후 종료하고 throw하지 않는다', async () => {
    adminFactory.current = client({ lookupError: { message: 'forced lookup failure' } });

    await expect(notifyUpsSettlementAdmins({ orderNo: 'ORD-1', orderId: 'order-1' })).resolves.toBeUndefined();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'ups-settlement: notification recipients lookup failed (best-effort)',
      { message: 'forced lookup failure' },
    );
  });

  it('설정(관리자 클라이언트) 실패: warn 후 종료하고 throw하지 않는다', async () => {
    adminFactory.current = Promise.reject(new Error('forced setup failure'));

    await expect(notifyUpsSettlementAdmins({ orderNo: 'ORD-1', orderId: 'order-1' })).resolves.toBeUndefined();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'ups-settlement: notification setup failed (best-effort)',
      expect.any(Error),
    );
  });

  it('저장이 오류를 반환하면 warn을 남긴다', async () => {
    adminFactory.current = client({ ids: ['user-1'], insertError: { message: 'forced insert failure' } });

    await notifyUpsSettlementAdmins({ orderNo: 'ORD-1', orderId: 'order-1' });

    expect(loggerMock.warn).toHaveBeenCalledWith(
      'ups-settlement: notification insert failed (best-effort)',
      { message: 'forced insert failure' },
    );
  });

  it('저장 예외도 warn 후 다음 수신자로 진행한다', async () => {
    adminFactory.current = client({ ids: ['user-1'], insertThrows: true });

    await expect(notifyUpsSettlementAdmins({ orderNo: 'ORD-1', orderId: 'order-1' })).resolves.toBeUndefined();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'ups-settlement: notification send failed (best-effort)',
      expect.any(Error),
    );
  });
});
