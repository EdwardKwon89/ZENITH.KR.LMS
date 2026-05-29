import { 
  selectCostOptimal, 
  selectTimeOptimal, 
  selectBalanced,
  Candidate
} from "./scoring";
import { PricingBreakdown } from "./composite-pricing";

export type RouteOptionType = 'COST' | 'TIME' | 'BALANCED';

export interface RouteSegment {
  transport_mode: 'SEA' | 'AIR' | 'LAND';
  from_port_id: string;
  to_port_id: string;
  carrier: string;
  transit_days: number;
  cost: number;
  currency: string;
  carrier_id?: string;
}

export interface RouteOption extends Candidate {
  option_type: RouteOptionType;
  segments: RouteSegment[];
  total_cost: number;
  total_transit_days: number;
  score: number;
  recommended_for?: RouteOptionType[];
  pricing_breakdown?: PricingBreakdown;
}

/**
 * [CTO] Map Adapter Interface
 */
export interface IVirtualMapAdapter {
  getPotentialRoutes(origin: string, dest: string, transportMode?: string): Promise<Omit<RouteOption, 'option_type' | 'score'>[]>;
}

/**
 * [Execution] Mock Map Adapter
 * Provides deterministic scenarios for testing
 */
export class MockMapAdapter implements IVirtualMapAdapter {
  async getPotentialRoutes(origin: string, dest: string, transportMode?: string): Promise<Omit<RouteOption, 'option_type' | 'score'>[]> {
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

  async calculateOptions(origin: string, dest: string, transportMode?: string): Promise<RouteOption[]> {
    const candidates = await this.adapter.getPotentialRoutes(origin, dest, transportMode);
    
    if (candidates.length === 0) return [];

    if (candidates.length === 1) {
      return [{ ...candidates[0], option_type: 'BALANCED', score: 0, recommended_for: ['COST', 'TIME', 'BALANCED'] }];
    }

    const costWinner = selectCostOptimal(candidates);
    const timeWinner = selectTimeOptimal(candidates);
    const balancedResult = await selectBalanced(candidates);
    const balancedScore = typeof balancedResult.score === 'number' ? balancedResult.score : 0;

    const costWinnerId = `${costWinner.total_cost}-${costWinner.total_transit_days}`;
    const timeWinnerId = `${timeWinner.total_cost}-${timeWinner.total_transit_days}`;
    const balancedId = `${balancedResult.candidate.total_cost}-${balancedResult.candidate.total_transit_days}`;

    return candidates.map(c => {
      const id = `${c.total_cost}-${c.total_transit_days}`;
      const recommended_for: RouteOptionType[] = [];
      if (id === costWinnerId) recommended_for.push('COST');
      if (id === timeWinnerId) recommended_for.push('TIME');
      if (id === balancedId) recommended_for.push('BALANCED');
      let option_type: RouteOptionType = 'BALANCED';
      let score = 0;
      if (id === costWinnerId) { option_type = 'COST'; score = c.total_cost; }
      else if (id === timeWinnerId) { option_type = 'TIME'; score = c.total_transit_days; }
      return { ...c, option_type, score, recommended_for };
    });
  }
}

export const routingEngine = new RoutingEngine();
