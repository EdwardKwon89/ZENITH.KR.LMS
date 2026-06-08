import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

function createMockSupabase() {
  const chain: any = {};
  chain.rpc = vi.fn(() => Promise.resolve(chain._listResult || { data: null, error: null }));
  chain.from = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.lte = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.range = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(chain._singleResult || { data: null, error: null }));
  chain.maybeSingle = vi.fn(() => Promise.resolve(chain._maybeSingleResult || { data: null, error: null }));
  chain.then = (resolve: any) => Promise.resolve(chain._listResult || { data: [], error: null }).then(resolve);
  chain._singleResult = null;
  chain._maybeSingleResult = null;
  chain._listResult = null;

  chain.select.mockImplementation((columns?: string) => {
    if (columns) return chain;
    return {
      then: (resolve: any) => Promise.resolve(chain._listResult || { data: [], error: null }).then(resolve),
      single: () => Promise.resolve(chain._singleResult || { data: null, error: null }),
    };
  });

  return chain;
}

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));

import { validateUserAction } from '@/lib/auth/guards';

describe('TC-P6-DB-05: 오더-서비스 배정 CRUD + 역할별 격리 통합 테스트', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('createOrderServices — TRANSPORT + CUSTOMS + DELIVERY 3종 동시 등록 성공', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { shipper_id: 'shipper-1' }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'shipper-1' } });

    const { createOrderServices } = await import('@/app/actions/operations/order-services');

    supabase._listResult = {
      data: [{ id: 'os-1', service_type: 'TRANSPORT', status: 'REQUESTED' }, { id: 'os-2', service_type: 'CUSTOMS', status: 'REQUESTED' }, { id: 'os-3', service_type: 'DELIVERY', status: 'REQUESTED' }],
      error: null,
    };

    const result = await createOrderServices('order-1', [
      { service_type: 'TRANSPORT', provider_id: 'carrier-1', quoted_cost: 1500, currency: 'USD' },
      { service_type: 'CUSTOMS', provider_id: 'customs-org-1', quoted_cost: 200, currency: 'USD' },
      { service_type: 'DELIVERY', provider_id: 'delivery-org-1', quoted_cost: 300, currency: 'USD' },
    ]);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(3);
    expect(supabase.rpc).toHaveBeenCalledWith('create_order_services_atomic', expect.any(Object));
  });

  it('createOrderServices — customs_rate_id 비활성 차단', async () => {
    const supabase = createMockSupabase();
    supabase.single
      .mockResolvedValueOnce({ data: { shipper_id: 'shipper-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'cust-inactive', is_active: false, valid_from: '2026-01-01', valid_until: '2026-12-31' }, error: null });
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'shipper-1' } });

    const { createOrderServices } = await import('@/app/actions/operations/order-services');

    const result = await createOrderServices('order-1', [
      { service_type: 'CUSTOMS', provider_id: 'customs-org', customs_rate_id: 'cust-inactive', quoted_cost: 200, currency: 'USD' },
    ]);

    expect(result.data).toBeNull();
    expect(result.error).toContain('Customs rate card is inactive');
  });

  it('createOrderServices — delivery_rate_id 만료 차단', async () => {
    const supabase = createMockSupabase();
    supabase.single
      .mockResolvedValueOnce({ data: { shipper_id: 'shipper-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'del-expired', is_active: true, valid_from: '2025-01-01', valid_until: '2025-06-30' }, error: null });
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'shipper-1' } });

    const { createOrderServices } = await import('@/app/actions/operations/order-services');

    const result = await createOrderServices('order-1', [
      { service_type: 'DELIVERY', provider_id: 'delivery-org', delivery_rate_id: 'del-expired', quoted_cost: 100, currency: 'USD' },
    ]);

    expect(result.data).toBeNull();
    expect(result.error).toContain('expired');
  });

  it('getOrderServices — ADMIN은 전역 조회 (provider_id 필터 없음)', async () => {
    const supabase = createMockSupabase();
    supabase._listResult = {
      data: [{ id: 'os-1', order_id: 'order-1', service_type: 'TRANSPORT', provider_id: 'carrier-1', status: 'REQUESTED' }, { id: 'os-2', order_id: 'order-1', service_type: 'CUSTOMS', provider_id: 'customs-org', status: 'REQUESTED' }],
      error: null,
    };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { getOrderServices } = await import('@/app/actions/operations/order-services');
    const result = await getOrderServices('order-1');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(supabase.eq).toHaveBeenCalledWith('order_id', 'order-1');
  });

  it('getOrderServices — CARRIER는 본인 provider_id만 조회', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { shipper_id: 'other-org' }, error: null };
    supabase._listResult = {
      data: [{ id: 'os-1', order_id: 'order-1', service_type: 'TRANSPORT', provider_id: 'my-carrier', status: 'REQUESTED' }],
      error: null,
    };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'carrier-1', role: USER_ROLES.CARRIER, org_id: 'my-carrier' } });

    const { getOrderServices } = await import('@/app/actions/operations/order-services');
    const result = await getOrderServices('order-1');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(supabase.eq).toHaveBeenCalledWith('provider_id', 'my-carrier');
  });

  it('updateOrderServiceStatus — ADMIN bypass', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { id: 'os-1', service_type: 'TRANSPORT', status: 'ACCEPTED' }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { updateOrderServiceStatus } = await import('@/app/actions/operations/order-services');
    const result = await updateOrderServiceStatus('os-1', 'ACCEPTED');

    expect(result.error).toBeNull();
  });

  it('updateOrderServiceStatus — DELIVERY_AGENT 본인 provider 업데이트 성공', async () => {
    const supabase = createMockSupabase();
    supabase.single.mockResolvedValueOnce({ data: { provider_id: 'my-delivery', order_id: 'order-1' }, error: null });
    supabase._singleResult = { data: { id: 'os-1', service_type: 'DELIVERY', status: 'ACCEPTED' }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'agent-1', role: USER_ROLES.DELIVERY_AGENT, org_id: 'my-delivery' } });

    const { updateOrderServiceStatus } = await import('@/app/actions/operations/order-services');
    const result = await updateOrderServiceStatus('os-1', 'ACCEPTED');

    expect(result.error).toBeNull();
  });

  it('updateOrderServiceStatus — 타 provider 업데이트 차단', async () => {
    const supabase = createMockSupabase();
    supabase.single.mockResolvedValueOnce({ data: { provider_id: 'other-carrier', order_id: 'order-1' }, error: null });
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'carrier-1', role: USER_ROLES.CARRIER, org_id: 'my-carrier' } });

    const { updateOrderServiceStatus } = await import('@/app/actions/operations/order-services');
    const result = await updateOrderServiceStatus('os-other', 'ACCEPTED');

    expect(result.data).toBeNull();
    expect(result.error).toContain('Unauthorized');
  });

  it('createOrderServices — shipper(owner)만 등록 가능 (admin 제외)', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: { shipper_id: 'shipper-1' }, error: null };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'other-user', role: USER_ROLES.CORPORATE, org_id: 'other-org' } });

    const { createOrderServices } = await import('@/app/actions/operations/order-services');
    const result = await createOrderServices('order-1', [
      { service_type: 'TRANSPORT', provider_id: 'carrier-1', quoted_cost: 100, currency: 'USD' },
    ]);

    expect(result.data).toBeNull();
    expect(result.error).toContain('Unauthorized');
  });

  it('order not found — createOrderServices 에러 반환', async () => {
    const supabase = createMockSupabase();
    supabase._singleResult = { data: null, error: { message: 'Not found' } };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'shipper-1' } });

    const { createOrderServices } = await import('@/app/actions/operations/order-services');
    const result = await createOrderServices('non-existent-order', [
      { service_type: 'TRANSPORT', provider_id: 'carrier-1', quoted_cost: 100, currency: 'USD' },
    ]);

    expect(result.data).toBeNull();
    expect(result.error).toContain('Order not found');
  });
});
