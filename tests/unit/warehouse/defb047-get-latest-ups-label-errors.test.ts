import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

const mockValidate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidate }));
vi.mock('@/app/actions/operations/orders', () => ({
  updateOrderStatus: vi.fn(),
  attachOperatorNames: vi.fn((_s: any, d: any[]) => Promise.resolve(d)),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/repositories', () => ({
  BaseRepository: class {},
  OrderRepository: class {},
  FinanceRepository: class {},
  AdminRepository: class {},
}));
vi.mock('@/app/actions/operations/ups-labels', () => ({
  registerUpsOrder: vi.fn(),
  cancelUpsRegistration: vi.fn(),
  fetchAndIssueUpsLabel: vi.fn(),
  voidUpsLabel: vi.fn(),
}));

import { getLatestUpsLabelErrors } from '@/app/actions/operations/warehouse';

// zen_ups_label_errors 조회 체인 mock — DB의 .order("attempted_at", desc)를 시뮬레이션해
// 최신순 정렬된 행들을 반환
function makeErrorsDb(rows: any[]) {
  const sorted = [...rows].sort(
    (a, b) => new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime()
  );
  return {
    from(table: string) {
      const chain: any = {};
      chain._rows = table === 'zen_ups_label_errors' ? sorted : [];
      chain.select = () => chain;
      chain.in = () => chain;
      chain.order = () => chain;
      chain.then = (resolve: any) => resolve({ data: chain._rows, error: null });
      return chain;
    },
  };
}

describe('TASK-B-285 (Issue #1071): getLatestUpsLabelErrors 서버 액션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-285-01: 여러 건 중 오더별 최신 에러 1건만 반환 (attempted_at 내림차순 기준)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'admin-user' },
      profile: { id: 'admin-user', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      supabase: makeErrorsDb([
        { id: 'e-old', order_id: 'o-1', shxk_code: 'A', error_message: '옛 에러', attempted_at: '2026-08-11T01:00:00Z' },
        { id: 'e-new', order_id: 'o-1', shxk_code: 'A', error_message: '새 에러', attempted_at: '2026-08-11T02:00:00Z' },
        { id: 'e-2', order_id: 'o-2', shxk_code: 'B', error_message: '오더2 에러', attempted_at: '2026-08-11T01:30:00Z' },
      ]),
    });

    const result = await getLatestUpsLabelErrors(['o-1', 'o-2']);
    expect(result.success).toBe(true);
    // 오더별 최신 1건만
    expect(Object.keys(result.errors)).toHaveLength(2);
    expect(result.errors['o-1'].id).toBe('e-new');
    expect(result.errors['o-1'].error_message).toBe('새 에러');
    expect(result.errors['o-2'].id).toBe('e-2');
  });

  it('TC-285-02: 빈 orderIds → 오류 없이 빈 맵 반환 (쿼리 미실행)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'admin-user' },
      profile: { id: 'admin-user', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      supabase: makeErrorsDb([]),
    });

    const result = await getLatestUpsLabelErrors([]);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('TC-285-03: 권한 없는 역할 → throw (WAREHOUSE_ROLES 외)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'shipper-user' },
      profile: { id: 'shipper-user', role: USER_ROLES.SHIPPER, org_id: 'org-2' },
      supabase: makeErrorsDb([]),
    });

    await expect(getLatestUpsLabelErrors(['o-1'])).rejects.toThrow('권한이 없습니다.');
  });

  it('TC-285-04: 에러 미기록 오더 → 해당 키 없음 (누락 행 없음)', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'admin-user' },
      profile: { id: 'admin-user', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      supabase: makeErrorsDb([
        { id: 'e-1', order_id: 'o-1', shxk_code: 'A', error_message: '에러', attempted_at: '2026-08-11T01:00:00Z' },
      ]),
    });

    const result = await getLatestUpsLabelErrors(['o-1', 'o-999']);
    expect(result.success).toBe(true);
    expect(result.errors['o-1']).toBeTruthy();
    expect(result.errors['o-999']).toBeUndefined();
  });

  it('TC-285-05: 조회 에러 시 throw 전파', async () => {
    const errorDb = {
      from() {
        return {
          select() { return this; },
          in() { return this; },
          order() { return this; },
          then: (resolve: any) => resolve({ data: null, error: new Error('db down') }),
        };
      },
    };
    mockValidate.mockResolvedValue({
      user: { id: 'admin-user' },
      profile: { id: 'admin-user', role: USER_ROLES.ADMIN, org_id: 'org-1' },
      supabase: errorDb,
    });

    await expect(getLatestUpsLabelErrors(['o-1'])).rejects.toThrow('Failed to fetch ups label errors');
  });
});
