import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrderByBarcodeOrNo, confirmInbound, getTodayInboundHistory } from '@/app/actions/operations/orders';
import { updatePackageRefs } from '@/app/actions/operations/warehouse';
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
    it('TC-INB.1: [Success] 존재하는 바코드로 조회 시 오더와 품목 상세를 반환해야 함', async () => {
      // Given
      const orderNo = 'ORD-20260523-001';
      const mockOrder = { id: 'order-123', order_no: orderNo, status: OrderStatus.SCHEDULED };
      const mockItems = [
        { id: 'item-1', item_name: 'Box A', quantity: 10, sku_code: 'SKU-001' },
      ];

      mockSupabase.maybeSingle.mockResolvedValue({ data: mockOrder, error: null });
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

    it('TC-INB.2: [Success] 존재하지 않는 바코드로 조회 시 null을 반환해야 함', async () => {
      // Given
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      // When
      const result = await getOrderByBarcodeOrNo('INVALID-BARCODE');

      // Then
      expect(result).toBeNull();
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

  describe('updatePackageRefs — TC-WH-REF', () => {
    const mockUser = { id: 'user-123' };
    const mockProfile = { id: 'user-123', org_id: 'org-456', role: 'ADMIN' };
    let chain: any;
    let updateFn: ReturnType<typeof vi.fn>;
    let selectFn: ReturnType<typeof vi.fn>;
    let eqFn: ReturnType<typeof vi.fn>;
    let maybeSingleFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();
      const fromFn = vi.fn();
      selectFn = vi.fn();
      eqFn = vi.fn();
      updateFn = vi.fn();
      maybeSingleFn = vi.fn();
      const eqResult = { maybeSingle: maybeSingleFn };
      const selectChain = { eq: eqFn, select: selectFn };
      const updateChain = { eq: eqFn, update: updateFn };
      chain = { ...selectChain, ...updateChain, from: fromFn, maybeSingle: maybeSingleFn };
      fromFn.mockReturnValue(chain);
      selectFn.mockReturnValue(selectChain);
      let eqCallCount = 0;
      eqFn.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) return eqResult;
        return { error: null };
      });
      updateFn.mockReturnValue(updateChain);
      (validateUserAction as any).mockResolvedValue({
        user: mockUser,
        profile: mockProfile,
        supabase: { from: fromFn, select: selectFn, eq: eqFn, update: updateFn, maybeSingle: maybeSingleFn },
      });
    });

    it('TC-WH-REF-01: [Success] 정상 업데이트 — domestic_ref_no + intl_ref_no 변경', async () => {
      const pkgId = '550e8400-e29b-41d4-a716-446655440001';
      maybeSingleFn.mockResolvedValue({ data: { id: pkgId, intl_ref_locked: false, intl_ref_no: null }, error: null });
      // eqFn은 beforeEach의 mockImplementation에 의해 첫 호출은 eqResult 반환, 두 번째 호출은 { error: null } 반환

      const result = await updatePackageRefs({
        packageId: pkgId,
        domesticRefNo: 'CJ1234567890',
        intlRefNo: '1Z999AA10123456784',
      });

      expect(result.success).toBe(true);
      expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({
        domestic_ref_no: 'CJ1234567890',
        intl_ref_no: '1Z999AA10123456784',
      }));
    });

    it('TC-WH-REF-02: [Reject] intl_ref_locked=true 상태에서 intl_ref_no 변경 시도 → 거부', async () => {
      const pkgId = '550e8400-e29b-41d4-a716-446655440002';
      maybeSingleFn.mockResolvedValue({ data: { id: pkgId, intl_ref_locked: true, intl_ref_no: '1Z999AA10123456784' }, error: null });

      const result = await updatePackageRefs({
        packageId: pkgId,
        domesticRefNo: 'CJ9876543210',
        intlRefNo: '1Z999AA10999999999',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('잠금');
      expect(updateFn).not.toHaveBeenCalled();
    });

    it('TC-WH-REF-03: [Reject] ref 문자열 100자 초과 → Zod 검증 에러', async () => {
      const result = await updatePackageRefs({
        packageId: '550e8400-e29b-41d4-a716-446655440003',
        domesticRefNo: 'A'.repeat(101),
        intlRefNo: null,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('100');
    });

    it('TC-WH-REF-04: [Reject] 패키지를 찾을 수 없음', async () => {
      const pkgId = '550e8400-e29b-41d4-a716-446655440099';
      maybeSingleFn.mockResolvedValue({ data: null, error: null });

      const result = await updatePackageRefs({
        packageId: pkgId,
        domesticRefNo: 'CJ123',
        intlRefNo: null,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('찾을 수 없습니다');
    });
  });
});
