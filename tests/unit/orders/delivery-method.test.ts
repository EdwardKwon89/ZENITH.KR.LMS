import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder } from '@/app/actions/orders';
import { validateUserAction } from '@/lib/auth/guards';
import { generateOrderNo } from '@/app/actions/master';
import { revalidatePath } from 'next/cache';
import { orderRegistrationSchema } from '@/lib/validation/order';

// Mock dependencies
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

describe('IMP-118: Order Delivery Method Selection and Validation (TC-UPS-ORDER)', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = { id: 'user-123', org_id: 'org-456' };
  const mockOrderNo = 'ZEN-2026-999999';

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ data: { id: 'new-order-id', order_no: mockOrderNo }, error: null }),
    };

    (validateUserAction as any).mockResolvedValue({ 
      user: mockUser, 
      profile: mockProfile, 
      supabase: mockSupabase 
    });

    (generateOrderNo as any).mockResolvedValue(mockOrderNo);
  });

  const basePayload = {
    order_type: 'B2B',
    shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
    origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
    dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
    recipient_name: 'Hong Gil-dong',
    recipient_address: '123 Zenith St, Seoul',
    recipient_phone: '010-1234-5678', 
    packages: [
      {
        packing_unit: 'BOX',
        packing_count: 1,
        gross_weight: 10.5,
        items: [{ 
          item_name: 'Industrial Robot Arm', 
          quantity: 1, 
          unit_price: 1000,
          currency: 'USD',
          item_packing_unit: 'UNIT'
        }]
      }
    ]
  };

  it('TC-UPS-ORDER-01: DIRECT 선택 — pickup 필드 불필요, createOrder 정상 저장', async () => {
    const payload = {
      ...basePayload,
      delivery_method: 'DIRECT',
    };

    const result = await createOrder(payload as any) as any;
    expect(result.order_no).toBe(mockOrderNo);

    // Verify RPC payload contains delivery_method: 'DIRECT'
    const rpcCall = mockSupabase.rpc.mock.calls[0];
    expect(rpcCall[0]).toBe('create_order_atomic');
    expect(rpcCall[1].p_payload.delivery_method).toBe('DIRECT');
  });

  it('TC-UPS-ORDER-04: DIRECT 선택 + pickup 필드 전달 시 — pickup 필드 제거되어 저장', async () => {
    const payload = {
      ...basePayload,
      delivery_method: 'DIRECT',
      pickup_location: 'Hidden Value',
      pickup_contact_name: 'Hidden Name',
      pickup_contact_tel: 'Hidden Phone',
    };

    const result = await createOrder(payload as any) as any;
    expect(result.order_no).toBe(mockOrderNo);

    // Verify RPC payload contains delivery_method: 'DIRECT' and no pickup_* fields
    const rpcCall = mockSupabase.rpc.mock.calls[0];
    expect(rpcCall[0]).toBe('create_order_atomic');
    expect(rpcCall[1].p_payload.delivery_method).toBe('DIRECT');
    expect(rpcCall[1].p_payload.pickup_location).toBeUndefined();
    expect(rpcCall[1].p_payload.pickup_contact_name).toBeUndefined();
    expect(rpcCall[1].p_payload.pickup_contact_tel).toBeUndefined();
  });

  it('TC-UPS-ORDER-02: PICKUP 선택 + pickup_address 입력 — 정상 저장', async () => {
    const payload = {
      ...basePayload,
      delivery_method: 'PICKUP',
      pickup_address: '123 Pickup St',
      pickup_country_code: 'KR',
      pickup_contact_name: 'Lee Min-su',
      pickup_contact_tel: '010-9999-8888',
    };

    const result = await createOrder(payload as any) as any;
    expect(result.order_no).toBe(mockOrderNo);

    // Verify RPC payload contains pickup info
    const rpcCall = mockSupabase.rpc.mock.calls[0];
    expect(rpcCall[0]).toBe('create_order_atomic');
    expect(rpcCall[1].p_payload.delivery_method).toBe('PICKUP');
    expect(rpcCall[1].p_payload.pickup_address).toBe('123 Pickup St');
    expect(rpcCall[1].p_payload.pickup_contact_name).toBe('Lee Min-su');
    expect(rpcCall[1].p_payload.pickup_contact_tel).toBe('010-9999-8888');
  });

  it('TC-UPS-ORDER-03: PICKUP 선택 + pickup_address 누락 — Zod 검증 에러 반환', async () => {
    const payload = {
      ...basePayload,
      delivery_method: 'PICKUP',
      pickup_contact_name: 'Lee Min-su',
      pickup_contact_tel: '010-9999-8888',
    };

    // Zod validation should fail directly
    await expect(createOrder(payload as any)).rejects.toThrow();

    // Verify direct Zod schema validation result has error on pickup_address
    const validationResult = orderRegistrationSchema.safeParse(payload);
    expect(validationResult.success).toBe(false);
    if (!validationResult.success) {
      const issues = validationResult.error.issues;
      const pickupAddrIssue = issues.find(issue => issue.path.includes('pickup_address'));
      expect(pickupAddrIssue).toBeDefined();
      expect(pickupAddrIssue?.message).toContain('Pickup address is required');
    }
  });
});
