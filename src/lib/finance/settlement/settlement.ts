import { logger } from '@/lib/logger';
import { createAdminClient } from '@/utils/supabase/server';
import { SlabRateCalculator } from './slab-rate-calculator';
import { CostAggregator } from './cost-aggregator';
import { SettlementValidator } from './settlement-validator';

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
  private slabRateCalculator = new SlabRateCalculator();
  private costAggregator = new CostAggregator();
  private settlementValidator = new SettlementValidator();

  /**
   * 오더의 정산 비용을 계산하고 zen_order_costs에 저장합니다.
   * @param orderId 오더 ID
   */
  async calculateOrderCosts(orderId: string): Promise<CostCalculationResult> {
    try {
      const supabase = await createAdminClient();
      
      // 1. 오더 정보 조회
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
        logger.error('[Settlement] Order not found:', orderId, orderError);
        return { success: false, message: '오더 정보를 찾을 수 없습니다.' };
      }

      logger.info(`[Settlement] Order Loaded: ${order.order_no} (${order.origin_port?.code} -> ${order.dest_port?.code}, ${order.transport_mode})`);
      logger.info(`[Settlement] Shipper ID: ${order.shipper_id}, Type: ${typeof order.shipper_id}`);
      
      // UUID가 배열(byte array)로 들어오는 경우 문자열로 변환
      let shipperIdStr = order.shipper_id;
      if (Array.isArray(order.shipper_id)) {
        shipperIdStr = Buffer.from(order.shipper_id).toString('hex');
        shipperIdStr = `${shipperIdStr.slice(0, 8)}-${shipperIdStr.slice(8, 12)}-${shipperIdStr.slice(12, 16)}-${shipperIdStr.slice(16, 20)}-${shipperIdStr.slice(20)}`;
      }

      // 오더 정산 유효성 검증
      const validation = this.settlementValidator.validateOrder(order);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

      // 2. Chargeable Weight 계산
      const { chargeableWeight } = await this.costAggregator.calculateChargeableWeight(order);
      logger.info(`[Settlement] Chargeable Weight: ${chargeableWeight}kg`);

      // 3. 요율 매칭 (가장 적합한 Rate Card 검색)
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
        .or(`customer_id.eq.${shipperIdStr},customer_id.is.null`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (rateError || !rateCard || rateCard.length === 0) {
        logger.warn(`[Settlement] No matching rate card found for ${order.origin_port.code}->${order.dest_port.code} (${order.transport_mode}). Error: ${rateError?.message}`);
        return { success: false, message: '매칭되는 유효한 요율 카드가 없습니다.' };
      }

      logger.info(`[Settlement] Found ${rateCard.length} potential rate cards`);
      const bestRate = rateCard.find(r => r.customer_id === shipperIdStr) || rateCard[0];
      logger.info(`[Settlement] Selected Best Rate: ID=${bestRate.id}`);

      // 4. 단가 결정 (슬랩 요율 적용)
      const unitPrice = this.slabRateCalculator.calculateUnitPrice(bestRate, chargeableWeight);
      logger.info(`[Settlement] Calculated Unit Price: ${unitPrice}`);

      const totalFreight = unitPrice * chargeableWeight;
      logger.info(`[Settlement] Calculation Success: ${unitPrice} * ${chargeableWeight} = ${totalFreight} ${bestRate.currency}`);

      // 5. 비용 데이터 저장 (멱등성 처리)
      const { data: existingCosts, error: costSelectError } = await supabase
        .from('zen_order_costs')
        .select('id, invoice_id')
        .eq('order_id', orderId)
        .eq('cost_type', 'FREIGHT');

      if (costSelectError) {
        throw costSelectError;
      }

      // 재계산 검증
      this.settlementValidator.validateRecalculation(existingCosts);

      const unbilledCost = existingCosts?.find(c => c.invoice_id === null);
      let costData;

      if (unbilledCost) {
        // 이미 청구되지 않은 비용 레코드가 존재하면 업데이트 (멱등성 보장)
        const { data: updatedCost, error: costUpdateError } = await supabase
          .from('zen_order_costs')
          .update({
            unit_price: unitPrice,
            quantity: chargeableWeight,
            currency: bestRate.currency || 'USD',
            is_revenue: true
          })
          .eq('id', unbilledCost.id)
          .select()
          .single();

        if (costUpdateError) {
          throw costUpdateError;
        }
        costData = updatedCost;
      } else {
        // 존재하지 않으면 새로 생성
        const { data: insertedCost, error: costInsertError } = await supabase
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
        costData = insertedCost;
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
      logger.error('SettlementEngine Error:', err);
      return { success: false, message: err.message };
    }
  }
}
