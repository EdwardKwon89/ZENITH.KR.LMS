import { describe, it, expect, vi, beforeEach } from 'vitest';

const createChainableMock = (data: any = null, error: any = null) => {
  const mockObj: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'gte', 'lte', 'neq', 'range'];
  methods.forEach((method) => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });
  mockObj.then = (resolve: any) => resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
  return mockObj;
};

const mockSupabase = { from: vi.fn() };

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/utils/date-kst', () => ({
  getKstToday: vi.fn().mockReturnValue('2026-08-09'),
}));

import { validateAdminAction } from '@/lib/auth/guards';
import { listExchangeRates, setManualExchangeRate, getExchangeRateSyncStatus } from '@/app/actions/admin/exchange-rates';

describe('TASK-B-257: 관리자 환율 관리 서버 액션 (Issue #999)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateAdminAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-1', role: 'ADMIN' },
    });
  });

  it('TC-999-EXR-A1: 수동 보정 입력 → MANUAL 소스 upsert (created_by=관리자)', async () => {
    const chain = createChainableMock({ id: 'exr-1' });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_exchange_rates') return chain;
      return createChainableMock();
    });

    const res = await setManualExchangeRate({
      base_currency: 'usd',
      quote_currency: 'krw',
      rate: 1380,
      rate_date: '2026-08-09',
    });

    expect(res.success).toBe(true);
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        base_currency: 'USD',
        quote_currency: 'KRW',
        rate: 1380,
        rate_date: '2026-08-09',
        source: 'MANUAL',
        is_active: true,
        created_by: 'admin-1',
      }),
      { onConflict: 'base_currency,quote_currency,rate_date' }
    );
  });

  it('TC-999-EXR-A2: 유효하지 않은 입력(음수/0 환율) → DB 호출 없이 에러', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_exchange_rates') return createChainableMock();
      return createChainableMock();
    });

    await expect(
      setManualExchangeRate({ rate: 0, rate_date: '2026-08-09' })
    ).rejects.toThrow('환율은 0보다 커야 합니다');
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('TC-999-EXR-A3: 잘못된 일자 형식 → 에러', async () => {
    await expect(
      setManualExchangeRate({ rate: 1380, rate_date: '2026/08/09' })
    ).rejects.toThrow('YYYY-MM-DD');
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('TC-999-EXR-A4: 이력 조회 → rate_date 내림차순 + range 페이징', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_exchange_rates') {
        const chain = createChainableMock([{ id: 'exr-1', rate_date: '2026-08-09' }]);
        return chain;
      }
      return createChainableMock();
    });

    const res = await listExchangeRates(1, 50);

    expect(res.rates).toHaveLength(1);
    expect(res.total).toBe(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_exchange_rates');
    expect((mockSupabase.from as any).mock.results[0].value.order).toHaveBeenCalledWith('rate_date', { ascending: false });
    expect((mockSupabase.from as any).mock.results[0].value.range).toHaveBeenCalledWith(0, 49);
  });

  it('TC-999-EXR-A5: 수집 상태 — 오늘 KOREAEXIM_API 행 존재 시 syncedToday=true', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_exchange_rates') {
        return createChainableMock(
          { rate_date: '2026-08-09', fetched_at: '2026-08-09T02:30:00Z', source: 'KOREAEXIM_API', rate: 1382 },
          null
        );
      }
      return createChainableMock();
    });

    const status = await getExchangeRateSyncStatus();

    expect(status.syncedToday).toBe(true);
    expect(status.lastRate).toBe(1382);
    expect(status.lastRateDate).toBe('2026-08-09');
  });

  it('TC-999-EXR-A6: 수집 상태 — 오늘 수집 없으면 syncedToday=false', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_exchange_rates') {
        return createChainableMock(
          { rate_date: '2026-08-07', fetched_at: '2026-08-07T02:30:00Z', source: 'KOREAEXIM_API', rate: 1375 },
          null
        );
      }
      return createChainableMock();
    });

    const status = await getExchangeRateSyncStatus();

    expect(status.syncedToday).toBe(false);
    expect(status.lastRateDate).toBe('2026-08-07');
  });
});
