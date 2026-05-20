import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMasterOrderWithHouses } from '@/app/actions/operations/orders';
import { validateUserAction } from '@/lib/auth/guards';

// Mock 의존성
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

describe('ZENITH Master Detail: Data Integrity Audit', () => {
  const mockMasterId = 'm-123';
  
  const createMockSupabase = () => {
    const mockEq = vi.fn();
    const mockSingle = vi.fn();
    const mockSelect = vi.fn();
    const mockFrom = vi.fn();
    const mockRange = vi.fn();

    const mock: any = {
      from: mockFrom,
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      range: mockRange
    };

    mockFrom.mockReturnValue(mock);
    mockSelect.mockReturnValue(mock);
    mockEq.mockReturnValue(mock);
    mockSingle.mockReturnValue(mock);
    mockRange.mockReturnValue(mock);

    return mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-MD.1: [Success] 마스터 상세 정보와 하우스 목록을 결합하여 반환해야 함', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase });

    supabase.single.mockResolvedValueOnce({ 
      data: { id: mockMasterId, master_no: 'M260422-0001' }, 
      error: null 
    });

    supabase.range.mockResolvedValueOnce({
      data: [
        { id: 'h-1', order_no: 'H-001', master_order_id: mockMasterId },
        { id: 'h-2', order_no: 'H-002', master_order_id: mockMasterId }
      ], 
      error: null,
      count: 2
    });

    const result = await getMasterOrderWithHouses(mockMasterId);

    expect(result.id).toBe(mockMasterId);
    expect(result.houses).toHaveLength(2);
    expect(result.houses[0].order_no).toBe('H-001');
    expect(result.totalHouses).toBe(2);
  });

  it('TC-MD.2: [Failure] 존재하지 않는 마스터 ID 조회 시 예외를 발생시켜야 함', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase });

    supabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    await expect(getMasterOrderWithHouses('invalid-id'))
      .rejects.toThrow(/Master order not found/);
  });
});
