import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAgencyOtherCharges,
  upsertAgencyOtherCharge,
  deactivateAgencyOtherCharge,
} from '@/app/actions/agency/other-charges';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  checkPermission: vi.fn(() => true),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/utils/supabase/server';

describe('TC-AG-OC: Agency Other Charges CRUD', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const filter: any = {};
    filter.eq = vi.fn(() => filter);
    filter.order = vi.fn(() => filter);
    filter.then = vi.fn((r: any) => r({ data: [], error: null }));

    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => filter),
        upsert: vi.fn(() => Promise.resolve({ error: null })),
        update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
        eq: vi.fn(() => filter),
        order: vi.fn(() => filter),
      })),
    };

    (createAdminClient as any).mockResolvedValue(mockSupabase);

    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-001' },
      profile: { id: 'user-001', role: 'AGENCY', org_id: 'agency-001' },
      supabase: mockSupabase,
    });
  });

  it('TC-AG-OC-01: getAgencyOtherCharges — 부가요금 목록 조회', async () => {
    const result = await getAgencyOtherCharges('agency-001');
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_agency_other_charges');
    expect(Array.isArray(result)).toBe(true);
  });

  it('TC-AG-OC-02: upsertAgencyOtherCharge — 부가요금 등록', async () => {
    const result = await upsertAgencyOtherCharge('agency-001', {
      other_charge_id: 'oc-001', selling_price: 5000, cost_price: 4000,
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_agency_other_charges');
    expect(result.success).toBe(true);
  });

  it('TC-AG-OC-03: deactivateAgencyOtherCharge — 부가요금 비활성화', async () => {
    const result = await deactivateAgencyOtherCharge('charge-001');
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_agency_other_charges');
    expect(result.success).toBe(true);
  });
});
