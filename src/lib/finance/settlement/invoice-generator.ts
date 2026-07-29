import { logger } from '@/lib/logger';
import { createAdminClient } from '@/utils/supabase/server';
import { getNumericParam } from '../../params/service';
import { SettlementEngine } from './settlement';
import { CostAggregator } from './cost-aggregator';

export class InvoiceGenerator {
  private costAggregator = new CostAggregator();

  /**
   * 오더의 정산 완료된 비용들을 기반으로 인보이스를 생성합니다.
   * @param orderId 오더 ID
   */
  async generateInvoice(orderId: string) {
    try {
      const supabase = await createAdminClient();

      // 0. 정산 마감 여부 확인 — 마감 후 인보이스 생성 차단
      const { data: existingFinalized } = await supabase
        .from('zen_invoices')
        .select('id')
        .eq('is_finalized', true)
        .filter('metadata->>source_order_id', 'eq', orderId)
        .neq('status', 'CANCELED')
        .maybeSingle();

      if (existingFinalized) {
        throw new Error('이미 정산이 마감된 오더입니다. 새 인보이스를 생성할 수 없습니다.');
      }

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

      const totalAmount = this.costAggregator.calculateTotalAmount(unbilledCosts);
      const currency = unbilledCosts[0].currency;

      // 3. 인보이스 번호 생성 (규칙: INV-YYYYMMDD-Random)
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = () => Math.floor(1000 + Math.random() * 9000);

      // 4. 기존 인보이스 (shipper 대상) — invoice_tier / billed_org_id 추가
      const exchangeRate = await getNumericParam('EXCHANGE_RATE_USD_KRW', 1350);
      const invoiceTier = order.agency_org_id ? 'AGENCY_TO_SHIPPER' : 'ADMIN_TO_SHIPPER';

      const { data: invoice, error: invError } = await supabase
        .from('zen_invoices')
        .insert({
          invoice_no: `INV-${today}-${randomSuffix()}`,
          shipper_id: shipperIdStr,
          billed_org_id: shipperIdStr,
          invoice_tier: invoiceTier,
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
              is_fallback: exchangeRate === 1350
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

      // 6. admin→agency 인보이스 생성 (agency_org_id가 있는 경우에만)
      let agencyInvoice: any = null;
      if (order.agency_org_id) {
        const { data: rateSnapshot } = await supabase
          .from('zen_order_rate_snapshots')
          .select('metadata')
          .eq('order_id', orderId)
          .maybeSingle();

        if (rateSnapshot?.metadata) {
          const meta = rateSnapshot.metadata as Record<string, any>;
          const platform = meta.platform || {};
          const agencyCurrency = platform.currency || 'USD';
          const baseFreight = Number(platform.baseSellingPrice) || 0;
          const fuelSurcharge = Number(platform.fuelSurchargeSellingAmount) || 0;
          const surgeFee = Number(platform.surgeFeeSellingAmount) || 0;
          const otherCharges = Number(platform.otherChargesSellingTotal) || 0;
          const platformTotal = baseFreight + fuelSurcharge + surgeFee + otherCharges;

          const agencyCostPrice = Number(meta.agency?.agencyCostPrice);
          const agencyBilledTotal = Number.isFinite(agencyCostPrice) && agencyCostPrice > 0
            ? agencyCostPrice
            : platformTotal;

          const { data: agencyInv, error: agencyInvError } = await supabase
            .from('zen_invoices')
            .insert({
              invoice_no: `INV-${today}-${randomSuffix()}`,
              shipper_id: shipperIdStr,
              billed_org_id: order.agency_org_id,
              invoice_tier: 'ADMIN_TO_AGENCY',
              total_amount: agencyBilledTotal,
              currency: agencyCurrency,
              applied_exchange_rate: exchangeRate,
              status: 'UNPAID',
              due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              metadata: {
                source_order_id: orderId,
                order_no: order.order_no,
                platform_breakdown: { baseFreight, fuelSurcharge, surgeFee, otherCharges },
              },
            })
            .select()
            .single();

          if (agencyInvError) throw agencyInvError;
          agencyInvoice = agencyInv;
        }
      }

      // 7. 오더 상태 업데이트 (정산 상태)
      await supabase
        .from('zen_orders')
        .update({ billing_status: 'INVOICED' })
        .eq('id', orderId);

      return { success: true, invoice, agencyInvoice };
    } catch (err: any) {
      logger.error('InvoiceGenerator Error:', err);
      return { success: false, message: err.message };
    }
  }
}
