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

// ─── TASK-B-267 (Issue #1028): AGENCY/SHIPPER 역할 법인정보·부서 관리 확장 ─────────

describe('Corporate Actions — AGENCY/SHIPPER 확장 (TASK-B-267 / Issue #1028)', () => {
  const mockUser = { id: 'user-123' };
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn(),
  };

  function setup(role: string) {
    vi.clearAllMocks();
    const profile = { id: 'user-123', org_id: 'org-456', role };
    (validateUserAction as any).mockResolvedValue({ user: mockUser, profile, supabase: mockSupabase });
    mockSupabase.then.mockImplementation((cb) => cb({ data: {}, error: null }));
    mockSupabase.single.mockResolvedValue({ data: {}, error: null });
  }

  it('TC-267-01: AGENCY 역할은 updateOrganizationInfo 성공 (법인정보 수정 허용)', async () => {
    setup(USER_ROLES.AGENCY);
    const result = await updateOrganizationInfo({ representative: 'Agency CEO', contact: '010-0000-1111' });
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
    expect(mockSupabase.update).toHaveBeenCalledWith({ rep_name: 'Agency CEO', contact_phone: '010-0000-1111' });
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'org-456');
  });

  it('TC-267-02: SHIPPER 역할은 updateOrganizationInfo 성공', async () => {
    setup(USER_ROLES.SHIPPER);
    const result = await updateOrganizationInfo({ bizNo: '999-88-77777' });
    expect(result.data).toBe(true);
    expect(mockSupabase.update).toHaveBeenCalledWith({ biz_no: '999-88-77777' });
  });

  it('TC-267-03: AGENCY/SHIPPER 역할은 부서 create/update/delete 모두 허용', async () => {
    for (const role of [USER_ROLES.AGENCY, USER_ROLES.SHIPPER]) {
      setup(role);
      const created = await createDepartment('Sales');
      expect(created.data).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith({ org_id: 'org-456', name: 'Sales' });

      setup(role);
      const updated = await updateDepartment('dept-1', 'Marketing');
      expect(updated.data).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({ name: 'Marketing' });

      setup(role);
      const deleted = await deleteDepartment('dept-1');
      expect(deleted.data).toBe(true);
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'dept-1');
    }
  });

  it('TC-267-04: 기존 CORPORATE/ADMIN 하위 호환 유지', async () => {
    for (const role of [USER_ROLES.CORPORATE, USER_ROLES.ADMIN]) {
      setup(role);
      const result = await updateOrganizationInfo({ representative: 'CEO' });
      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    }
  });

  it('TC-267-05: 여전히 권한 없는 역할(CARRIER/INDIVIDUAL/USER 등)은 updateOrganizationInfo 거부', async () => {
    for (const role of [USER_ROLES.CARRIER, USER_ROLES.INDIVIDUAL, USER_ROLES.USER, USER_ROLES.OPERATOR]) {
      setup(role);
      const result = await updateOrganizationInfo({ representative: 'Nope' });
      expect(result.data).toBeNull();
      expect(result.error).toBe('조직 정보를 수정할 권한이 없습니다.');
    }
  });

  it('TC-267-06: AGENCY_SHIPPER는 이번 확장 범위 미포함 — updateOrganizationInfo 거부 (JSJung 확인 전 임의 추가 금지)', async () => {
    setup(USER_ROLES.AGENCY_SHIPPER);
    const result = await updateOrganizationInfo({ representative: 'Nope' });
    expect(result.data).toBeNull();
    expect(result.error).toBe('조직 정보를 수정할 권한이 없습니다.');
  });

  it('TC-267-07: 권한 없는 역할은 부서 create도 거부', async () => {
    setup(USER_ROLES.CARRIER);
    const result = await createDepartment('Sales');
    expect(result.data).toBeNull();
    expect(result.error).toBe('부서 관리 권한이 없습니다.');
  });
});
