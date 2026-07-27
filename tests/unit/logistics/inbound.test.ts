import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrderByBarcodeOrNo, confirmInbound, saveInboundMeasurements, getTodayInboundHistory } from '@/app/actions/operations/orders';
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

vi.mock('@/app/actions/ups/freight', () => ({
  estimateUpsFreight: vi.fn().mockResolvedValue({
    platform: { totalSellingPrice: 150, currency: 'USD', baseSellingPrice: 100, fuelSurchargeSellingAmount: 20, otherChargesSellingTotal: 10, surgeFeeSellingAmount: 20 },
    agency: null,
    shipper: null,
  }),
}));

describe('ZENITH Logistics: Inbound Process Unit Tests', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = { id: 'user-123', org_id: 'org-456', role: 'ADMIN' };
  let mockSupabase: any;
  let orderResolve: (col: string, asc: boolean) => any;

  const defaultOrderResolve = (_col: string, asc: boolean) => asc ? { data: [], error: null } : undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    orderResolve = defaultOrderResolve;

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(function(this: any, column: string, opts?: any) {
        const result = orderResolve(column, opts?.ascending ?? true);
        if (result) return { then: (resolve: any) => resolve(result) };
        return this;
      }),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
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

      orderResolve = (col, asc) => asc ? { data: mockItems, error: null } : undefined;
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'order-123' }, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

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

      orderResolve = (col, asc) => asc ? { data: mockItems, error: null } : undefined;
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockOrder, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

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

      orderResolve = (col, asc) => asc ? { data: mockItems, error: null } : undefined;
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { order_id: 'order-456' }, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

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

    it('TC-INB.6: [Success] 조회 시 packages[].id가 정상 포함되어야 함 (DEF-B-009 재발 방지)', async () => {
      // Given
      const orderNo = 'ORD-PKG-001';
      const mockOrder = {
        id: 'order-pkg-001',
        order_no: orderNo,
        status: OrderStatus.SCHEDULED,
        order_packages: [
          { id: 'pkg-001', order_id: 'order-pkg-001', packing_unit: 'BOX', packing_count: 2, length: 10, width: 10, height: 10, gross_weight: 5, volume: 0.001 },
          { id: 'pkg-002', order_id: 'order-pkg-001', packing_unit: 'PAL', packing_count: 1, length: 100, width: 80, height: 60, gross_weight: 50, volume: 0.48 },
        ],
      };
      const mockItems = [
        { id: 'item-1', item_name: 'Box D', quantity: 2, sku_code: 'SKU-004' },
      ];

      orderResolve = (col, asc) => asc ? { data: mockItems, error: null } : undefined;
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'order-pkg-001' }, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      // When
      const result = await getOrderByBarcodeOrNo(orderNo);

      // Then
      expect(result).not.toBeNull();
      expect(result?.packages).toHaveLength(2);
      expect(result?.packages[0].id).toBe('pkg-001');
      expect(result?.packages[1].id).toBe('pkg-002');
    });

    it('TC-INB.9: [Success] 조회 시 currentFreight가 rateSnapshot 있으면 포함되어야 함', async () => {
      // Given
      const orderNo = 'ORD-FREIGHT-001';
      const mockOrder = { id: 'order-frt-001', order_no: orderNo, status: OrderStatus.SCHEDULED };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'order-frt-001' }, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null })
        .mockResolvedValueOnce({ data: { applied_unit_price: 1250, applied_currency: 'USD' }, error: null });

      // When
      const result = await getOrderByBarcodeOrNo(orderNo);

      // Then
      expect(result).not.toBeNull();
      expect(result?.currentFreight).toEqual({ amount: 1250, currency: 'USD' });
    });

    it('TC-INB.10: [Success] rateSnapshot 없으면 currentFreight가 null이어야 함', async () => {
      // Given
      const orderNo = 'ORD-NO-FREIGHT';
      const mockOrder = { id: 'order-no-frt', order_no: orderNo, status: OrderStatus.SCHEDULED };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'order-no-frt' }, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      // When
      const result = await getOrderByBarcodeOrNo(orderNo);

      // Then
      expect(result).not.toBeNull();
      expect(result?.currentFreight).toBeNull();
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
      expect(result.freightEstimate).toBeUndefined();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_order_status_atomic', expect.objectContaining({
        p_order_id: orderId,
        p_prev_status: OrderStatus.SCHEDULED,
        p_next_status: OrderStatus.WAREHOUSED,
        p_reason: '[검수: 정상] 이상 없음',
      }));
    });
  });

  describe('saveInboundMeasurements', () => {
    it('TC-INB.7: [Success] 측정값 저장 시 zen_order_packages update + 운임 재계산 호출, 상태 전이 없음', async () => {
      // Given
      const orderId = 'order-789';
      const packageUpdates = [
        { packageId: 'pkg-001', gross_weight: 15, length: 30, width: 25, height: 20 },
      ];

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { metadata: { platform: { totalSellingPrice: 100, currency: 'USD' } }, applied_unit_price: 100 }, error: null })
        .mockResolvedValueOnce({ data: { status: OrderStatus.SCHEDULED, transport_mode: 'UPS', ups_product_code: 'UPS-EXPRESS' }, error: null })
        .mockResolvedValueOnce({ data: { gross_weight: 10, length: 20, width: 15, height: 10 }, error: null });
      mockSupabase.single.mockResolvedValue({ data: { status: OrderStatus.SCHEDULED }, error: null });
      mockSupabase.rpc.mockResolvedValue({ error: null });

      // When
      const result = await saveInboundMeasurements(orderId, packageUpdates);

      // Then
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('zen_order_packages');
      expect(mockSupabase.from).toHaveBeenCalledWith('order_status_history');
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it('TC-INB.8: [Validation] 빈 updates 전달 시 실패 반환', async () => {
      // When
      const result = await saveInboundMeasurements('order-xxx', []);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBe('변경된 측정값이 없습니다.');
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

  describe('DEF-B-016: applyPackageMeasurements agencyOrgId 전달 검증', () => {
    it('TC-DEF-B-016: UPS 오더 측정값 저장 시 estimateUpsFreightFn에 agencyOrgId가 전달되어야 함', async () => {
      const { estimateUpsFreight } = await import('@/app/actions/ups/freight');
      const mockEstimate = vi.mocked(estimateUpsFreight);
      mockEstimate.mockClear();
      mockEstimate.mockResolvedValue({
        platform: { totalSellingPrice: 150, currency: 'USD', baseSellingPrice: 100, fuelSurchargeSellingAmount: 20, otherChargesSellingTotal: 10, surgeFeeSellingAmount: 20 } as any,
        agency: null,
        shipper: null,
      });

      const orderId = 'order-agency-test';
      const agencyOrgId = 'org-agency-123';
      const packageUpdates = [
        { packageId: 'pkg-001', gross_weight: 15, length: 30, width: 25, height: 20 },
      ];

      const agencyProfile = { id: 'user-agency', org_id: 'org-other', role: 'AGENCY' };
      (validateUserAction as any).mockResolvedValue({
        user: { id: 'user-agency' },
        profile: agencyProfile,
        supabase: mockSupabase,
      });

      // 1. existingSnapshot
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { metadata: {}, applied_unit_price: 100 }, error: null })
        // 2. orderMeta
        .mockResolvedValueOnce({ data: { status: OrderStatus.WAREHOUSED, transport_mode: 'UPS', ups_product_code: 'UPS-EXPRESS', agency_org_id: agencyOrgId, dest_port_id: null, recipient_country_code: 'US', incoterms: 'DDU', shipper_id: 'shipper-1', order_no: 'ORD-AGENCY-001' }, error: null })
        // 3. currentPkg
        .mockResolvedValueOnce({ data: { gross_weight: 10, length: 20, width: 15, height: 10 }, error: null })
        // 4. UPS product
        .mockResolvedValueOnce({ data: { id: 'product-1' }, error: null });

      // from() chaining: order_packages select → returns packages data
      let fromCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        fromCallCount++;
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          maybeSingle: mockSupabase.maybeSingle,
        };

        if (table === 'zen_order_packages' && fromCallCount >= 5) {
          // packages query inside the freight calculation block
          chain.select.mockReturnValue({
            ...chain,
            eq: vi.fn().mockResolvedValue({ data: [{ gross_weight: 15, length: 30, width: 25, height: 20 }], error: null }),
          });
        }

        return chain;
      });

      await saveInboundMeasurements(orderId, packageUpdates);

      expect(mockEstimate).toHaveBeenCalledWith(
        expect.objectContaining({
          agencyOrgId: agencyOrgId,
        })
      );
    });
  });
});
