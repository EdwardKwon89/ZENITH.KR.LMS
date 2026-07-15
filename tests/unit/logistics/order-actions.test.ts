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

vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn,
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
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
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

    mockSupabase.rpc.mockResolvedValue({ data: { id: 'new-order-id', order_no: mockOrderNo }, error: null });

    // When
    const result = await createOrder(payload as any);

    // Then
    expect(result.order_no).toBe(mockOrderNo);
    
    // Supabase RPC 호출 데이터 검증
    const rpcCall = mockSupabase.rpc.mock.calls[0];
    expect(rpcCall[0]).toBe('create_order_atomic');
    expect(rpcCall[1].p_payload.recipient_phone).toBe('010-1234-5678'); 
    expect(rpcCall[1].p_user_id).toBe(mockProfile.id); 
    expect(rpcCall[1].p_org_id).toBe(mockProfile.org_id); 
    
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

    mockSupabase.rpc.mockResolvedValue({ data: { id: 'order-v2-id', order_no: mockOrderNo }, error: null });

    // When
    await createOrder(payload as any);

    // Then
    const rpcCall = mockSupabase.rpc.mock.calls[0];
    expect(rpcCall[0]).toBe('create_order_atomic');
    expect(rpcCall[1].p_payload.shipper_contact_name).toBe('Manager Kim');
    expect(rpcCall[1].p_payload.shipper_contact_phone).toBe('010-1111-2222');
    expect(rpcCall[1].p_payload.description).toBe('Special delivery instruction: Ring the bell');
  });

  it('TC-A.5: [Success] 오더 생성 시 특수화물 유형(special_cargo_type)이 정상 전달되어야 함', async () => {
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
          special_cargo_type: 'DANGEROUS',
          items: [{ 
            item_name: 'Chemical Reagents', 
            quantity: 1, 
            unit_price: 1000,
            currency: 'USD',
            item_packing_unit: 'UNIT'
          }]
        }
      ]
    };

    mockSupabase.rpc.mockResolvedValue({ data: { id: 'new-order-id', order_no: mockOrderNo }, error: null });

    // When
    await createOrder(payload as any);

    // Then
    const rpcCall = mockSupabase.rpc.mock.calls[0];
    expect(rpcCall[0]).toBe('create_order_atomic');
    const pkg = rpcCall[1].p_payload.packages?.[0];
    expect(pkg?.special_cargo_type).toBe('DANGEROUS');
  });

  it('TC-A.6: [Success] Issue #489 신규 컬럼(recipient_country_code, shipper_address 등)이 RPC payload에 포함되어야 함', async () => {
    // Given
    const payload = {
      order_type: 'B2C_ECOM',
      shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
      origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
      dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
      recipient_name: 'John Doe',
      recipient_address: '456 Oak St',
      recipient_phone: '010-5555-6666',
      recipient_country_code: 'US',
      recipient_state_province: 'CA',
      recipient_city: 'Los Angeles',
      shipper_address: '100 Seoul St',
      shipper_country_code: 'KR',
      shipper_state_province: 'Seoul',
      shipper_city: 'Jung-gu',
      shipper_address_detail: 'Bldg 5',
      shipper_zipcode: '04524',
      shipper_biz_no: '123-45-67890',
      ups_product_code: 'WW_EXPEDITED',
      incoterms: 'DDP',
      packages: [
        {
          packing_unit: 'BOX',
          packing_count: 2,
          gross_weight: 20,
          items: [{ item_name: 'Test', quantity: 2, unit_price: 100, item_packing_unit: 'UNIT' }]
        }
      ]
    };

    mockSupabase.rpc.mockResolvedValue({ data: { id: 'order-489-id', order_no: mockOrderNo }, error: null });

    // When
    await createOrder(payload as any);

    // Then
    const rpcCall = mockSupabase.rpc.mock.calls[0];
    expect(rpcCall[0]).toBe('create_order_atomic');
    const pp = rpcCall[1].p_payload;
    expect(pp.recipient_country_code).toBe('US');
    expect(pp.recipient_state_province).toBe('CA');
    expect(pp.recipient_city).toBe('Los Angeles');
    expect(pp.shipper_address).toBe('100 Seoul St');
    expect(pp.shipper_country_code).toBe('KR');
    expect(pp.shipper_state_province).toBe('Seoul');
    expect(pp.shipper_city).toBe('Jung-gu');
    expect(pp.shipper_address_detail).toBe('Bldg 5');
    expect(pp.shipper_zipcode).toBe('04524');
    expect(pp.shipper_biz_no).toBe('123-45-67890');
    expect(pp.ups_product_code).toBe('WW_EXPEDITED');
    expect(pp.incoterms).toBe('DDP');
  });

  it('TC-A.7: [Success] Issue #489 — ups_product_code/incoterms 조건부 UPDATE 제거 — RPC v5에서 직접 저장 확인', async () => {
    // Given: ups_product_code가 있는 payload
    const payload = {
      order_type: 'B2C_ECOM',
      shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
      origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
      dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
      recipient_name: 'Jane',
      recipient_address: '789 Pine St',
      recipient_phone: '010-7777-8888',
      ups_product_code: 'WW_EXPEDITED',
      incoterms: 'DDU',
      packages: [
        {
          packing_unit: 'BOX',
          packing_count: 1,
          gross_weight: 5,
          items: [{ item_name: 'Widget', quantity: 1, unit_price: 50, item_packing_unit: 'UNIT' }]
        }
      ]
    };

    mockSupabase.rpc.mockResolvedValue({ data: { id: 'order-v5-id', order_no: mockOrderNo }, error: null });

    // When
    await createOrder(payload as any);

    // Then: RPC payload에 ups_product_code/incoterms 포함 확인
    const rpcCall = mockSupabase.rpc.mock.calls[0];
    expect(rpcCall[1].p_payload.ups_product_code).toBe('WW_EXPEDITED');
    expect(rpcCall[1].p_payload.incoterms).toBe('DDU');
    // 조건부 UPDATE(.from('zen_orders').update(...))가 호출되지 않았는지 확인
    expect(mockSupabase.update).not.toHaveBeenCalled();
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

  describe('dissolveMasterOrder and getHeldPreviousStatus Actions', () => {
    it('[Success] dissolveMasterOrder: should call RPC dissolve_master_order_atomic with correct parameters', async () => {
      // Given
      const masterId = 'master-uuid-123';
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      // When
      const { dissolveMasterOrder } = await import('@/app/actions/orders');
      const result = await dissolveMasterOrder(masterId);

      // Then
      expect(result).toEqual({ success: true });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('dissolve_master_order_atomic', {
        p_master_order_id: masterId,
        p_user_id: mockUser.id,
      });
      expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/logistics/master', 'page');
    });

    it('[Success] getHeldPreviousStatus: should query order_status_history and return correct status', async () => {
      // Given
      const orderId = 'order-uuid-999';
      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.order.mockReturnThis();
      mockSupabase.limit.mockReturnThis();
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { prev_status: 'REGISTERED' },
        error: null
      });

      // When
      const { getHeldPreviousStatus } = await import('@/app/actions/orders');
      const result = await getHeldPreviousStatus(orderId);

      // Then
      expect(result).toBe('REGISTERED');
      expect(mockSupabase.from).toHaveBeenCalledWith('order_status_history');
    });
  });
});
