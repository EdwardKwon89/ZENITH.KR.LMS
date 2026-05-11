import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMyProfile, withdrawUser, getMyProfile } from '@/app/actions/member';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Profile Actions Unit Tests', () => {
  const mockUser = { id: 'user-123', email: 'test@zenith.kr' };
  const mockProfile = { id: 'user-123', email: 'test@zenith.kr', full_name: 'Test User' };
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    // For awaiting the result of the chain
    then: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (validateUserAction as any).mockResolvedValue({ user: mockUser, profile: mockProfile, supabase: mockSupabase });
    mockSupabase.then.mockImplementation((cb) => cb({ data: {}, error: null }));
  });

  it('TC-PROFILE-01: should get my profile successfully', async () => {
    const result = await getMyProfile();
    expect(result).toEqual(mockProfile);
  });

  it('TC-PROFILE-02: should update my profile successfully', async () => {
    const result = await updateMyProfile({ fullName: 'New Name' });
    
    expect(result.success).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_profiles');
    expect(mockSupabase.update).toHaveBeenCalledWith({ full_name: 'New Name' });
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockUser.id);
  });

  it('TC-PROFILE-03: should withdraw user successfully (soft delete)', async () => {
    const result = await withdrawUser();
    
    expect(result.success).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_profiles');
    expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: false });
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockUser.id);
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('TC-PROFILE-04: should handle error during withdrawal', async () => {
    mockSupabase.then.mockImplementationOnce((cb) => cb({ data: null, error: { message: 'DB Error' } }));
    
    const result = await withdrawUser();
    
    expect(result.error).toBe('탈퇴 처리 중 오류가 발생했습니다.');
  });
});
