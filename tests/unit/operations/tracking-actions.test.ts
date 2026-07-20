import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addTrackingEvent } from '@/app/actions/operations/tracking';
import { validateAdminAction } from '@/lib/auth/guards';

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
