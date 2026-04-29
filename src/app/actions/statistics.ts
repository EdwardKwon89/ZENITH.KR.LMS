'use server';

import { validateAdminAction } from '@/lib/auth/guards';

/**
 * [WBS 4.6.1] 기간별 운송 및 비용 통계 데이터를 조회합니다.
 */
export async function getCostProfitStats(period: 'WEEK' | 'MONTH' | 'YEAR') {
  const { supabase } = await validateAdminAction();

  // 1. 기간 설정
  const now = new Date();
  let startDate = new Date();
  if (period === 'WEEK') startDate.setDate(now.getDate() - 7);
  else if (period === 'MONTH') startDate.setMonth(now.getMonth() - 1);
  else startDate.setFullYear(now.getFullYear() - 1);

  // 2. 매출 데이터 조회 (Invoices)
  const { data: revenueData, error: revError } = await supabase
    .from('zen_invoices')
    .select('total_amount, created_at, order:zen_orders(trans_mode)')
    .gte('created_at', startDate.toISOString());

  if (revError) throw new Error(`매출 통계 조회 실패: ${revError.message}`);

  // 3. 비용 데이터 조회 (Order Costs)
  const { data: costData, error: costError } = await supabase
    .from('zen_order_costs')
    .select('total_amount, created_at, order:order_id(trans_mode)')
    .gte('created_at', startDate.toISOString());

  if (costError) throw new Error(`비용 통계 조회 실패: ${costError.message}`);

  // 4. 모드별 집계
  const statsByMode = ['AIR', 'SEA', 'CIR'].map(mode => {
    const rev = (revenueData || [])
      .filter(i => {
        const orderData = i.order;
        const order = Array.isArray(orderData) ? orderData[0] : orderData;
        return (order as any)?.trans_mode === mode;
      })
      .reduce((sum, i) => sum + Number(i.total_amount), 0);
    
    const cost = (costData || [])
      .filter(c => {
        const orderData = c.order;
        const order = Array.isArray(orderData) ? orderData[0] : orderData;
        return (order as any)?.trans_mode === mode;
      })
      .reduce((sum, c) => sum + Number(c.total_amount), 0);

    return {
      mode,
      revenue: rev,
      cost: cost,
      profit: rev - cost,
      margin: rev > 0 ? ((rev - cost) / rev) * 100 : 0
    };
  });

  return {
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    statsByMode
  };
}
