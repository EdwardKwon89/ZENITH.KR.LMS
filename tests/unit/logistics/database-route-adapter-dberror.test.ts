import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseRouteAdapter } from '@/lib/logistics/adapters/DatabaseRouteAdapter';
import { logger } from '@/lib/logger';

/**
 * TASK-1139 (Issue #1184): DatabaseRouteAdapter DB에러/무경로 구분불가 개선
 *
 * TC-DBE: DB 조회 실패(error) 시에만 logger.error 기록,
 *         정상 빈 결과는 기존대로 조용히 처리되는지 검증
 */

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

type QueryResult = { data: unknown; error: unknown };

function createQueryHandler(result: QueryResult) {
  const handler: any = {};
  for (const method of ['select', 'eq', 'lte', 'or', 'order', 'limit']) {
    handler[method] = vi.fn().mockReturnThis();
  }
  handler.maybeSingle = vi.fn().mockResolvedValue(result);
  handler.then = (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject);
  return handler;
}

const DB_ERROR = { message: 'connection terminated unexpectedly', code: 'PGRST-XXX' };

function createSupabase(routeNetworkResult?: QueryResult, rateCardResult?: QueryResult) {
  const mock: any = { from: vi.fn() };
  mock.from.mockImplementation((table: string) => {
    if (table === 'zen_route_network') return createQueryHandler(routeNetworkResult ?? { data: [], error: null });
    if (table === 'zen_rate_cards') return createQueryHandler(rateCardResult ?? { data: null, error: null });
    throw new Error(`unexpected table: ${table}`);
  });
  return mock;
}

const ROUTE_ROW = {
  id: 'route-1',
  carrier_id: 'carrier-air',
  from_port_id: 'ICN',
  to_port_id: 'SIN',
  transport_mode: 'AIR',
  transit_days: 2,
  is_active: true,
  carrier: { code: 'ZENITH_AIR', name: 'ZENITH Air Cargo', transport_mode: 'AIR' },
};

describe('TC-DBE: DatabaseRouteAdapter DB 에러/빈결과 구분 로깅', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[TC-DBE-01] 직항 경로 조회에서 DB 에러 발생 시 logger.error를 기록하고 빈 배열을 반환한다', async () => {
    const supabase = createSupabase({ data: null, error: DB_ERROR });
    const adapter = new DatabaseRouteAdapter(supabase);

    const result = await adapter.getPotentialRoutes('ICN', 'SIN');

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      '[DB_ROUTE_ADAPTER] Direct route query failed (ICN -> SIN):',
      DB_ERROR.message
    );
    expect(result).toEqual([]);
  });

  it('[TC-DBE-02] 직항 경로가 정상적으로 없는 경우(data=[]) 로그 없이 조용히 처리한다', async () => {
    const supabase = createSupabase({ data: [], error: null });
    const adapter = new DatabaseRouteAdapter(supabase);

    const result = await adapter.getPotentialRoutes('ICN', 'SIN');

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('[TC-DBE-03] 요율 조회에서 DB 에러 발생 시 logger.error를 기록하고 cost 0으로 계속 진행한다', async () => {
    const supabase = createSupabase({ data: [ROUTE_ROW], error: null }, { data: null, error: DB_ERROR });
    const adapter = new DatabaseRouteAdapter(supabase);

    const result = await adapter.getPotentialRoutes('ICN', 'SIN');

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      '[DB_ROUTE_ADAPTER] Rate card query failed (carrier-air/AIR):',
      DB_ERROR.message
    );
    expect(result).toHaveLength(1);
    expect(result[0].segments[0].cost).toBe(0);
  });

  it('[TC-DBE-04] 요율 카드가 정상적으로 없는 경우(data=null) 로그 없이 cost 0 처리한다', async () => {
    const supabase = createSupabase({ data: [ROUTE_ROW], error: null }, { data: null, error: null });
    const adapter = new DatabaseRouteAdapter(supabase);

    const result = await adapter.getPotentialRoutes('ICN', 'SIN');

    expect(logger.error).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].segments[0].cost).toBe(0);
  });

  it('[TC-DBE-05] 정상 흐름(경로+요율 모두 존재)에서는 에러 로그 없이 옵션을 생성한다', async () => {
    const rateResult = { data: { tiers: { weight_slabs: [{ weight_min: 0, unit_price: 5.5 }] } }, error: null };
    const supabase = createSupabase({ data: [ROUTE_ROW], error: null }, rateResult);
    const adapter = new DatabaseRouteAdapter(supabase);

    const result = await adapter.getPotentialRoutes('ICN', 'SIN');

    expect(logger.error).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].total_cost).toBe(5.5);
    expect(result[0].total_transit_days).toBe(2);
  });
});
