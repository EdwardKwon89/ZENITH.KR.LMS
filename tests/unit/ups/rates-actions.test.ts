import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUpsZones,
  getUpsProducts,
  getUpsBaseRates,
  getUpsFuelSurcharge,
  getUpsOtherCharges,
} from '@/app/actions/ups/rates';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

describe('TC-UPS-R: UPS Rate Lookup Server Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    };

    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-001' },
      profile: { id: 'user-001', role: 'ADMIN', org_id: 'org-001' },
      supabase: mockSupabase,
    });
  });

  it('TC-UPS-R-01: getUpsZones — Zone 목록 + 국가 반환', async () => {
    const mockZones = [
      { id: 'z1', zone_code: 'Z1', zone_name: 'Zone 1', is_active: true, sort_order: 1, countries: [] },
      { id: 'z2', zone_code: 'Z2', zone_name: 'Zone 2', is_active: true, sort_order: 2, countries: [{ country_code: 'USA' }] },
    ];
    mockSupabase.order.mockResolvedValue({ data: mockZones, error: null });

    const result = await getUpsZones();

    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_zones');
    expect(mockSupabase.select).toHaveBeenCalledWith('*, countries:zen_ups_zone_countries(*)');
    expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    expect(result).toEqual(mockZones);
  });

  it('TC-UPS-R-02: getUpsProducts — cargoType 필터', async () => {
    const mockProducts = [
      { id: 'p1', product_code: 'UPS-EXP', cargo_type: 'DOC', is_active: true, sort_order: 1 },
    ];
    mockSupabase.order.mockResolvedValue({ data: mockProducts, error: null });

    const result = await getUpsProducts('DOC');

    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_products');
    expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    expect(mockSupabase.eq).toHaveBeenCalledWith('cargo_type', 'DOC');
    expect(result).toEqual(mockProducts);
  });

  it('TC-UPS-R-03: getUpsBaseRates — 복합 필터 (productId + zoneId)', async () => {
    const mockRates = [
      { id: 'r1', product_id: 'p1', zone_id: 'z1', weight_kg: 0.5, selling_price: 25, is_active: true, valid_from: '2026-01-01' },
    ];
    mockSupabase.order.mockResolvedValue({ data: mockRates, error: null });

    const result = await getUpsBaseRates({ productId: 'p1', zoneId: 'z1' });

    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_base_rates');
    expect(mockSupabase.eq).toHaveBeenCalledWith('product_id', 'p1');
    expect(mockSupabase.eq).toHaveBeenCalledWith('zone_id', 'z1');
    expect(mockSupabase.lte).toHaveBeenCalledWith('valid_from', expect.any(String));
    expect(result).toEqual(mockRates);
  });

  it('TC-UPS-R-04: getUpsFuelSurcharge — 기준일 기반 최신 조회', async () => {
    const mockSurcharge = { id: 'f1', product_id: null, effective_week: '2026-06-08', selling_rate: 0.235 };
    mockSupabase.limit.mockResolvedValue({ data: [mockSurcharge], error: null });

    const result = await getUpsFuelSurcharge(null, '2026-06-14');

    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_fuel_surcharges');
    expect(mockSupabase.lte).toHaveBeenCalledWith('effective_week', '2026-06-14');
    expect(mockSupabase.order).toHaveBeenCalledWith('effective_week', { ascending: false });
    expect(result).toEqual(mockSurcharge);
  });

  it('TC-UPS-R-05: getUpsOtherCharges — 활성 항목만 반환', async () => {
    const mockCharges = [
      { id: 'c1', charge_code: 'DHL', charge_name: 'DHL', is_active: true, unit: 'PKG' },
    ];
    mockSupabase.order.mockResolvedValue({ data: mockCharges, error: null });

    const result = await getUpsOtherCharges();

    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_other_charges');
    expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    expect(result).toEqual(mockCharges);
  });
});
