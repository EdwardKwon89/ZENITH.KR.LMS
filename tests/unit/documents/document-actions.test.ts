import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrderDocumentData } from '@/app/actions/finance';
import { validateUserAction } from '@/lib/auth/guards';

// Mock 의존성 설정
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

describe('ZENITH Document Actions: Data Aggregation', () => {
  const supabaseMock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    supabaseMock.from.mockReturnValue(supabaseMock);
    supabaseMock.select.mockReturnValue(supabaseMock);
    supabaseMock.eq.mockReturnValue(supabaseMock);
    supabaseMock.order.mockReturnValue(supabaseMock);
    supabaseMock.maybeSingle.mockReturnValue(supabaseMock);

    (validateUserAction as any).mockResolvedValue({ supabase: supabaseMock, user: { id: 'user-1' } });
  });

  it('TC-DOC.1: [Success] getOrderDocumentData는 오더, 패킹, 아이템 정보를 통합하여 반환해야 함', async () => {
    // Given
    const orderNo = 'ORD-2026-0001';
    const mockOrder = { id: 'order-uuid', order_no: orderNo, shipper_id: 'shipper-1' };
    const mockPackages = [{ id: 'pkg-1', package_no: 'P01', order_id: 'order-uuid' }];
    const mockItems = [{ id: 'item-1', package_id: 'pkg-1', item_name: 'Product A', quantity: 10 }];

    // Chain setup for multiple calls
    supabaseMock.maybeSingle.mockResolvedValueOnce({ data: mockOrder, error: null });
    supabaseMock.order.mockResolvedValueOnce({ data: mockPackages, error: null }); // for packages
    supabaseMock.order.mockResolvedValueOnce({ data: mockItems, error: null });    // for items

    // When
    const result = await getOrderDocumentData(orderNo);

    // Then
    expect(supabaseMock.from).toHaveBeenCalledWith('zen_orders');
    expect(supabaseMock.eq).toHaveBeenCalledWith('order_no', orderNo);
    expect(result.order_no).toBe(orderNo);
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].items).toHaveLength(1);
    expect(result.packages[0].items[0].item_name).toBe('Product A');
  });

  it('TC-DOC.2: [Failure] 존재하지 않는 오더 번호 조회 시 예외를 던져야 함', async () => {
    // Given
    supabaseMock.maybeSingle.mockResolvedValue({ data: null, error: null });

    // When & Then
    await expect(getOrderDocumentData('NON-EXISTENT'))
      .rejects.toThrow(/해당 번호\(NON-EXISTENT\)의 오더를 찾을 수 없습니다/);
  });

  it('TC-DOC.3: [Failure] DB 조회 오류 발생 시 예외를 던져야 함', async () => {
    // Given
    supabaseMock.maybeSingle.mockResolvedValue({ data: null, error: { message: 'Connection Error' } });

    // When & Then
    await expect(getOrderDocumentData('ORD-ERR'))
      .rejects.toThrow(/오더 조회 중 오류 발생: Connection Error/);
  });
});
