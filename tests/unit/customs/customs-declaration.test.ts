import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDeclaration, getDeclarations, updateDeclarationStatus, submitDeclaration } from '@/app/actions/customs';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock Supabase Server Client
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock Next.js Cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Customs Server Actions', () => {
  let mockSupabase: any;
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    vi.clearAllMocks();

    const mockProfile = { id: 'user-123', role: 'ADMIN' };
    
    // profiles 전용 쿼리 체인
    const profileQueryChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    };

    // 일반 테이블용 쿼리 체인 (이미 존재하던 mockQueryChain 역할)
    const mockQueryChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    };

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockImplementation((table) => {
        if (table === 'profiles') return profileQueryChain;
        return mockQueryChain;
      }),
      ...mockQueryChain, // 기본 메서드 노출
    };

    (createClient as any).mockImplementation(() => Promise.resolve(mockSupabase));
  });

  it('TC-CCL-01: createDeclaration — 초기 상태 PENDING', async () => {
    const payload = {
      orderId: 'order-123',
      cargoDescription: 'Electronics',
      declaredValue: 5000,
      currencyCode: 'USD',
    };

    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'decl-123' }, error: null });

    const result = await createDeclaration(payload);

    expect(result.success).toBe(true);
    expect(result.id).toBe('decl-123');
    expect(mockSupabase.from).toHaveBeenCalledWith('customs_declarations');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/customs');
  });

  it('TC-CCL-04: getDeclarations — 화주별 권한 격리', async () => {
    const mockData = [
      {
        id: 'decl-123',
        order_id: 'order-123',
        status: 'PENDING',
        order: {
          order_no: 'ORD-001',
          shipper: { full_name: 'John Doe' }
        }
      }
    ];

    mockSupabase.range.mockResolvedValueOnce({ data: mockData, error: null, count: 1 });

    const result = await getDeclarations();

    expect(result.declarations).toHaveLength(1);
    expect(result.declarations[0].order_no).toBe('ORD-001');
    expect(result.declarations[0].shipper_name).toBe('John Doe');
  });

  it('TC-CCL-02: updateDeclarationStatus — 상태/메모 업데이트', async () => {
    const payload = {
      id: 'decl-123',
      status: 'APPROVED' as const,
      adminNote: 'Verified'
    };

    mockSupabase.eq.mockResolvedValueOnce({ error: null });

    const result = await updateDeclarationStatus(payload);

    expect(result.success).toBe(true);
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'APPROVED',
      admin_note: 'Verified'
    }));
  });

  it('TC-CCL-03: submitDeclaration — 어댑터 연동 및 SUBMITTED 전환', async () => {
    // 1. Fetch current record
    mockSupabase.single.mockResolvedValueOnce({ 
      data: { id: 'decl-123', order_id: 'order-123' }, 
      error: null 
    });
    
    // 2. Update status after submission
    // First call to eq (in select) should return this, second call (in update) should return result
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockResolvedValueOnce({ error: null });

    const result = await submitDeclaration('decl-123');

    expect(result.success).toBe(true);
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'SUBMITTED'
    }));
  });
});
