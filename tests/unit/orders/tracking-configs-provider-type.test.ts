import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder } from '@/app/actions/orders';
import { validateUserAction } from '@/lib/auth/guards';
import { generateOrderNo } from '@/app/actions/master';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
}));

vi.mock('@/app/actions/master', () => ({
  generateOrderNo: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

describe('TASK-B-207: UPS 오더 생성 시 zen_tracking_configs.provider_type 갱신', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = { id: 'user-123', org_id: 'org-456', role: 'CORPORATE' };
  const mockOrderNo = 'ZEN-2026-000001';

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
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
    };

    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: mockProfile,
      supabase: mockSupabase,
    });

    (generateOrderNo as any).mockResolvedValue(mockOrderNo);

    mockSupabase.rpc.mockResolvedValue({
      data: { id: 'new-order-id', order_no: mockOrderNo },
      error: null,
    });
  });

  function makePayload(transportMode: string) {
    return {
      order_type: 'B2B',
      shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
      origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
      dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
      recipient_name: 'Test Recipient',
      recipient_address: '123 Test St',
      recipient_phone: '010-1234-5678',
      transport_mode: transportMode,
      packages: [
        {
          packing_unit: 'BOX',
          packing_count: 1,
          gross_weight: 5,
          items: [
            {
              item_name: 'Test Item',
              quantity: 1,
              unit_price: 100,
              currency: 'USD',
              item_packing_unit: 'UNIT',
            },
          ],
        },
      ],
    };
  }

  it('TC-TRACKING-UPS-01: UPS 오더 생성 시 provider_type을 UPS로 갱신해야 한다', async () => {
    const payload = makePayload('UPS');
    await createOrder(payload as any);

    const trackingConfigUpdateCall = mockSupabase.from.mock.calls.find(
      (call: any[]) => call[0] === 'zen_tracking_configs'
    );
    expect(trackingConfigUpdateCall).toBeDefined();
  });

  it('TC-TRACKING-UPS-02: AIR 오더 생성 시 provider_type 갱신을 호출하지 않아야 한다', async () => {
    const payload = makePayload('AIR');
    await createOrder(payload as any);

    const trackingConfigUpdateCall = mockSupabase.from.mock.calls.find(
      (call: any[]) => call[0] === 'zen_tracking_configs'
    );
    expect(trackingConfigUpdateCall).toBeUndefined();
  });

  it('TC-TRACKING-UPS-03: SEA 오더 생성 시 provider_type 갱신을 호출하지 않아야 한다', async () => {
    const payload = makePayload('SEA');
    await createOrder(payload as any);

    const trackingConfigUpdateCall = mockSupabase.from.mock.calls.find(
      (call: any[]) => call[0] === 'zen_tracking_configs'
    );
    expect(trackingConfigUpdateCall).toBeUndefined();
  });
});
