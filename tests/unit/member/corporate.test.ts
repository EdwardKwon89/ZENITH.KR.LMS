import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateOrganizationInfo, createDepartment, updateDepartment, deleteDepartment } from '@/app/actions/corporate';
import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Corporate Actions Unit Tests', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = { id: 'user-123', org_id: 'org-456', role: USER_ROLES.CORPORATE };
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    // For awaiting the result of the chain
    then: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (validateUserAction as any).mockResolvedValue({ user: mockUser, profile: mockProfile, supabase: mockSupabase });
    mockSupabase.then.mockImplementation((cb) => cb({ data: {}, error: null }));
    mockSupabase.single.mockResolvedValue({ data: {}, error: null });
  });

  it('TC-MEM-01: should update organization info successfully', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { metadata: { old: 'data' } }, error: null });
    
    const result = await updateOrganizationInfo({ representative: 'New CEO' });
    
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
    expect(mockSupabase.update).toHaveBeenCalledWith({
      metadata: { old: 'data', representative: 'New CEO' }
    });
  });

  it('TC-MEM-02: should create department successfully', async () => {
    const result = await createDepartment('Sales');
    
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      org_id: 'org-456',
      name: 'Sales'
    });
  });

  it('TC-MEM-03: should delete department successfully', async () => {
    const result = await deleteDepartment('dept-789');
    
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
    expect(mockSupabase.delete).toHaveBeenCalled();
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'dept-789');
  });

  it('TC-MEM-04: should return error if unauthorized role tries to update org info', async () => {
    (validateUserAction as any).mockResolvedValueOnce({ 
      user: mockUser, 
      profile: { ...mockProfile, role: USER_ROLES.USER }, // Regular user
      supabase: mockSupabase 
    });

    const result = await updateOrganizationInfo({ representative: 'Bad Guy' });
    expect(result.data).toBeNull();
    expect(result.error).toBe('조직 정보를 수정할 권한이 없습니다.');
  });
});
