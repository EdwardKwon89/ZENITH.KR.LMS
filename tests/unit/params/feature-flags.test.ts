import { vi, describe, it, expect, beforeEach } from 'vitest';
import { isFeatureEnabled } from '../../../src/lib/params/feature-flags';

// Mock 의존성 설정
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
}));

describe('FeatureFlagService', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    (global as any).mockSupabase = mockSupabase;
  });

  it('TC-FF-01: [Success] should return true if global feature flag is ON', async () => {
    // Given
    mockSupabase.single.mockResolvedValue({
      data: { is_enabled: true },
      error: null
    });

    // When
    const enabled = await isFeatureEnabled('NEW_ENGINE');

    // Then
    expect(enabled).toBe(true);
    expect(mockSupabase.is).toHaveBeenCalledWith('org_id', null);
  });

  it('TC-FF-02: [Success] should check org flag if global flag is OFF', async () => {
    // Given
    // First call (global) returns false, second call (org) returns true
    mockSupabase.single
      .mockResolvedValueOnce({ data: { is_enabled: false }, error: null })
      .mockResolvedValueOnce({ data: { is_enabled: true }, error: null });

    // When
    const enabled = await isFeatureEnabled('ORG_BETA', 'org-123');

    // Then
    expect(enabled).toBe(true);
    expect(mockSupabase.eq).toHaveBeenCalledWith('org_id', 'org-123');
  });

  it('TC-FF-03: [Success] should return false if both global and org flags are OFF', async () => {
    // Given
    mockSupabase.single.mockResolvedValue({ data: { is_enabled: false }, error: null });

    // When
    const enabled = await isFeatureEnabled('HIDDEN_FEATURE', 'org-123');

    // Then
    expect(enabled).toBe(false);
  });
});
