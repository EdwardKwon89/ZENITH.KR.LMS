// TASK-B-367 (Issue #1377) + TASK-B-382 (Issue #1377/1463):
// unmarkOrderCostSettled 거부 사유·포함 확인 RPC(fail-closed)·조건부 UPDATE 단위 검증.
import { describe, it, expect, vi, beforeEach } from 'vitest';

type State = {
  profile: any;
  order: any;
  orderError: any;
  included: unknown;
  rpcError: any;
  rpcCalls: [string, Record<string, unknown>][];
  updated: any[];
  updateError: any;
  updatePayload: any;
  eqCalls: [string, unknown][];
};

const state: State = {
  profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
  order: { id: 'order-1', cost_settlement_status: 'SETTLED' },
  orderError: null,
  included: false,
  rpcError: null,
  rpcCalls: [],
  updated: [{ id: 'order-1' }],
  updateError: null,
  updatePayload: null,
  eqCalls: [],
};

const mockValidateUserAction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidateUserAction }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));

/** 체이너블 쿼리 mock — 최종 await / single() 결과를 state에서 읽는다. */
function chain(result: () => { data: any; error: any }) {
  const c: any = {};
  for (const m of ['select', 'limit', 'order', 'filter', 'neq', 'in']) c[m] = () => c;
  c.eq = (col: string, val: unknown) => { state.eqCalls.push([col, val]); return c; };
  c.single = async () => result();
  c.maybeSingle = async () => result();
  c.then = (resolve: any, reject?: any) => Promise.resolve(result()).then(resolve, reject);
  return c;
}

const mockSupabase: any = {
  from: (table: string) => {
    if (table === 'zen_orders') {
      return {
        select: () => chain(() => ({ data: state.order, error: state.orderError })),
        update: (payload: any) => {
          state.updatePayload = payload;
          return chain(() => ({ data: state.updated, error: state.updateError }));
        },
      };
    }
    // TASK-B-382: 앱은 청구서 항목 테이블을 직접 조회하지 않는다.
    throw new Error(`unexpected table: ${table}`);
  },
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push([fn, args]);
    return { data: state.included, error: state.rpcError };
  },
};

import { logger } from '@/lib/logger';
import { unmarkOrderCostSettled } from '@/app/actions/finance/ups-actual-cost';

const K = {
  permission: '권한이 없습니다.',
  orderNotFound: '오더를 찾을 수 없습니다.',
  notFound: '대상을 찾을 수 없습니다.',
  includes: '이 오더는 청구서에 포함되어 정산을 해제할 수 없습니다. 먼저 청구서를 취소하세요.',
  statementLookup: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: STATEMENT_ITEM_LOOKUP)',
  unmarkUpdate: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: UNMARK_UPDATE)',
  unexpected: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: UNEXPECTED)',
};
const RPC_NAME = 'zen_billing_statement_order_included';

beforeEach(() => {
  vi.clearAllMocks();
  state.profile = { id: 'user-1', role: 'ADMIN', org_id: 'org-1' };
  state.order = { id: 'order-1', cost_settlement_status: 'SETTLED' };
  state.orderError = null;
  state.included = false;
  state.rpcError = null;
  state.rpcCalls = [];
  state.updated = [{ id: 'order-1' }];
  state.updateError = null;
  state.updatePayload = null;
  state.eqCalls = [];
  mockValidateUserAction.mockImplementation(async () => ({
    supabase: mockSupabase, user: { id: 'user-1' }, profile: state.profile,
  }));
});

describe('unmarkOrderCostSettled — 거부 사유 (단위)', () => {
  it('Admin 아님 → permission_denied, DB 조회/RPC 0건', async () => {
    state.profile = { id: 'u', role: 'AGENCY', org_id: 'org-1' };
    const res = await unmarkOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe(K.permission);
    expect(state.eqCalls).toHaveLength(0);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it('오더 조회 오류 → order_not_found + 원본 error 를 logger.error 로 전달', async () => {
    const original = { message: 'db down' };
    state.orderError = original;
    const res = await unmarkOrderCostSettled('order-1');
    expect(res.error).toBe(K.orderNotFound);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('order lookup failed'), original);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it('NOT_SETTLED 오더 → not_found, RPC/UPDATE 미실행', async () => {
    state.order = { id: 'order-1', cost_settlement_status: 'NOT_SETTLED' };
    const res = await unmarkOrderCostSettled('order-1');
    expect(res.error).toBe(K.notFound);
    expect(state.rpcCalls).toHaveLength(0);
    expect(state.updatePayload).toBeNull();
  });

  it('포함 확인 RPC 오류 → generic 실패(fail-closed), UPDATE 미실행', async () => {
    const original = { message: 'permission denied for function' };
    state.rpcError = original;
    const res = await unmarkOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe(K.statementLookup);
    expect(res.error).not.toBe(K.includes);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('statement inclusion RPC failed'), original);
    expect(state.updatePayload).toBeNull();
  });

  it('RPC 반환값이 boolean이 아니면 해제 차단(fail-closed)', async () => {
    state.included = null;
    const res = await unmarkOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe(K.statementLookup);
    expect(state.updatePayload).toBeNull();
  });

  it('포함 확인 RPC true → statement_includes_order, UPDATE 미실행', async () => {
    state.included = true;
    const res = await unmarkOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe(K.includes);
    expect(logger.warn).toHaveBeenCalled();
    expect(state.rpcCalls).toEqual([[RPC_NAME, { p_order_id: 'order-1' }]]);
    expect(state.updatePayload).toBeNull();
  });

  it.each(['MANAGER', 'ZENITH_SUPER_ADMIN'])('%s도 포함 오더 해제 거부', async (role) => {
    state.profile = { id: 'user-1', role, org_id: 'org-1' };
    state.included = true;
    const res = await unmarkOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe(K.includes);
  });

  it('조건부 UPDATE 오류 → generic 실패', async () => {
    const original = { message: 'update failed' };
    state.updateError = original;
    const res = await unmarkOrderCostSettled('order-1');
    expect(res.error).toBe(K.unmarkUpdate);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('conditional update failed'), original);
  });

  it('조건부 UPDATE 영향 행 0건(경합) → not_found + logger.warn', async () => {
    state.updated = [];
    const res = await unmarkOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe(K.notFound);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('concurrent unmark'));
  });

  it('예외 발생 → generic 실패 + 원본 에러 로깅', async () => {
    const original = new Error('boom');
    mockValidateUserAction.mockRejectedValueOnce(original);
    const res = await unmarkOrderCostSettled('order-1');
    expect(res.success).toBe(false);
    expect(res.error).toBe(K.unexpected);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('unmarkOrderCostSettled failed'), original);
  });
});

describe('unmarkOrderCostSettled — 성공', () => {
  it('미포함(RPC false) → 상태 되돌림 + 조건부 UPDATE 술어 확인', async () => {
    const res = await unmarkOrderCostSettled('order-1');
    expect(res).toEqual({ success: true });
    expect(state.rpcCalls).toEqual([[RPC_NAME, { p_order_id: 'order-1' }]]);
    expect(state.updatePayload).toEqual({
      cost_settlement_status: 'NOT_SETTLED',
      cost_settled_at: null,
      cost_settled_by: null,
    });
    expect(state.eqCalls.some(([col, val]) => col === 'id' && val === 'order-1')).toBe(true);
    expect(state.eqCalls.some(([col, val]) => col === 'cost_settlement_status' && val === 'SETTLED')).toBe(true);
  });

  it('MANAGER 미포함 오더는 기존 동작 유지(해제 허용)', async () => {
    state.profile = { id: 'user-1', role: 'MANAGER', org_id: 'org-1' };
    const res = await unmarkOrderCostSettled('order-1');
    expect(res).toEqual({ success: true });
  });
});
