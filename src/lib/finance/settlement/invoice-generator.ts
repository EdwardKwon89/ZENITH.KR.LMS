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

      // 6. 오더 상태 업데이트 (정산 상태)
      await supabase
        .from('zen_orders')
        .update({ billing_status: 'INVOICED' })
        .eq('id', orderId);

      return { success: true, invoice };
    } catch (err: any) {
      logger.error('InvoiceGenerator Error:', err);
      return { success: false, message: err.message };
    }
  }
}
