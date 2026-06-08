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

      // 2a. 운송수단별 요금 산정 정책 조회 (IMP-105)
      const { data: pricingPolicy } = await supabase
        .from('zen_transport_pricing_policies')
        .select('pricing_method, volumetric_divisor')
        .eq('transport_mode', order.transport_mode)
        .maybeSingle();

      const policyMethod = pricingPolicy?.pricing_method || 'WEIGHT_ONLY';
      const volumetricDivisor = pricingPolicy?.volumetric_divisor || 6000;

      // 2b. Chargeable Weight 계산 (정책 기반)
      const { chargeableWeight, totalGrossWeight, totalVolume } = await this.costAggregator.calculateChargeableWeight(order);

      let effectiveChargeableWeight = chargeableWeight;
      if (policyMethod === 'VOLUMETRIC' && totalVolume > 0) {
        const volumeWeight = (totalVolume * 1000000.0) / volumetricDivisor;
        effectiveChargeableWeight = Math.max(totalGrossWeight, volumeWeight);
      } else if (policyMethod === 'WEIGHT_ONLY' || policyMethod === 'WM') {
        effectiveChargeableWeight = totalGrossWeight;
      }

      logger.info(`[Settlement] Chargeable Weight: ${effectiveChargeableWeight}kg (${policyMethod})`);

      // 3. 비용 데이터 저장 (멱등성 처리) - 기존 미청구 비용 목록 및 인보이스 상태 확인을 위해 먼저 로드
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

      // 4. 적용된 경로 옵션 확인 (IMP-070)
      const { data: route, error: routeError } = await supabase
        .from('zen_order_routes')
        .select(`
          selected_option_id,
          selected_option:zen_route_options(id, segments, total_cost, total_transit_days, option_type)
        `)
        .eq('order_id', orderId)
        .maybeSingle();

      if (routeError) {
        logger.error('[Settlement] Route query error:', routeError);
      }

      const selectedOption = route?.selected_option as any;
      const segments = selectedOption?.segments;

      let costId: string | undefined;
      let totalFreight: number;
      let calculatedUnitPrice: number | undefined;
      let finalCurrency: string;

      if (selectedOption && Array.isArray(segments) && segments.length > 0) {
        logger.info(`[Settlement] Routing option found: ${route.selected_option_id}`);
        
        // 멱등성 보장: 기존 미청구 FREIGHT 항목 삭제
        const { error: deleteError } = await supabase
          .from('zen_order_costs')
          .delete()
          .eq('order_id', orderId)
          .eq('cost_type', 'FREIGHT');

        if (deleteError) {
          throw deleteError;
        }

        const carriers = segments.map((s: any) => s.carrier).filter(Boolean);
        const uniqueCarriers = new Set(carriers);
        const isSingleCarrier = uniqueCarriers.size === 1;

        totalFreight = segments.reduce((sum: number, s: any) => sum + Number(s.cost || 0), 0);
        finalCurrency = segments[0]?.currency || 'USD';

        if (isSingleCarrier) {
          logger.info(`[Settlement] Single carrier detected: ${carriers[0]}`);
          const unitPrice = totalFreight / (effectiveChargeableWeight || 1);
          calculatedUnitPrice = unitPrice;

          const { data: insertedCost, error: costInsertError } = await supabase
            .from('zen_order_costs')
            .insert({
              order_id: orderId,
              cost_type: 'FREIGHT',
              unit_price: unitPrice,
              quantity: effectiveChargeableWeight,
              currency: finalCurrency,
              is_revenue: true,
              route_option_id: route.selected_option_id,
              carrier: carriers[0],
              segment_index: null
            })
            .select()
            .single();

          if (costInsertError) {
            throw costInsertError;
          }
          costId = insertedCost.id;
        } else {
          logger.info(`[Settlement] Multi-carrier detected. Segment count: ${segments.length}`);
          const insertPayloads = segments.map((seg: any, idx: number) => ({
            order_id: orderId,
            cost_type: 'FREIGHT',
            unit_price: Number(seg.cost || 0),
            quantity: 1,
            currency: seg.currency || 'USD',
            is_revenue: true,
            route_option_id: route.selected_option_id,
            carrier: seg.carrier,
            segment_index: idx
          }));

          const { data: insertedCosts, error: costInsertError } = await supabase
            .from('zen_order_costs')
            .insert(insertPayloads)
            .select();

          if (costInsertError || !insertedCosts || insertedCosts.length === 0) {
            throw costInsertError || new Error('다중 캐리어 비용 삽입 실패');
          }
          costId = insertedCosts[0].id;
        }
      } else {
        logger.info('[Settlement] No selected route option. Falling back to Rate Cards.');
        
        // 요율 매칭 (가장 적합한 Rate Card 검색) - Fallback 시에만 실행
        const { data: rateCard, error: rateError } = await supabase
          .from('zen_rate_cards')
          .select('*')
          .eq('origin_port_id', order.origin_port_id)
          .eq('dest_port_id', order.dest_port_id)
          .eq('transport_mode', order.transport_mode)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (rateError || !rateCard || rateCard.length === 0) {
          logger.warn(`[Settlement] No matching rate card found for ${order.origin_port?.code}->${order.dest_port?.code} (${order.transport_mode}). Error: ${rateError?.message}`);
          return { success: false, message: '매칭되는 유효한 요율 카드가 없습니다.' };
        }

        logger.info(`[Settlement] Found ${rateCard.length} potential rate cards`);
        const bestRate = rateCard[0];
        logger.info(`[Settlement] Selected Best Rate: ID=${bestRate.id}`);

        const unitPrice = this.slabRateCalculator.calculateUnitPrice(bestRate, effectiveChargeableWeight);
        calculatedUnitPrice = unitPrice;

        if (policyMethod === 'WM') {
          const totalVolume = await this.getTotalCbm(orderId, supabase);
          const weightCost = totalGrossWeight * unitPrice;
          const cbmPrice = this.getCbmPriceFromCbmSlabs(bestRate.tiers?.cbm_slabs, totalVolume);
          const cbmCost = totalVolume * (cbmPrice || 0);
          totalFreight = Math.max(weightCost, cbmCost);
          effectiveChargeableWeight = totalGrossWeight;
        } else {
          totalFreight = unitPrice * effectiveChargeableWeight;
        }
        finalCurrency = bestRate.currency || 'USD';

        const unbilledCost = existingCosts?.find(c => c.invoice_id === null);

        if (unbilledCost) {
          const { data: updatedCost, error: costUpdateError } = await supabase
            .from('zen_order_costs')
            .update({
              unit_price: calculatedUnitPrice || unitPrice,
              quantity: effectiveChargeableWeight,
              currency: finalCurrency,
              is_revenue: true,
              route_option_id: null,
              carrier: null,
              segment_index: null
            })
            .eq('id', unbilledCost.id)
            .select()
            .single();

          if (costUpdateError) {
            throw costUpdateError;
          }
          costId = updatedCost.id;
        } else {
          const { data: insertedCost, error: costInsertError } = await supabase
            .from('zen_order_costs')
            .insert({
              order_id: orderId,
              cost_type: 'FREIGHT',
              unit_price: calculatedUnitPrice || unitPrice,
              quantity: effectiveChargeableWeight,
              currency: finalCurrency,
              is_revenue: true,
              route_option_id: null,
              carrier: null,
              segment_index: null
            })
            .select()
            .single();

          if (costInsertError) {
            throw costInsertError;
          }
          costId = insertedCost.id;
        }
      }

      return {
        success: true,
        chargeableWeight: effectiveChargeableWeight,
        unitPrice: calculatedUnitPrice,
        totalFreight,
        currency: finalCurrency,
        costId
      };
    } catch (err: any) {
      logger.error('SettlementEngine Error:', err);
      return { success: false, message: err.message };
    }
  }

  private async getTotalCbm(orderId: string, supabase: any): Promise<number> {
    const { data: packages } = await supabase
      .from('zen_order_packages')
      .select('volume')
      .eq('order_id', orderId);
    if (!packages) return 0;
    return packages.reduce((sum: number, p: any) => sum + Number(p.volume || 0), 0);
  }

  private getCbmPriceFromCbmSlabs(cbmSlabs: any, cbm: number): number | null {
    if (!Array.isArray(cbmSlabs)) return null;
    let matched = null;
    for (const s of cbmSlabs) {
      if (cbm >= Number(s.cbm_min || 0)) {
        matched = s;
      }
    }
    if (matched && matched.cbm_price !== undefined && matched.cbm_price !== null) {
      return Number(matched.cbm_price);
    }
    return null;
  }
}
