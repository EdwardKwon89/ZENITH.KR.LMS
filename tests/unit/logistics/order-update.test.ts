import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderStatus } from '@/types/orders';
import { isOrderEditable } from '@/lib/logistics/status-machine';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

vi.mock('@/app/actions/master', () => ({
  generateOrderNo: vi.fn(),
}));

function createMockSupabase() {
  return {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    delete: vi.fn().mockReturnThis(),
  };
}

describe('Order Update (DEF-109)', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = { id: 'user-123', org_id: 'org-456', role: 'ADMIN' };

  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();

    const { validateUserAction } = await import('@/lib/auth/guards');
    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: mockProfile,
      supabase: mockSupabase,
    });
  });

  it('TC-UPDATE-01: WAREHOUSED status throws cannot be edited error', async () => {
    const { updateOrder } = await import('@/app/actions/operations/orders');

    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'order-1', status: OrderStatus.WAREHOUSED, shipper_id: 'org-456' },
      error: null,
    });

    const payload = {
      order_type: 'B2B' as const,
      shipper_id: '00000000-0000-0000-0000-000000000000',
      recipient_name: 'Test',
      recipient_address: '123 Test St',
      recipient_phone: '010-1234-5678',
      packages: [{ packing_unit: 'BOX', packing_count: 1, gross_weight: 10, items: [{ item_name: 'test', quantity: 1 }] }],
      delivery_method: 'DIRECT' as const,
      transport_mode: 'AIR' as const,
    };

    await expect(updateOrder('order-1', payload as any)).rejects.toThrow(/cannot be edited/);
  });

  it('TC-EDIT-PAGE-01: isOrderEditable returns true for REGISTERED', () => {
    expect(isOrderEditable(OrderStatus.REGISTERED)).toBe(true);
  });

  it('TC-EDIT-PAGE-02: isOrderEditable returns false for WAREHOUSED', () => {
    expect(isOrderEditable(OrderStatus.WAREHOUSED)).toBe(false);
  });

  it('TC-EDIT-PAGE-03: isOrderEditable returns false for IN_TRANSIT', () => {
    expect(isOrderEditable(OrderStatus.IN_TRANSIT)).toBe(false);
  });
});
