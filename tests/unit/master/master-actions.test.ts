import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNations, getPorts, upsertCommonCode, deleteCommonCode } from '@/app/actions/master';
import { createMasterOrder, dissolveMasterOrder } from '@/app/actions/orders';
import { validateAdminAction, validateUserAction } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

// Mock 의존성 설정
vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('ZENITH Master Data: CRUD Operations', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };

    (validateAdminAction as any).mockResolvedValue({ supabase: mockSupabase, user: { id: 'admin-1' } });
    (validateUserAction as any).mockResolvedValue({ supabase: mockSupabase, user: { id: 'user-1' } });
  });

  it('TC-M.1: [Success] getNations는 국가 목록을 이름 순으로 반환해야 함', async () => {
    // Given
    const mockData = [{ id: '1', name: 'Korea' }, { id: '2', name: 'USA' }];
    mockSupabase.order.mockResolvedValue({ data: mockData });

    // When
    const result = await getNations();

    // Then
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_nations');
    expect(mockSupabase.order).toHaveBeenCalledWith('name', { ascending: true });
    expect(result).toEqual(mockData);
  });

  it('TC-M.2: [Success] getPorts는 항구 목록을 코드 순으로 반환해야 함', async () => {
    // Given
    const mockData = [{ code: 'KRPUS', name: 'Busan' }];
    mockSupabase.order.mockResolvedValue({ data: mockData });

    // When
    const result = await getPorts();

    // Then
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ports');
    expect(mockSupabase.order).toHaveBeenCalledWith('code', { ascending: true });
    expect(result).toEqual(mockData);
  });

  it('TC-M.3: [Success] upsertCommonCode는 데이터를 저장하고 경로를 갱신해야 함', async () => {
    // Given
    const payload = { group_code: 'TEST', code_value: '01' };
    mockSupabase.single.mockResolvedValue({ data: { ...payload, id: 'uuid' } });

    // When
    await upsertCommonCode(payload);

    // Then
    expect(mockSupabase.from).toHaveBeenCalledWith('common_codes');
    expect(mockSupabase.upsert).toHaveBeenCalledWith(payload);
    expect(revalidatePath).toHaveBeenCalledWith('/(dashboard)/master/codes', 'page');
  });

  it('TC-M.4: [Success] deleteCommonCode는 해당 ID를 삭제해야 함', async () => {
    // Given
    mockSupabase.eq.mockResolvedValue({ error: null });

    // When
    await deleteCommonCode('target-id');

    // Then
    expect(mockSupabase.from).toHaveBeenCalledWith('common_codes');
    expect(mockSupabase.delete).toHaveBeenCalled();
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'target-id');
  });

  describe('Master Order Actions: Exception Resilience', () => {

    it('TC-A.5: [Failure] 마스터 오더 생성 시 DB 에러 발생 시 예외를 던져야 함', async () => {
      // Given
      const payload = { houseOrderIds: ['h-1', 'h-2'] };
      mockSupabase.rpc.mockResolvedValue({ data: [{ total_weight: 100, total_volume: 10 }], error: null });
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Database Insert Error' } });

      // When & Then
      await expect(createMasterOrder(payload))
        .rejects.toThrow(/Master creation failed: Database Insert Error/);
    });

    it('TC-A.6: [Failure] 마스터 해체(Dissolve) 시 바인딩 해제 실패 시 예외를 던져야 함', async () => {
      // Given
      mockSupabase.eq.mockResolvedValue({ error: { message: 'Network Timeout' } });

      // When & Then
      await expect(dissolveMasterOrder('m-789'))
        .rejects.toThrow(/Unbinding failed: Network Timeout/);
    });
  });
});
