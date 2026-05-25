import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUserAction } from '@/lib/auth/guards';

/**
 * ROU-01 라우팅 액션 통합 테스트
 *
 * TC-R.4: getRouteOptions — 3종 옵션 생성 및 UPSERT 정책 검증
 * TC-R.5: selectRoute    — zen_order_routes 확정 저장 검증
 */

import { getRouteOptions, selectRoute, getRouteVisualization, getRouteConsistencyStatus } from '@/app/actions/routing';

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
    upsert: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    range: vi.fn().mockReturnThis(),
  };
  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.upsert.mockReturnValue(mock);
  mock.insert.mockReturnValue(mock);
  mock.update.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  mock.maybeSingle.mockReturnValue(mock);
  mock.range.mockReturnValue(mock);
  return mock;
};

let activeMockSupabase = createMockSupabase();

// ─── TC-R.4: getRouteOptions ──────────────────────────────────────────────────

describe('TC-R.4: getRouteOptions — 3종 옵션 생성 및 UPSERT 정책', () => {
  const mockUser = { id: 'user-1' };
  const mockProfile = { org_id: 'shipper-1', role: 'USER' };
  const mockOrderId = 'order-uuid-001';

  const mockRouteOption = (type: 'COST' | 'TIME' | 'BALANCED') => ({
    id: `opt-${type.toLowerCase()}-1`,
    order_id: mockOrderId,
    option_type: type,
    segments: [
      { from_port_id: 'ICN', to_port_id: 'SIN', transport_mode: 'AIR', carrier: 'KE', transit_days: 8, cost: 1000, currency: 'USD' },
    ],
    total_cost: type === 'COST' ? 1000 : type === 'TIME' ? 1400 : 1100,
    total_transit_days: type === 'TIME' ? 5 : type === 'COST' ? 8 : 6,
    score: type === 'COST' ? 0.8 : type === 'TIME' ? 0.6 : 0.7,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    activeMockSupabase = createMockSupabase();
    
    // Default mocks for common flows
    activeMockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              origin_port_id: 'port-uuid-1',
              dest_port_id: 'port-uuid-2',
              origin_port: { code: 'ICN', name: 'Incheon' },
              dest_port: { code: 'SIN', name: 'Singapore' }
            },
            error: null
          })
        };
      }
      if (table === 'zen_route_network') {
        const mockRoutes = [
          {
            id: 'route-1',
            carrier_id: 'carrier-air',
            from_port_id: 'ICN',
            to_port_id: 'SIN',
            transport_mode: 'AIR',
            transit_days: 2,
            is_active: true,
            carrier: { code: 'ZENITH_AIR', name: 'ZENITH Air Cargo', transport_mode: 'AIR' }
          },
          {
            id: 'route-2',
            carrier_id: 'carrier-sea',
            from_port_id: 'ICN',
            to_port_id: 'SIN',
            transport_mode: 'SEA',
            transit_days: 7,
            is_active: true,
            carrier: { code: 'ZENITH_SEA', name: 'ZENITH Maritime', transport_mode: 'SEA' }
          },
        ];
        const handler: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
        handler.then = (resolve: any) => resolve({ data: mockRoutes, error: null });
        return handler;
      }
      if (table === 'zen_rate_cards') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { tiers: [{ weight_min: 0, unit_price: 5.50 }] },
            error: null
          })
        };
      }
      if (table === 'zen_route_options') {
        const mockOptions = [
          mockRouteOption('COST'),
          mockRouteOption('TIME'),
          mockRouteOption('BALANCED')
        ];
        return {
          upsert: activeMockSupabase.upsert.mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockOptions, error: null })
        };
      }
      return activeMockSupabase;
    });

    (validateUserAction as any).mockResolvedValue({ supabase: activeMockSupabase, user: mockUser, profile: mockProfile });
  });

  it('[TC-R.4a] COST/TIME/BALANCED 3종 옵션을 반환한다 (BUG-08-A: 객체 형식)', async () => {
    const result = await getRouteOptions(mockOrderId);

    expect(result.success).toBe(true);
    expect(result.options).toHaveProperty('COST');
    expect(result.options).toHaveProperty('TIME');
    expect(result.options).toHaveProperty('BALANCED');
  });

  it('[TC-R.4b] COST 옵션의 비용은 TIME 옵션보다 저렴하거나 같아야 한다', async () => {
    const result = await getRouteOptions(mockOrderId);
    const costOpt = result.options.COST;
    const timeOpt = result.options.TIME;

    expect(costOpt.total_cost).toBeLessThanOrEqual(timeOpt.total_cost);
  });

  it('[TC-R.4c] TIME 옵션의 소요일은 COST 옵션보다 짧거나 같아야 한다', async () => {
    const result = await getRouteOptions(mockOrderId);
    const costOpt = result.options.COST;
    const timeOpt = result.options.TIME;

    expect(timeOpt.total_transit_days).toBeLessThanOrEqual(costOpt.total_transit_days);
  });

  it('[TC-R.4d] UPSERT 정책 — zen_route_options.upsert 를 호출한다', async () => {
    // Rely on default from() mock in beforeEach
    await getRouteOptions(mockOrderId);
    
    expect(activeMockSupabase.from).toHaveBeenCalledWith('zen_route_options');
    expect(activeMockSupabase.upsert).toHaveBeenCalled();
  });
});

// ─── TC-R.5: selectRoute ─────────────────────────────────────────────────────

describe('TC-R.5: selectRoute — zen_order_routes 확정 저장', () => {
  const mockUser = { id: 'user-1' };
  const mockOrderId = 'order-uuid-001';
  const mockOptionId = 'opt-balanced-1';

  beforeEach(() => {
    vi.clearAllMocks();
    activeMockSupabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase: activeMockSupabase, user: mockUser });
  });

  it('[TC-R.5a] 선택한 optionId 로 zen_order_routes 에 레코드를 생성한다', async () => {
    activeMockSupabase.upsert.mockResolvedValue({ error: null });
    activeMockSupabase.single.mockResolvedValue({ data: { id: 'route-record-uuid' }, error: null });

    const result = await selectRoute(mockOrderId, mockOptionId);

    expect(result.success).toBe(true);
    expect(activeMockSupabase.from).toHaveBeenCalledWith('zen_order_routes');
    expect(activeMockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: mockOrderId,
        selected_option_id: mockOptionId,
        applied_by: mockUser.id
      }),
      expect.any(Object)
    );
  });

  it('[TC-R.5b] appliedRouteId 는 zen_order_routes 실제 레코드 UUID 를 반환한다 (BUG-10-A)', async () => {
    activeMockSupabase.upsert.mockResolvedValue({ error: null });
    activeMockSupabase.single.mockResolvedValue({ data: { id: 'route-record-uuid' }, error: null });

    const result = await selectRoute(mockOrderId, mockOptionId);

    expect(result.success).toBe(true);
    expect(result.appliedRouteId).toBe('route-record-uuid');
  });
});

// ─── TC-R.6: getRouteVisualization ──────────────────────────────────────────

describe('TC-R.6: getRouteVisualization — 마일스톤 및 시각화 데이터', () => {
  const mockUser = { id: 'user-1' };
  const mockOrderId = 'order-uuid-001';

  beforeEach(() => {
    vi.clearAllMocks();
    activeMockSupabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase: activeMockSupabase, user: mockUser });
  });

  it('[TC-R.6a] 적용된 경로가 없을 경우 success: false 를 반환한다', async () => {
    activeMockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getRouteVisualization(mockOrderId);

    expect(result.success).toBe(false);
    expect(result.milestones).toEqual([]);
  });

  it('[TC-R.6b] 세그먼트 데이터를 마일스톤 배열로 올바르게 변환한다', async () => {
    const mockRoute = {
      order_id: mockOrderId,
      selected_option: {
        segments: [
          { from_port_id: 'ICN', to_port_id: 'SIN', transport_mode: 'AIR' },
          { from_port_id: 'SIN', to_port_id: 'HKG', transport_mode: 'SEA' }
        ]
      }
    };
    activeMockSupabase.maybeSingle.mockResolvedValue({ data: mockRoute, error: null });
    activeMockSupabase.select.mockReturnThis();
    activeMockSupabase.eq.mockReturnThis();
    activeMockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_order_routes') return activeMockSupabase;
      if (table === 'zen_tracking_events') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
      return activeMockSupabase;
    });

    const result = await getRouteVisualization(mockOrderId);

    expect(result.success).toBe(true);
    // Segments: ICN->SIN, SIN->HKG. Milestones: ICN, SIN, HKG
    expect(result.milestones).toHaveLength(3);
    expect(result.milestones[0].name).toBe('ICN');
    expect(result.milestones[1].name).toBe('SIN');
    expect(result.milestones[2].name).toBe('HKG');
  });

  it('[TC-R.6c] 트래킹 이벤트가 존재하는 지점의 status 는 COMPLETED 이다', async () => {
    const mockRoute = {
      order_id: mockOrderId,
      selected_option: {
        segments: [{ from_port_id: 'ICN', to_port_id: 'SIN', transport_mode: 'AIR' }]
      }
    };
    const mockEvents = [{ location_name: 'ICN', event_type: 'DEPARTURE' }];

    activeMockSupabase.maybeSingle.mockResolvedValue({ data: mockRoute, error: null });
    activeMockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_order_routes') return activeMockSupabase;
      if (table === 'zen_tracking_events') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null }) };
      return activeMockSupabase;
    });

    const result = await getRouteVisualization(mockOrderId);

    expect(result.milestones[0].status).toBe('COMPLETED');
    expect(result.milestones[1].status).toBe('PENDING'); // SIN has no event
  });
});

// ─── TC-R.7: getRouteConsistencyStatus ────────────────────────────────────────

describe('TC-R.7: getRouteConsistencyStatus — 경로 정합성 상태', () => {
  const mockUser = { id: 'user-1' };
  const mockOrderId = 'order-uuid-001';

  beforeEach(() => {
    vi.clearAllMocks();
    activeMockSupabase = createMockSupabase();
    (validateUserAction as any).mockResolvedValue({ supabase: activeMockSupabase, user: mockUser });
  });

  it('[TC-R.7a] (Mock) 항상 success: true 와 isConsistent: true 를 반환한다', async () => {
    const result = await getRouteConsistencyStatus(mockOrderId);

    expect(result.success).toBe(true);
    expect(result.isConsistent).toBe(true);
  });
});

// ─── TC-R.8: Hub 경로 탐색 (IMP-084) ─────────────────────────────────────

describe('TC-R.8: Hub 경로 탐색 — DatabaseRouteAdapter.appendHubRoutes', () => {
  const mockUser = { id: 'user-1' };
  const mockProfile = { org_id: 'shipper-1', role: 'USER' };

  function createHubMockSupabase(options: { directOnly: boolean }) {
    const mock = createMockSupabase();
    let routeNetworkCallCount = 0;
    const capturedOptions: any[] = [];

    mock.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: options.directOnly ? {
              origin_port_id: 'port-uuid-1',
              dest_port_id: 'port-uuid-2',
              transport_mode: 'AIR',
              cargo_details: { total_weight: 100, total_volume: 1 },
              origin_port: { code: 'ICN', name: 'Incheon' },
              dest_port: { code: 'SIN', name: 'Singapore' }
            } : {
              origin_port_id: 'port-uuid-3',
              dest_port_id: 'port-uuid-4',
              transport_mode: 'AIR',
              cargo_details: { total_weight: 100, total_volume: 1 },
              origin_port: { code: 'PVG', name: 'Shanghai Pudong' },
              dest_port: { code: 'LAX', name: 'Los Angeles' }
            },
            error: null
          })
        };
      }
      if (table === 'zen_route_network') {
        routeNetworkCallCount++;
        const handler: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
        if (options.directOnly) {
          handler.then = (resolve: any) => resolve({ data: [
            { id: 'r-1', carrier_id: 'carrier-air', from_port_id: 'ICN', to_port_id: 'SIN', transport_mode: 'AIR', transit_days: 2, is_active: true, carrier: { code: 'ZENITH_AIR', name: 'ZENITH Air Cargo', transport_mode: 'AIR' } },
            { id: 'r-2', carrier_id: 'carrier-sea', from_port_id: 'ICN', to_port_id: 'SIN', transport_mode: 'SEA', transit_days: 7, is_active: true, carrier: { code: 'ZENITH_SEA', name: 'ZENITH Maritime', transport_mode: 'SEA' } },
          ], error: null });
        } else if (routeNetworkCallCount === 1) {
          handler.then = (resolve: any) => resolve({ data: [], error: null });
        } else if (routeNetworkCallCount === 2) {
          handler.then = (resolve: any) => resolve({ data: [
            { id: 'r-3', carrier_id: 'carrier-air', from_port_id: 'PVG', to_port_id: 'ICN', transport_mode: 'AIR', transit_days: 2, is_active: true, carrier: { code: 'ZENITH_AIR', name: 'ZENITH Air Cargo', transport_mode: 'AIR' } },
            { id: 'r-4', carrier_id: 'carrier-sea', from_port_id: 'PVG', to_port_id: 'ICN', transport_mode: 'SEA', transit_days: 5, is_active: true, carrier: { code: 'ZENITH_SEA', name: 'ZENITH Maritime', transport_mode: 'SEA' } },
          ], error: null });
        } else {
          handler.then = (resolve: any) => resolve({ data: [
            { id: 'r-5', carrier_id: 'carrier-air', from_port_id: 'ICN', to_port_id: 'LAX', transport_mode: 'AIR', transit_days: 10, is_active: true, carrier: { code: 'ZENITH_AIR', name: 'ZENITH Air Cargo', transport_mode: 'AIR' } },
            { id: 'r-6', carrier_id: 'carrier-sea', from_port_id: 'ICN', to_port_id: 'LAX', transport_mode: 'SEA', transit_days: 12, is_active: true, carrier: { code: 'ZENITH_SEA', name: 'ZENITH Maritime', transport_mode: 'SEA' } },
          ], error: null });
        }
        return handler;
      }
      if (table === 'zen_rate_cards') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { tiers: [{ weight_min: 0, unit_price: 5.50 }] },
            error: null
          })
        };
      }
      if (table === 'zen_route_options') {
        return {
          upsert: vi.fn().mockImplementation((data: any) => {
            const idx = capturedOptions.findIndex(o => o.order_id === data.order_id && o.option_type === data.option_type);
            if (idx >= 0) capturedOptions[idx] = { ...capturedOptions[idx], ...data };
            else capturedOptions.push({ ...data, id: `captured-${capturedOptions.length + 1}`, created_at: new Date().toISOString() });
            return Promise.resolve({ error: null });
          }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(() => {
            const count = capturedOptions.length;
            return Promise.resolve({ data: capturedOptions, error: null, count });
          })
        };
      }
      if (table === 'zen_surcharges') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      }
      return mock;
    });

    return mock;
  }

  it('[TC-R.8a] PVG→LAX 경로 요청 시 Hub 경로(ICN 경유)를 1개 이상 반환한다', async () => {
    activeMockSupabase = createHubMockSupabase({ directOnly: false });
    (validateUserAction as any).mockResolvedValue({ supabase: activeMockSupabase, user: mockUser, profile: mockProfile });

    const result = await getRouteOptions('order-uuid-001');

    expect(result.success).toBe(true);
    const keys = Object.keys(result.options);
    expect(keys.length).toBeGreaterThanOrEqual(1);
    const firstKey = keys[0];
    const option = result.options[firstKey];
    expect(option.segments).toBeDefined();
    expect(option.segments.length).toBeGreaterThanOrEqual(2);
    expect(option.segments[0].to_port_id).toBe('ICN');
    expect(option.segments[1].to_port_id).toBe('LAX');
  });

  it('[TC-R.8b] ICN→SIN 직항 경로는 Hub 경로 없이 2개(COST/TIME/BALANCED) 이상 반환한다', async () => {
    activeMockSupabase = createHubMockSupabase({ directOnly: true });
    (validateUserAction as any).mockResolvedValue({ supabase: activeMockSupabase, user: mockUser, profile: mockProfile });

    const result = await getRouteOptions('order-uuid-001');

    expect(result.success).toBe(true);
    const keys = Object.keys(result.options);
    expect(keys.length).toBeGreaterThanOrEqual(2);
    keys.forEach(key => {
      const seg = result.options[key].segments || [];
      seg.forEach((s: any) => {
        expect(s.from_port_id).toBe('ICN');
        expect(s.to_port_id).toBe('SIN');
      });
    });
  });
});
