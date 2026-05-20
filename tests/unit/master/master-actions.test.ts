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

vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

describe('ZENITH Master Data: CRUD Operations', () => {
  const supabaseMock: any = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    order: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    rpc: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    supabaseMock.from.mockReturnValue(supabaseMock);
    supabaseMock.select.mockReturnValue(supabaseMock);
    supabaseMock.insert.mockReturnValue(supabaseMock);
    supabaseMock.order.mockReturnValue(supabaseMock);
    supabaseMock.upsert.mockReturnValue(supabaseMock);
    supabaseMock.delete.mockReturnValue(supabaseMock);
    supabaseMock.update.mockReturnValue(supabaseMock);
    supabaseMock.rpc.mockReturnValue(supabaseMock);
    supabaseMock.eq.mockReturnValue(supabaseMock);
    supabaseMock.single.mockReturnValue(supabaseMock);
    supabaseMock.maybeSingle.mockReturnValue(supabaseMock);
    supabaseMock.then.mockImplementation((onFulfilled: any) => Promise.resolve({ data: [], error: null }).then(onFulfilled));

    (validateAdminAction as any).mockResolvedValue({ supabase: supabaseMock, user: { id: 'admin-1' } });
    (validateUserAction as any).mockResolvedValue({ supabase: supabaseMock, user: { id: 'user-1' } });
  });

  it('TC-M.1: [Success] getNations는 국가 목록을 이름 순으로 반환해야 함', async () => {
    // Given
    const mockData = [{ id: '1', name: 'Korea' }, { id: '2', name: 'USA' }];
    supabaseMock.order.mockResolvedValue({ data: mockData });

    // When
    const result = await getNations();

    // Then
    expect(supabaseMock.from).toHaveBeenCalledWith('zen_nations');
    expect(supabaseMock.order).toHaveBeenCalledWith('name', { ascending: true });
    expect(result).toEqual(mockData);
  });

  it('TC-M.2: [Success] getPorts는 항구 목록을 코드 순으로 반환해야 함', async () => {
    // Given
    const mockData = [{ code: 'KRPUS', name: 'Busan' }];
    supabaseMock.order.mockResolvedValue({ data: mockData });

    // When
    const result = await getPorts();

    // Then
    expect(supabaseMock.from).toHaveBeenCalledWith('zen_ports');
    expect(supabaseMock.order).toHaveBeenCalledWith('code', { ascending: true });
    expect(result).toEqual(mockData);
  });

  it('TC-M.3: [Success] upsertCommonCode는 데이터를 저장하고 경로를 갱신해야 함', async () => {
    // Given
    const payload = { group_code: 'TEST', code_value: '01', code_name: 'Test Code' };
    supabaseMock.single.mockResolvedValue({ data: { ...payload, id: 'uuid' } });

    // When
    await upsertCommonCode(payload);

    // Then
    expect(supabaseMock.from).toHaveBeenCalledWith('common_codes');
    expect(supabaseMock.upsert).toHaveBeenCalledWith(payload);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/codes', 'page');
  });

  it('TC-M.4: [Success] deleteCommonCode는 해당 ID를 삭제해야 함', async () => {
    // Given
    const deleteMock = {
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((onFulfilled) => Promise.resolve({ error: null }).then(onFulfilled))
    };
    supabaseMock.delete.mockReturnValue(deleteMock);

    // When
    await deleteCommonCode('G001', 'C001');

    // Then
    expect(supabaseMock.from).toHaveBeenCalledWith('common_codes');
    expect(supabaseMock.delete).toHaveBeenCalled();
    expect(deleteMock.eq).toHaveBeenCalledWith('group_code', 'G001');
    expect(deleteMock.eq).toHaveBeenCalledWith('code_value', 'C001');
  });

  describe('Master Order Actions: Exception Resilience', () => {

    it('TC-A.5: [Failure] 마스터 오더 생성 시 DB 에러 발생 시 예외를 던져야 함', async () => {
      // Given
      const payload = { houseOrderIds: ['h-1', 'h-2'] };
      supabaseMock.rpc.mockResolvedValue({ data: [{ total_weight: 100, total_volume: 10 }], error: null });
      supabaseMock.single.mockResolvedValue({ data: null, error: { message: 'Database Insert Error' } });

      // When & Then
      await expect(createMasterOrder(payload))
        .rejects.toThrow(/Master creation failed: Database Insert Error/);
    });

    it('TC-A.6: [Failure] 마스터 해체(Dissolve) 시 바인딩 해제 실패 시 예외를 던져야 함', async () => {
      // Given
      supabaseMock.eq.mockResolvedValue({ error: { message: 'Network Timeout' } });

      // When & Then
      await expect(dissolveMasterOrder('m-789'))
        .rejects.toThrow(/Unbinding failed: Network Timeout/);
    });
  });
});
