import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMasterOrderWithHouses } from '@/app/actions/orders';
import { validateUserAction } from '@/lib/auth/guards';

// Mock 의존성
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

describe('ZENITH Master Detail: Data Integrity Audit', () => {
  const mockMasterId = 'm-123';
  
  const createMockSupabase = () => {
    // 체이닝 함수들을 분리하여 정의
    const mockEq = vi.fn();
    const mockSingle = vi.fn();
    const mockSelect = vi.fn();
    const mockFrom = vi.fn();

    // 초기 상태 객체
    const mock: any = {
      from: mockFrom,
      select: mockSelect,
      eq: mockEq,
      single: mockSingle
    };

    // 모든 체이닝 메서드가 mock 객체를 반환하도록 설정 (무한 체이닝)
    mockFrom.mockReturnValue(mock);
    mockSelect.mockReturnValue(mock);
    mockEq.mockReturnValue(mock);
    mockSingle.mockReturnValue(mock);

    return mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-MD.1: [Success] 마스터 상세 정보와 하우스 목록을 결합하여 반환해야 함', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase });

    // getMasterOrderWithHouses 내부 호출 구조:
    // 1. master조회: from().select().eq().single()
    // 2. houses조회: from().select().eq()

    // 터미널 메서드들에 대해 순차적 응답 설정
    // single()은 마스터 조회 때 1번만 호출됨
    supabase.single.mockResolvedValueOnce({ 
      data: { id: mockMasterId, master_no: 'M260422-0001' }, 
      error: null 
    });

    // eq()는 마스터 조회(1회)와 하우스 조회(1회) 총 2회 호출됨
    // 1회차 eq (master id 필터): 그냥 체이닝용 리턴 (이미 createMockSupabase에서 처리됨)
    // 2회차 eq (houses master_order_id 필터): 데이터 반환
    supabase.eq
      .mockReturnValueOnce(supabase) // 1회차: master.eq("id", id) -> 계속 체이닝
      .mockResolvedValueOnce({ // 2회차: houses.eq("master_order_id", id) -> 데이터 반환
        data: [
          { id: 'h-1', order_no: 'H-001', master_order_id: mockMasterId },
          { id: 'h-2', order_no: 'H-002', master_order_id: mockMasterId }
        ], 
        error: null 
      });

    const result = await getMasterOrderWithHouses(mockMasterId);

    expect(result.id).toBe(mockMasterId);
    expect(result.houses).toHaveLength(2);
    expect(result.houses[0].order_no).toBe('H-001');
  });

  it('TC-MD.2: [Failure] 존재하지 않는 마스터 ID 조회 시 예외를 발생시켜야 함', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase });

    // single() 에러 모킹
    supabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    await expect(getMasterOrderWithHouses('invalid-id'))
      .rejects.toThrow(/Master order not found/);
  });
});
