/**
 * 📦 Freight Calculator Utility (ZEN_A4 Standard)
 * 물류 표준 Chargeable Weight 산출 및 예상 운임 계산 엔진
 */

export type TransportMode = 'AIR' | 'SEA' | 'EXP' | 'LAND';

export interface FreightCalcInput {
  weight: number;      // Actual Weight (kg)
  volume: number;      // Total Volume (CBM)
  mode: TransportMode;
}

// 📐 가변 요율 정의 (향후 DB 연동 대상으로, 현재는 비즈니스 정책 기반 더미값 사용)
const DUMMY_RATES = {
  AIR: 5.5,   // $ per kg
  EXP: 9.0,   // $ per kg
  SEA: 120.0, // $ per CBM (LCL 기본)
  LAND: 2500, // $ per container/truck (Flat - 예시)
};

/**
 * Chargeable Weight 산출 로직
 * - AIR/EXP: 1 CBM = 167kg (Standard Factor 6000)
 * - SEA: 1 CBM = 1,000kg (하지만 해상은 대개 CBM과 중량 중 큰 값을 R.T로 사용)
 */
export function calculateChargeableWeight(input: FreightCalcInput): number {
  const { weight, volume, mode } = input;

  switch (mode) {
    case 'AIR':
    case 'EXP':
      const volWeight = volume * 167; // IATA Standard
      return Math.max(weight, volWeight);
    
    case 'SEA':
      // 해상 LCL의 경우 대개 1 CBM이 기준이나, 중량이 1,000kg를 넘으면 중량을 CBM으로 환산(1000kg = 1CBM)하여 비교
      const seaWeightAsCbm = weight / 1000;
      return Math.max(volume, seaWeightAsCbm); // Revenue Ton (R.T) 개념

    case 'LAND':
    default:
      return weight;
  }
}

/**
 * 예상 운임(Estimated Freight) 계산
 */
export function estimateFreightCost(input: FreightCalcInput): number {
  const chargeable = calculateChargeableWeight(input);
  const mode = input.mode;

  if (mode === 'SEA') {
    // 해상은 R.T(Chargeable Volume) 기준 단가 적용
    return chargeable * DUMMY_RATES.SEA;
  }

  // 항공, 특송 등은 중량 기준 단가 적용
  const rate = DUMMY_RATES[mode] || 0;
  return chargeable * rate;
}
