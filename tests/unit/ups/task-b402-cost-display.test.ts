// TASK-B-402 (Issue #1451, B-377 구현 PR-A): 가드·가더 함수·라벨 audience 단언 테스트.
// - getUpsActualCost: 허용 집합 외 역할은 logger.warn + permission_denied, SUB_ADMIN은 통과
// - getOrderAdditionalCharges: 소유·tier 검증, 최신 version, DTO는 항목 컬럼만(원가 미반환)
// - getCostTypeLabel: audience 'neutral' → "부가운임"
// 단언 기준: 호출 여부가 아니라 **레벨·인자·반환값**으로 검증한다(반복 지적 유형 차단).
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: vi.fn() }));
vi.mock('@/lib/i18n/action-error', () => ({
  trError: vi.fn(async (key: string, params?: Record<string, unknown>) =>
    params?.code ? `${key}:${String(params.code)}` : key),
  actionLocale: vi.fn(async () => 'ko'),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { logger } from '@/lib/logger';
import { validateUserAction } from '@/lib/auth/guards';
import { getCostTypeLabel } from '@/lib/finance/settlement/cost-type-labels';
import { getOrderAdditionalCharges } from '@/app/actions/finance/additional-charges';

function chain(result: Record<string, unknown>) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'in', 'update', 'insert']) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.single = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return c;
}

function supabaseOf(tables: Record<string, Record<string, unknown>>) {
  return { from: vi.fn((t: string) => chain(tables[t] ?? { data: null, error: null })) } as never;
}

function mockAuth(role: string, orgId: string | null = 'org-1') {
  vi.mocked(validateUserAction).mockResolvedValue({
    supabase: null,
    profile: { id: 'p1', role, org_id: orgId },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCostTypeLabel audience (설계 §5 — neutral 라벨)', () => {
  it('기본(admin)은 원문 라벨, neutral은 "부가운임"', () => {
    expect(getCostTypeLabel('BASE_FREIGHT')).toBe('기본운임');
    expect(getCostTypeLabel('FUEL_SURCHARGE')).toBe('유류할증료');
    expect(getCostTypeLabel('BASE_FREIGHT', 'neutral')).toBe('부가운임');
    expect(getCostTypeLabel('UNKNOWN_TYPE', 'neutral')).toBe('부가운임');
    // neutral은 원문 유형명이 그대로 노출되지 않는다
    expect(getCostTypeLabel('FUEL_SURCHARGE', 'neutral')).not.toBe('유류할증료');
  });
});

describe('getOrderAdditionalCharges — 소유·tier 검증과 DTO 제한 (설계 §3-1)', () => {
  const ORDER = { id: 'o1', shipper_id: 'ship-org', agency_org_id: 'agency-org' };

  it('admin 3역할: tier 필터 없이 전체 항목 + DTO는 항목 컬럼만(원가 미반환)', async () => {
    mockAuth('ADMIN');
    const charges = chain({
      data: [
        { line_no: 1, name: '할증', amount: 500, currency: 'KRW', tier: 'SHIPPER' },
        { line_no: 2, name: '부가', amount: 300, currency: 'KRW', tier: 'ADMIN_TO_AGENCY' },
      ],
      error: null,
    });
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: {
        from: vi.fn((t: string) => {
          if (t === 'zen_orders') return chain({ data: ORDER, error: null });
          if (t === 'zen_ups_settlement_runs') return chain({ data: { id: 'run-9', version: 9 }, error: null });
          if (t === 'zen_ups_settlement_run_charges') return charges;
          return chain({ data: null, error: null });
        }),
      },
      profile: { id: 'p1', role: 'ADMIN', org_id: null },
    } as never);

    const res = await getOrderAdditionalCharges('o1');

    expect(res.success).toBe(true);
    expect(res.version).toBe(9);
    expect(res.items).toHaveLength(2);
    expect(res.items[0]).toEqual({ lineNo: 1, name: '할증', amount: 500, currency: 'KRW', tier: 'SHIPPER' });
    // DTO 제한: charges select는 항목 컬럼만 요청(원가 컬럼 미조회)
    const selectMock = charges.select as ReturnType<typeof vi.fn>;
    const chargeSelect = selectMock.mock.calls.map((a) => String(a[0])).join(' ');
    expect(chargeSelect).toContain('line_no');
    expect(chargeSelect).toContain('name');
    expect(chargeSelect).not.toContain('cost');
    expect(chargeSelect).not.toContain('total');
    // admin은 tier 필터 미적용
    expect(charges.eq).not.toHaveBeenCalledWith('tier', expect.anything());
  });

  it('화주 자기 오더: SHIPPER tier 필터 + 자기 tier 항목만 반환', async () => {
    mockAuth('SHIPPER', 'ship-org');
    const charges = chain({ data: [{ line_no: 1, name: '부가', amount: 100, currency: 'KRW', tier: 'SHIPPER' }], error: null });
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: {
        from: vi.fn((t: string) => {
          if (t === 'zen_orders') return chain({ data: ORDER, error: null });
          if (t === 'zen_ups_settlement_runs') return chain({ data: { id: 'run-2', version: 2 }, error: null });
          if (t === 'zen_ups_settlement_run_charges') return charges;
          return chain({ data: null, error: null });
        }),
      },
      profile: { id: 'p1', role: 'SHIPPER', org_id: 'ship-org' },
    } as never);

    const res = await getOrderAdditionalCharges('o1');

    expect(res.success).toBe(true);
    expect(res.items).toHaveLength(1);
    expect(charges.eq).toHaveBeenCalledWith('tier', 'SHIPPER');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('타인 오더(소유 불일치): permission_denied + logger.warn 레벨 단언', async () => {
    mockAuth('SHIPPER', 'other-org');
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: { from: vi.fn(() => chain({ data: ORDER, error: null })) },
      profile: { id: 'p1', role: 'SHIPPER', org_id: 'other-org' },
    } as never);

    const res = await getOrderAdditionalCharges('o1');

    expect(res.success).toBe(false);
    expect(res.error).toBe('permission_denied');
    expect(res.items).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ownership denied'));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('정산 전(run 없음): 성공 + 빈 항목(오류 아님, 로거 미기록)', async () => {
    mockAuth('ADMIN');
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: {
        from: vi.fn((t: string) => {
          if (t === 'zen_orders') return chain({ data: ORDER, error: null });
          if (t === 'zen_ups_settlement_runs') return chain({ data: null, error: null });
          return chain({ data: null, error: null });
        }),
      },
      profile: { id: 'p1', role: 'ADMIN', org_id: null },
    } as never);

    const res = await getOrderAdditionalCharges('o1');

    expect(res).toEqual({ success: true, items: [] });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('charges 조회 실패: logger.error에 오류 객체 전달 + 실패 반환', async () => {
    mockAuth('ADMIN');
    const dbErr = { message: 'DB_DOWN_402' };
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: {
        from: vi.fn((t: string) => {
          if (t === 'zen_orders') return chain({ data: ORDER, error: null });
          if (t === 'zen_ups_settlement_runs') return chain({ data: { id: 'run-1', version: 1 }, error: null });
          return chain({ data: null, error: dbErr });
        }),
      },
      profile: { id: 'p1', role: 'ADMIN', org_id: null },
    } as never);

    const res = await getOrderAdditionalCharges('o1');

    expect(res.success).toBe(false);
    expect(res.items).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('run charges lookup failed'),
      dbErr,
    );
  });
});

describe('getUpsActualCost 가드 — 허용 집합(§8-2)과 실패 관측성', () => {
  it('허용 집합 외 역할: logger.warn(레벨 단언) + permission_denied throw', async () => {
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: { from: vi.fn(() => chain({ data: { order_id: 'o1' }, error: null })) },
      profile: { id: 'p1', role: 'INDIVIDUAL', org_id: null },
    } as never);

    const { getUpsActualCost } = await import('@/app/actions/finance/ups-actual-cost');
    await expect(getUpsActualCost('o1')).rejects.toThrow('permission_denied');

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Denied for role'));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('SUB_ADMIN(Pilot 예외): 통과 — 권한 거부 없음', async () => {
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: { from: vi.fn(() => chain({ data: { order_id: 'o1' }, error: null })) },
      profile: { id: 'p1', role: 'SUB_ADMIN', org_id: 'sub-org' },
    } as never);

    const { getUpsActualCost } = await import('@/app/actions/finance/ups-actual-cost');
    const data = await getUpsActualCost('o1');

    expect(data).toEqual({ order_id: 'o1' });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('ADMIN: 통과(현행 호출 경로 유지)', async () => {
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: { from: vi.fn(() => chain({ data: { order_id: 'o1' }, error: null })) },
      profile: { id: 'p1', role: 'ADMIN', org_id: null },
    } as never);

    const { getUpsActualCost } = await import('@/app/actions/finance/ups-actual-cost');
    const data = await getUpsActualCost('o1');

    expect(data).toEqual({ order_id: 'o1' });
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
