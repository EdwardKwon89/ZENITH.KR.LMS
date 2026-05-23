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
                    tiers: [
                      { weight_min: 0, unit_price: 5.5 },
                      { weight_min: 100, unit_price: 4.8 }
                    ],
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
  });
});

