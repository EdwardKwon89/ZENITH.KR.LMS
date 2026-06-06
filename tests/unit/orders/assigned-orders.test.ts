import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

function createMockSupabase() {
  const inner = {
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => inner),
    })),
  };
}

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

import { validateUserAction } from '@/lib/auth/guards';

describe('P6-ORDERS: CUSTOMS_BROKER/DELIVERY_AGENT 할당 오더 조회', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-P6-ORDERS-01: CARRIER getAssignedOrders 호출 가능', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({
      supabase,
      profile: { id: 'carrier-1', role: USER_ROLES.CARRIER, org_id: 'org-carrier' },
    });

    const { getAssignedOrders } = await import('@/app/actions/operations/assigned-orders');
    const result = await getAssignedOrders();
    expect(Array.isArray(result)).toBe(true);
  });

  it('TC-P6-ORDERS-02: CUSTOMS_BROKER getAssignedOrders 호출 가능', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({
      supabase,
      profile: { id: 'cb-1', role: USER_ROLES.CUSTOMS_BROKER, org_id: 'org-cb' },
    });

    const { getAssignedOrders } = await import('@/app/actions/operations/assigned-orders');
    const result = await getAssignedOrders();
    expect(Array.isArray(result)).toBe(true);
  });

  it('TC-P6-ORDERS-03: DELIVERY_AGENT getAssignedOrders 호출 가능', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({
      supabase,
      profile: { id: 'da-1', role: USER_ROLES.DELIVERY_AGENT, org_id: 'org-da' },
    });

    const { getAssignedOrders } = await import('@/app/actions/operations/assigned-orders');
    const result = await getAssignedOrders();
    expect(Array.isArray(result)).toBe(true);
  });

  it('TC-P6-ORDERS-04: CORPORATE getAssignedOrders 접근 차단', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({
      supabase,
      profile: { id: 'corp-1', role: USER_ROLES.CORPORATE, org_id: 'org-corp' },
    });

    const { getAssignedOrders } = await import('@/app/actions/operations/assigned-orders');
    await expect(getAssignedOrders()).rejects.toThrow('권한이 없습니다');
  });

  it('TC-P6-ORDERS-05: DELIVERY_AGENT category=DELIVERY 필터 조회 가능', async () => {
    const supabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({
      supabase,
      profile: { id: 'da-1', role: USER_ROLES.DELIVERY_AGENT, org_id: 'org-da' },
    });

    const { getAssignedOrders } = await import('@/app/actions/operations/assigned-orders');
    const result = await getAssignedOrders('DELIVERY');
    expect(Array.isArray(result)).toBe(true);
  });
});
