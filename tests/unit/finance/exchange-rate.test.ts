import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getNumericParam } = vi.hoisted(() => ({
  getNumericParam: vi.fn(),
}));

vi.mock('@/lib/params/service', () => ({ getNumericParam }));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { getExchangeRate } from '@/lib/finance/exchange-rate';

const createChainableMock = (data: any = null, error: any = null) => {
  const mockObj: any = {};
  const methods = ['select', 'eq', 'lte', 'order', 'limit', 'maybeSingle', 'single', 'in', 'not', 'neq'];
  methods.forEach((method) => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

describe('TASK-B-257: getExchangeRate 헬퍼 (Issue #999)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    getNumericParam.mockResolvedValue(1350);
    mockSupabase = { from: vi.fn() };
    (global as any).mockSupabase = mockSupabase;
  });

  it('TC-999-EXR-01: 최근 일자 환율 조회 성공', async () => {
    const chain = createChainableMock({ rate: 1380 });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_exchange_rates') return chain;
      return createChainableMock();
    });

    const rate = await getExchangeRate('USD', 'KRW', '2026-08-09');

    expect(rate).toBe(1380);
    expect(chain.eq).toHaveBeenCalledWith('base_currency', 'USD');
    expect(chain.eq).toHaveBeenCalledWith('quote_currency', 'KRW');
    expect(chain.eq).toHaveBeenCalledWith('is_active', true);
    expect(chain.lte).toHaveBeenCalledWith('rate_date', '2026-08-09');
    expect(chain.order).toHaveBeenCalledWith('rate_date', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it('TC-999-EXR-02: 빈 테이블(신규 배포 직후) → 레거시 파라미터 → 1350 fallback', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_exchange_rates') return createChainableMock(null);
      return createChainableMock();
    });

    const rate = await getExchangeRate('USD', 'KRW');

    expect(rate).toBe(1350);
    expect(getNumericParam).toHaveBeenCalledWith('EXCHANGE_RATE_USD_KRW', 1350);
  });

  it('TC-999-EXR-03: 쿼리 에러 시 fallback', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_exchange_rates') return createChainableMock(null, new Error('boom'));
      return createChainableMock();
    });

    const rate = await getExchangeRate('USD', 'KRW');

    expect(rate).toBe(1350);
  });

  it('TC-999-EXR-04: 주말(미고시일) → rate_date 이전 최근 영업일 환율 사용', async () => {
    const chain = createChainableMock({ rate: 1375 });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_exchange_rates') return chain;
      return createChainableMock();
    });

    const rate = await getExchangeRate('USD', 'KRW', '2026-08-08');

    expect(rate).toBe(1375);
    expect(chain.lte).toHaveBeenCalledWith('rate_date', '2026-08-08');
  });

  it('TC-999-EXR-05: 예외 발생 시 fallback', async () => {
    mockSupabase.from.mockImplementation(() => {
      throw new Error('client error');
    });

    const rate = await getExchangeRate('USD', 'KRW');

    expect(rate).toBe(1350);
  });

  it('TC-999-EXR-06: base/quote 대문자 정규화', async () => {
    const chain = createChainableMock({ rate: 1390 });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_exchange_rates') return chain;
      return createChainableMock();
    });

    const rate = await getExchangeRate('usd', 'krw', '2026-08-09');

    expect(rate).toBe(1390);
    expect(chain.eq).toHaveBeenCalledWith('base_currency', 'USD');
    expect(chain.eq).toHaveBeenCalledWith('quote_currency', 'KRW');
  });
});
