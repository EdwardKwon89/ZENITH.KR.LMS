import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { USER_ROLES } from '@/lib/auth/rbac';

// TASK-B-353 (Issue #1328): warehouse 액션 + 창고 화면 오류 로케일 전환 회귀 테스트.
//
// (a) 대표 실패 경로의 문장이 ko 로케일 문장이고 영문 원문이 아니다 (trError 실문구)
// (b) 호출자 계약 고정 — throw 유지 함수는 reject(→ 컴포넌트의 await 뒤 성공 토스트 미도달),
//     반환 계약 함수는 {success:false, error: ko} (→ 호출자 if(res.success)가 성공 토스트를 못 띄움)
//     ※ 본 Task의 throw→반환 전환은0건(B-352 선례) — 기존 반환 계약(undoDeparture)만 고정
// (c) 4개 로케일(ko/en/zh/ja) 대표 키 실재
// (d) logger 인자 (반환 지점 logger.warn / pass-through 실패 로깅)
//
// trError는 실제 next-intl/server를 사용한다(defb047 선례) — request 컨텍스트 부재 시
// actionLocale()이 기본 로케일('ko')로 폴백한다.

const mockValidate = vi.hoisted(() => vi.fn());
const mockFindById = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidate }));
vi.mock('@/app/actions/operations/orders', () => ({
  updateOrderStatus: vi.fn(),
  attachOperatorNames: vi.fn((_s: any, d: any[]) => Promise.resolve(d)),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/repositories', () => ({
  BaseRepository: class {},
  OrderRepository: class {
    findById = mockFindById;
  },
  FinanceRepository: class {},
  AdminRepository: class {},
}));
vi.mock('@/app/actions/operations/ups-labels', () => ({
  registerUpsOrder: vi.fn(),
  cancelUpsRegistration: vi.fn(),
  fetchAndIssueUpsLabel: vi.fn(),
  voidUpsLabel: vi.fn(),
}));

import {
  getWarehousedOrders,
  getLatestUpsLabelErrors,
  confirmUpsRegistration,
  confirmPickup,
  undoDeparture,
} from '@/app/actions/operations/warehouse';
import { registerUpsOrder } from '@/app/actions/operations/ups-labels';
import { updateOrderStatus } from '@/app/actions/operations/orders';
import { logger } from '@/lib/logger';

/** throw의 정확한 message를 돌려받는다 (toThrow의 부분매칭이 아닌 완전 일치 단언용). */
async function catchMsg(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  throw new Error('expected the action to reject, but it resolved');
}

function adminCtx(supabase: any = {}) {
  return {
    user: { id: 'admin-u' },
    profile: { id: 'admin-u', role: USER_ROLES.ADMIN, org_id: 'org-1' },
    supabase,
  };
}

/** select().in().order() 체인이 DB 에러로 끝나는 supabase 모의 */
const errorDb = {
  from() {
    return {
      select() { return this; },
      in() { return this; },
      order() { return this; },
      then: (resolve: any) => resolve({ data: null, error: new Error('db down raw') }),
    };
  },
};

describe('TC-353-1: (a) 대표 실패 경로의 문장은 ko 문장이고 영문 원문이 아니다', () => {
  beforeEach(() => vi.clearAllMocks());

  it('profile 없음(getWarehousedOrders) → "사용자 프로필을 찾을 수 없습니다." (영문 원문 미포함)', async () => {
    mockValidate.mockResolvedValue({ user: { id: 'u' }, profile: null, supabase: {} });
    const msg = await catchMsg(() => getWarehousedOrders());
    expect(msg).toBe('사용자 프로필을 찾을 수 없습니다.');
    expect(msg).not.toBe('User profile not found');
  });

  it('조회 실패(getLatestUpsLabelErrors) → "데이터를 불러오지 못했습니다…" (Failed to fetch 원문 미포함)', async () => {
    mockValidate.mockResolvedValue(adminCtx(errorDb));
    const msg = await catchMsg(() => getLatestUpsLabelErrors(['o-1']));
    expect(msg).toBe('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    expect(msg).not.toBe('Failed to fetch ups label errors');
  });

  it('상태 불일치(confirmUpsRegistration) → "WAREHOUSED 상태의 오더만 UPS 등록할 수 있습니다." (정확 문장)', async () => {
    mockValidate.mockResolvedValue(adminCtx());
    mockFindById.mockResolvedValue({ data: { status: 'REGISTERED', shipper_id: 'ship-1' }, error: null });
    const msg = await catchMsg(() => confirmUpsRegistration('order-x'));
    expect(msg).toBe('WAREHOUSED 상태의 오더만 UPS 등록할 수 있습니다.');
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });
});

describe('TC-353-2: (b) 호출자 계약 고정 — throw 유지 / 기존 반환 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throw 유지(confirmPickup·호출자 catch-only): 권한 거부 시 reject → 컴포넌트의 await 뒤 성공 토스트에 도달 불가', async () => {
    // PickupProcessForm.handleConfirmPickup는 `await confirmPickup(...)` 뒤에 success toast를 둔다.
    // 실패 시 throw가 전파되어 그 줄에 도달하지 못함을 계약으로 고정한다 (B-352 재작업 선례).
    mockValidate.mockResolvedValue({
      user: { id: 'u' },
      profile: { id: 'u', role: USER_ROLES.SHIPPER, org_id: 'org-2' },
      supabase: {},
    });
    const msg = await catchMsg(() => confirmPickup('order-x'));
    expect(msg).toBe('권한이 없습니다.');
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it('반환 계약(undoDeparture): 오더 없음 → {success:false, error: ko} — 호출자 if(res.success)가 성공 토스트를 못 띄움', async () => {
    mockValidate.mockResolvedValue(adminCtx());
    mockFindById.mockResolvedValue({ data: null, error: null });
    const res: any = await undoDeparture('order-x');
    expect(res.success).toBe(false);
    expect(res).toHaveProperty('error', '오더를 찾을 수 없습니다.');
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });
});

describe('TC-353-3: (c) 4개 로케일 대표 키 실재', () => {
  const LOCALES = ['ko', 'en', 'zh', 'ja'] as const;
  const load = (loc: string) =>
    JSON.parse(readFileSync(resolve(process.cwd(), `messages/${loc}.json`), 'utf-8'));

  it.each(LOCALES)(
    '%s: Errors.fetch_failed·status_ups_register·own_shipper_only + WarehouseInbound.measurements_saved 존재',
    (loc) => {
      const m = load(loc);
      expect(m.Errors.fetch_failed).toEqual(expect.any(String));
      expect(m.Errors.status_ups_register).toEqual(expect.any(String));
      expect(m.Errors.own_shipper_only).toEqual(expect.any(String));
      expect(m.WarehouseInbound.measurements_saved).toEqual(expect.any(String));
      expect(m.Errors.fetch_failed.length).toBeGreaterThan(0);
      expect(m.Errors.status_ups_register.length).toBeGreaterThan(0);
    }
  );

  it('같은 키의 문구가 로케일마다 실제로 다르다 (ko ≠ en, 동일 키 공통 문자열 아님)', () => {
    const ko = load('ko').Errors.fetch_failed;
    const en = load('en').Errors.fetch_failed;
    expect(ko).not.toBe(en);
    expect(en).toMatch(/Failed to fetch/); // en은 영문 문장
  });
});

describe('TC-353-4: (d) logger 인자 (반환 지점 관측성)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('undoDeparture 반환 실패 시 logger.warn에 함수명·사유·orderId가 남는다', async () => {
    mockValidate.mockResolvedValue(adminCtx());
    mockFindById.mockResolvedValue({ data: null, error: null });
    await undoDeparture('order-x');
    expect(logger.warn).toHaveBeenCalledWith('undoDeparture: order not found (order-x)');
  });

  it('pass-through 실패(confirmUpsRegistration) 시 함수명과 원 error가 로깅된다', async () => {
    mockValidate.mockResolvedValue(adminCtx());
    mockFindById.mockResolvedValue({ data: { status: 'WAREHOUSED', shipper_id: 'ship-1' }, error: null });
    vi.mocked(registerUpsOrder).mockResolvedValue({ success: false, error: 'DB down raw' } as any);

    const res: any = await confirmUpsRegistration('order-x');
    expect(res.success).toBe(false);
    expect(res).toHaveProperty('error', 'DB down raw');
    expect(logger.warn).toHaveBeenCalledWith('confirmUpsRegistration: passthrough failure', 'DB down raw');
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });
});
