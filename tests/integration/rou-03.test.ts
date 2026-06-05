import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUserAction } from '@/lib/auth/guards';

/**
 * TC-SCHED-01: selectRoute 스케줄 자동 매칭 (DEF-043)
 *
 * 경로 선택 시 zen_vessel_schedules에서 carrier+port+mode 조합을
 * 자동 매칭하여 segments에 schedule_id / flight_no / etd / eta를 보강한다.
 * Non-fatal 설계 — 매칭 실패 시 null 허용, 기존 동작 유지.
 */

import { selectRoute } from '@/app/actions/routing';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

interface MockTableConfig {
  singleData?: any;
  maybeSingleData?: any;
  updateData?: any;
  selectError?: any;
}

describe('TC-SCHED-01: selectRoute 스케줄 자동 매칭 (DEF-043)', () => {
  const mockUser = { id: 'user-1' };
  const mockOrderId = 'order-uuid-001';
  const mockOptionId = 'opt-balanced-1';

  let mockSupabase: any;
  const tableConfigs = new Map<string, MockTableConfig>();
  let routeOptUpdateData: any = undefined;

  function setMockTableData(table: string, config: MockTableConfig) {
    tableConfigs.set(table, config);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    tableConfigs.clear();
    routeOptUpdateData = undefined;

    setMockTableData('zen_order_routes', {
      singleData: { id: 'route-record-uuid' },
      updateData: { error: null },
    });
    setMockTableData('zen_route_options', {
      singleData: { id: mockOptionId, segments: [] },
    });
    setMockTableData('zen_carriers', {
      singleData: { org_id: 'carrier-org-1' },
    });
    setMockTableData('zen_ports', {
      singleData: [],
    });
    setMockTableData('zen_vessel_schedules', {
      maybeSingleData: null,
    });
    setMockTableData('zen_orders', {
      updateData: { error: null },
    });

    mockSupabase = {
      from: vi.fn((table: string) => {
        const chain: any = {};
        chain.then = (resolve: any) => {
          const cfg = tableConfigs.get(table);
          const data = cfg?.singleData !== undefined ? cfg.singleData : [];
          resolve({ data, error: null, count: Array.isArray(data) ? data.length : 0 });
        };
        chain.select = vi.fn().mockReturnValue(chain);
        chain.upsert = vi.fn().mockResolvedValue({ error: null });
        chain.insert = vi.fn().mockResolvedValue({ error: null });
        chain.update = vi.fn((data: any) => {
          const cfg = tableConfigs.get(table);
          const err = cfg?.updateData?.error;
          if (err) return Promise.resolve({ data: null, error: err });
          if (table === 'zen_route_options') routeOptUpdateData = data;
          return chain;
        });
        chain.delete = vi.fn().mockResolvedValue({ error: null });
        chain.eq = vi.fn().mockReturnValue(chain);
        chain.in = vi.fn().mockReturnValue(chain);
        chain.gte = vi.fn().mockReturnValue(chain);
        chain.order = vi.fn().mockReturnValue(chain);
        chain.limit = vi.fn().mockReturnValue(chain);
        chain.range = vi.fn().mockReturnValue(chain);
        chain.is = vi.fn().mockReturnValue(chain);
        chain.lte = vi.fn().mockReturnValue(chain);
        chain.or = vi.fn().mockReturnValue(chain);
        chain.head = vi.fn().mockReturnValue(chain);
        chain.single = vi.fn(async () => {
          const cfg = tableConfigs.get(table);
          if (cfg?.selectError) return { data: null, error: cfg.selectError };
          if (Array.isArray(cfg?.singleData)) return { data: cfg.singleData, error: null };
          return { data: cfg?.singleData ?? null, error: null };
        });
        chain.maybeSingle = vi.fn(async () => {
          const cfg = tableConfigs.get(table);
          const val = cfg?.maybeSingleData !== undefined ? cfg.maybeSingleData : cfg?.singleData;
          return { data: val ?? null, error: null };
        });
        chain._table = table;
        return chain;
      }),
    };

    (validateUserAction as any).mockResolvedValue({ supabase: mockSupabase, user: mockUser });
  });

  it('[TC-SCHED-01a] 매칭 성공 시 segments에 schedule_id/flight_no/etd/eta 보강', async () => {
    const segments = [
      {
        transport_mode: 'AIR',
        from_port_id: 'ICN',
        to_port_id: 'LAX',
        carrier: 'ZENITH Air Cargo',
        carrier_id: 'carrier-air-1',
        transit_days: 10,
        cost: 1200,
        currency: 'USD',
      },
    ];

    setMockTableData('zen_route_options', {
      singleData: { id: mockOptionId, segments },
    });
    setMockTableData('zen_ports', {
      singleData: [
        { id: 'port-icn-uuid', code: 'ICN' },
        { id: 'port-lax-uuid', code: 'LAX' },
      ],
    });
    setMockTableData('zen_vessel_schedules', {
      maybeSingleData: {
        id: 'schedule-uuid-001',
        vessel_name: 'Boeing 777F',
        voyage_no: 'KE-701',
        etd: '2026-07-01T00:00:00Z',
        eta: '2026-07-02T00:00:00Z',
      },
    });

    await selectRoute(mockOrderId, mockOptionId);

    expect(routeOptUpdateData).toBeDefined();
    expect(routeOptUpdateData.segments[0].schedule_id).toBe('schedule-uuid-001');
    expect(routeOptUpdateData.segments[0].flight_no).toBe('Boeing 777F / KE-701');
    expect(routeOptUpdateData.segments[0].etd).toBe('2026-07-01T00:00:00Z');
    expect(routeOptUpdateData.segments[0].eta).toBe('2026-07-02T00:00:00Z');
  });

  it('[TC-SCHED-01b] 매칭 실패 시 non-fatal — segments 미변경', async () => {
    const segments = [
      {
        transport_mode: 'SEA',
        from_port_id: 'ICN',
        to_port_id: 'LAX',
        carrier: 'ZENITH Maritime',
        carrier_id: 'carrier-sea-1',
        transit_days: 14,
        cost: 450,
        currency: 'USD',
      },
    ];

    setMockTableData('zen_route_options', {
      singleData: { id: mockOptionId, segments },
    });
    setMockTableData('zen_ports', {
      singleData: [
        { id: 'port-icn-uuid', code: 'ICN' },
        { id: 'port-lax-uuid', code: 'LAX' },
      ],
    });
    setMockTableData('zen_vessel_schedules', {
      maybeSingleData: null,
    });

    await selectRoute(mockOrderId, mockOptionId);

    expect(routeOptUpdateData).toBeUndefined();
  });

  it('[TC-SCHED-01c] LAND 모드 세그먼트는 스케줄 매칭 스킵', async () => {
    const segments = [
      {
        transport_mode: 'LAND',
        from_port_id: 'ICN',
        to_port_id: 'PUS',
        carrier: 'Zenith Trucking',
        carrier_id: 'carrier-land-1',
        transit_days: 1,
        cost: 50,
        currency: 'USD',
      },
    ];

    setMockTableData('zen_route_options', {
      singleData: { id: mockOptionId, segments },
    });

    mockSupabase.from = vi.fn((table: string) => {
      const chain: any = {};
      chain.then = (resolve: any) => {
        const cfg = tableConfigs.get(table);
        const data = cfg?.singleData !== undefined ? cfg.singleData : [];
        resolve({ data, error: null, count: Array.isArray(data) ? data.length : 0 });
      };
      chain.select = vi.fn().mockReturnValue(chain);
      chain.upsert = vi.fn().mockResolvedValue({ error: null });
      chain.update = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.gte = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn(async () => {
        const cfg = tableConfigs.get(table);
        return { data: cfg?.singleData ?? null, error: null };
      });
      chain.maybeSingle = vi.fn(async () => {
        const cfg = tableConfigs.get(table);
        const val = cfg?.maybeSingleData !== undefined ? cfg.maybeSingleData : cfg?.singleData;
        return { data: val ?? null, error: null };
      });
      chain._table = table;

      if (table === 'zen_vessel_schedules') {
        chain.eq = vi.fn(() => { throw new Error('LAND segment should not query schedules'); });
      }

      return chain;
    });

    await selectRoute(mockOrderId, mockOptionId);
  });

  it('[TC-SCHED-01d] carrier_id 없으면 스케줄 매칭 스킵', async () => {
    const segments = [
      {
        transport_mode: 'AIR',
        from_port_id: 'ICN',
        to_port_id: 'LAX',
        carrier: 'Unknown Carrier',
        transit_days: 10,
        cost: 1200,
        currency: 'USD',
      },
    ];

    setMockTableData('zen_route_options', {
      singleData: { id: mockOptionId, segments },
    });

    mockSupabase.from = vi.fn((table: string) => {
      const chain: any = {};
      chain.then = (resolve: any) => {
        const cfg = tableConfigs.get(table);
        const data = cfg?.singleData !== undefined ? cfg.singleData : [];
        resolve({ data, error: null, count: Array.isArray(data) ? data.length : 0 });
      };
      chain.select = vi.fn().mockReturnValue(chain);
      chain.upsert = vi.fn().mockResolvedValue({ error: null });
      chain.update = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.gte = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn(async () => {
        const cfg = tableConfigs.get(table);
        return { data: cfg?.singleData ?? null, error: null };
      });
      chain.maybeSingle = vi.fn(async () => {
        const cfg = tableConfigs.get(table);
        const val = cfg?.maybeSingleData !== undefined ? cfg.maybeSingleData : cfg?.singleData;
        return { data: val ?? null, error: null };
      });
      chain._table = table;

      if (table === 'zen_vessel_schedules') {
        chain.eq = vi.fn(() => { throw new Error('no carrier_id segment should not query schedules'); });
      }

      return chain;
    });

    await selectRoute(mockOrderId, mockOptionId);
  });
});
