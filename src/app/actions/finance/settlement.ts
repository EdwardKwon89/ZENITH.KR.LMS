'use server';

import { logger } from '@/lib/logger';

import { SettlementEngine, InvoiceGenerator } from '@/lib/finance/settlement';
import { revalidatePath } from 'next/cache';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { FinanceRepository } from '@/lib/repositories';
import { USER_ROLES } from '@/lib/auth/rbac';
import { getNumericParam } from '@/lib/params/service';
import { sendInvoiceFinalizedEmail } from '@/lib/notifications/email';

export async function generateInvoicesForOrder(orderId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');

  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
  const isAdmin = adminRoles.includes(profile.role);
  if (!isAdmin && profile.role !== USER_ROLES.AGENCY) {
    throw new Error('정산서를 생성할 권한이 없습니다.');
  }

  if (profile.role === USER_ROLES.AGENCY) {
    const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
    const { data: order } = await supabase
      .from('zen_orders')
      .select('shipper_id')
      .eq('id', orderId)
      .single();

    if (!order || !agencyShipperIds.includes(order.shipper_id)) {
      throw new Error('본인 소속 화주의 오더에 대해서만 인보이스를 생성할 수 있습니다.');
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
    throw new Error('이미 정산이 마감된 오더입니다. 인보이스를 생성할 수 없습니다.');
  }

  const result = await generator.generateInvoice(orderId);

  if (!result.success) {
    throw new Error(result.message || "정산서 생성 실패");
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
    if (!orderId) return '인보이스에 연결된 오더를 찾을 수 없습니다.';

    const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
    const { data: order } = await supabase
      .from('zen_orders')
      .select('shipper_id')
      .eq('id', orderId)
      .single();

    if (!order || !agencyShipperIds.includes(order.shipper_id)) {
      return '본인 소속 화주의 인보이스만 마감할 수 있습니다.';
    }
  } else if (!isAdmin) {
    return '정산 마감 권한이 없습니다.';
  }
  return null;
}

async function computeInvoiceTotal(supabase: any, invoiceId: string) {
  const { data: linkedCosts, error } = await supabase
    .from('zen_order_costs')
    .select('unit_price, quantity')
    .eq('invoice_id', invoiceId);
  if (error) throw new Error('비용 정보를 조회할 수 없습니다.');
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
  if (error) throw new Error(`정산 마감 실패: ${error.message}`);

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
    if (!profile) throw new Error('User profile not found');

    const invoice = await lookupInvoice(supabase, invoiceId);
    if (!invoice) return { success: false, error: '인보이스를 찾을 수 없습니다.' };
    if (invoice.is_finalized) return { success: false, error: '이미 정산이 마감된 인보이스입니다.' };

    const permError = await assertFinalizePermission(supabase, profile, invoice);
    if (permError) return { success: false, error: permError };

    const isAdminAction = profile.role !== USER_ROLES.AGENCY;
    if (isAdminAction && !reason?.trim()) {
      return { success: false, error: 'Admin 예외 마감 시 사유를 입력해야 합니다.' };
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
    return { success: false, error: err.message || '알 수 없는 서버 오류' };
  }
}

export async function updatePaymentStatus(
  invoiceId: string,
  status: string,
  amount: number,
  paymentMethod: string = 'BANK_TRANSFER'
) {
  const { supabase, profile, user } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');

  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
  const isAdmin = adminRoles.includes(profile.role);
  if (!isAdmin && profile.role !== USER_ROLES.AGENCY) {
    throw new Error('결제 상태를 수정할 권한이 없습니다.');
  }

  const financeRepo = new FinanceRepository(supabase);
  const { data: existingInvoice } = await financeRepo.findByIdBasic(invoiceId);
  if (!existingInvoice) throw new Error('인보이스를 찾을 수 없습니다.');

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
        throw new Error('본인 소속 화주의 인보이스 결제 상태만 변경할 수 있습니다.');
      }
    }
  }

  const prevStatus = existingInvoice?.status ?? null;

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
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');

  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
  const isAdmin = adminRoles.includes(profile.role);
  if (!isAdmin && profile.role !== USER_ROLES.AGENCY) {
    throw new Error('정산 재계산을 실행할 권한이 없습니다.');
  }

  if (profile.role === USER_ROLES.AGENCY) {
    const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
    const { data: order } = await supabase
      .from('zen_orders')
      .select('shipper_id')
      .eq('id', orderId)
      .single();

    if (!order || !agencyShipperIds.includes(order.shipper_id)) {
      throw new Error('본인 소속 화주의 오더에 대해서만 정산을 계산할 수 있습니다.');
    }
  }

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
  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
  const isAdmin = adminRoles.includes(profile.role);
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

  if (insertError) throw new Error(`부가운임 추가 실패: ${insertError.message}`);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/(dashboard)/orders/${orderId}`);

  return { success: true };
}

// ─── TASK-194-C: 마감 후 조정 — 신규 추가 인보이스 발행 ───────────────────

export async function createPostFinalizationAdjustment(
  orderId: string, adjustmentAmount: number, currency: string,
  userId: string, originalInvoiceId: string
): Promise<{ success: boolean; adjustmentAmount?: number; error?: string }> {
  try {
    const { supabase } = await validateAdminAction();
    const { data: origInv } = await supabase
      .from('zen_invoices').select('shipper_id, metadata, invoice_no').eq('id', originalInvoiceId).single();
    if (!origInv) return { success: false, error: '원 인보이스를 찾을 수 없습니다.' };
    const { data: order } = await supabase
      .from('zen_orders').select('order_no').eq('id', orderId).single();
    const invCurrency = currency || 'USD';

    if (adjustmentAmount !== 0) {
      const newInv = await createAdjustmentInvoice(supabase, origInv, orderId, order?.order_no, adjustmentAmount, invCurrency);
      if (!newInv) return { success: false, error: '추가 인보이스 생성 실패' };
      await linkAdjustmentCosts(supabase, orderId, newInv.id);
      const total = await calcAdjustmentTotal(supabase, newInv.id);
      await supabase.from('zen_invoices').update({ total_amount: total }).eq('id', newInv.id);
      await supabase.from('zen_invoice_history').insert({
        invoice_id: newInv.id, prev_status: 'UNPAID', next_status: 'UNPAID',
        changed_by: userId, notes: `마감 후 추가 인보이스 (원: ${origInv.invoice_no})`,
      });
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/finance/invoices');
    return { success: true, adjustmentAmount };
  } catch (err: any) {
    logger.error('createPostFinalizationAdjustment error:', err);
    return { success: false, error: err.message || '마감 후 조정 실패' };
  }
}

async function createAdjustmentInvoice(
  supabase: any, origInv: any, orderId: string, orderNo: string | undefined,
  adjustmentAmount: number, currency: string
) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const invNo = `INV-${today}-${Math.floor(1000 + Math.random() * 9000)}`;
  const exchangeRate = await getNumericParam('EXCHANGE_RATE_USD_KRW', 1350);
  const { data, error } = await supabase.from('zen_invoices').insert({
    invoice_no: invNo, shipper_id: origInv.shipper_id, total_amount: adjustmentAmount,
    currency, applied_exchange_rate: exchangeRate, status: 'UNPAID',
    due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    metadata: { source_order_id: orderId, order_no: orderNo, adjustment_of: origInv.id },
  }).select().single();
  return error ? null : data;
}

async function linkAdjustmentCosts(supabase: any, orderId: string, invoiceId: string) {
  const { data: costs } = await supabase.from('zen_order_costs')
    .select('id').eq('order_id', orderId)
    .eq('cost_type', 'UPS_ACTUAL_ADJUSTMENT').is('invoice_id', null);
  if (costs?.length) {
    await supabase.from('zen_order_costs')
      .update({ invoice_id: invoiceId })
      .in('id', costs.map((c: any) => c.id));
  }
}

async function calcAdjustmentTotal(supabase: any, invoiceId: string) {
  const { data } = await supabase.from('zen_order_costs')
    .select('unit_price, quantity').eq('invoice_id', invoiceId);
  return (data || []).reduce((sum: number, c: any) => sum + (Number(c.unit_price) * Number(c.quantity || 1)), 0);
}

// ─── TASK-194-C: 화주 거부 — CANCELED + superseded_by 재발행 ────────────

export async function rejectInvoice(
  invoiceId: string
): Promise<{ success: boolean; newInvoiceId?: string; error?: string }> {
  try {
    const { supabase, profile, user } = await validateUserAction();
    if (!profile) throw new Error('User profile not found');

    const { data: invoice, error: invErr } = await supabase
      .from('zen_invoices').select('*, metadata').eq('id', invoiceId).single();
    if (invErr || !invoice) return { success: false, error: '인보이스를 찾을 수 없습니다.' };
    if (invoice.status === 'CANCELED') return { success: false, error: '이미 취소된 인보이스입니다.' };

    const permErr = await assertFinalizePermission(supabase, profile, invoice);
    if (permErr) return { success: false, error: permErr };

    const orderId = invoice.metadata?.source_order_id;

    const { error: cancelErr } = await supabase.from('zen_invoices')
      .update({ status: 'CANCELED', is_finalized: false, finalized_at: null, finalized_by: null, finalized_reason: null })
      .eq('id', invoiceId);
    if (cancelErr) return { success: false, error: `인보이스 취소 실패: ${cancelErr.message}` };

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
    return { success: false, error: err.message || '인보이스 거부 처리 실패' };
  }
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
