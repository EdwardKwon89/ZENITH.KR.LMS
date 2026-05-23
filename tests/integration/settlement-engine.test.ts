import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettlementEngine } from '@/lib/finance/settlement/settlement';
import { createAdminClient } from '@/utils/supabase/server';

// Mock Supabase Server Admin Client
vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to create a mock Supabase query chain
const createQueryMock = (data: any, error: any = null) => {
  const queryChain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn().mockImplementation((onFulfilled: any) => {
      return Promise.resolve({ data, error }).then(onFulfilled);
    })
  };
  queryChain.select.mockReturnValue(queryChain);
  queryChain.insert.mockReturnValue(queryChain);
  queryChain.update.mockReturnValue(queryChain);
  queryChain.delete.mockReturnValue(queryChain);
  queryChain.eq.mockReturnValue(queryChain);
  queryChain.or.mockReturnValue(queryChain);
  queryChain.order.mockReturnValue(queryChain);
  return queryChain;
};

const createMockSupabase = () => {
  const mock: any = {
    from: vi.fn(),
    _tableMocks: {},
  };
  
  mock.from.mockImplementation((table: string) => {
    return mock._tableMocks[table] || createQueryMock(null);
  });
  
  return mock;
};

let mockSupabase = createMockSupabase();

describe('SettlementEngine Route-Based Cost Integration (IMP-070)', () => {
  const mockOrderId = 'order-uuid-111';
  const mockOrder = {
    id: mockOrderId,
    order_no: 'ORD-2026-001',
    shipper_id: 'shipper-uuid-222',
    origin_port_id: 'port-icn-uuid',
    dest_port_id: 'port-sin-uuid',
    transport_mode: 'AIR',
    estimated_cost: 100, // chargeable weight fallback
    origin_port: { code: 'ICN' },
    dest_port: { code: 'SIN' },
    packages: [{ gross_weight: 100, volume: 0.1, packing_count: 1 }]
  };

  const mockRateCard = [
    {
      id: 'rate-card-uuid-333',
      origin_code: 'ICN',
      dest_code: 'SIN',
      mode: 'AIR',
      status: 'ACTIVE',
      base_rate: 15,
      unit_price: 15,
      currency: 'USD',
      tiers: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    (createAdminClient as any).mockResolvedValue(mockSupabase);
    (global as any).mockSupabase = mockSupabase;
  });

  it('TC-F-ROUTE-1: [Fallback] 확정 경로가 없으면 기존 Rate Card 요율 매칭 로직으로 작동해야 함', async () => {
    const existingCosts: any[] = [];
    const insertedCost = { id: 'inserted-cost-uuid', total_amount: 1500 };

    const orderCostsMock: any = {
      select: vi.fn().mockImplementation(() => {
        if (orderCostsMock.insert.mock.calls.length > 0) {
          return createQueryMock(insertedCost);
        }
        return createQueryMock(existingCosts);
      }),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    orderCostsMock.insert.mockReturnValue(orderCostsMock);
    orderCostsMock.eq.mockReturnValue(orderCostsMock);

    mockSupabase._tableMocks = {
      zen_orders: createQueryMock(mockOrder),
      zen_order_routes: createQueryMock(null), // no route
      zen_rate_cards: createQueryMock(mockRateCard),
      zen_order_costs: orderCostsMock,
      zen_system_params: createQueryMock(null, { code: 'PGRST116', message: 'Not found' })
    };

    const engine = new SettlementEngine();
    const result = await engine.calculateOrderCosts(mockOrderId);

    if (!result.success) console.log('FAIL RESULT:', result);
    expect(result.success).toBe(true);
    expect(result.totalFreight).toBe(1500); // 15 * 100
    expect(result.unitPrice).toBe(15);
    
    expect(orderCostsMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      route_option_id: null,
      carrier: null,
      segment_index: null
    }));
  });

  it('TC-F-ROUTE-2: [Single Carrier] 단일 carrier 경로일 경우 합산하여 1건의 비용 레코드가 생성되어야 함', async () => {
    const mockRoute = {
      selected_option_id: 'route-option-single-uuid',
      selected_option: {
        id: 'route-option-single-uuid',
        segments: [
          { transport_mode: 'SEA', from_port_id: 'ICN', to_port_id: 'SIN', carrier: 'Zenith Ocean Line', cost: 450, currency: 'USD' }
        ]
      }
    };

    const existingCosts: any[] = [];
    const insertedCost = { id: 'inserted-cost-uuid', total_amount: 450 };

    const orderCostsMock: any = {
      select: vi.fn().mockImplementation(() => {
        if (orderCostsMock.insert.mock.calls.length > 0) {
          return createQueryMock(insertedCost);
        }
        return createQueryMock(existingCosts);
      }),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockImplementation(() => createQueryMock(null)),
      eq: vi.fn().mockReturnThis(),
    };
    orderCostsMock.insert.mockReturnValue(orderCostsMock);
    orderCostsMock.eq.mockReturnValue(orderCostsMock);

    mockSupabase._tableMocks = {
      zen_orders: createQueryMock(mockOrder),
      zen_order_routes: createQueryMock(mockRoute),
      zen_order_costs: orderCostsMock,
      zen_system_params: createQueryMock(null, { code: 'PGRST116', message: 'Not found' })
    };

    const engine = new SettlementEngine();
    const result = await engine.calculateOrderCosts(mockOrderId);

    if (!result.success) console.log('FAIL RESULT:', result);
    expect(result.success).toBe(true);
    expect(result.totalFreight).toBe(450);
    expect(orderCostsMock.delete).toHaveBeenCalled(); // 멱등성 삭제 검증
    
    expect(orderCostsMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      route_option_id: 'route-option-single-uuid',
      carrier: 'Zenith Ocean Line',
      segment_index: null
    }));
  });

  it('TC-F-ROUTE-3: [Multi-Carrier] 다중 carrier 경로일 경우 세그먼트별 분할하여 복수의 비용 레코드가 생성되어야 함', async () => {
    const mockRoute = {
      selected_option_id: 'route-option-multi-uuid',
      selected_option: {
        id: 'route-option-multi-uuid',
        segments: [
          { transport_mode: 'LAND', from_port_id: 'ICN', to_port_id: 'Incheon Hub', carrier: 'Zenith Trucking', cost: 50, currency: 'USD' },
          { transport_mode: 'SEA', from_port_id: 'Incheon Hub', to_port_id: 'SIN', carrier: 'Express Ferry', cost: 600, currency: 'USD' }
        ]
      }
    };

    const existingCosts: any[] = [];
    const insertedCosts = [
      { id: 'cost-seg-1', total_amount: 50 },
      { id: 'cost-seg-2', total_amount: 600 }
    ];

    const orderCostsMock: any = {
      select: vi.fn().mockImplementation(() => {
        if (orderCostsMock.insert.mock.calls.length > 0) {
          return createQueryMock(insertedCosts);
        }
        return createQueryMock(existingCosts);
      }),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockImplementation(() => createQueryMock(null)),
      eq: vi.fn().mockReturnThis(),
    };
    orderCostsMock.insert.mockReturnValue(orderCostsMock);
    orderCostsMock.eq.mockReturnValue(orderCostsMock);

    mockSupabase._tableMocks = {
      zen_orders: createQueryMock(mockOrder),
      zen_order_routes: createQueryMock(mockRoute),
      zen_order_costs: orderCostsMock,
      zen_system_params: createQueryMock(null, { code: 'PGRST116', message: 'Not found' })
    };

    const engine = new SettlementEngine();
    const result = await engine.calculateOrderCosts(mockOrderId);

    if (!result.success) console.log('FAIL RESULT:', result);
    expect(result.success).toBe(true);
    expect(result.totalFreight).toBe(650); // 50 + 600
    expect(orderCostsMock.delete).toHaveBeenCalled();
    
    expect(orderCostsMock.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        route_option_id: 'route-option-multi-uuid',
        carrier: 'Zenith Trucking',
        segment_index: 0,
        unit_price: 50,
        quantity: 1
      }),
      expect.objectContaining({
        route_option_id: 'route-option-multi-uuid',
        carrier: 'Express Ferry',
        segment_index: 1,
        unit_price: 600,
        quantity: 1
      })
    ]);
  });
});
