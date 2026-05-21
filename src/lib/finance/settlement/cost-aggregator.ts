import { getNumericParam } from '../../params/service';

interface CargoDetails {
  total_weight?: number | string;
  total_volume?: number | string;
}

/**
 * cargo_details JSONB 필드를 타입 가드를 사용해 안전하게 파싱합니다.
 */
function parseCargoDetails(cargoDetails: any): CargoDetails {
  if (typeof cargoDetails !== 'object' || cargoDetails === null) {
    return {};
  }
  const result: CargoDetails = {};
  if ('total_weight' in cargoDetails) {
    const weight = cargoDetails.total_weight;
    if (typeof weight === 'number' || typeof weight === 'string') {
      result.total_weight = weight;
    }
  }
  if ('total_volume' in cargoDetails) {
    const volume = cargoDetails.total_volume;
    if (typeof volume === 'number' || typeof volume === 'string') {
      result.total_volume = volume;
    }
  }
  return result;
}

export class CostAggregator {
  /**
   * 화물의 실제 중량과 부피 중량을 비교하여 청구 중량(Chargeable Weight)을 산출합니다.
   */
  async calculateChargeableWeight(order: any): Promise<{
    chargeableWeight: number;
    totalGrossWeight: number;
    totalVolume: number;
  }> {
    let totalGrossWeight = 0;
    let totalVolume = 0;

    if (order.packages && order.packages.length > 0) {
      order.packages.forEach((pkg: any) => {
        totalGrossWeight += Number(pkg.gross_weight || 0);
        totalVolume += Number(pkg.volume || 0);
      });
    } else {
      // packages가 없는 경우 cargo_details(JSONB)에서 안전하게 파싱하여 참조
      const cargo = parseCargoDetails(order.cargo_details);
      totalGrossWeight = Number(cargo.total_weight || 0);
      totalVolume = Number(cargo.total_volume || 0);
    }

    // Volume Weight 계산 (물류 표준 계수 적용)
    // AIR: 1 CBM = 166.67 kg (1:6000 기준)
    // SEA: 1 CBM = 1000 kg (1:1000 기준)
    const seaFactor = await getNumericParam('VOLUME_FACTOR_SEA', 1000);
    const airFactor = await getNumericParam('VOLUME_FACTOR_AIR', 166.67);
    
    const volumeFactor = order.transport_mode === 'SEA' ? seaFactor : airFactor;
    const volumeWeight = totalVolume * volumeFactor;

    // 실제 중량과 부피 중량 중 큰 값을 선택
    const chargeableWeight = Math.max(totalGrossWeight, volumeWeight);

    return { 
      chargeableWeight: Number(chargeableWeight.toFixed(2)), 
      totalGrossWeight, 
      totalVolume 
    };
  }

  /**
   * 미청구 비용 항목들의 총합을 합산합니다.
   */
  calculateTotalAmount(unbilledCosts: any[]): number {
    return unbilledCosts.reduce((sum: number, cost: any) => sum + Number(cost.total_amount), 0);
  }
}
