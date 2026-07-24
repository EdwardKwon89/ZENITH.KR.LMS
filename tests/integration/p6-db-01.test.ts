import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

function createMockSupabase() {
  const chain = {
    rpc: vi.fn(() => Promise.resolve(chain._listResult || { data: null, error: null })),
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    is: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    range: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(chain._singleResult || { data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve(chain._maybeSingleResult || { data: null, error: null })),
    then: undefined as any,
    _singleResult: null,
    _maybeSingleResult: null,
    _listResult: null,
    _rpcResult: null,
  };

  chain.then = (resolve: any) => {
    return Promise.resolve(chain._listResult || { data: [], error: null }).then(resolve);
  };

  (chain.select as any).mockImplementation((columns?: string) => {
    if (columns) {
      return chain;
    }
    return {
      then: (resolve: any) => Promise.resolve(chain._listResult || { data: [], error: null }).then(resolve),
      single: () => Promise.resolve(chain._singleResult || { data: null, error: null }),
    };
  });

  return chain;
}

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (fn: any) => fn,
}));

import { validateUserAction } from '@/lib/auth/guards';

describe('TC-P6-DB-01: Phase 6 DB 스키마 연동 통합 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createCustomsRate — 기본값으로 zen_customs_rates INSERT 성공', async () => {
    const supabase = createMockSupabase();
    (supabase as any)._singleResult = {
      data: { id: 'rate-1', org_id: 'org-customs', country_code: 'KR', currency: 'USD', is_active: true, version_no: 1, created_at: '2026-06-01', created_by: 'admin-1' },
      error: null,
    };

    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { createCustomsRate } = await import('@/app/actions/admin/customs-rates');
    const result = await createCustomsRate({ org_id: 'org-customs', country_code: 'KR', valid_from: '2026-06-01' });

    expect(result.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('zen_customs_rates');
  });

  it('createDeliveryRate — LOCAL 타입 INSERT 검증', async () => {
    const supabase = createMockSupabase();
    (supabase as any)._singleResult = {
      data: { id: 'del-1', org_id: 'org-del', service_type: 'LOCAL', country_code: 'KR', is_active: true },
      error: null,
    };

    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-1' } });

    const { createDeliveryRate } = await import('@/app/actions/admin/delivery-rates');
    const result = await createDeliveryRate({ org_id: 'org-del', service_type: 'LOCAL', country_code: 'KR', valid_from: '2026-06-01' });

    expect(result.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('zen_delivery_rates');
  });

  it('createOrderServices — 요율 유효성 검증 후 zen_order_services INSERT', async () => {
    const supabase = createMockSupabase();
    (supabase as any)._singleResult = { data: { shipper_id: 'shipper-1' }, error: null };

    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'shipper-1' } });

    const { createOrderServices } = await import('@/app/actions/operations/order-services');

    (supabase as any)._listResult = {
      data: [{ id: 'os-1', service_type: 'TRANSPORT', status: 'REQUESTED' }],
      error: null,
    };

    const result = await createOrderServices('order-1', [
      { service_type: 'TRANSPORT', provider_id: 'carrier-1', quoted_cost: 1500, currency: 'USD' },
    ]);

    expect(result.error).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledWith('create_order_services_atomic', expect.any(Object));
  });

  it('getAvailableServiceRates — 복수 테이블 조회 성공', async () => {
    const supabase = createMockSupabase();

    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'org-1' } });

    (supabase as any)._maybeSingleResult = { data: { id: 'port-icn-uuid' }, error: null };

    (supabase as any)._listResult = {
      data: [
        { id: 'rate-1', carrier_id: 'carrier-1', transport_mode: 'AIR', tiers: { weight_slabs: [{ weight_min: 0, unit_price: 5 }], cbm_slabs: [{ cbm_min: 0, cbm_price: 0, min_charge: 0 }] }, currency: 'USD', carrier: { name: 'Test Air' } },
      ],
      error: null,
    };

    const { getAvailableServiceRates } = await import('@/app/actions/operations/service-rates');
    const result = await getAvailableServiceRates({ originCode: 'ICN', destCode: 'LAX', destCountryCode: 'US', transportMode: 'AIR', cargoWeight: 50, cargoCbm: 2 });

    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(supabase.from).toHaveBeenCalledWith('zen_ports');
    expect(supabase.from).toHaveBeenCalledWith('zen_rate_cards');
    expect(supabase.from).toHaveBeenCalledWith('zen_customs_rates');
    expect(supabase.from).toHaveBeenCalledWith('zen_delivery_rates');
  });

  it('createOrderServices — TRANSPORT rate_card_id 유효성 검증', async () => {
    const supabase = createMockSupabase();

    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'shipper-1' } });

    (supabase.single as any)
      .mockResolvedValueOnce({ data: { shipper_id: 'shipper-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'rate-active', is_active: true, valid_from: '2026-01-01', valid_until: '2026-12-31' }, error: null });
    (supabase as any)._listResult = { data: [{ id: 'os-1' }], error: null };

    const { createOrderServices } = await import('@/app/actions/operations/order-services');

    const result = await createOrderServices('order-1', [
      { service_type: 'TRANSPORT', provider_id: 'carrier-1', rate_card_id: 'rate-active', quoted_cost: 1000, currency: 'USD' },
    ]);

    expect(result.error).toBeNull();
    expect(supabase.eq).toHaveBeenCalledWith('id', 'rate-active');
  });
});
