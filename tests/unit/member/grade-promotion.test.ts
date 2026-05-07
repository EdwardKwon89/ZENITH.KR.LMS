import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  getGradeMaster,
  getMyProfile,
  getMyPendingPromotionRequest,
  requestGradePromotion,
  getGradePromotionRequests,
  reviewGradePromotion
} from '../../../src/app/actions/member';
import { validateUserAction, validateAdminAction } from '../../../src/lib/auth/guards';
import { sendInAppNotification } from '../../../src/app/actions/notifications';

// Mock the auth guards
vi.mock('../../../src/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

// Mock notifications
vi.mock('../../../src/app/actions/notifications', () => ({
  sendInAppNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Grade Promotion Unit Tests', () => {
  let mockSupabase: any;
  let mockUser: any;
  let mockProfile: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };

    mockUser = { id: 'test-user-id', email: 'test@zenith.kr' };
    mockProfile = { id: 'test-user-id', role: 'INDIVIDUAL', grade_code: 'G01' };

    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: mockUser,
      profile: mockProfile,
    });

    (validateAdminAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { ...mockUser, role: 'ADMIN' },
      profile: { ...mockProfile, role: 'ADMIN' },
    });
  });

  describe('Member Actions', () => {
    it('should fetch grade master list', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [{ grade_code: 'G01', grade_name_ko: '일반' }],
        error: null
      });

      const result = await getGradeMaster();
      expect(result).toHaveLength(1);
      expect(result[0].grade_code).toBe('G01');
      expect(mockSupabase.from).toHaveBeenCalledWith('grade_master');
    });

    it('should request grade promotion successfully', async () => {
      // Mock zen_profiles role/status check
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'INDIVIDUAL', status: 'ACTIVE' },
        error: null
      });

      // Mock profiles.grade_code lookup
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { grade_code: 'G01' },
        error: null
      });

      // Mock existing request check
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock insertion
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'req-123' },
        error: null
      });

      // Mock admins for notification
      mockSupabase.in.mockResolvedValueOnce({
        data: [{ id: 'admin-1' }],
        error: null
      });

      const result = await requestGradePromotion({
        targetGrade: 'G02',
        requestReason: 'Test reason'
      });

      expect(result.success).toBe(true);
      expect(result.requestId).toBe('req-123');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        target_grade: 'G02',
        request_reason: 'Test reason'
      }));
      expect(sendInAppNotification).toHaveBeenCalled();
    });

    it('should prevent promotion request if one is pending', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'INDIVIDUAL', status: 'ACTIVE' },
        error: null
      });

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { grade_code: 'G01' },
        error: null
      });

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'existing-req' },
        error: null
      });

      await expect(requestGradePromotion({
        targetGrade: 'G02',
        requestReason: 'Reason'
      })).rejects.toThrow('이미 대기 중인 승급 신청이 있습니다.');
    });
  });

  describe('Admin Actions', () => {
    it('should fetch promotion requests joined with zen_profiles', async () => {
      mockSupabase.range.mockResolvedValueOnce({
        data: [
          {
            id: 'req-1',
            user_id: 'user-1',
            current_grade: 'IRON',
            target_grade: 'BRONZE',
            request_reason: 'Need benefits',
            status: 'PENDING',
            admin_comment: null,
            processed_at: null,
            created_at: '2026-05-06T00:00:00.000Z',
            zen_profiles: {
              full_name: 'Requester One',
              email: 'requester@zenith.kr',
            },
          },
        ],
        count: 1,
        error: null,
      });

      const result = await getGradePromotionRequests();

      expect(result.total).toBe(1);
      expect(result.requests[0]).toMatchObject({
        user_name: 'Requester One',
        user_email: 'requester@zenith.kr',
        status: 'PENDING',
      });
      expect(validateAdminAction).toHaveBeenCalled();
    });

    it('should approve grade promotion', async () => {
      // Mock request fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'req-1', user_id: 'user-1', target_grade: 'G02', status: 'PENDING' },
        error: null
      });

      // Mock updates
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnValueOnce(mockSupabase) // For the first eq() followed by .single()
                    .mockResolvedValue({ error: null }); // For the second eq() which is awaited

      const result = await reviewGradePromotion({
        requestId: 'req-1',
        decision: 'APPROVED',
        adminComment: 'Approved'
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledTimes(2); // Request status + Profile grade
      expect(sendInAppNotification).toHaveBeenCalled();
    });
  });
});
