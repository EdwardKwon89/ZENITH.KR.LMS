import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrderByBarcodeOrNo, confirmInbound, getTodayInboundHistory } from '@/app/actions/operations/orders';
import { validateUserAction } from '@/lib/auth/guards';
import { OrderStatus } from '@/types/orders';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

describe('ZENITH Logistics: Inbound Process Unit Tests', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = { id: 'user-123', org_id: 'org-456', role: 'ADMIN' };
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
      rpc: vi.fn(),
    };

    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: mockProfile,
      supabase: mockSupabase,
    });
  });

  describe('getOrderByBarcodeOrNo', () => {
    it('TC-INB.1: [Success] 존재하는 오더번호로 조회 시 오더와 품목 상세를 반환해야 함', async () => {
      // Given
      const orderNo = 'ORD-20260523-001';
      const mockOrder = { id: 'order-123', order_no: orderNo, status: OrderStatus.SCHEDULED };
      const mockItems = [
        { id: 'item-1', item_name: 'Box A', quantity: 10, sku_code: 'SKU-001' },
      ];

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'order-123' }, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null });
      mockSupabase.order.mockResolvedValue({ data: mockItems, error: null });

      // When
      const result = await getOrderByBarcodeOrNo(orderNo);

      // Then
      expect(result).not.toBeNull();
      expect(result?.order_no).toBe(orderNo);
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0].sku_code).toBe('SKU-001');
      expect(mockSupabase.from).toHaveBeenCalledWith('zen_orders');
    });

    it('TC-INB.2: [Success] 존재하지 않는 값(오더번호/Local Tracking No 모두 불일치)으로 조회 시 null을 반환해야 함', async () => {
      // Given
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      // When
      const result = await getOrderByBarcodeOrNo('INVALID-BARCODE');

      // Then
      expect(result).toBeNull();
    });

    it('TC-INB.3: [Success] UUID 형식 ID로 조회 시 오더를 반환해야 함', async () => {
      // Given
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockOrder = { id: uuid, order_no: 'ORD-UUID-001', status: OrderStatus.SCHEDULED };
      const mockItems = [
        { id: 'item-1', item_name: 'Box B', quantity: 5, sku_code: 'SKU-002' },
      ];

      mockSupabase.maybeSingle.mockResolvedValue({ data: mockOrder, error: null });
      mockSupabase.order.mockResolvedValue({ data: mockItems, error: null });

      // When
      const result = await getOrderByBarcodeOrNo(uuid);

      // Then
      expect(result).not.toBeNull();
      expect(result?.id).toBe(uuid);
      expect(result?.items).toHaveLength(1);
    });

    it('TC-INB.4: [Success] order_no 미매칭 → domestic_ref_no(Local Tracking No) 2차 조회 성공', async () => {
      // Given
      const localTrackingNo = 'LPN-20260726-001';
      const mockOrder = { id: 'order-456', order_no: 'ORD-LOCAL-001', status: OrderStatus.SCHEDULED };
      const mockItems = [
        { id: 'item-2', item_name: 'Box C', quantity: 3, sku_code: 'SKU-003' },
      ];

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { order_id: 'order-456' }, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null });
      mockSupabase.order.mockResolvedValue({ data: mockItems, error: null });

      // When
      const result = await getOrderByBarcodeOrNo(localTrackingNo);

      // Then
      expect(result).not.toBeNull();
      expect(result?.order_no).toBe('ORD-LOCAL-001');
      expect(result?.items).toHaveLength(1);
    });

    it('TC-INB.5: [Error] DB 조회 실패 시 throw해야 함', async () => {
      // Given
      const orderNo = 'ORD-ERROR-001';
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'order-err' }, error: null })
        .mockResolvedValueOnce({ data: null, error: new Error('DB connection lost') });

      // When & Then
      await expect(getOrderByBarcodeOrNo(orderNo)).rejects.toThrow('오더 조회 실패');
    });
  });

  describe('confirmInbound', () => {
    it('TC-INB.3: [Success] 입고 확정 시 검수 결과를 포함하여 updateOrderStatus를 호출해야 함', async () => {
      // Given
      const orderId = 'order-123';
      const inspectStatus = 'NORMAL';
      const note = '이상 없음';

      // updateOrderStatus 내부 조회 Mocking
      mockSupabase.maybeSingle.mockResolvedValue({ data: { master_order_id: null }, error: null });
      mockSupabase.single.mockResolvedValue({ data: { status: OrderStatus.SCHEDULED, transport_mode: 'AIR' }, error: null });
      mockSupabase.rpc.mockResolvedValue({ error: null });

      // When
      const result = await confirmInbound(orderId, inspectStatus, note);

      // Then
      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_order_status_atomic', expect.objectContaining({
        p_order_id: orderId,
        p_prev_status: OrderStatus.SCHEDULED,
        p_next_status: OrderStatus.WAREHOUSED,
        p_reason: '[검수: 정상] 이상 없음',
      }));
    });
  });

  describe('getTodayInboundHistory', () => {
    it('TC-INB.4: [Success] 오늘 하루 동안의 입고 처리 이력을 조회해야 함', async () => {
      // Given
      const mockHistory = [
        {
          id: 'hist-1',
          order_id: 'order-123',
          next_status: OrderStatus.WAREHOUSED,
          reason: '[검수: 정상] 이상 없음',
          created_at: new Date().toISOString(),
        },
      ];
      mockSupabase.order.mockResolvedValue({ data: mockHistory, error: null });

      // When
      const result = await getTodayInboundHistory();

      // Then
      expect(result).toHaveLength(1);
      expect(result[0].reason).toContain('정상');
      expect(mockSupabase.from).toHaveBeenCalledWith('order_status_history');
      expect(mockSupabase.gte).toHaveBeenCalled();
      expect(mockSupabase.lte).toHaveBeenCalled();
    });
  });
});
