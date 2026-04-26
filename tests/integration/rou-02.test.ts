import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUserAction } from '@/lib/auth/guards';
import { getRouteVisualization, getRouteConsistencyStatus } from '@/app/actions/routing';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

// ─── Mock Supabase Factory ────────────────────────────────────────────────────

const createMockSupabase = () => {
  const mock: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };
  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  return mock;
};

let activeMockSupabase = createMockSupabase();

// ─── TC-R.6: getRouteVisualization ──────────────────────────────────────────

describe('TC-R.6: getRouteVisualization — 시각화 데이터 변환', () => {
  const mockOrderId = 'order-uuid-001';

  beforeEach(() => {
    vi.clearAllMocks();
    activeMockSupabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase: activeMockSupabase });
  });

  it('[TC-R.6a] 세그먼트 데이터를 마일스톤 배열로 올바르게 변환한다', async () => {
    const mockSegments = [
      { from_port_id: 'ICN', to_port_id: 'SIN', transport_mode: 'AIR' }
    ];
    activeMockSupabase.maybeSingle.mockResolvedValue({
      data: {
        order_id: mockOrderId,
        selected_option: { segments: mockSegments }
      },
      error: null
    });

    const result = await getRouteVisualization(mockOrderId);

    expect(result.success).toBe(true);
    // ICN (출발) + SIN (도착) = 2개 마일스톤
    expect(result.milestones).toHaveLength(2);
    expect(result.milestones[0].name).toBe('ICN');
    expect(result.milestones[0].location).toEqual({ lat: 37.4602, lng: 126.4407 });
    expect(result.milestones[1].name).toBe('SIN');
    expect(result.milestones[1].location).toEqual({ lat: 1.3521, lng: 103.8198 });
  });

  it('[TC-R.6b] 데이터가 없을 경우 빈 마일스톤을 반환한다', async () => {
    activeMockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getRouteVisualization(mockOrderId);

    expect(result.success).toBe(false);
    expect(result.milestones).toHaveLength(0);
  });
});

// ─── TC-R.7: getRouteConsistencyStatus ─────────────────────────────────────

describe('TC-R.7: getRouteConsistencyStatus — 정합성 체크', () => {
  const mockOrderId = 'order-uuid-001';

  beforeEach(() => {
    vi.clearAllMocks();
    activeMockSupabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase: activeMockSupabase });
  });

  it('[TC-R.7a] Mock 단계에서는 항상 isConsistent: true 를 반환한다', async () => {
    const result = await getRouteConsistencyStatus(mockOrderId);

    expect(result.success).toBe(true);
    expect(result.isConsistent).toBe(true);
    expect(result.discrepancies).toEqual([]);
  });
});
