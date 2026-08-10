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
      range: vi.fn(),
    };

    // DEF-B-041: 페이지네이션 도입 후 최종 .range(from, to)가 Promise로 resolve되어야 한다.
    // 기본: 1페이지에 1000행 미만 데이터 반환(→ 루프 1회 종료)
    mockSupabase.range.mockResolvedValue({ data: [], error: null });

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
    mockSupabase.range.mockResolvedValue({ data: mockRates, error: null });

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

// ─── TASK-B-268 (Issue #1034 / DEF-B-041): PostgREST 1,000행 제한 페이지네이션 ─────────

describe('TC-UPS-R-PAG: getUpsBaseRates 페이지네이션 (DEF-B-041)', () => {
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
      range: vi.fn(),
    };
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-001' },
      profile: { id: 'user-001', role: 'ADMIN', org_id: 'org-001' },
      supabase: mockSupabase,
    });
  });

  function makeRows(count: number, startIdx = 0) {
    return Array.from({ length: count }, (_, i) => ({
      id: `r-${startIdx + i}`, product_id: 'p1', zone_id: 'z1', weight_kg: startIdx + i + 0.5,
      selling_price: 100, is_active: true, valid_from: '2026-01-01',
    }));
  }

  it('TC-UPS-R-PAG-01: 1,000행 초과(1,200행) 데이터를 2회 range 호출로 전체 병합한다', async () => {
    const page1 = makeRows(1000, 0);
    const page2 = makeRows(200, 1000);
    mockSupabase.range
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: page2, error: null });

    const result = await getUpsBaseRates();

    expect(result).toHaveLength(1200);
    // range 호출 인자: [0, 999] → [1000, 1999]
    expect(mockSupabase.range).toHaveBeenCalledTimes(2);
    expect(mockSupabase.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(mockSupabase.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    // 마지막 행(weight 1200.5)까지 포함됐는지 — 잘림 없이 전체 반환 확인
    expect(result[1199].id).toBe('r-1199');
  });

  it('TC-UPS-R-PAG-02: 1,000행 이하면 range 1회 호출 후 종료 (기존 동작 회귀 방지)', async () => {
    mockSupabase.range.mockResolvedValue({ data: makeRows(300), error: null });

    const result = await getUpsBaseRates({ productId: 'p1' });

    expect(result).toHaveLength(300);
    expect(mockSupabase.range).toHaveBeenCalledTimes(1);
    expect(mockSupabase.range).toHaveBeenCalledWith(0, 999);
  });

  it('TC-UPS-R-PAG-03: 정확히 1,000행이면 다음 페이지(빈 응답)까지 호출해 종료, 결과는 1,000행', async () => {
    // 페이지네이션 헬퍼는 정확히 PAGE_SIZE(1000)행을 받으면 다음 페이지를 한 번 더 조회해
    // 빈 응답으로 종료를 판단한다 — mock도 동일하게 2번째 호출은 빈 배열을 반환해야 한다.
    mockSupabase.range
      .mockResolvedValueOnce({ data: makeRows(1000), error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const result = await getUpsBaseRates();

    expect(result).toHaveLength(1000);
    expect(mockSupabase.range).toHaveBeenCalledTimes(2);
    expect(mockSupabase.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(mockSupabase.range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('TC-UPS-R-PAG-04: 페이지네이션 시에도 productId/zoneId 필터가 유지된다', async () => {
    mockSupabase.range
      .mockResolvedValueOnce({ data: makeRows(1000, 0), error: null })
      .mockResolvedValueOnce({ data: makeRows(200, 1000), error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await getUpsBaseRates({ productId: 'p1', zoneId: 'z1' });

    expect(mockSupabase.eq).toHaveBeenCalledWith('product_id', 'p1');
    expect(mockSupabase.eq).toHaveBeenCalledWith('zone_id', 'z1');
  });

  it('TC-UPS-R-PAG-05: 조회 에러 시 에러를 전파한다', async () => {
    mockSupabase.range.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(getUpsBaseRates()).rejects.toThrow('boom');
  });
});
