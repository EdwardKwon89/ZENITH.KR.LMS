// TASK-B-360 (Issue #1366) — 후보 조회 상한 신호·paidAt 형식·orderIds 중복 제거 단위 검증
// (PR #1404 검토 보완: "상한 도달 시 신호/실패 동작 테스트" — mock으로 한도를 제어해 실제 500/1000건 생성 없이 검증)
//
// 원칙: 서버 액션 **실제 함수를 호출**하고, DB만 모의한다. 소스 문자열 toContain 단독 단언 금지.
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Chain = { [k: string]: any; then: (r: (v: any) => void) => void };

function makeChain(data: any, error: any = null): Chain {
  const result = { data, error };
  const chain: any = {};
  for (const m of [
    'select', 'insert', 'update', 'delete', 'eq', 'neq', 'not', 'in', 'ilike',
    'order', 'limit', 'range', 'single', 'maybeSingle', 'filter', 'gte', 'lte', 'lt', 'gt', 'is',
  ]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve(result);
  return chain as Chain;
}

const LIMIT_ORDERS = 500;
const LIMIT_ADHOC = 1000;

function makeOrders(n: number): any[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `ord-${String(i).padStart(4, '0')}`,
    order_no: `ZEN-LIM-${i}`,
    status: 'DELIVERED',
    cost_settlement_status: 'SETTLED',
    shipper_id: 'shipper-1',
    agency_org_id: 'agency-1',
    shipper_name: `(주)LIMIT Co ${i}`,
    shipper_biz_no: null,
    shipper: { name: 'Shipper S' },
    agency: { name: 'Agency A' },
  }));
}

/** 프로필 소속 org(id=org-1)는 AGENCY, 청구 대상 org(id≠org-1)는 SHIPPER 로 구분해 대상 해석을 갈라놓는다. */
function makeOrgChain() {
  const filters: Record<string, any> = {};
  const chain: any = {};
  for (const m of ['select', 'maybeSingle', 'single']) chain[m] = vi.fn(() => chain);
  chain.eq = vi.fn((col: string, val: any) => { filters[col] = val; return chain; });
  chain.then = (resolve: any) => resolve({
    data: filters.id === 'org-1' ? { type: 'AGENCY', id: 'org-1' } : { type: 'SHIPPER', id: filters.id ?? 'target-1' },
    error: null,
  });
  return chain;
}

/** loadOwnStatement는 maybeSingle(객체), 조건부 UPDATE 후 select는 배열 — Supabase 계약 차이 재현 */
function makeStatementChain(statement: any, updateResult?: any[]) {
  let single = false;
  const chain: any = {};
  for (const m of ['select', 'update', 'eq', 'insert', 'delete']) chain[m] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => { single = true; return chain; });
  chain.then = (resolve: any) => resolve({
    data: single ? statement : updateResult !== undefined ? updateResult : statement ? [statement] : [],
    error: null,
  });
  return chain;
}

const mockValidateUserAction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidateUserAction }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn((...a: unknown[]) => { console.log('LOGGER_ERROR', String(a[0]), a[1] instanceof Error ? (a[1].message + ' | ' + a[1].stack?.split('\n').slice(0,4).join(' \n ')) : JSON.stringify(a)); }), warn: vi.fn() } }));

import {
  listBillableOrders, listAdhocShipperNames, confirmStatementPayment, createBillingStatement,
} from '@/app/actions/finance/billing-statements';
import { logger } from '@/lib/logger';

function mockSupabase(opts: {
  orders?: any[]; history?: any[]; included?: any[]; statement?: any; rpcData?: any;
  /** 조건부 UPDATE/DELETE의 rowCount 결과 — 빈 배열이면 0건(상태가 바뀐 경우) */
  updateResult?: any[];
} = {}) {
  const orgChain = makeChain({ type: 'SHIPPER', id: 'org-1' });
  const linkChain = makeChain({ id: 'link-1' });
  const orders = opts.orders ?? [];
  const history = opts.history ?? orders.map((o) => ({
    order_id: o.id, created_at: '2026-11-10T10:00:00Z', next_status: 'DELIVERED',
  }));
  const included = opts.included ?? [];
  const statement = opts.statement ?? null;
  const updateResult = opts.updateResult;
  const rpcData = opts.rpcData ?? [];

  const supabase: any = {
    from: vi.fn((table: string) => {
      if (table === 'zen_organizations') return makeOrgChain();
      if (table === 'zen_agency_shippers') return makeChain(linkChain);
      if (table === 'zen_orders') return makeChain(orders);
      if (table === 'order_status_history') return makeChain(history);
      if (table === 'zen_billing_statement_items') return makeChain(included);
      if (table === 'zen_billing_statements') return makeStatementChain(statement, updateResult);
      return makeChain(null);
    }),
    rpc: vi.fn().mockResolvedValue({ data: rpcData, error: null }),
  };
  void orgChain;
  return supabase;
}

function asAgency(supabase: any) {
  mockValidateUserAction.mockResolvedValue({
    supabase,
    user: { id: 'user-1' },
    profile: { id: 'user-1', role: 'AGENCY', org_id: 'org-1', status: 'ACTIVE' },
  });
}

const RANGE = { dateFrom: '2026-11-01', dateTo: '2026-11-30', dateBasis: 'DELIVERED' as const };
const TARGET = { type: 'ORG' as const, orgId: 'shipper-1' };

beforeEach(() => {
  vi.mocked(logger.warn).mockClear();
  vi.mocked(logger.error).mockClear();
});

describe('후보 조회 상한 신호 (truncated)', () => {
  it('오더가 상한(500)에 도달하면 truncated=true + logger.warn (조용한 누락 방지)', async () => {
    asAgency(mockSupabase({ orders: makeOrders(LIMIT_ORDERS) }));
    const res = await listBillableOrders({ ...RANGE, billedTarget: TARGET });
    expect(res.success).toBe(true);
    expect(res.truncated).toBe(true);
    expect(res.orders).toHaveLength(LIMIT_ORDERS);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('500'),
    );
  });

  it('상한 미만이면 truncated=false (정상 경로)', async () => {
    asAgency(mockSupabase({ orders: makeOrders(10) }));
    const res = await listBillableOrders({ ...RANGE, billedTarget: TARGET });
    expect(res.success).toBe(true);
    expect(res.truncated).toBe(false);
    expect(res.orders).toHaveLength(10);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('수기 화주명 자동완성도 상한(1000) 도달 시 truncated=true + logger.warn', async () => {
    // 모두 동일 표기(공백 변형 포함) → 정규화 그룹 1개로 1,000건 집계
    const orders = makeOrders(LIMIT_ADHOC).map((o) => ({ ...o, shipper_name: '  (주)LIMIT   Co ' }));
    asAgency(mockSupabase({ orders }));
    const res = await listAdhocShipperNames();
    expect(res.success).toBe(true);
    expect(res.truncated).toBe(true);
    expect(res.names?.[0]?.count).toBe(LIMIT_ADHOC);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1000'));
  });
});

describe('confirmStatementPayment — paidAt 형식 검증', () => {
  it('YYYY-MM-DD 형식이 아니면 저장하지 않고 generic 오류를 반환한다', async () => {
    const statement = {
      id: 'stmt-1', issuer_org_id: 'org-1', status: 'ISSUED', total_amount: 1000,
    };
    const supabase = mockSupabase({ statement });
    asAgency(supabase);

    const res = await confirmStatementPayment('stmt-1', { amount: 1000, paidAt: '2026/11/21' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('요청을 처리하지 못했습니다');
    // 형식 검증이 UPDATE보다 먼저 실행됨 — 저장 경로에 도달하지 않는다
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid paidAt format'));
  });

  it('정상 형식이면 조건부 UPDATE를 호출한다', async () => {
    const statement = {
      id: 'stmt-2', issuer_org_id: 'org-1', status: 'ISSUED', total_amount: 1000,
    };
    const supabase = mockSupabase({ statement });
    asAgency(supabase);

    const res = await confirmStatementPayment('stmt-2', { amount: 1000, paidAt: '2026-11-21' });
    expect(res.success).toBe(true);
    const chains = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.filter((c: any[]) => c[0] === 'zen_billing_statements');
    expect(chains.length).toBeGreaterThan(0);
  });
});

describe('createBillingStatement — orderIds 중복 제거', () => {
  it('중복 id를 제거한 배열로 RPC를 호출한다', async () => {
    const supabase = mockSupabase({ rpcData: [{ stmt_id: 's1', stmt_no: 'ST-1', stmt_round: 1, item_count: 2, zero_amount_count: 0 }] });
    asAgency(supabase);

    const res = await createBillingStatement({
      billedTarget: TARGET, year: 2026, month: 11,
      orderIds: ['ord-0001', 'ord-0001', 'ord-0002', 'ord-0002', 'ord-0002'],
    });
    expect(res.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    const arg = (supabase.rpc as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(arg.p_order_ids).toEqual(['ord-0001', 'ord-0002']);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('duplicate orderIds removed'));
  });
});

describe('TOCTOU — 분류와 UPDATE 사이 상태가 바뀐 경우 (조건부 술어 rowCount authority)', () => {
  it('분류는 ISSUED지만 조건부 UPDATE가 0건이면 오류를 반환한다', async () => {
    // maybeSingle → ISSUED (분류 통과) / update+select → [] (그 사이 다른 세션이 상태를 바꿈)
    const statement = { id: 'stmt-toc', issuer_org_id: 'org-1', status: 'ISSUED', total_amount: 500 };
    const supabase = mockSupabase({ statement, updateResult: [] });
    asAgency(supabase);

    const res = await confirmStatementPayment('stmt-toc', { amount: 500, paidAt: '2026-11-21' });
    expect(res.success).toBe(false);
    expect(res.error).toBe('발행(확정)된 청구서만 입금확인할 수 있습니다.');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('rowCount=0'));
  });

  it('분류는 DRAFT지만 DELETE가 0건이면 오류를 반환한다 (취소 경로)', async () => {
    const statement = { id: 'stmt-toc2', issuer_org_id: 'org-1', status: 'DRAFT', total_amount: 0 };
    const supabase = mockSupabase({ statement, updateResult: [] });
    asAgency(supabase);

    const { cancelBillingStatement } = await import('@/app/actions/finance/billing-statements');
    const res = await cancelBillingStatement('stmt-toc2');
    expect(res.success).toBe(false);
    expect(res.error).toBe('초안(DRAFT) 상태의 청구서만 처리할 수 있습니다.');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('rowCount=0'));
  });
});

describe('dateRangeError 형식 검증 (PR #1410 후속 권고 3)', () => {
  it('YYYY-MM-DD 형식이 아니면 DATE_RANGE_INVALID — UNEXPECTED(RangeError)로 새지 않는다', async () => {
    asAgency(mockSupabase({ orders: [] }));
    const res = await listBillableOrders({
      ...RANGE, dateTo: 'abc', billedTarget: TARGET,
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: DATE_RANGE_INVALID)');
    expect(logger.error).not.toHaveBeenCalled(); // RangeError → UNEXPECTED 경로를 밟지 않는다
  });

  it('형식은 맞지만 역전된 기간도 DATE_RANGE_INVALID', async () => {
    asAgency(mockSupabase({ orders: [] }));
    const res = await listBillableOrders({
      ...RANGE, dateFrom: '2026-11-30', dateTo: '2026-11-01', billedTarget: TARGET,
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: DATE_RANGE_INVALID)');
  });
});
