import { logger } from '@/lib/logger';
'use server';

import { SettlementEngine, InvoiceGenerator } from '@/lib/finance/settlement';
import { revalidatePath } from 'next/cache';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { FinanceRepository } from '@/lib/repositories';
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
  const financeRepo = new FinanceRepository(supabase);

  const { data: invoice, error: invError } = await financeRepo.updatePaymentStatus(invoiceId, {
    status,
    paid_amount: amount,
    payment_method: paymentMethod,
  });

  if (invError) throw new Error(`결제 상태 업데이트 실패: ${invError.message}`);

  const orderId = (invoice?.metadata as any)?.source_order_id;
  if (status === 'PAID' && orderId) {
    await financeRepo.updateBillingStatusByOrderId(orderId, 'PAID');

    revalidatePath(`/orders/${orderId}`);
  }

  revalidatePath('/finance/invoices');
  return { success: true };
}

export async function calculateSettlementAction(orderId: string) {
  logger.info(`[Action] calculateSettlementAction started for order: ${orderId}`);
  const { supabase, profile } = await validateAdminAction();
  const financeRepo = new FinanceRepository(supabase);
  logger.info(`[Action] User Profile: ${profile.email}, Role: ${profile.role}`);

  const { data: existingCosts, error: costsCheckError } = await financeRepo.findByOrderId(orderId);
  if (costsCheckError) throw new Error(`비용 확인 실패: ${costsCheckError.message}`);
  if (existingCosts?.some(c => c.invoice_id !== null)) {
    throw new Error('Cannot recalculate costs after invoice has been issued.');
  }

  const engine = new SettlementEngine();
  const result = await engine.calculateOrderCosts(orderId);

  logger.info(`[Action] Settlement calculation result for ${orderId}:`, result);

  if (result.success) {
    const { data: costs, error: costsError } = await financeRepo.findFullByOrderId(orderId);

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
  const financeRepo = new FinanceRepository(supabase);

  const isAdmin = profile.role === USER_ROLES.ZENITH_SUPER_ADMIN || profile.role === USER_ROLES.ADMIN;
  const shipperId = !isAdmin && profile.org_id ? profile.org_id : undefined;

  const { data: unpaidSum, error: unpaidError } = await financeRepo.findUnpaidSum(shipperId);
  const { data: recentInvoices, error: recentError } = await financeRepo.findRecentInvoices(5, shipperId);

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
  const financeRepo = new FinanceRepository(supabase);

  const isAdmin = profile.role === USER_ROLES.ZENITH_SUPER_ADMIN || profile.role === USER_ROLES.ADMIN;
  const shipperId = !isAdmin && profile.org_id ? profile.org_id : undefined;

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data: invoices, error } = await financeRepo.findPaidInvoicesByDateRange(
    sevenDaysAgo.toISOString(),
    now.toISOString(),
    shipperId,
  );
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
  const financeRepo = new FinanceRepository(supabase);

  const { data, error } = await financeRepo.findRevenueReport(filters);
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
  const financeRepo = new FinanceRepository(supabase);

  const { data, error } = await financeRepo.findCostReport(filters);
  if (error) throw new Error(`비용 리포트 조회 실패: ${error.message}`);

  const totalCost = data?.reduce((sum, cost) => sum + Number(cost.total_amount), 0) || 0;

  return {
    items: data || [],
    summary: { totalCost }
  };
}
