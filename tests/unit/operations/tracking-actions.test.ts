import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addTrackingEvent, getGlobalTrackingOverview } from '@/app/actions/operations/tracking';
import { validateAdminAction, validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: vi.fn(), validateAdminAction: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));
vi.mock('@/app/actions/operations/orders', () => ({ updateOrderStatus: vi.fn() }));

import { updateOrderStatus } from '@/app/actions/operations/orders';

describe('TC-OPS-TRK-01: addTrackingEvent', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
    (validateAdminAction as any).mockResolvedValue({
      user: { id: 'admin-001' },
      supabase: mockSupabase,
    });
  });

  it('DELIVERED 이벤트 추가 시 updateOrderStatus(DELIVERED) 호출', async () => {
    (updateOrderStatus as any).mockResolvedValue(undefined);

    const result = await addTrackingEvent('order-001', {
      event_code: 'DELIVERED',
      location: '서울',
      description: '수동 배송완료 처리',
    });

    expect(result.success).toBe(true);
    expect(updateOrderStatus).toHaveBeenCalledWith(
      'order-001',
      'DELIVERED',
      expect.stringContaining('DELIVERED')
    );
  });

  it('매핑 없는 이벤트 코드는 updateOrderStatus 호출하지 않음', async () => {
    const result = await addTrackingEvent('order-002', {
      event_code: 'UNKNOWN_EVENT',
      location: 'ICN',
      description: '테스트',
    });

    expect(result.success).toBe(true);
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it('INSERT 실패 시 에러 throw', async () => {
    mockSupabase.from = vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
    }));

    await expect(addTrackingEvent('order-003', {
      event_code: 'DELIVERED',
      location: 'Seoul',
      description: 'Fail test',
    })).rejects.toThrow('Failed to add tracking event');
  });
});

describe('DEF-122: getGlobalTrackingOverview isUnassigned', () => {
  let mockSupabase: any;

  function makeChain(data: any[], error: any = null, count = 1) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data, error, count }),
    };
    return chain;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-001' },
      supabase: mockSupabase,
    });
  });

  it('order가 객체일 때 shipper_id 존재 → is_unassigned=false', async () => {
    const chain = makeChain([
      { order_id: 'order-001', order: { id: 'order-001', shipper_id: 'ship-001', recipient_name: 'James' } },
    ]);
    mockSupabase.from.mockReturnValueOnce(chain);
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }),
    });

    const result = await getGlobalTrackingOverview();
    expect(result.configs[0].is_unassigned).toBe(false);
  });

  it('order가 객체일 때 shipper_id+recipient_name 모두 없으면 is_unassigned=true', async () => {
    const chain = makeChain([
      { order_id: 'order-002', order: { id: 'order-002', shipper_id: null, recipient_name: null } },
    ]);
    mockSupabase.from.mockReturnValueOnce(chain);
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }),
    });

    const result = await getGlobalTrackingOverview();
    expect(result.configs[0].is_unassigned).toBe(true);
  });
});
