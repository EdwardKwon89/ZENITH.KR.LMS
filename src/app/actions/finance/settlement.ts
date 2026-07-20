'use server';

import { logger } from '@/lib/logger';

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
  const { supabase, user, profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');
  const financeRepo = new FinanceRepository(supabase);

  // 권한 확인: AGENCY는 소속 화주 인보이스만, ADMIN/MANAGER는 전체
  const adminRoles: string[] = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN];
  const isAdmin = adminRoles.includes(profile.role as string);
  if (!isAdmin && profile.role !== USER_ROLES.AGENCY) {
    throw new Error('결제 상태를 변경할 권한이 없습니다.');
  }

  const { data: existingInvoice } = await financeRepo.findByIdBasic(invoiceId);
  if (!existingInvoice) throw new Error('Invoice not found');
  const prevStatus = existingInvoice?.status ?? null;

  if (profile.role === USER_ROLES.AGENCY) {
    const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
    if (!agencyShipperIds || !agencyShipperIds.includes(existingInvoice.shipper_id)) {
      throw new Error('소속 화주의 인보이스만 처리할 수 있습니다.');
    }
  }

  const { data: invoice, error: invError } = await financeRepo.updatePaymentStatus(invoiceId, {
    status,
    paid_amount: amount,
    payment_method: paymentMethod,
  });

  if (invError) throw new Error(`결제 상태 업데이트 실패: ${invError.message}`);

  // IMP-051: Audit history (best-effort)
  void (async () => {
    const { error } = await supabase.from('zen_invoice_history').insert({
      invoice_id: invoiceId,
      prev_status: prevStatus,
      next_status: status,
      paid_amount: amount,
      changed_by: user.id,
    });
    if (error) logger.error('[AUDIT] Invoice history insert failed:', error);
  })();

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
    const day = dayNames[new Date(inv.created_at ?? '').getDay()];
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

async function resolveAgencyShipperIds(supabase: any, agencyOrgId: string): Promise<string[]> {
  const { data } = await supabase
    .from('zen_agency_shippers')
    .select('shipper_org_id')
    .eq('agency_org_id', agencyOrgId)
    .eq('is_active', true);
  return (data || []).map((r: any) => r.shipper_org_id);
}

export async function addManualOrderCost(
  orderId: string,
  costName: string,
  amount: number,
  currency: string,
) {
  logger.info(`[addManualOrderCost] orderId=${orderId}, costName=${costName}, amount=${amount}, currency=${currency}`);
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');

  if (!costName.trim()) throw new Error('비용 항목명을 입력해주세요.');
  if (amount <= 0) throw new Error('금액은 0보다 커야 합니다.');
  if (!currency) throw new Error('통화를 지정해주세요.');

  // 권한 확인: AGENCY는 소속 화주 오더만, ADMIN/MANAGER는 전체
  const adminRoles: string[] = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN];
  const isAdmin = adminRoles.includes(profile.role as string);
  if (!isAdmin && profile.role !== USER_ROLES.AGENCY) {
    throw new Error('기타 부가운임을 추가할 권한이 없습니다.');
  }

  if (profile.role === USER_ROLES.AGENCY) {
    const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
    if (!agencyShipperIds) throw new Error('소속 화주 정보를 조회할 수 없습니다.');

    const { data: order } = await supabase
      .from('zen_orders')
      .select('shipper_id')
      .eq('id', orderId)
      .single();

    if (!order || !agencyShipperIds.includes(order.shipper_id)) {
      throw new Error('소속 화주의 오더만 수정할 수 있습니다.');
    }
  }

  // 인보이스 확정 여부 확인 (확정 후 INSERT 차단)
  const { data: existingInvoiced } = await supabase
    .from('zen_order_costs')
    .select('id')
    .eq('order_id', orderId)
    .not('invoice_id', 'is', null)
    .limit(1);

  if (existingInvoiced && existingInvoiced.length > 0) {
    throw new Error('이미 확정된 청구서가 있어 정산 항목을 추가할 수 없습니다.');
  }

  // currency 일치 확인은 Aiden 권고사항 — 오더 기준 통화 컬럼이 없어 넘어온 값 그대로 사용

  const { data: newCost, error: insertError } = await supabase
    .from('zen_order_costs')
    .insert({
      order_id: orderId,
      cost_type: 'OTHER_CHARGE',
      unit_price: amount,
      quantity: 1,
      currency,
      is_revenue: true,
    })
    .select('id, cost_type, total_amount, currency')
    .single();

  if (insertError) throw new Error(`부가운임 추가 실패: ${insertError.message}`);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/(dashboard)/orders/${orderId}`);

  return { success: true, cost: newCost };
}

export async function getOrganizations() {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_organizations')
    .select('id, name')
    .order('name');

  if (error) throw new Error(`조직 조회 실패: ${error.message}`);
  return data || [];
}
