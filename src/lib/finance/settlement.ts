/**
 * ZENITH_LMS: Settlement & Finance Engine
 * 
 * 오더의 물류 데이터(중량, 부피, 운송수단)와 요율 카드(Rate Card)를 매칭하여
 * 정산 비용을 산출하고 인보이스를 생성하는 핵심 로직을 담당합니다.
 */

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { calculateSlabRate } from '../logistics/rate-engine';
import { getNumericParam } from '../params/service';

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
      const supabase = await createAdminClient();
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
        console.error('[Settlement] Order not found:', orderId, orderError);
        return { success: false, message: '오더 정보를 찾을 수 없습니다.' };
      }

      console.log(`[Settlement] Order Loaded: ${order.order_no} (${order.origin_port?.code} -> ${order.dest_port?.code}, ${order.transport_mode})`);
      console.log(`[Settlement] Shipper ID: ${order.shipper_id}, Type: ${typeof order.shipper_id}`);
      
      // UUID가 배열(byte array)로 들어오는 경우 문자열로 변환
      let shipperIdStr = order.shipper_id;
      if (Array.isArray(order.shipper_id)) {
        shipperIdStr = Buffer.from(order.shipper_id).toString('hex');
        // UUID 형식(8-4-4-4-12)으로 변환이 필요한 경우 처리 (여기서는 단순 비교를 위해 우선 유지 또는 보정)
        shipperIdStr = `${shipperIdStr.slice(0, 8)}-${shipperIdStr.slice(8, 12)}-${shipperIdStr.slice(12, 16)}-${shipperIdStr.slice(16, 20)}-${shipperIdStr.slice(20)}`;
      }

      if (!order.origin_port || !order.dest_port || !order.transport_mode) {
        return { success: false, message: '출발지/도착지 또는 운송 모드 정보가 누락되어 정산을 계산할 수 없습니다.' };
      }

      // 2. Chargeable Weight 계산
      const { chargeableWeight } = await this.calculateChargeableWeight(order);
      console.log(`[Settlement] Chargeable Weight: ${chargeableWeight}kg`);

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
        .or(`customer_id.eq.${shipperIdStr},customer_id.is.null`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (rateError || !rateCard || rateCard.length === 0) {
        console.warn(`[Settlement] No matching rate card found for ${order.origin_port.code}->${order.dest_port.code} (${order.transport_mode}). Error: ${rateError?.message}`);
        return { success: false, message: '매칭되는 유효한 요율 카드가 없습니다.' };
      }

      console.log(`[Settlement] Found ${rateCard.length} potential rate cards`);
      console.log(`[Settlement] Order Shipper ID: ${order.shipper_id}`);
      rateCard.forEach((r, idx) => {
        console.log(`[Settlement] Rate Card ${idx}: ID=${r.id}, Customer=${r.customer_id}, Priority=${r.priority}`);
      });

      // 여러 개가 나올 수 있으므로 고객 전용 요율을 우선 선택
      const bestRate = rateCard.find(r => r.customer_id === shipperIdStr) || rateCard[0];
      console.log(`[Settlement] Selected Best Rate: ID=${bestRate.id}`);

      // 4. 단가 결정 (슬랩 요율 적용)
      console.log(`[Settlement] Raw Unit Price from DB:`, bestRate.unit_price, `Type:`, typeof bestRate.unit_price);
      const unitPrice = bestRate.tiers && bestRate.tiers.length > 0
        ? calculateSlabRate(chargeableWeight, bestRate.tiers)
        : (typeof bestRate.unit_price === 'object' && bestRate.unit_price !== null && 'Int' in bestRate.unit_price 
            ? Number(bestRate.unit_price.Int) * Math.pow(10, bestRate.unit_price.Exp)
            : Number(bestRate.unit_price));
      
      console.log(`[Settlement] Calculated Unit Price: ${unitPrice}`);

      const totalFreight = unitPrice * chargeableWeight;
      console.log(`[Settlement] Calculation Success: ${unitPrice} * ${chargeableWeight} = ${totalFreight} ${bestRate.currency}`);

      // 5. 비용 데이터 저장 (멱등성 처리)
      const { data: existingCosts, error: costSelectError } = await supabase
        .from('zen_order_costs')
        .select('id, invoice_id')
        .eq('order_id', orderId)
        .eq('cost_type', 'FREIGHT');

      if (costSelectError) {
        throw costSelectError;
      }

      const unbilledCost = existingCosts?.find(c => c.invoice_id === null);
      const billedCost = existingCosts?.find(c => c.invoice_id !== null);

      if (billedCost) {
        throw new Error('Cannot recalculate costs after invoice has been issued.');
      }

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
      console.error('SettlementEngine Error:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 화물의 실제 중량과 부피 중량을 비교하여 청구 중량(Chargeable Weight)을 산출합니다.
   */
  private async calculateChargeableWeight(order: any) {
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
}

export class InvoiceGenerator {
  /**
   * 오더의 정산 완료된 비용들을 기반으로 인보이스를 생성합니다.
   * @param orderId 오더 ID
   */
  async generateInvoice(orderId: string) {
    try {
      const supabase = await createAdminClient();
      // 1. 오더 및 비용 정보 조회
      const { data: order, error: orderError } = await supabase
        .from('zen_orders')
        .select('*, costs:zen_order_costs(*)')
        .eq('id', orderId)
        .single();

      if (orderError || !order) throw new Error('오더를 찾을 수 없습니다.');
      
      // UUID가 배열(byte array)로 들어오는 경우 문자열로 변환
      let shipperIdStr = order.shipper_id;
      if (Array.isArray(order.shipper_id)) {
        shipperIdStr = Buffer.from(order.shipper_id).toString('hex');
        shipperIdStr = `${shipperIdStr.slice(0, 8)}-${shipperIdStr.slice(8, 12)}-${shipperIdStr.slice(12, 16)}-${shipperIdStr.slice(16, 20)}-${shipperIdStr.slice(20)}`;
      }

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
      const exchangeRate = await getNumericParam('EXCHANGE_RATE_USD_KRW', 1350);
      
      const { data: invoice, error: invError } = await supabase
        .from('zen_invoices')
        .insert({
          invoice_no: invoiceNo,
          shipper_id: shipperIdStr,
          total_amount: totalAmount,
          currency: currency,
          applied_exchange_rate: exchangeRate,
          status: 'UNPAID',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { 
            source_order_id: orderId, 
            order_no: order.order_no,
            rate_snapshot: {
              exchange_rate: exchangeRate,
              is_fallback: exchangeRate === 1350 // 간단한 체크
            }
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
