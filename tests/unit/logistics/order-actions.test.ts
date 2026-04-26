import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder, updateOrderStatus } from '@/app/actions/orders';
import { OrderStatus } from '@/types/orders';
import { validateUserAction } from '@/lib/auth/guards';
import { generateOrderNo } from '@/app/actions/master';
import { revalidatePath } from 'next/cache';

// Mock 의존성 설정
vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
}));

vi.mock('@/app/actions/master', () => ({
  generateOrderNo: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('ZENITH Logistics: Order Creation Logic', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = { id: 'user-123', org_id: 'org-456' };
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
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };

    (validateUserAction as any).mockResolvedValue({ 
      user: mockUser, 
      profile: mockProfile, 
      supabase: mockSupabase 
    });

    (generateOrderNo as any).mockResolvedValue(mockOrderNo);
  });

  it('TC-A.1: [Success] 오더 생성 시 recipient_phone 및 소유주 정보가 정확히 매핑되어야 함', async () => {
    // Given
    const payload = {
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

    mockSupabase.single.mockResolvedValue({ data: { id: 'new-order-id', order_no: mockOrderNo } });

    // When
    const result = await createOrder(payload as any);

    // Then
    expect(result.order_no).toBe(mockOrderNo);
    
    // Supabase 호출 데이터 검증
    const insertCall = mockSupabase.insert.mock.calls[0][0];
    expect(insertCall.recipient_phone).toBe('010-1234-5678'); 
    expect(insertCall.created_by).toBe(mockProfile.id); 
    expect(insertCall.org_id).toBe(mockProfile.org_id); 
    
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/orders', 'page');
  });

  it('TC-A.2: [Failure] 가드에서 프로필 획득 실패 시 에러를 전파해야 함', async () => {
    // Given
    (validateUserAction as any).mockRejectedValue(new Error('Login required'));

    // When & Then
    await expect(createOrder({} as any)).rejects.toThrow('Login required');
  });

  it('TC-A.3: [Success] 송하인 담당자명, 연락처, 비고 필드가 DB 삽입 시 포함되어야 함 (v2)', async () => {
    // Given
    const payload = {
      order_type: 'B2C_ECOM' as const,
      shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
      origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
      dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
      recipient_name: 'Lee Young-hee',
      recipient_address: '456 Zenith Tower, Busan',
      recipient_phone: '010-8888-9999',
      
      // 스크린샷 피드백 신규 필드
      shipper_contact_name: 'Manager Kim',
      shipper_contact_phone: '010-1111-2222',
      description: 'Special delivery instruction: Ring the bell',
      
      packages: [
        {
          packing_unit: 'BOX',
          packing_count: 5,
          gross_weight: 50,
          items: [{ 
            item_name: 'Electronics', 
            quantity: 5, 
            unit_price: 200,
            currency: 'KRW',
            item_packing_unit: 'PCS'
          }]
        }
      ]
    };

    mockSupabase.single.mockResolvedValue({ data: { id: 'order-v2-id', order_no: mockOrderNo } });

    // When
    await createOrder(payload as any);

    // Then
    const insertCall = mockSupabase.insert.mock.calls[0][0];
    expect(insertCall.shipper_contact_name).toBe('Manager Kim');
    expect(insertCall.shipper_contact_phone).toBe('010-1111-2222');
    expect(insertCall.description).toBe('Special delivery instruction: Ring the bell');
  });

  describe('Order Status Update: Exception Resilience', () => {

    it('TC-A.4: [Failure] 마스터에 결합된 오더의 상태 변경 시도 시 예외를 발생시켜야 함', async () => {
      // Given
      const orderId = 'mastered-order';
      mockSupabase.maybeSingle.mockResolvedValue({ 
        data: { master_order_id: 'm-123' }, 
        error: null 
      });

      // When & Then
      await expect(updateOrderStatus(orderId, OrderStatus.IN_TRANSIT))
        .rejects.toThrow(/마스터 오더에 결합된 상태입니다/);
    });
  });
});
