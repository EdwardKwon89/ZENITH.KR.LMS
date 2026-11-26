'use server';

import { logger } from '@/lib/logger';
import { trError } from '@/lib/i18n/action-error';

import { SettlementEngine, InvoiceGenerator } from '@/lib/finance/settlement';
import { revalidatePath } from 'next/cache';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { FinanceRepository } from '@/lib/repositories';
import { USER_ROLES } from '@/lib/auth/rbac';
import { getExchangeRate } from '@/lib/finance/exchange-rate';
import { getKstToday } from '@/lib/utils/date-kst';
import { sendInvoiceFinalizedEmail } from '@/lib/notifications/email';

export async function generateInvoicesForOrder(orderId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error(await trError('profile_not_found'));

  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
  const isAdmin = adminRoles.includes(profile.role);
  if (!isAdmin && profile.role !== USER_ROLES.AGENCY) {
    logger.warn(`[generateInvoicesForOrder] denied for role: ${profile.role}`);
    throw new Error(await trError('permission_denied'));
  }

  if (profile.role === USER_ROLES.AGENCY) {
    const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
    const { data: order } = await supabase
      .from('zen_orders')
      .select('shipper_id')
      .eq('id', orderId)
      .single();

    if (!order || !agencyShipperIds.includes(order.shipper_id)) {
      logger.warn(`[generateInvoicesForOrder] shipper out of agency scope (${orderId})`);
      throw new Error(await trError('own_shipper_only'));
    }
  }

  const generator = new InvoiceGenerator();

  // 정산 마감 여부 확인 — 마감 후 새 인보이스 생성 차단
  const { data: finalizedCheck } = await supabase
    .from('zen_invoices')
    .select('id')
    .eq('is_finalized', true)
    .filter('metadata->>source_order_id', 'eq', orderId)
    .neq('status', 'CANCELED')
    .maybeSingle();

  if (finalizedCheck) {
    logger.warn(`[generateInvoicesForOrder] already finalized order (${orderId})`);
    throw new Error(await trError('settlement_order_already_finalized'));
  }

  const result = await generator.generateInvoice(orderId);

  if (!result.success) {
    logger.error('[generateInvoicesForOrder] invoice generation failed:', result.message);
    throw new Error(await trError('invoice_create_failed'));
  }

  revalidatePath("/finance/invoices");
  revalidatePath(`/(dashboard)/orders/${orderId}`);

  return result;
}

async function lookupInvoice(supabase: any, invoiceId: string) {
  const { data, error } = await supabase
    .from('zen_invoices')
    .select('*, metadata')
    .eq('id', invoiceId)
    .single();
  if (error || !data) return null;
  return data;
}

async function assertFinalizePermission(supabase: any, profile: any, invoice: any): Promise<string | null> {
  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
  const isAdmin = adminRoles.includes(profile.role);

  if (profile.role === USER_ROLES.AGENCY) {
    const orderId = invoice.metadata?.source_order_id;
    if (!orderId) { logger.warn('[assertFinalizePermission] invoice has no linked order'); return await trError('not_found'); }

    const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
    const { data: order } = await supabase
      .from('zen_orders')
      .select('shipper_id')
      .eq('id', orderId)
      .single();

    if (!order || !agencyShipperIds.includes(order.shipper_id)) {
      logger.warn('[assertFinalizePermission] shipper out of agency scope');
      return await trError('own_shipper_only');
    }
  } else if (!isAdmin) {
    logger.warn(`[assertFinalizePermission] denied for role: ${profile.role}`);
    return await trError('permission_denied');
  }
  return null;
}

async function computeInvoiceTotal(supabase: any, invoiceId: string) {
  const { data: linkedCosts, error } = await supabase
    .from('zen_order_costs')
    .select('unit_price, quantity')
    .eq('invoice_id', invoiceId);
  if (error) {
    logger.error('computeInvoiceTotal: zen_order_costs lookup failed', error);
    throw new Error(await trError('generic', { code: 'COST_LOOKUP' }));
  }
  return (linkedCosts || []).reduce((sum: number, c: any) => sum + (Number(c.unit_price) * Number(c.quantity || 1)), 0);
}

async function markInvoiceFinalized(supabase: any, invoiceId: string, totalAmount: number, userId: string, status: string, reason?: string) {
  const updateData: Record<string, any> = {
    total_amount: totalAmount,
    is_finalized: true,
    finalized_at: new Date().toISOString(),
    finalized_by: userId,
  };
  if (reason) updateData.finalized_reason = reason;

  const { error } = await supabase.from('zen_invoices').update(updateData).eq('id', invoiceId);
  if (error) {
    logger.error('markInvoiceFinalized: zen_invoices update failed', error);
    throw new Error(await trError('generic', { code: 'INVOICE_FINALIZE' }));
  }

  await supabase.from('zen_invoice_history').insert({
    invoice_id: invoiceId,
    prev_status: status,
    next_status: status,
    changed_by: userId,
    notes: `정산 마감${reason ? ` (사유: ${reason})` : ''}`,
  });
}

export async function finalizeInvoice(
  invoiceId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile, user } = await validateUserAction();
    if (!profile) return { success: false, error: await trError('profile_not_found') };

    const invoice = await lookupInvoice(supabase, invoiceId);
    if (!invoice) {
      logger.warn(`finalizeInvoice: invoice not found (${invoiceId})`);
      return { success: false, error: await trError('invoice_not_found') };
    }
    if (invoice.is_finalized) {
      logger.warn(`finalizeInvoice: already finalized (${invoiceId})`);
      return { success: false, error: await trError('invoice_already_finalized') };
    }

    const permError = await assertFinalizePermission(supabase, profile, invoice);
    if (permError) return { success: false, error: permError };

    const isAdminAction = profile.role !== USER_ROLES.AGENCY;
    if (isAdminAction && !reason?.trim()) {
      logger.warn(`finalizeInvoice: reason required (${invoiceId})`);
      return { success: false, error: await trError('invoice_finalize_reason_required') };
    }

    const totalAmount = await computeInvoiceTotal(supabase, invoiceId);
    await markInvoiceFinalized(supabase, invoiceId, totalAmount, user.id, invoice.status, reason);

    // TASK-206: 인보이스 발행 이메일 알림 (best-effort, await + try/catch)
    try {
      const { data: org } = await supabase
        .from('zen_organizations')
        .select('name')
        .eq('id', invoice.shipper_id)
        .single();

      const { data: shipperProfile } = await supabase
        .from('zen_profiles')
        .select('email')
        .eq('org_id', invoice.shipper_id)
        .eq('role', USER_ROLES.SHIPPER)
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();

      if (shipperProfile?.email) {
        await sendInvoiceFinalizedEmail({
          email: shipperProfile.email,
          shipperName: org?.name || '화주',
          invoiceNo: invoice.invoice_no,
          totalAmount,
          currency: invoice.currency,
          dueDate: invoice.due_date,
          orderNo: invoice.metadata?.order_no,
        });
      }
    } catch (e) {
      logger.error('[TASK-206] Failed to send invoice finalized email:', e);
    }

    revalidatePath('/finance/invoices');
    revalidatePath('/(dashboard)/settlement');

    return { success: true };
  } catch (err: any) {
    logger.error('Finalize invoice error:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

export async function updatePaymentStatus(
  invoiceId: string,
  status: string,
  amount: number,
  paymentMethod: string = 'BANK_TRANSFER'
) {
  const { supabase, profile, user } = await validateUserAction();
  if (!profile) throw new Error(await trError('profile_not_found'));

  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
  const isAdmin = adminRoles.includes(profile.role);
  if (!isAdmin && profile.role !== USER_ROLES.AGENCY) {
    logger.warn(`[updatePaymentStatus] denied for role: ${profile.role}`);
    throw new Error(await trError('permission_denied'));
  }

  const financeRepo = new FinanceRepository(supabase);
  const { data: existingInvoice } = await financeRepo.findByIdBasic(invoiceId);
  if (!existingInvoice) {
    logger.warn(`[updatePaymentStatus] invoice not found (${invoiceId})`);
    throw new Error(await trError('invoice_not_found'));
  }

  if (profile.role === USER_ROLES.AGENCY) {
    const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
    const orderId = (existingInvoice?.metadata as any)?.source_order_id;
    if (orderId) {
      const { data: order } = await supabase
        .from('zen_orders')
        .select('shipper_id')
        .eq('id', orderId)
        .single();
      if (!order || !agencyShipperIds.includes(order.shipper_id)) {
        logger.warn(`[updatePaymentStatus] shipper out of agency scope (${invoiceId})`);
        throw new Error(await trError('own_shipper_only'));
      }
    }
  }

  const prevStatus = existingInvoice?.status ?? null;

  const { data: invoice, error: invError } = await financeRepo.updatePaymentStatus(invoiceId, {
    status,
    paid_amount: amount,
    payment_method: paymentMethod,
  });

  if (invError) {
    logger.error('updatePaymentStatus: update failed', invError);
    throw new Error(await trError('generic', { code: 'PAYMENT_STATUS_UPDATE' }));
  }

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
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error(await trError('profile_not_found'));

  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
  const isAdmin = adminRoles.includes(profile.role);
  if (!isAdmin && profile.role !== USER_ROLES.AGENCY) {
    logger.warn(`[calculateSettlementAction] denied for role: ${profile.role}`);
    throw new Error(await trError('permission_denied'));
  }

  if (profile.role === USER_ROLES.AGENCY) {
    const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
    const { data: order } = await supabase
      .from('zen_orders')
      .select('shipper_id')
      .eq('id', orderId)
      .single();

    if (!order || !agencyShipperIds.includes(order.shipper_id)) {
      logger.warn(`[calculateSettlementAction] shipper out of agency scope (${orderId})`);
      throw new Error(await trError('own_shipper_only'));
    }
  }

  const financeRepo = new FinanceRepository(supabase);
  logger.info(`[Action] User Profile: ${profile.email}, Role: ${profile.role}`);

  const { data: existingCosts, error: costsCheckError } = await financeRepo.findByOrderId(orderId);
  if (costsCheckError) {
    logger.error('calculateSettlementAction: cost lookup failed', costsCheckError);
    throw new Error(await trError('generic', { code: 'COST_LOOKUP' }));
  }
  if (existingCosts?.some(c => c.invoice_id !== null)) {
    logger.warn(`[calculateSettlementAction] recalculation locked by invoice (${orderId})`);
    throw new Error(await trError('settlement_recalc_locked'));
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
  if (!profile) throw new Error(await trError('profile_not_found'));
  const financeRepo = new FinanceRepository(supabase);

  const isAdmin = profile.role === USER_ROLES.ZENITH_SUPER_ADMIN || profile.role === USER_ROLES.ADMIN;
  const shipperId = !isAdmin && profile.org_id ? profile.org_id : undefined;

  const { data: unpaidSum, error: unpaidError } = await financeRepo.findUnpaidSum(shipperId);
  const { data: recentInvoices, error: recentError } = await financeRepo.findRecentInvoices(5, shipperId);

  if (unpaidError || recentError) {
    logger.error('getSettlementOverview: lookup failed', unpaidError || recentError);
    throw new Error(await trError('generic', { code: 'SETTLEMENT_OVERVIEW_LOOKUP' }));
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
  if (!profile) throw new Error(await trError('profile_not_found'));
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
  if (error) {
    logger.error('getWeeklyRevenueChart: lookup failed', error);
    throw new Error(await trError('generic', { code: 'REVENUE_CHART_LOOKUP' }));
  }

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
  if (error) {
    logger.error('getRevenueReport: lookup failed', error);
    throw new Error(await trError('generic', { code: 'REVENUE_REPORT_LOOKUP' }));
  }

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
  if (error) {
    logger.error('getCostReport: lookup failed', error);
    throw new Error(await trError('generic', { code: 'COST_REPORT_LOOKUP' }));
  }

  const totalCost = data?.reduce((sum, cost) => sum + Number(cost.total_amount), 0) || 0;

  return {
    items: data || [],
    summary: { totalCost }
  };
}

// TASK-B-316 (Issue #1156, DEF-B-141): 대리점 자기 자신을 화주로 등록한 오더도 관리 대상에 포함
// warehouse.ts getAgencyShipperIds() 패턴과 동일
async function resolveAgencyShipperIds(supabase: any, agencyOrgId: string): Promise<string[]> {
  const { data } = await supabase
    .from('zen_agency_shippers')
    .select('shipper_org_id')
    .eq('agency_org_id', agencyOrgId)
    .eq('is_active', true);
  const downstreamIds = (data || []).map((r: any) => r.shipper_org_id);
  return [...downstreamIds, agencyOrgId];
}

export async function addManualOrderCost(
  orderId: string,
  costName: string,
  amount: number,
  currency: string,
) {
  logger.info(`[addManualOrderCost] orderId=${orderId}, costName=${costName}, amount=${amount}, currency=${currency}`);
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error(await trError('profile_not_found'));

  if (!costName.trim()) { logger.warn('[addManualOrderCost] cost name missing'); throw new Error(await trError('cost_name_required')); }
  if (amount <= 0) { logger.warn('[addManualOrderCost] invalid amount'); throw new Error(await trError('cost_amount_invalid')); }
  if (!currency) { logger.warn('[addManualOrderCost] currency missing'); throw new Error(await trError('cost_currency_required')); }

  // 권한 확인: AGENCY는 소속 화주 오더만, ADMIN/MANAGER는 전체
  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
  const isAdmin = adminRoles.includes(profile.role);
  if (!isAdmin && profile.role !== USER_ROLES.AGENCY) {
    logger.warn(`[addManualOrderCost] denied for role: ${profile.role}`);
    throw new Error(await trError('permission_denied'));
  }

  if (profile.role === USER_ROLES.AGENCY) {
    const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
    if (!agencyShipperIds) {
      logger.error('[addManualOrderCost] agency shipper lookup returned nothing');
      throw new Error(await trError('generic', { code: 'AGENCY_SHIPPER_LOOKUP' }));
    }

    const { data: order } = await supabase
      .from('zen_orders')
      .select('shipper_id')
      .eq('id', orderId)
      .single();

    if (!order || !agencyShipperIds.includes(order.shipper_id)) {
      logger.warn(`[addManualOrderCost] shipper out of agency scope (${orderId})`);
      throw new Error(await trError('own_shipper_only'));
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
    logger.warn(`[addManualOrderCost] settlement items locked (${orderId})`);
    throw new Error(await trError('settlement_items_locked'));
  }

  // currency 일치 확인은 Aiden 권고사항 — 오더 기준 통화 컬럼이 없어 넘어온 값 그대로 사용

  const { error: insertError } = await supabase
    .from('zen_order_costs')
    .insert({
      order_id: orderId,
      cost_type: 'OTHER_CHARGE',
      unit_price: amount,
      quantity: 1,
      currency,
      is_revenue: true,
    });

  if (insertError) {
    logger.error('addManualOrderCost: zen_order_costs insert failed', insertError);
    throw new Error(await trError('generic', { code: 'COST_INSERT' }));
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/(dashboard)/orders/${orderId}`);

  return { success: true };
}

// ─── TASK-194-C: 화주 거부 — CANCELED + superseded_by 재발행 ────────────

export async function rejectInvoice(
  invoiceId: string
): Promise<{ success: boolean; newInvoiceId?: string; error?: string }> {
  try {
    const { supabase, profile, user } = await validateUserAction();
    if (!profile) return { success: false, error: await trError('profile_not_found') };

    const { data: invoice, error: invErr } = await supabase
      .from('zen_invoices').select('*, metadata').eq('id', invoiceId).single();
    if (invErr || !invoice) {
      logger.warn(`rejectInvoice: invoice not found (${invoiceId})`);
      return { success: false, error: await trError('invoice_not_found') };
    }
    if (invoice.status === 'CANCELED') {
      logger.warn(`rejectInvoice: already canceled (${invoiceId})`);
      return { success: false, error: await trError('invoice_already_canceled') };
    }

    const permErr = await assertFinalizePermission(supabase, profile, invoice);
    if (permErr) return { success: false, error: permErr };

    const orderId = invoice.metadata?.source_order_id;

    const { error: cancelErr } = await supabase.from('zen_invoices')
      .update({ status: 'CANCELED', is_finalized: false, finalized_at: null, finalized_by: null, finalized_reason: null })
      .eq('id', invoiceId);
    if (cancelErr) {
      logger.error('rejectInvoice: cancel update failed', cancelErr);
      return { success: false, error: await trError('generic', { code: 'INVOICE_CANCEL' }) };
    }

    await supabase.from('zen_invoice_history').insert({
      invoice_id: invoiceId, prev_status: invoice.status, next_status: 'CANCELED',
      changed_by: user.id, notes: '화주 거부로 인보이스 취소',
    });

    if (orderId) {
      await supabase.from('zen_order_costs')
        .update({ invoice_id: null }).eq('order_id', orderId).eq('invoice_id', invoiceId);
    }

    let newInvoiceId: string | undefined;
    if (orderId) {
      const gen = new InvoiceGenerator();
      const result = await gen.generateInvoice(orderId);
      if (result.success && result.invoice) {
        newInvoiceId = result.invoice.id;
        await supabase.from('zen_invoices')
          .update({ metadata: { ...invoice.metadata, superseded_by: newInvoiceId } })
          .eq('id', invoiceId);
        await supabase.from('zen_invoice_history').insert({
          invoice_id: newInvoiceId, prev_status: null, next_status: 'UNPAID',
          changed_by: user.id, notes: `거부 인보이스(${invoice.invoice_no}) 재발행`,
        });
      }
    }

    revalidatePath('/finance/invoices');
    if (orderId) revalidatePath(`/orders/${orderId}`);
    return { success: true, newInvoiceId };
  } catch (err: any) {
    logger.error('rejectInvoice error:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

export async function getOrganizations() {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_organizations')
    .select('id, name')
    .order('name');

  if (error) {
    logger.error('getOrganizations: lookup failed', error);
    throw new Error(await trError('generic', { code: 'ORGANIZATION_LOOKUP' }));
  }
  return data || [];
}
