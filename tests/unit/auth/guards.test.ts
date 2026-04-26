import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateAdminAction, validateUserAction } from '@/lib/auth/guards';
import { createClient } from '@/utils/supabase/server';
import { checkPermission } from '@/lib/auth/rbac';
import { redirect } from 'next/navigation';

// Mock 의존성 설정
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/auth/rbac', () => ({
  checkPermission: vi.fn(),
  USER_ROLES: {
    ZENITH_SUPER_ADMIN: 'ZENITH_SUPER_ADMIN',
    ADMIN: 'ADMIN',
    CUSTOMER: 'CUSTOMER',
  },
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('ZENITH Security Guard: Server Action Authorization', () => {
  const mockUser = { id: 'user-123', email: 'admin@zenith.kr' };
  const mockProfile = { id: 'user-123', role: 'ADMIN', org_id: 'org-456' };

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Supabase Mock 초기화
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    (createClient as any).mockResolvedValue(mockSupabase);
  });

  it('TC-G.1: [Success] 관리자 권한을 가진 사용자는 프로필 전체 정보를 반환해야 함', async () => {
    // Given
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    mockSupabase.single.mockResolvedValue({ data: mockProfile });
    (checkPermission as any).mockResolvedValue(true);

    // When
    const result = await validateAdminAction();

    // Then
    expect(result.user).toEqual(mockUser);
    expect(result.profile).toEqual(mockProfile); // select("*")가 반영된 전체 정보
    expect(mockSupabase.select).toHaveBeenCalledWith('*');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('TC-G.2: [Failure] 권한이 없는 사용자가 관리자 액션 호출 시 예외를 발생시켜야 함', async () => {
    // Given
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    mockSupabase.single.mockResolvedValue({ data: { ...mockProfile, role: 'CUSTOMER' } });
    (checkPermission as any).mockReturnValue(false);

    // When & Then
    await expect(validateAdminAction()).rejects.toThrow('Unauthorized access');
  });

  it('TC-G.3: [Failure] 세션이 없는 경우 로그인 페이지로 리다이렉트해야 함', async () => {
    // Given
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    // When & Then
    await expect(validateAdminAction()).rejects.toThrow('Login required');
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('TC-G.4: [Success] 일반 사용자 액션 가드는 권한 체크 없이 프로필을 반환해야 함', async () => {
    // Given
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    mockSupabase.single.mockResolvedValue({ data: mockProfile });

    // When
    const result = await validateUserAction();

    // Then
    expect(result.user).toEqual(mockUser);
    expect(checkPermission).not.toHaveBeenCalled(); // 일반 유저는 경로 권한 체크 패스
  });
});
