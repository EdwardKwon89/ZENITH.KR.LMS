import { describe, it, expect } from 'vitest';
import { calculateChargeableWeight, estimateFreightCost, FreightCalcInput } from '../../../src/utils/logistics/freight-calculator';

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
    it('should calculate correct Air Freight cost', () => {
      const input: FreightCalcInput = { weight: 100, volume: 1, mode: 'AIR' };
      // Chargeable: 167kg, Rate: $5.5 -> $918.5
      expect(estimateFreightCost(input)).toBeCloseTo(918.5, 1);
    });

    it('should calculate correct Sea Freight cost', () => {
      const input: FreightCalcInput = { weight: 500, volume: 2, mode: 'SEA' };
      // Chargeable: 2.0 R.T, Rate: $120.0 -> $240.0
      expect(estimateFreightCost(input)).toBe(240);
    });
  });
});
