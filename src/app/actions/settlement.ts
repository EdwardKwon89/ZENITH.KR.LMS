import { logger } from '@/lib/logger';
'use server';

import { SettlementEngine, InvoiceGenerator } from '@/lib/finance/settlement';
import { revalidatePath } from 'next/cache';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';

export async function generateInvoicesForOrder(orderId: string) {
  await validateUserAction();

  const generator = new InvoiceGenerator();
  const result = await generator.generateInvoice(orderId);

  if (!result.success) {
    throw new Error(result.message || "정산서 생성 실패");
  }

  revalidatePath("/finance/invoices");
  revalidatePath(`/(dashboard)/orders/${orderId}`);

  return result;
}

export async function updatePaymentStatus(
  invoiceId: string,
  status: string,
  amount: number,
  paymentMethod: string = 'BANK_TRANSFER'
) {
  const { supabase } = await validateAdminAction();

  const { data: invoice, error: invError } = await supabase
    .from('zen_invoices')
    .update({
      status,
      paid_amount: amount,
      payment_method: paymentMethod,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .select('metadata')
    .single();

  if (invError) throw new Error(`결제 상태 업데이트 실패: ${invError.message}`);

  const orderId = (invoice?.metadata as any)?.source_order_id;
  if (status === 'PAID' && orderId) {
    await supabase
      .from('zen_orders')
      .update({ billing_status: 'PAID' })
      .eq('id', orderId);

    revalidatePath(`/orders/${orderId}`);
  }

  revalidatePath('/finance/invoices');
  return { success: true };
}

export async function calculateSettlementAction(orderId: string) {
  logger.info(`[Action] calculateSettlementAction started for order: ${orderId}`);
  const { supabase, profile } = await validateAdminAction();
  logger.info(`[Action] User Profile: ${profile.email}, Role: ${profile.role}`);

  const { data: existingCosts, error: costsCheckError } = await supabase
    .from('zen_order_costs')
    .select('id, invoice_id')
    .eq('order_id', orderId);
  if (costsCheckError) throw new Error(`비용 확인 실패: ${costsCheckError.message}`);
  if (existingCosts?.some(c => c.invoice_id !== null)) {
    throw new Error('Cannot recalculate costs after invoice has been issued.');
  }

  const engine = new SettlementEngine();
  const result = await engine.calculateOrderCosts(orderId);

  logger.info(`[Action] Settlement calculation result for ${orderId}:`, result);

  if (result.success) {
    const { data: costs, error: costsError } = await supabase
      .from('zen_order_costs')
      .select('id, order_id, cost_type, quantity, unit_price, total_amount, currency, invoice_id, is_revenue, created_at')
      .eq('order_id', orderId);

    if (costsError) {
      logger.error(`[Action] Error fetching costs for ${orderId}:`, costsError);
    }

    logger.info(`[Action] Fetched ${costs?.length || 0} costs for ${orderId}`);

    revalidatePath(`/orders/${orderId}`);
    return { ...result, costs: costs || [] };
  }

  return result;
}

export async function getSettlementOverview() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const isAdmin = profile.role === USER_ROLES.ZENITH_SUPER_ADMIN || profile.role === USER_ROLES.ADMIN;

  const unpaidQuery = supabase
    .from("zen_invoices")
    .select("total_amount")
    .in("status", ["UNPAID", "PARTIAL"]);
  if (!isAdmin && profile.org_id) unpaidQuery.eq("shipper_id", profile.org_id);
  const { data: unpaidSum, error: unpaidError } = await unpaidQuery;

  const recentQuery = supabase
    .from("zen_invoices")
    .select("id, invoice_no, total_amount, currency, status, created_at, shipper_id")
    .order("created_at", { ascending: false })
    .limit(5);
  if (!isAdmin && profile.org_id) recentQuery.eq("shipper_id", profile.org_id);
  const { data: recentInvoices, error: recentError } = await recentQuery;

  if (unpaidError || recentError) {
    throw new Error("Failed to fetch settlement overview");
  }

  const totalUnpaid = unpaidSum?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

  return {
    totalUnpaid,
    recentInvoices: recentInvoices || [],
    currency: recentInvoices?.[0]?.currency || "USD"
  };
}

export async function getWeeklyRevenueChart() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const isAdmin = profile.role === USER_ROLES.ZENITH_SUPER_ADMIN || profile.role === USER_ROLES.ADMIN;

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const query = supabase
    .from('zen_invoices')
    .select('total_amount, created_at')
    .eq('status', 'PAID')
    .gte('created_at', sevenDaysAgo.toISOString())
    .lte('created_at', now.toISOString());

  if (!isAdmin && profile.org_id) {
    query.eq('shipper_id', profile.org_id);
  }

  const { data: invoices, error } = await query;
  if (error) throw new Error(`매출 통계 조회 실패: ${error.message}`);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartDataMap: Record<string, number> = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    chartDataMap[dayNames[d.getDay()]] = 0;
  }

  invoices?.forEach(inv => {
    const day = dayNames[new Date(inv.created_at).getDay()];
    if (chartDataMap[day] !== undefined) {
      chartDataMap[day] += Number(inv.total_amount);
    }
  });

  const result = Object.entries(chartDataMap).map(([name, revenue]) => ({
    name,
    revenue
  }));

  return result;
}

export async function getRevenueReport(filters: {
  startDate: string;
  endDate: string;
  transMode?: string;
  shipperId?: string;
}) {
  const { supabase, profile } = await validateAdminAction();

  let query = supabase
    .from('zen_invoices')
    .select(`
      id,
      invoice_no,
      total_amount,
      currency,
      status,
      created_at,
      shipper:shipper_id(name),
      order:zen_orders!inner(id, trans_mode)
    `)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (filters.transMode && filters.transMode !== 'ALL') {
    query = query.eq('order.trans_mode', filters.transMode);
  }
  if (filters.shipperId) {
    query = query.eq('shipper_id', filters.shipperId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`수입 리포트 조회 실패: ${error.message}`);

  const totalRevenue = data?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
  const count = data?.length || 0;
  const avgRevenue = count > 0 ? totalRevenue / count : 0;

  return {
    items: data || [],
    summary: { totalRevenue, count, avgRevenue }
  };
}

export async function getCostReport(filters: {
  startDate: string;
  endDate: string;
  serviceType?: string;
}) {
  const { supabase } = await validateAdminAction();

  let query = supabase
    .from('zen_order_costs')
    .select(`
      *,
      order:order_id(order_no, trans_mode, shipper:shipper_id(name))
    `)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (filters.serviceType && filters.serviceType !== 'ALL') {
    query = query.eq('cost_type', filters.serviceType);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`비용 리포트 조회 실패: ${error.message}`);

  const totalCost = data?.reduce((sum, cost) => sum + Number(cost.total_amount), 0) || 0;

  return {
    items: data || [],
    summary: { totalCost }
  };
}
