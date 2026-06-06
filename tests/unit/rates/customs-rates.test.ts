import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
};

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

import { validateUserAction } from '@/lib/auth/guards';

describe('P6-CUSTOMS: 통관 서비스 요율 Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-P6-CUSTOMS-01: ADMIN은 createCustomsRate 호출 가능', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' },
    });

    const { createCustomsRate } = await import('@/app/actions/admin/customs-rates');
    const { data, error } = await createCustomsRate({
      org_id: 'org-customs',
      country_code: 'KR',
      currency: 'USD',
      valid_from: '2026-06-01',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('TC-P6-CUSTOMS-02: CUSTOMS_BROKER는 본인 org 요율만 등록 가능', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'broker-1', role: USER_ROLES.CUSTOMS_BROKER, org_id: 'my-org' },
    });

    const { createCustomsRate } = await import('@/app/actions/admin/customs-rates');
    const { data, error } = await createCustomsRate({
      org_id: 'my-org',
      country_code: 'US',
      currency: 'USD',
      valid_from: '2026-06-01',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('TC-P6-CUSTOMS-03: CUSTOMS_BROKER는 타인 org 요율 등록 차단', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'broker-1', role: USER_ROLES.CUSTOMS_BROKER, org_id: 'my-org' },
    });

    const { createCustomsRate } = await import('@/app/actions/admin/customs-rates');
    const { data, error } = await createCustomsRate({
      org_id: 'other-org',
      country_code: 'JP',
      currency: 'USD',
      valid_from: '2026-06-01',
    });

    expect(data).toBeNull();
    expect(error).toContain('본인 조직');
  });
});
