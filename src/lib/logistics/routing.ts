import { 
  selectCostOptimal, 
  selectTimeOptimal, 
  selectBalanced,
  Candidate
} from "./scoring";

export type RouteOptionType = 'COST' | 'TIME' | 'BALANCED';

export interface RouteSegment {
  transport_mode: 'SEA' | 'AIR' | 'LAND';
  from_port_id: string;
  to_port_id: string;
  carrier: string;
  transit_days: number;
  cost: number;
  currency: string;
}

export interface RouteOption extends Candidate {
  option_type: RouteOptionType;
  segments: RouteSegment[];
  total_cost: number;
  total_transit_days: number;
  score: number;
}

/**
 * [CTO] Map Adapter Interface
 */
export interface IVirtualMapAdapter {
  getPotentialRoutes(origin: string, dest: string): Promise<Omit<RouteOption, 'option_type' | 'score'>[]>;
}

/**
 * [Execution] Mock Map Adapter
 * Provides deterministic scenarios for testing
 */
export class MockMapAdapter implements IVirtualMapAdapter {
  async getPotentialRoutes(origin: string, dest: string): Promise<Omit<RouteOption, 'option_type' | 'score'>[]> {
    return [
      {
        segments: [
          { transport_mode: 'SEA', from_port_id: origin, to_port_id: dest, carrier: 'Zenith Ocean Line (KE)', transit_days: 14, cost: 450, currency: 'USD' }
        ],
        total_cost: 450,
        total_transit_days: 14
      },
      {
        segments: [
          { transport_mode: 'AIR', from_port_id: origin, to_port_id: dest, carrier: 'Zenith Air Cargo (SQ)', transit_days: 2, cost: 1200, currency: 'USD' }
        ],
        total_cost: 1200,
        total_transit_days: 2
      },
      {
        segments: [
          { transport_mode: 'LAND', from_port_id: origin, to_port_id: 'Incheon Hub', carrier: 'Zenith Trucking', transit_days: 1, cost: 50, currency: 'USD' },
          { transport_mode: 'SEA', from_port_id: 'Incheon Hub', to_port_id: dest, carrier: 'Express Ferry (OZ)', transit_days: 5, cost: 600, currency: 'USD' }
        ],
        total_cost: 650,
        total_transit_days: 6
      }
    ];
  }
}

/**
 * [Execution] Routing Engine
 * Handles scoring and route selection logic
 */
export class RoutingEngine {
  private adapter: IVirtualMapAdapter;

  constructor(adapter: IVirtualMapAdapter = new MockMapAdapter()) {
    this.adapter = adapter;
  }

  async calculateOptions(origin: string, dest: string): Promise<RouteOption[]> {
    const candidates = await this.adapter.getPotentialRoutes(origin, dest);
    
    if (candidates.length === 0) return [];

    // Ds-11 Scoring Policy 적용
    const costWinner = selectCostOptimal(candidates);
    const timeWinner = selectTimeOptimal(candidates);
    const balancedResult = selectBalanced(candidates);

    return [
      { 
        ...costWinner, 
        option_type: 'COST', 
        score: costWinner.total_cost 
      },
      { 
        ...timeWinner, 
        option_type: 'TIME', 
        score: timeWinner.total_transit_days 
      },
      { 
        ...balancedResult.candidate, 
        option_type: 'BALANCED', 
        score: balancedResult.score 
      }
    ];
  }
}

export const routingEngine = new RoutingEngine();
