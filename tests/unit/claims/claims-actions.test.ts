import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClaims, createClaim, updateClaimStatus, addIncidentFee } from '@/app/actions/claims';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

// Mock 의존성 설정
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('ZENITH Claims Actions: Lifecycle & Settlement', () => {
  const supabaseMock: any = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    order: vi.fn(),
    then: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    supabaseMock.from.mockReturnValue(supabaseMock);
    supabaseMock.select.mockReturnValue(supabaseMock);
    supabaseMock.insert.mockReturnValue(supabaseMock);
    supabaseMock.update.mockReturnValue(supabaseMock);
    supabaseMock.delete.mockReturnValue(supabaseMock);
    supabaseMock.eq.mockReturnValue(supabaseMock);
    supabaseMock.single.mockReturnValue(supabaseMock);
    supabaseMock.order.mockReturnValue(supabaseMock);
    
    // Default then implementation
    supabaseMock.then.mockImplementation((onFulfilled: any) => 
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    );

    (validateUserAction as any).mockResolvedValue({ 
      supabase: supabaseMock, 
      user: { id: 'user-1' },
      profile: { id: 'prof-1', role: 'CORPORATE', org_id: 'org-1' }
    });
    
    (validateAdminAction as any).mockResolvedValue({ 
      supabase: supabaseMock, 
      user: { id: 'admin-1' },
      profile: { id: 'prof-admin', role: 'ADMIN', org_id: 'zenith-org' }
    });
  });

  it('TC-CLM.1: [Success] getClaims는 해당 조직의 클레임만 조회해야 함 (화주 기준)', async () => {
    // Given
    supabaseMock.then.mockImplementationOnce((onFulfilled: any) => 
      Promise.resolve({ data: [{ id: 'c1', org_id: 'org-1' }], error: null }).then(onFulfilled)
    );

    // When
    const result = await getClaims();

    // Then
    expect(supabaseMock.from).toHaveBeenCalledWith('zen_claims');
    expect(supabaseMock.eq).toHaveBeenCalledWith('org_id', 'org-1');
    expect(result).toHaveLength(1);
  });

  it('TC-CLM.2: [Success] createClaim은 클레임을 생성하고 오더 상태를 CLAIMED로 변경해야 함', async () => {
    // Given
    const payload = { order_id: 'o1', reason_code: 'DAMAGE' as const, description: 'Broken' };
    
    // 1. Order check (with status for canChangeStatus validation)
    supabaseMock.then.mockImplementationOnce((onFulfilled: any) => 
      Promise.resolve({ data: { id: 'o1', shipper_id: 'org-1', status: 'IN_TRANSIT' }, error: null }).then(onFulfilled)
    );
    // 2. Insert result
    supabaseMock.then.mockImplementationOnce((onFulfilled: any) => 
      Promise.resolve({ data: { id: 'c1' }, error: null }).then(onFulfilled)
    );
    // 3. Order update (status change)
    supabaseMock.then.mockImplementationOnce((onFulfilled: any) => 
      Promise.resolve({ data: null, error: null }).then(onFulfilled)
    );

    // When
    await createClaim(payload);

    // Then
    expect(supabaseMock.from).toHaveBeenCalledWith('zen_claims');
    expect(supabaseMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      order_id: 'o1',
      reason_code: 'DAMAGE',
      status: 'OPEN'
    }));
    expect(supabaseMock.from).toHaveBeenCalledWith('zen_orders');
    expect(supabaseMock.update).toHaveBeenCalledWith({ status: 'CLAIMED' });
  });

  it('TC-CLM.3: [Success] addIncidentFee는 사고비를 등록하고 인보이스 총액을 차감해야 함', async () => {
    // Given
    const payload = { claim_id: 'c1', invoice_id: 'inv1', fee_amount: 100, currency: 'USD' };
    
    // reset mock to default and provide specific responses
    supabaseMock.then.mockImplementation((onFulfilled: any) => 
      Promise.resolve({ data: { id: 'fee1', total_amount: 1000 }, error: null }).then(onFulfilled)
    );

    // When
    await addIncidentFee(payload);

    // Then
    expect(supabaseMock.from).toHaveBeenCalledWith('zen_incident_fees');
    expect(supabaseMock.from).toHaveBeenCalledWith('zen_invoices');
    expect(supabaseMock.update).toHaveBeenCalledWith(expect.objectContaining({
      total_amount: 900
    }));
  });

  it('TC-CLM.4: [Failure] 타 조직 오더에 대한 클레임 생성 시 예외를 던져야 함', async () => {
    // Given
    (validateUserAction as any).mockResolvedValueOnce({
      supabase: supabaseMock,
      user: { id: 'user-1' },
      profile: { id: 'prof-1', role: 'CORPORATE', org_id: 'org-1' }
    });

    // 전역 then mock이 타 조직 오더를 반환하도록 설정
    supabaseMock.then.mockImplementationOnce((onFulfilled: any) => 
      Promise.resolve({ data: { id: 'prof-1' }, error: null }).then(onFulfilled)
    );
    supabaseMock.then.mockImplementationOnce((onFulfilled: any) => 
      Promise.resolve({ data: { shipper_id: 'other-org' }, error: null }).then(onFulfilled)
    );

    // When & Then
    await expect(createClaim({ order_id: 'o1', reason_code: 'DELAY', description: 'Late' }))
      .rejects.toThrow(/do not have permission/);
  });

  it('TC-CLM.5: [Success] updateClaimStatus는 클레임 상태를 변경하고 revalidatePath를 호출해야 함', async () => {
    // Given
    supabaseMock.then.mockImplementationOnce((onFulfilled: any) => 
      Promise.resolve({ data: null, error: null }).then(onFulfilled)
    );

    // When
    const result = await updateClaimStatus('c1', 'INVESTIGATING');

    // Then
    expect(supabaseMock.from).toHaveBeenCalledWith('zen_claims');
    expect(supabaseMock.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'INVESTIGATING'
    }));
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/(dashboard)/admin/claims");
  });
});
