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
        single: vi.fn(() => Promise.resolve({ data: { id: 'new-id', service_type: 'LOCAL' }, error: null })),
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

describe('P6-DELIVERY: 배송 서비스 요율 Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-P6-DELIVERY-01: ADMIN은 createDeliveryRate(LOCAL) 호출 가능', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' },
    });

    const { createDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const { data, error } = await createDeliveryRate({
      org_id: 'org-delivery',
      service_type: 'LOCAL',
      country_code: 'KR',
      currency: 'USD',
      valid_from: '2026-06-01',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('TC-P6-DELIVERY-02: DELIVERY_AGENT는 본인 org TOTAL 요율 등록 가능', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'agent-1', role: USER_ROLES.DELIVERY_AGENT, org_id: 'my-org' },
    });

    const { createDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const { data, error } = await createDeliveryRate({
      org_id: 'my-org',
      service_type: 'TOTAL',
      transport_mode: 'AIR',
      origin_code: 'ICN',
      dest_code: 'NRT',
      currency: 'USD',
      valid_from: '2026-06-01',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('TC-P6-DELIVERY-03: DELIVERY_AGENT 타인 org 요율 등록 차단', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'agent-1', role: USER_ROLES.DELIVERY_AGENT, org_id: 'my-org' },
    });

    const { createDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const { data, error } = await createDeliveryRate({
      org_id: 'other-org',
      service_type: 'LOCAL',
      country_code: 'JP',
      currency: 'USD',
      valid_from: '2026-06-01',
    });

    expect(data).toBeNull();
    expect(error).toContain('본인 조직');
  });
});
