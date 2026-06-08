import { describe, it, expect } from 'vitest';
import { calculateChargeableWeight, estimateFreightCost, FreightCalcInput } from '../../../src/utils/logistics/freight-calculator';
import { calculateCompositePricing } from '../../../src/lib/logistics/composite-pricing';

describe('Freight Calculator Utility', () => {
  
  describe('calculateChargeableWeight', () => {
    it('should use Actual Weight when it is greater than Volume Weight (AIR)', () => {
      const input: FreightCalcInput = { weight: 500, volume: 1, mode: 'AIR' };
      // 1 CBM * 167 = 167kg < 500kg
      expect(calculateChargeableWeight(input)).toBe(500);
    });

    it('should use Volume Weight when it is greater than Actual Weight (AIR)', () => {
      const input: FreightCalcInput = { weight: 100, volume: 2, mode: 'AIR' };
      // 2 CBM * 167 = 334kg > 100kg
      expect(calculateChargeableWeight(input)).toBe(334);
    });

    it('should calculate Revenue Ton (R.T) correctly for Sea Freight', () => {
      // 2 CBM, 500kg -> 2.0 R.T
      expect(calculateChargeableWeight({ weight: 500, volume: 2, mode: 'SEA' })).toBe(2);
      
      // 1 CBM, 1500kg -> 1.5 R.T
      expect(calculateChargeableWeight({ weight: 1500, volume: 1, mode: 'SEA' })).toBe(1.5);
    });
  });

  describe('estimateFreightCost', () => {
    it('should calculate correct Air Freight cost (Sync Fallback)', () => {
      const input: FreightCalcInput = { weight: 100, volume: 1, mode: 'AIR' };
      // Chargeable: 167kg, Rate: $5.5 -> $918.5
      expect(estimateFreightCost(input)).toBeCloseTo(918.5, 1);
    });

    it('should calculate correct Sea Freight cost (Sync Fallback)', () => {
      const input: FreightCalcInput = { weight: 500, volume: 2, mode: 'SEA' };
      // Chargeable: 2.0 R.T, Rate: $120.0 -> $240.0
      expect(estimateFreightCost(input)).toBe(240);
    });
  });

  describe('calculateCompositePricing (DB Mock Integration)', () => {
    it('should calculate base freight and multiple surcharges correctly from mock tables', async () => {
      const mockSupabase = {
        from: (table: string) => {
          const chain = {
            select: () => chain,
            eq: () => chain,
            lte: () => chain,
            or: () => chain,
            order: () => chain,
            limit: () => chain,
            maybeSingle: async () => {
              if (table === 'zen_rate_cards') {
                return {
                  data: {
                    tiers: {
                      weight_slabs: [
                        { weight_min: 0, unit_price: 5.5 },
                        { weight_min: 100, unit_price: 4.8 }
                      ],
                      cbm_slabs: [{ cbm_min: 0, cbm_price: 0, min_charge: 0 }]
                    },
                    currency: 'USD'
                  },
                  error: null
                };
              }
              return { data: null, error: null };
            },
            then: (resolve: any) => {
              if (table === 'zen_surcharges') {
                return Promise.resolve(
                  resolve({
                    data: [
                      { surcharge_type: 'FSC', rate_type: 'PERCENT', amount: 15.0, currency: 'USD' },
                      { surcharge_type: 'SSC', rate_type: 'FLAT', amount: 50.0, currency: 'USD' }
                    ],
                    error: null
                  })
                );
              }
              return Promise.resolve(resolve({ data: [], error: null }));
            }
          };
          return chain;
        }
      } as any;

      const result = await calculateCompositePricing({
        weight: 100,
        volume: 1,
        transport_mode: 'AIR',
        carrier_id: 'mock-carrier-id',
        supabase: mockSupabase
      });

      // chargeableWeight: 167
      // baseFreight: 167 * 4.8 = 801.6
      // FSC (PERCENT 15%): 801.6 * 0.15 = 120.24
      // SSC (FLAT): 50.0
      // total: 801.6 + 120.24 + 50.0 = 971.84
      expect(result.baseFreight).toBeCloseTo(801.6, 2);
      expect(result.surcharges.find(s => s.surcharge_type === 'FSC')?.calculated_amount).toBeCloseTo(120.24, 2);
      expect(result.surcharges.find(s => s.surcharge_type === 'SSC')?.calculated_amount).toBe(50);
      expect(result.total).toBeCloseTo(971.84, 2);
    });

    it('should calculate composite pricing for a multi-leg route option (Hub Route) and handle missing rate card fallback', async () => {
      const mockSupabase = {
        from: (table: string) => {
          const chain = {
            select: () => chain,
            eq: (field: string, val: any) => {
              if (field === 'carrier_id') {
                (chain as any).currentCarrier = val;
              }
              return chain;
            },
            lte: () => chain,
            or: () => chain,
            order: () => chain,
            limit: () => chain,
            currentCarrier: '',
            maybeSingle: async () => {
              if (table === 'zen_rate_cards') {
                if ((chain as any).currentCarrier === 'carrier-1') {
                  return {
                      data: {
                        tiers: {
                          weight_slabs: [{ weight_min: 0, unit_price: 10.0 }],
                          cbm_slabs: [{ cbm_min: 0, cbm_price: 0, min_charge: 0 }]
                        },
                        currency: 'USD'
                      },
                    error: null
                  };
                }
              }
              return { data: null, error: null };
            },
            then: (resolve: any) => {
              if (table === 'zen_surcharges') {
                if ((chain as any).currentCarrier === 'carrier-1') {
                  return Promise.resolve(
                    resolve({
                      data: [
                        { surcharge_type: 'FSC', rate_type: 'FLAT', amount: 30.0, currency: 'USD' }
                      ],
                      error: null
                    })
                  );
                }
              }
              return Promise.resolve(resolve({ data: [], error: null }));
            }
          };
          return chain;
        }
      } as any;

      const routeOption = {
        option_type: 'COST',
        segments: [
          // 1st Leg: carrier_id가 있고 rate_card 매칭됨
          {
            transport_mode: 'AIR',
            from_port_id: 'ICN',
            to_port_id: 'HKG',
            carrier: 'Zenith Air',
            carrier_id: 'carrier-1',
            transit_days: 1,
            cost: 0,
            currency: 'USD'
          },
          // 2nd Leg: carrier_id가 있으나 rate_card 매칭 안 되어 fallback 발생
          {
            transport_mode: 'SEA',
            from_port_id: 'HKG',
            to_port_id: 'SIN',
            carrier: 'Zenith Sea',
            carrier_id: 'carrier-2',
            transit_days: 4,
            cost: 150,
            currency: 'USD'
          },
          // 3rd Leg: carrier_id가 없어 즉시 fallback
          {
            transport_mode: 'LAND',
            from_port_id: 'SIN',
            to_port_id: 'Hub',
            carrier: 'Local Truck',
            transit_days: 1,
            cost: 50,
            currency: 'USD'
          }
        ],
        total_cost: 0,
        total_transit_days: 6,
        score: 0
      } as any;

      const result = await calculateCompositePricing({
        weight: 10,
        volume: 0.05,
        supabase: mockSupabase,
        routeOption
      });

      // 1st Leg: ChargeableWeight = 10, baseFreight = 10 * 10 = 100, FSC = 30 -> 130
      // 2nd Leg: rate_card 없음 -> segment.cost인 150 유지
      // 3rd Leg: carrier_id 없음 -> segment.cost인 50 유지
      // totalBaseFreight = 100 (leg1) + 150 (leg2 fallback) + 50 (leg3 fallback) = 300
      // totalSurcharge = 30
      // total = 130 + 150 + 50 = 330
      expect(result.baseFreight).toBe(300);
      expect(result.total).toBe(330);
      expect(routeOption.segments[0].cost).toBe(130);
      expect(routeOption.segments[1].cost).toBe(150);
      expect(routeOption.segments[2].cost).toBe(50);
      expect(routeOption.total_cost).toBe(330);
    });
  });
});

