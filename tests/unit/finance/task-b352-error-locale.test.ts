// TASK-B-352 (Issue #1325): ups-actual-cost / ups-actual-charges / tracking 서버 액션의
// 사용자 반환 오류가 로케일 문장이고, DB/예외 원문을 포함하지 않으며, logger 가 원문 객체로
// 호출되는지 검증한다(B-351과 동일한 방식).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

interface ChainableMock {
  [key: string]: any;
  then: (resolve: any) => void;
}

const createChainableMock = (data: any = null, error: any = null): ChainableMock => {
  const mockObj: ChainableMock = {} as any;
  for (const method of [
    'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'not', 'limit', 'order',
    'single', 'maybeSingle', 'ilike', 'is', 'filter', 'neq', 'range',
  ]) {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  }
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

const mockSupabase: any = { from: vi.fn() };

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: vi.fn(async () => mockSupabase) }));
vi.mock('@/lib/finance/exchange-rate', () => ({ getExchangeRate: vi.fn() }));
vi.mock('@/app/actions/finance/settlement', () => ({ createPostFinalizationAdjustment: vi.fn() }));
vi.mock('@/lib/logistics/status-machine', () => ({ canChangeStatus: vi.fn() }));
vi.mock('@/app/actions/misc/notifications', () => ({ triggerStatusChangeNotification: vi.fn() }));

import { validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { getExchangeRate } from '@/lib/finance/exchange-rate';
import { canChangeStatus } from '@/lib/logistics/status-machine';
import { getUpsActualCost } from '@/app/actions/finance/ups-actual-cost';
import { manuallySetOrderDeliveredAction } from '@/app/actions/operations/tracking';

const ORDER_ID = 'order-b352';

function mockUser(role: string = USER_ROLES.ADMIN) {
  vi.mocked(validateUserAction).mockResolvedValue({
    supabase: mockSupabase,
    user: { id: 'user-1' },
    profile: { id: 'user-1', role, org_id: 'org-1' },
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getExchangeRate).mockResolvedValue(150 as any);
  vi.mocked(canChangeStatus).mockReturnValue({ allowed: true } as any);
});

describe('manuallySetOrderDeliveredAction — DB 원문 은닉 + 로케일 문장 (TASK-B-352)', () => {
  it('상태 업데이트 실패 → generic(ko)+코드, DB 원문 미포함, logger.error(에러 객체)', async () => {
    mockUser();
    const dbError = { message: 'DB_SECRET_STATUS_UPDATE_42c' };
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        // select → 주문, update → 에러
        const chain = createChainableMock({ id: ORDER_ID, order_no: 'ZEN-1', status: 'IN_TRANSIT', shipper_id: 'shipper-1' });
        chain.update = vi.fn(() => createChainableMock(null, dbError));
        return chain;
      }
      return createChainableMock();
    });

    const result = await manuallySetOrderDeliveredAction(ORDER_ID, '고객 요청');

    expect(result.success).toBe(false);
    expect(result.error).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: STATUS_UPDATE)');
    expect(result.error).not.toContain('DB_SECRET_STATUS_UPDATE_42c');
    expect(logger.error).toHaveBeenCalledWith(
      'manuallySetOrderDeliveredAction: zen_orders status update failed',
      dbError,
    );
  });
});

describe('getUpsActualCost — 조회 실패 시 원문 은닉 (TASK-B-352)', () => {
  it('throw 메시지가 로케일 문구이며 DB 원문을 포함하지 않는다', async () => {
    mockUser();
    const dbError = { message: 'DB_SECRET_COST_LOOKUP_1b9' };
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_ups_actual_cost') return createChainableMock(null, dbError);
      return createChainableMock();
    });

    await expect(getUpsActualCost(ORDER_ID)).rejects.toThrow(
      '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: ACTUAL_COST_LOOKUP)',
    );
    expect(logger.error).toHaveBeenCalledWith(
      'getUpsActualCost: zen_ups_actual_cost select failed',
      dbError,
    );
  });
});
