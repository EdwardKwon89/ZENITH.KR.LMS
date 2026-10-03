import { describe, it, expect, vi, beforeEach } from 'vitest';

// TASK-1149 (Issue #1229, DEF-142): getOrders 인증 중복조회 제거 + select 축소
// - 실제 getOrders() + 실제 OrderRepository.findList()를 실행하고,
//   supabase 체인 목으로 전달된 select SQL·필터를 검증하는 behavioral 테스트다.
// - AdminRepository만 목 처리 (pageSize 설정 조회 → 기본 20 유지).

const mockValidateUserAction = vi.fn();
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: (...args: any[]) => mockValidateUserAction(...args),
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/repositories', async (importOriginal: any) => {
  const mod = await importOriginal();
  return {
    ...mod,
    AdminRepository: vi.fn(function (this: any) {
      return {
        findSettingByKey: async () => ({ data: null, error: null }),
      };
    }),
  };
});

import { getOrders } from '@/app/actions/operations/orders';

const REQUIRED_COLUMNS = [
  'id', 'order_no', 'order_type', 'created_at',
  'shipper_id', 'shipper_name', 'recipient_name',
  'origin_port_id', 'dest_port_id',
  'status', 'billing_status', 'transport_mode',
  'pickup_country_code', 'recipient_country_code',
];

function makeChain(result: any) {
  const calls: { selectArgs: any[]; eqArgs: any[][] } = { selectArgs: [], eqArgs: [] };
  const chain: any = {};
  chain.select = vi.fn((...args: any[]) => {
    calls.selectArgs.push(args);
    return chain;
  });
  chain.eq = vi.fn((...args: any[]) => {
    calls.eqArgs.push(args);
    return chain;
  });
  chain.or = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.range = vi.fn(() => chain);
  chain.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return { chain, calls };
}

const ROWS = [
  {
    id: 'o1', order_no: 'ZEN-1', order_type: 'STANDARD', created_at: '2026-10-01T00:00:00Z',
    shipper_id: 'org-1', shipper_name: null, recipient_name: 'R',
    origin_port_id: null, dest_port_id: null, status: 'CREATED', billing_status: 'PENDING',
    transport_mode: 'UPS', pickup_country_code: 'KR', recipient_country_code: 'TH',
    shipper: { name: 'Org' }, origin_port: null, dest_port: null,
  },
];

describe('getOrders 인증 생략 + select 축소 (TASK-1149)', () => {
  let fromCalls: { table: string; chain: any; calls: any }[];

  beforeEach(() => {
    vi.clearAllMocks();
    fromCalls = [];
  });

  function mockSupabase() {
    const supabase: any = {
      from: vi.fn((table: string) => {
        const { chain, calls } = makeChain(
          table === 'zen_orders' ? { data: ROWS, error: null, count: 1 } : { data: null, error: null },
        );
        fromCalls.push({ table, chain, calls });
        return chain;
      }),
    };
    return supabase;
  }

  it('TC-DEDUP-01: [Success] preloaded 제공 시 validateUserAction을 호출하지 않아야 함', async () => {
    // Given
    const supabase = mockSupabase();
    mockValidateUserAction.mockResolvedValue({ supabase, profile: { role: 'ADMIN' }, user: { id: 'u' } });

    // When — 실제 getOrders 호출 (preloaded 전달)
    const result = await getOrders({
      page: 1,
      preloaded: { user: { id: 'u' }, profile: { id: 'u', role: 'ADMIN' }, supabase },
    });

    // Then — 재조회 생략 + 정상 반환
    expect(mockValidateUserAction).not.toHaveBeenCalled();
    expect(result.orders).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('TC-DEDUP-02: [Guard] preloaded 미제공 시 기존 동작 유지 (validateUserAction 호출)', async () => {
    // Given — 기존 호출부 형태 그대로
    const supabase = mockSupabase();
    mockValidateUserAction.mockResolvedValue({
      supabase,
      profile: { id: 'u', role: 'ADMIN' },
      user: { id: 'u' },
    });

    // When
    const result = await getOrders({ page: 1 });

    // Then — 46개 기존 호출부 영향 없음
    expect(mockValidateUserAction).toHaveBeenCalledTimes(1);
    expect(result.orders).toHaveLength(1);
  });

  it('TC-DEDUP-03: [Guard] findList select에 렌더 필수 컬럼이 모두 포함되고 bare *가 없어야 함', async () => {
    // Given
    const supabase = mockSupabase();
    mockValidateUserAction.mockResolvedValue({
      supabase,
      profile: { id: 'u', role: 'ADMIN' },
      user: { id: 'u' },
    });

    // When
    await getOrders({ page: 1 });

    // Then — 실제 findList가 생성한 select SQL 검증
    const ordersFrom = fromCalls.find((f) => f.table === 'zen_orders');
    expect(ordersFrom).toBeTruthy();
    const sql = String(ordersFrom!.calls.selectArgs[0][0]);
    for (const col of REQUIRED_COLUMNS) {
      expect(sql).toContain(col);
    }
    expect(sql).not.toMatch(/(^|[\s,])\*(?=[\s,]|$)/);
  });

  it('TC-DEDUP-04: [Guard] preloaded CORPORATE 프로필의 소속 스코핑이 유지되어야 함', async () => {
    // Given — 대리점/화주 스코핑 (서버 필터, 렌더 무관)
    const supabase = mockSupabase();
    mockValidateUserAction.mockResolvedValue({ supabase, profile: null, user: null });

    // When
    await getOrders({
      page: 1,
      preloaded: {
        user: { id: 'u' },
        profile: { id: 'u', role: 'CORPORATE', org_id: 'org-9' },
        supabase,
      },
    });

    // Then — shipper_id 서버 필터 유지 (보안 회귀 방지)
    const ordersFrom = fromCalls.find((f) => f.table === 'zen_orders');
    expect(ordersFrom!.calls.eqArgs).toContainEqual(['shipper_id', 'org-9']);
  });
});
