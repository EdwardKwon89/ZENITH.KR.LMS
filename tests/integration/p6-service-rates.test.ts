import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

function createMockSupabase() {
  const chain: any = {};
  chain.rpc = vi.fn();
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
vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn }));

import { validateUserAction } from '@/lib/auth/guards';

describe('TC-P6-DB-04: 통합 서비스 요율 조회 엣지 케이스 통합 테스트', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('운송 요율 last tier fallback (weight > max_weight) — 마지막 tier rate * weight 적용', async () => {
    const supabase = createMockSupabase();
    supabase._maybeSingleResult = { data: { id: 'port-icn-uuid' }, error: null };
    supabase._listResult = {
      data: [{ id: 'rate-1', carrier_id: 'carrier-1', transport_mode: 'AIR', tiers: [{ weight_min: 0, unit_price: 5 }], currency: 'USD', carrier: { name: 'Test Air' } }],
      error: null,
    };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'org-1' } });

    const { getAvailableServiceRates } = await import('@/app/actions/operations/service-rates');
    const result = await getAvailableServiceRates({ originCode: 'ICN', destCode: 'NRT', destCountryCode: 'JP', transportMode: 'AIR', cargoWeight: 200, cargoCbm: 3 });

    expect(result.error).toBeNull();
    expect(result.data!.transport[0].estimatedCost).toBe(1000);
  });

  it('운송 요율 tiers 빈 배열 — estimatedCost 0 반환', async () => {
    const supabase = createMockSupabase();
    supabase._maybeSingleResult = { data: { id: 'port-icn-uuid' }, error: null };
    supabase._listResult = {
      data: [{ id: 'rate-1', carrier_id: 'carrier-1', transport_mode: 'AIR', tiers: [], currency: 'USD', carrier: { name: 'Test Air' } }],
      error: null,
    };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'org-1' } });

    const { getAvailableServiceRates } = await import('@/app/actions/operations/service-rates');
    const result = await getAvailableServiceRates({ originCode: 'ICN', destCode: 'SIN', destCountryCode: 'SG', transportMode: 'AIR', cargoWeight: 50, cargoCbm: 1 });

    expect(result.error).toBeNull();
    expect(result.data!.transport[0].estimatedCost).toBe(0);
  });

  it('운송 요율 tiers null — estimatedCost 0 반환', async () => {
    const supabase = createMockSupabase();
    supabase._maybeSingleResult = { data: { id: 'port-icn-uuid' }, error: null };
    supabase._listResult = {
      data: [{ id: 'rate-1', carrier_id: 'carrier-1', transport_mode: 'SEA', tiers: null, currency: 'USD', carrier: { name: 'Test Sea' } }],
      error: null,
    };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'org-1' } });

    const { getAvailableServiceRates } = await import('@/app/actions/operations/service-rates');
    const result = await getAvailableServiceRates({ originCode: 'ICN', destCode: 'LAX', destCountryCode: 'US', transportMode: 'SEA', cargoWeight: 100, cargoCbm: 5 });

    expect(result.error).toBeNull();
    expect(result.data!.transport[0].estimatedCost).toBe(0);
  });

  it('port maybeSingle null 반환 — port 필터 없이 rate 조회', async () => {
    const supabase = createMockSupabase();
    supabase._maybeSingleResult = { data: null, error: null };
    supabase._listResult = {
      data: [{ id: 'rate-1', carrier_id: 'carrier-1', transport_mode: 'AIR', tiers: [{ weight_min: 0, unit_price: 5 }], currency: 'USD', carrier: { name: 'Test Air' } }],
      error: null,
    };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'org-1' } });

    const { getAvailableServiceRates } = await import('@/app/actions/operations/service-rates');
    const result = await getAvailableServiceRates({ originCode: 'UNKNOWN', destCode: 'NOWHERE', destCountryCode: 'XX', transportMode: 'AIR', cargoWeight: 10, cargoCbm: 0.5 });

    expect(result.error).toBeNull();
    expect(result.data!.transport).toHaveLength(1);
  });

  it('carrier name null — 빈 문자열 fallback', async () => {
    const supabase = createMockSupabase();
    supabase._maybeSingleResult = { data: { id: 'port-icn-uuid' }, error: null };
    supabase._listResult = {
      data: [{ id: 'rate-1', carrier_id: 'carrier-1', transport_mode: 'AIR', tiers: [{ weight_min: 0, unit_price: 3 }], currency: 'USD', carrier: null }],
      error: null,
    };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'org-1' } });

    const { getAvailableServiceRates } = await import('@/app/actions/operations/service-rates');
    const result = await getAvailableServiceRates({ originCode: 'ICN', destCode: 'NRT', destCountryCode: 'JP', transportMode: 'AIR', cargoWeight: 30, cargoCbm: 1 });

    expect(result.error).toBeNull();
    expect(result.data!.transport[0].carrierName).toBe('');
  });

  it('운송 요율만 존재하고 customs/delivery 빈 배열 — 부분 결과 성공', async () => {
    const supabase = createMockSupabase();
    supabase._maybeSingleResult = { data: { id: 'port-icn-uuid' }, error: null };
    supabase._listResultQueue = [
      Promise.resolve({ data: [{ id: 'rate-1', carrier_id: 'carrier-1', transport_mode: 'AIR', tiers: [{ weight_min: 0, unit_price: 5 }], currency: 'USD', carrier: { name: 'Korean Air' } }], error: null }),
      Promise.resolve({ data: [], error: null }),
      Promise.resolve({ data: [], error: null }),
    ];
    supabase.then = vi.fn((resolve: any) => (supabase._listResultQueue.shift() || Promise.resolve({ data: [], error: null })).then(resolve));
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'org-1' } });

    const { getAvailableServiceRates } = await import('@/app/actions/operations/service-rates');
    const result = await getAvailableServiceRates({ originCode: 'ICN', destCode: 'NRT', destCountryCode: 'JP', transportMode: 'AIR', cargoWeight: 50, cargoCbm: 1 });

    expect(result.error).toBeNull();
    expect(result.data!.transport).toHaveLength(1);
    expect(result.data!.customs).toHaveLength(0);
    expect(result.data!.deliveryLocal).toHaveLength(0);
    expect(result.data!.deliveryTotal).toHaveLength(0);
  });

  it('중량 0 — estimatedCost 0으로 정상 반환', async () => {
    const supabase = createMockSupabase();
    supabase._maybeSingleResult = { data: { id: 'port-icn-uuid' }, error: null };
    supabase._listResult = {
      data: [{ id: 'rate-1', carrier_id: 'carrier-1', transport_mode: 'AIR', tiers: [{ weight_min: 0, unit_price: 5 }], currency: 'USD', carrier: { name: 'Test Air' } }],
      error: null,
    };
    (validateUserAction as any).mockResolvedValue({ supabase, profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'org-1' } });

    const { getAvailableServiceRates } = await import('@/app/actions/operations/service-rates');
    const result = await getAvailableServiceRates({ originCode: 'ICN', destCode: 'LAX', destCountryCode: 'US', transportMode: 'AIR', cargoWeight: 0, cargoCbm: 0 });

    expect(result.error).toBeNull();
    expect(result.data!.transport[0].estimatedCost).toBe(0);
  });
});
