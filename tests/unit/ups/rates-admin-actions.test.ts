import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createUpsZone,
  updateUpsZone,
  createUpsProduct,
  upsertUpsBaseRate,
  upsertUpsFuelSurcharge,
  createUpsOtherCharge,
  upsertAgencyPricingPolicy,
  upsertUpsWeightTierRate,
  deleteUpsWeightTierRate,
  upsertUpsFreightMinimum,
  deleteUpsFreightMinimum,
} from '@/app/actions/ups/rates-mutation';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

function makeFilter() {
  const fb: any = {};
  fb.eq = vi.fn(() => fb);
  fb.order = vi.fn(() => fb);
  fb.single = vi.fn(() => fb);
  fb.maybeSingle = vi.fn(() => fb);
  return fb;
}

function makeFrom(filter: any) {
  return vi.fn(() => ({
    insert: vi.fn(() => Promise.resolve({ error: null })),
    update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    upsert: vi.fn(() => Promise.resolve({ error: null })),
    delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    select: vi.fn(() => filter),
    order: vi.fn(() => filter),
    eq: vi.fn(() => filter),
  }));
}

describe('TC-UPS-ADMIN: UPS Admin Rate CRUD Actions', () => {
  let mockFilter: any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFilter = makeFilter();
    mockSupabase = {
      from: makeFrom(mockFilter),
    };

    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-001' },
      profile: { id: 'user-001', role: 'ADMIN', org_id: 'org-001' },
      supabase: mockSupabase,
    });
  });

  it('TC-UPS-ADMIN-01: createUpsZone — Zone 신규 등록', async () => {
    await createUpsZone({ zone_code: 'Z99', zone_name: 'Test Zone', sort_order: 99 });
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_zones');
  });

  it('TC-UPS-ADMIN-01b: updateUpsZone — Zone 정보 수정', async () => {
    await updateUpsZone('zone-001', { zone_name: 'Updated Zone' });
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_zones');
  });

  it('TC-UPS-ADMIN-02: createUpsProduct — 제품 신규 등록', async () => {
    await createUpsProduct({ product_code: 'TEST', product_name: 'Test Product', cargo_type: 'DOC' });
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_products');
  });

  it('TC-UPS-ADMIN-03: upsertUpsBaseRate — 기준요금 등록', async () => {
    await upsertUpsBaseRate({
      product_id: 'prod-001', zone_id: 'zone-001', weight_kg: 5,
      selling_price: 50000, cost_price: 40000, valid_from: '2026-07-01',
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_base_rates');
  });

  it('TC-UPS-ADMIN-04: upsertUpsFuelSurcharge — 유류할증료 등록', async () => {
    await upsertUpsFuelSurcharge({
      effective_week: '2026-07-06', selling_rate: 0.185, cost_rate: 0.155,
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_fuel_surcharges');
  });

  it('TC-UPS-ADMIN-05: createUpsOtherCharge — 부가요금 등록', async () => {
    await createUpsOtherCharge({ charge_code: 'TEST_FEE', charge_name: 'Test Fee', unit: 'LOT' });
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_other_charges');
  });

  it('TC-UPS-ADMIN-06: upsertAgencyPricingPolicy — 대리점 할인율 정책 등록', async () => {
    await upsertAgencyPricingPolicy({ agency_org_id: 'agency-001', discount_rate: 0.15 });
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_agency_pricing_policies');
  });

  it('TC-UPS-ADMIN-07: MANAGER role 접근 가능', async () => {
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-002' },
      profile: { id: 'user-002', role: 'MANAGER', org_id: 'org-002' },
      supabase: mockSupabase,
    });
    await expect(updateUpsZone('zone-001', { zone_name: 'MGR Update' })).resolves.not.toThrow();
  });

  it('TC-UPS-ADMIN-07b: GUEST role 차단', async () => {
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-003' },
      profile: { id: 'user-003', role: 'GUEST', org_id: 'org-003' },
      supabase: mockSupabase,
    });
    await expect(createUpsZone({ zone_code: 'Z1', zone_name: 'Test' })).rejects.toThrow('UPS 요율 관리 권한이 없습니다.');
  });

  it('TC-UPS-ADMIN-08: upsertUpsWeightTierRate — 20kg 초과 티어 요율 등록', async () => {
    await upsertUpsWeightTierRate({
      product_id: 'prod-001', zone_id: 'zone-001', tier_min_kg: 21,
      price_per_kg_selling: 6000, price_per_kg_cost: 5000, valid_from: '2026-07-01'
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_weight_tier_rates');
  });

  it('TC-UPS-ADMIN-09: deleteUpsWeightTierRate — 20kg 초과 티어 요율 삭제/비활성화', async () => {
    await deleteUpsWeightTierRate('tier-rate-001');
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_weight_tier_rates');
  });

  it('TC-UPS-ADMIN-10: upsertUpsFreightMinimum — Freight 최소운임 등록', async () => {
    await upsertUpsFreightMinimum({
      product_id: 'prod-001', zone_id: 'zone-001',
      min_charge_selling: 180000, min_charge_cost: 150000
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_freight_minimums');
  });

  it('TC-UPS-ADMIN-11: deleteUpsFreightMinimum — Freight 최소운임 삭제/비활성화', async () => {
    await deleteUpsFreightMinimum('freight-min-001');
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_freight_minimums');
  });
});
