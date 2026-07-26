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

describe('TASK-B-208: getGlobalTrackingOverview order.status 포함 (behavioral)', () => {
  let mockSupabase: any;

  function makeChain(data: any[], error: any = null, count = 1) {
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data, error, count }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-001' },
      supabase: mockSupabase,
    });
  });

  it('반환된 config에 order.status 필드가 포함된다', async () => {
    const chain = makeChain([
      {
        order_id: 'order-100',
        order: { id: 'order-100', order_no: 'ZEN-001', shipper_id: 's1', recipient_name: 'Kim', transport_mode: 'AIR', status: 'DELIVERED' },
      },
    ]);
    mockSupabase.from.mockReturnValueOnce(chain);
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }),
    });

    const result = await getGlobalTrackingOverview();
    const orderData = Array.isArray(result.configs[0].order) ? result.configs[0].order[0] : result.configs[0].order;
    expect(orderData).toBeDefined();
    expect(orderData.status).toBe('DELIVERED');
  });

  it('여러 오더의 order.status가 각각 정확히 반환된다', async () => {
    const chain = makeChain([
      { order_id: 'o1', order: { id: 'o1', order_no: 'Z1', shipper_id: 's1', recipient_name: 'A', transport_mode: 'AIR', status: 'IN_TRANSIT' } },
      { order_id: 'o2', order: { id: 'o2', order_no: 'Z2', shipper_id: 's2', recipient_name: 'B', transport_mode: 'SEA', status: 'HELD' } },
      { order_id: 'o3', order: { id: 'o3', order_no: 'Z3', shipper_id: 's3', recipient_name: 'C', transport_mode: 'UPS', status: 'CLAIMED' } },
    ]);
    const trackingEventsChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const upsEventsChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabase.from.mockReturnValueOnce(chain);
    mockSupabase.from.mockReturnValueOnce(trackingEventsChain);
    mockSupabase.from.mockReturnValueOnce(upsEventsChain);

    const result = await getGlobalTrackingOverview();
    expect(result.configs).toHaveLength(3);
    const statuses = result.configs.map((c: any) => {
      const o = Array.isArray(c.order) ? c.order[0] : c.order;
      return o.status;
    });
    expect(statuses).toEqual(['IN_TRANSIT', 'HELD', 'CLAIMED']);
  });
});
