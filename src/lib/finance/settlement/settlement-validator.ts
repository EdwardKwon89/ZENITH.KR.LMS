export class SettlementValidator {
  /**
   * 오더의 필수 정산 데이터 존재 여부를 검증합니다.
   */
  validateOrder(order: any): { isValid: boolean; message?: string } {
    if (!order.origin_port || !order.dest_port || !order.transport_mode) {
      return { 
        isValid: false, 
        message: '출발지/도착지 또는 운송 모드 정보가 누락되어 정산을 계산할 수 없습니다.' 
      };
    }
    return { isValid: true };
  }

  /**
   * 이미 인보이스가 청구된 비용이 있는 경우 재계산을 방지합니다.
   */
  validateRecalculation(existingCosts: any[] | null): void {
    const billedCost = existingCosts?.find(c => c.invoice_id !== null);
    if (billedCost) {
      throw new Error('Cannot recalculate costs after invoice has been issued.');
    }
  }
}
