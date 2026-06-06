import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  then: vi.fn(),
};

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

import { validateUserAction } from '@/lib/auth/guards';

describe('P6-SVCRATE: 통합 서비스 요율 조회 Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-P6-SVCRATE-01: 모든 요율 타입 통합 조회 성공', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'org-1' },
    });

    mockSupabase.then
      .mockImplementationOnce((cb: any) => cb({ data: { id: 'port-icn-uuid' }, error: null }))
      .mockImplementationOnce((cb: any) => cb({ data: { id: 'port-lax-uuid' }, error: null }))
      .mockImplementationOnce((cb: any) => cb({
        data: [
          { id: 'rate-1', carrier_id: 'carrier-1', transport_mode: 'AIR', tiers: [{ min_weight: 0, max_weight: 100, rate: 5 }], currency: 'USD', carrier: { name: 'Korean Air' } },
          { id: 'rate-2', carrier_id: 'carrier-2', transport_mode: 'AIR', tiers: [{ min_weight: 0, max_weight: 100, rate: 4.5 }], currency: 'USD', carrier: { name: 'Asiana' } },
        ],
        error: null,
      }))
      .mockImplementationOnce((cb: any) => cb({
        data: [
          { id: 'cust-1', org_id: 'org-cust', country_code: 'US', cost_per_kg: 0.5, cost_per_cbm: 10, fixed_fee: 25, currency: 'USD', transit_days: 2, org: { name: 'Customs Broker Co' } },
        ],
        error: null,
      }))
      .mockImplementationOnce((cb: any) => cb({
        data: [
          { id: 'del-local', org_id: 'org-del', service_type: 'LOCAL', cost_per_kg: 0.3, cost_per_cbm: 5, fixed_fee: 10, currency: 'USD', transit_days: 1, org: { name: 'Local Delivery' } },
          { id: 'del-total', org_id: 'org-del', service_type: 'TOTAL', cost_per_kg: 0.8, cost_per_cbm: 15, fixed_fee: 30, currency: 'USD', transit_days: 3, org: { name: 'Total Delivery' } },
        ],
        error: null,
      }));

    const { getAvailableServiceRates } = await import('@/app/actions/operations/service-rates');
    const result = await getAvailableServiceRates({
      originCode: 'ICN',
      destCode: 'LAX',
      destCountryCode: 'US',
      transportMode: 'AIR',
      cargoWeight: 50,
      cargoCbm: 2,
    });

    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();

    const rates = result.data!;
    expect(rates.transport).toHaveLength(2);
    expect(rates.customs).toHaveLength(1);
    expect(rates.deliveryLocal).toHaveLength(1);
    expect(rates.deliveryTotal).toHaveLength(1);

    expect(rates.transport[0].estimatedCost).toBe(250);
    expect(rates.transport[0].carrierName).toBe('Korean Air');
    expect(rates.transport[1].estimatedCost).toBe(225);
    expect(rates.transport[1].carrierName).toBe('Asiana');

    expect(rates.customs[0].estimatedCost).toBe(70);
    expect(rates.customs[0].orgName).toBe('Customs Broker Co');

    expect(rates.deliveryLocal[0].estimatedCost).toBe(35);
    expect(rates.deliveryTotal[0].estimatedCost).toBe(100);
  });

  it('TC-P6-SVCRATE-02: 운송 요율 없음 → 에러 반환', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'org-1' },
    });

    mockSupabase.then
      .mockImplementationOnce((cb: any) => cb({ data: { id: 'port-icn-uuid' }, error: null }))
      .mockImplementationOnce((cb: any) => cb({ data: { id: 'port-nrt-uuid' }, error: null }))
      .mockImplementationOnce((cb: any) => cb({ data: [], error: null }));

    const { getAvailableServiceRates } = await import('@/app/actions/operations/service-rates');
    const result = await getAvailableServiceRates({
      originCode: 'ICN',
      destCode: 'NRT',
      destCountryCode: 'JP',
      transportMode: 'SEA',
      cargoWeight: 100,
      cargoCbm: 5,
    });

    expect(result.data).toBeNull();
    expect(result.error).toContain("선택하신 노선/서비스에 등록된 비용 정보가 없습니다");
  });

  it('TC-P6-SVCRATE-03: 부분 결과 (운송 요율만 존재)', async () => {
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'user-1', role: USER_ROLES.CORPORATE, org_id: 'org-1' },
    });

    mockSupabase.then
      .mockImplementationOnce((cb: any) => cb({ data: { id: 'port-icn-uuid' }, error: null }))
      .mockImplementationOnce((cb: any) => cb({ data: { id: 'port-sin-uuid' }, error: null }))
      .mockImplementationOnce((cb: any) => cb({
        data: [{ id: 'rate-1', carrier_id: 'carrier-1', transport_mode: 'AIR', tiers: [{ min_weight: 0, max_weight: 1000, rate: 3 }], currency: 'USD', carrier: { name: 'Singapore Air' } }],
        error: null,
      }))
      .mockImplementationOnce((cb: any) => cb({ data: [], error: null }))
      .mockImplementationOnce((cb: any) => cb({ data: [], error: null }));

    const { getAvailableServiceRates } = await import('@/app/actions/operations/service-rates');
    const result = await getAvailableServiceRates({
      originCode: 'ICN',
      destCode: 'SIN',
      destCountryCode: 'SG',
      transportMode: 'AIR',
      cargoWeight: 200,
      cargoCbm: 3,
    });

    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();

    const rates = result.data!;
    expect(rates.transport).toHaveLength(1);
    expect(rates.transport[0].estimatedCost).toBe(600);
    expect(rates.customs).toHaveLength(0);
    expect(rates.deliveryLocal).toHaveLength(0);
    expect(rates.deliveryTotal).toHaveLength(0);
  });
});
