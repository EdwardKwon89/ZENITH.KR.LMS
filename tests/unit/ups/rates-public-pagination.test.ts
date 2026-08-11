import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPublicBaseRates } from '@/app/actions/ups/rates-public';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

// ─── TASK-B-268 (Issue #1034 / DEF-B-041): getPublicBaseRates 페이지네이션 ─────

describe('TC-UPS-R-PUBLIC-PAG: getPublicBaseRates 페이지네이션 (DEF-B-041)', () => {
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
      profile: { id: 'user-001', role: 'AGENCY', org_id: 'org-001' },
      supabase: mockSupabase,
    });
  });

  function makeRows(count: number, startIdx = 0) {
    return Array.from({ length: count }, (_, i) => ({
      id: `r-${startIdx + i}`, product_id: 'p1', zone_id: 'z1', weight_kg: startIdx + i + 0.5,
      selling_price: 100, is_active: true, valid_from: '2026-01-01',
      product: { product_code: 'WW_EXPRESS_NONDOC', product_name: 'Express', cargo_type: 'NON_DOC' },
      zone: { zone_code: 'Z1', zone_name: 'Zone 1' },
    }));
  }

  it('TC-UPS-R-PUBLIC-PAG-01: 1,000행 초과(1,560행) 데이터를 2회 range 호출로 전체 병합한다', async () => {
    const page1 = makeRows(1000, 0);
    const page2 = makeRows(560, 1000);
    mockSupabase.range
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: page2, error: null });

    const result = await getPublicBaseRates();

    expect(result).toHaveLength(1560);
    expect(mockSupabase.range).toHaveBeenCalledTimes(2);
    expect(mockSupabase.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(mockSupabase.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(result[1559].id).toBe('r-1559');
  });

  it('TC-UPS-R-PUBLIC-PAG-02: 1,000행 이하면 range 1회 호출 후 종료 (회귀 방지)', async () => {
    mockSupabase.range.mockResolvedValue({ data: makeRows(500), error: null });

    const result = await getPublicBaseRates();

    expect(result).toHaveLength(500);
    expect(mockSupabase.range).toHaveBeenCalledTimes(1);
    expect(mockSupabase.range).toHaveBeenCalledWith(0, 999);
  });

  it('TC-UPS-R-PUBLIC-PAG-03: 조회 에러 시 에러를 전파한다', async () => {
    mockSupabase.range.mockResolvedValue({ data: null, error: { message: 'rls blocked' } });

    await expect(getPublicBaseRates()).rejects.toThrow('rls blocked');
  });

  it('TC-UPS-R-PUBLIC-PAG-04: is_active/valid 기간 필터가 각 페이지에 동일하게 유지된다', async () => {
    mockSupabase.range
      .mockResolvedValueOnce({ data: makeRows(1000, 0), error: null })
      .mockResolvedValueOnce({ data: makeRows(200, 1000), error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await getPublicBaseRates();

    // 2페이지 동안 동일한 필터 체인 호출
    expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    expect(mockSupabase.lte).toHaveBeenCalledWith('valid_from', expect.any(String));
    expect(mockSupabase.or).toHaveBeenCalledWith(expect.stringContaining('valid_until'));
  });
});

// ─── TASK-B-270 (Issue #1039 / DEF-B-043): 페이지네이션 tiebreaker 2차 정렬 ─────

describe('TC-UPS-R-PUBLIC-TIE: getPublicBaseRates weight_kg/id 2차 정렬 (DEF-B-043)', () => {
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
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'user-001' },
      profile: { id: 'user-001', role: 'AGENCY', org_id: 'org-001' },
      supabase: mockSupabase,
    });
  });

  it('TC-UPS-R-PUBLIC-TIE-01: getPublicBaseRates가 weight_kg 정렬 후 id 2차 정렬을 호출한다 (behavioral)', async () => {
    await getPublicBaseRates();

    expect(mockSupabase.order).toHaveBeenCalledWith('weight_kg');
    expect(mockSupabase.order).toHaveBeenCalledWith('id');
    const orderCalls = mockSupabase.order.mock.calls.map((c: any[]) => c[0]);
    const wIdx = orderCalls.indexOf('weight_kg');
    const idIdx = orderCalls.indexOf('id');
    expect(wIdx).toBeGreaterThanOrEqual(0);
    expect(idIdx).toBeGreaterThan(wIdx);
  });
});
