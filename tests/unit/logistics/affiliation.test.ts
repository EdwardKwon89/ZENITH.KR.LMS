import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentUserAffiliation } from '@/app/actions/master';
import { SYSTEM_INDIVIDUAL_SHIPPER_ID } from '@/lib/constants';
import * as guards from '@/lib/auth/guards';

// 1. Mocking Dependencies
vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
  requireAuth: vi.fn(),
  requireAdmin: vi.fn()
}));

describe('ZENITH Logistics: User Affiliation & Order Settings Logic', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('TC-A.1: 법인 사용자는 소속 조직 ID와 기업명을 정확히 반환해야 함', async () => {
    // Given: Corporate user session
    const mockOrgId = 'corp-123-uuid';
    const mockProfile = {
      id: 'user-001',
      role: 'ADMIN',
      org_id: mockOrgId
    };

    // Supabase Mock with Fluent Interface (Modified for multi-table queries)
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(function() {
        const lastTable = (mockSupabase.from as any).mock.calls.slice(-1)[0][0];
        if (lastTable === 'organizations') {
          return Promise.resolve({ data: { org_name_ko: 'SNTL Logistics', address: 'Seoul', biz_no: '123' }, error: null });
        }
        if (lastTable === 'zen_organizations') {
          return Promise.resolve({ data: { name: 'SNTL (Modern)' }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      })
    };

    (guards.validateUserAction as any).mockResolvedValue({
      profile: mockProfile,
      supabase: mockSupabase
    });

    // When: Calling the affiliation action
    const result = await getCurrentUserAffiliation();

    // Then: Should match corporate info (Prioritizes legacy org_name_ko as per user request)
    expect(result.orgId).toBe(mockOrgId);
    expect(result.orgName).toBe('SNTL Logistics');
    expect(result.isIndividual).toBe(false);
    expect(mockSupabase.from).toHaveBeenCalledWith('organizations');
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_organizations');
  });

  it('TC-A.2: 개인 사용자는 시스템 지정 더미 ID를 반환하고 isIndividual이 true여야 함', async () => {
    // Given: Individual user session (no org_id)
    const mockProfile = {
      id: 'personal-001',
      role: 'INDIVIDUAL',
      org_id: null
    };

    (guards.validateUserAction as any).mockResolvedValue({
      profile: mockProfile,
      supabase: {}
    });

    // When: Calling the affiliation action
    const result = await getCurrentUserAffiliation();

    // Then: Should reflect individual context
    expect(result.isIndividual).toBe(true);
    expect(result.orgId).toBeNull();
    expect(result.dummyIndividualId).toBe(SYSTEM_INDIVIDUAL_SHIPPER_ID);
    expect(result.orgName).toBeNull();
  });

  it('TC-A.3: 시스템 개인 화주 ID(Dummy)는 프로젝트 표준 규격과 일치해야 함', () => {
    // Audit constant integrity
    expect(SYSTEM_INDIVIDUAL_SHIPPER_ID).toBe('e8b8a8b8-c8b8-48b8-a8b8-d8b8a8b8c8d8');
  });
});
