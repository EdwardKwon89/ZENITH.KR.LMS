/**
 * ZENITH_LMS: Settlement & Finance Engine
 * 
 * 오더의 물류 데이터(중량, 부피, 운송수단)와 요율 카드(Rate Card)를 매칭하여
 * 정산 비용을 산출하고 인보이스를 생성하는 핵심 로직을 담당합니다.
 */

import { createClient } from '@/utils/supabase/server';
import { calculateSlabRate } from '../logistics/rate-engine';

export interface CostCalculationResult {
  success: boolean;
  message?: string;
  chargeableWeight?: number;
  unitPrice?: number;
  totalFreight?: number;
  currency?: string;
  costId?: string;
}

export class SettlementEngine {
  /**
   * 오더의 정산 비용을 계산하고 zen_order_costs에 저장합니다.
   * @param orderId 오더 ID
   */
  async calculateOrderCosts(orderId: string): Promise<CostCalculationResult> {
    try {
      const supabase = await createClient();
      // 1. 오더 정보 조회 (포트 코드 및 패키지 정보 포함)
      const { data: order, error: orderError } = await supabase
        .from('zen_orders')
        .select(`
          *,
          origin_port:zen_ports!origin_port_id(code),
          dest_port:zen_ports!dest_port_id(code),
          packages:zen_order_packages(*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('SettlementEngine: Order not found', orderError);
        return { success: false, message: '오더 정보를 찾을 수 없습니다.' };
      }

      if (!order.origin_port || !order.dest_port || !order.transport_mode) {
        return { success: false, message: '출발지/도착지 또는 운송 모드 정보가 누락되어 정산을 계산할 수 없습니다.' };
      }

      // 2. Chargeable Weight 계산
      const { chargeableWeight } = this.calculateChargeableWeight(order);

      // 3. 요율 매칭 (가장 적합한 Rate Card 검색)
      // 우선순위: 1. 고객 전용 요율(customer_id 매칭), 2. 일반 요율(customer_id IS NULL)
      // 그 중 priority가 높은 것, 최신순
      const { data: rateCard, error: rateError } = await supabase
        .from('zen_rate_cards')
        .select(`
          *,
          tiers:zen_rate_tiers(*)
        `)
        .eq('origin_code', order.origin_port.code)
        .eq('dest_code', order.dest_port.code)
        .eq('mode', order.transport_mode)
        .eq('status', 'ACTIVE')
        .or(`customer_id.eq.${order.shipper_id},customer_id.is.null`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (rateError || !rateCard || rateCard.length === 0) {
        console.warn('SettlementEngine: No matching rate card found for order:', orderId);
        return { success: false, message: '매칭되는 유효한 요율 카드가 없습니다.' };
      }

      // 여러 개가 나올 수 있으므로 고객 전용 요율을 우선 선택
      const bestRate = rateCard.find(r => r.customer_id === order.shipper_id) || rateCard[0];

      // 4. 단가 결정 (슬랩 요율 적용)
      const unitPrice = bestRate.tiers && bestRate.tiers.length > 0
        ? calculateSlabRate(chargeableWeight, bestRate.tiers)
        : Number(bestRate.unit_price);

      const totalFreight = unitPrice * chargeableWeight;

      // 5. 비용 데이터 저장 (기존 FREIGHT 항목이 있으면 삭제 후 재입력)
      await supabase
        .from('zen_order_costs')
        .delete()
        .eq('order_id', orderId)
        .eq('cost_type', 'FREIGHT')
        .is('invoice_id', null); // 인보이스가 이미 발행된 경우 수정 불가

      const { data: costData, error: costInsertError } = await supabase
        .from('zen_order_costs')
        .insert({
          order_id: orderId,
          cost_type: 'FREIGHT',
          unit_price: unitPrice,
          quantity: chargeableWeight,
          currency: bestRate.currency || 'USD',
          is_revenue: true
        })
        .select()
        .single();

      if (costInsertError) {
        throw costInsertError;
      }

      return {
        success: true,
        chargeableWeight,
        unitPrice,
        totalFreight,
        currency: bestRate.currency ?? undefined,
        costId: costData.id
      };
    } catch (err: any) {
      console.error('SettlementEngine Error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 화물의 실제 중량과 부피 중량을 비교하여 청구 중량(Chargeable Weight)을 산출합니다.
   */
  private calculateChargeableWeight(order: any) {
    let totalGrossWeight = 0;
    let totalVolume = 0;

    if (order.packages && order.packages.length > 0) {
      order.packages.forEach((pkg: any) => {
        totalGrossWeight += Number(pkg.gross_weight || 0);
        totalVolume += Number(pkg.volume || 0);
      });
    } else {
      // packages가 없는 경우 cargo_details(JSONB)에서 참조
      totalGrossWeight = Number(order.cargo_details?.total_weight || 0);
      totalVolume = Number(order.cargo_details?.total_volume || 0);
    }

    // Volume Weight 계산 (물류 표준 계수 적용)
    // AIR: 1 CBM = 166.67 kg (1:6000 기준)
    // SEA: 1 CBM = 1000 kg (1:1000 기준)
    const volumeFactor = order.transport_mode === 'SEA' ? 1000 : 166.67;
    const volumeWeight = totalVolume * volumeFactor;

    // 실제 중량과 부피 중량 중 큰 값을 선택
    const chargeableWeight = Math.max(totalGrossWeight, volumeWeight);

    return { 
      chargeableWeight: Number(chargeableWeight.toFixed(2)), 
      totalGrossWeight, 
      totalVolume 
    };
  }
}

export class InvoiceGenerator {
  /**
   * 오더의 정산 완료된 비용들을 기반으로 인보이스를 생성합니다.
   * @param orderId 오더 ID
   */
  async generateInvoice(orderId: string) {
    try {
      const supabase = await createClient();
      // 1. 오더 및 비용 정보 조회
      const { data: order, error: orderError } = await supabase
        .from('zen_orders')
        .select('*, costs:zen_order_costs(*)')
        .eq('id', orderId)
        .single();

      if (orderError || !order) throw new Error('오더를 찾을 수 없습니다.');
      
      if (!order.costs || order.costs.length === 0) {
        // 비용이 계산되지 않았다면 엔진 실행
        const engine = new SettlementEngine();
        const calcResult = await engine.calculateOrderCosts(orderId);
        if (!calcResult.success) throw new Error(calcResult.message || '비용 산출 실패');
        
        // 다시 조회
        const { data: updatedOrder } = await supabase
          .from('zen_orders')
          .select('*, costs:zen_order_costs(*)')
          .eq('id', orderId)
          .single();
        order.costs = updatedOrder?.costs || [];
      }

      // 2. 총액 합산 (이미 인보이스에 포함된 비용은 제외)
      const unbilledCosts = order.costs.filter((c: any) => !c.invoice_id);
      if (unbilledCosts.length === 0) {
        throw new Error('이미 모든 비용이 인보이스에 포함되었습니다.');
      }

      if (!order.shipper_id) throw new Error('오더에 송하인 정보가 없어 인보이스를 생성할 수 없습니다.');

      const totalAmount = unbilledCosts.reduce((sum: number, cost: any) => sum + Number(cost.total_amount), 0);
      const currency = unbilledCosts[0].currency;

      // 3. 인보이스 번호 생성 (규칙: INV-YYYYMMDD-Random)
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNo = `INV-${today}-${randomSuffix}`;
      
      // 4. 인보이스 레코드 생성
      const { data: invoice, error: invError } = await supabase
        .from('zen_invoices')
        .insert({
          invoice_no: invoiceNo,
          shipper_id: order.shipper_id,
          total_amount: totalAmount,
          currency: currency,
          status: 'UNPAID',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { 
            source_order_id: orderId, 
            order_no: order.order_no 
          }
        })
        .select()
        .single();

      if (invError) throw invError;

      // 5. 비용들에 invoice_id 연결
      await supabase
        .from('zen_order_costs')
        .update({ invoice_id: invoice.id })
        .in('id', unbilledCosts.map((c: any) => c.id));

      // 6. 오더 상태 업데이트 (정산 상태)
      await supabase
        .from('zen_orders')
        .update({ billing_status: 'INVOICED' })
        .eq('id', orderId);

      return { success: true, invoice };
    } catch (err: any) {
      console.error('InvoiceGenerator Error:', err);
      return { success: false, message: err.message };
    }
  }
}
