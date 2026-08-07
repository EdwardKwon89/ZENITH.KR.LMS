import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrganizationInfo, updateOrganizationInfo, createDepartment, updateDepartment, deleteDepartment } from '@/app/actions/corporate';
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
    const result = await updateOrganizationInfo({ representative: 'New CEO' });
    
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
    expect(mockSupabase.update).toHaveBeenCalledWith({
      rep_name: 'New CEO'
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

  it('TC-MEM-05: updateOrganizationInfo 전달 payload가 실제 컬럼 5개로 구성되고 metadata 키를 포함하지 않아야 한다 (Issue #943)', async () => {
    await updateOrganizationInfo({
      representative: '대표자',
      bizNo: '123-45-67890',
      address: '서울시 강남구 테헤란로 123',
      contact: '010-1234-5678',
      email: 'corp@zenith.kr',
    });

    expect(mockSupabase.update).toHaveBeenCalledWith({
      rep_name: '대표자',
      biz_no: '123-45-67890',
      address: '서울시 강남구 테헤란로 123',
      contact_phone: '010-1234-5678',
      contact_email: 'corp@zenith.kr',
    });

    const updatePayload = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(updatePayload)).not.toContain('metadata');
    expect(Object.keys(updatePayload)).toHaveLength(5);
  });

  it('TC-MEM-06: getOrganizationInfo select가 실제 컬럼명(rep_name/biz_no/contact_phone/contact_email/address)을 포함하고 metadata를 조회하지 않아야 한다 (Issue #943)', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'org-456',
        name: '테스트 법인',
        rep_name: '대표자',
        biz_no: '123-45-67890',
        contact_phone: '010-1234-5678',
        contact_email: 'corp@zenith.kr',
        address: '서울시 강남구 테헤란로 123',
      },
      error: null,
    });

    const org = await getOrganizationInfo();

    expect(org?.rep_name).toBe('대표자');
    expect(mockSupabase.select).toHaveBeenCalledWith(expect.stringContaining('rep_name'));
    expect(mockSupabase.select).toHaveBeenCalledWith(expect.stringContaining('biz_no'));
    expect(mockSupabase.select).toHaveBeenCalledWith(expect.stringContaining('contact_phone'));
    expect(mockSupabase.select).toHaveBeenCalledWith(expect.stringContaining('contact_email'));
    expect(mockSupabase.select).toHaveBeenCalledWith(expect.stringContaining('address'));
    expect(mockSupabase.select).not.toHaveBeenCalledWith(expect.stringContaining('metadata'));
  });
});
