'use server';

import { revalidatePath } from 'next/cache';
import { validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { trError } from '@/lib/i18n/action-error';

const ADMIN_ROLES = ['ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const;
// [설계 확정] §8-2 허용 집합: admin 3역할 + `SUB_ADMIN`(Pilot 예외 — Edward 2026-11-27).
const GET_UPS_ACTUAL_COST_ROLES = ['ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUB_ADMIN'] as const;

/** TASK-B-352: 권한 실패는 throw 대신 로케일 문장을 반환한다(사용자 도달 경로). */
async function assertAdmin(profile: { role: string } | null): Promise<string | null> {
  if (profile && ADMIN_ROLES.includes(profile.role as any)) return null;
  logger.warn(`[assertAdmin] Denied for role: ${profile?.role ?? 'unknown'}`);
  return trError('permission_denied');
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 기존 실제 원가 확정 기록 조회 */
export async function getUpsActualCost(orderId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile || !GET_UPS_ACTUAL_COST_ROLES.some((r) => r === profile.role)) {
    logger.warn(`[getUpsActualCost] Denied for role: ${profile?.role ?? 'unknown'}`);
    throw new Error(await trError('permission_denied'));
  }
  const { data, error } = await supabase
    .from('zen_ups_actual_cost')
    .select(`
      *,
      entered_by_profile:entered_by (
        full_name,
        email
      )
    `)
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) {
    logger.error('getUpsActualCost: zen_ups_actual_cost select failed', error);
    throw new Error(await trError('generic', { code: 'ACTUAL_COST_LOOKUP' }));
  }
  return data;
}

export interface CostSettlementFilter {
  status: 'NOT_SETTLED' | 'SETTLED' | 'ALL';
  from: string;
  to: string;
  q?: string;
}

export interface CostSettlementOrderRow {
  orderId: string;
  orderNo: string;
  shipperName: string | null;
  agencyName: string | null;
  deliveredAt: string | null;
  settlementStatus: 'NOT_SETTLED' | 'SETTLED';
  costSettledAt: string | null;
  upsInvoiceNo: string | null;
  hasActualCost: boolean;
  legacyInvoiced: boolean;
  excludedReason: 'LEGACY_INVOICED' | null;
}

export interface CostSettlementListResult {
  success: boolean;
  orders?: CostSettlementOrderRow[];
  total?: number;
  error?: string;
}

function deliveredDateOf(history: Array<{ order_id: string; created_at: string }> | null | undefined) {
  const map = new Map<string, string>();
  for (const row of history ?? []) {
    if (!map.has(row.order_id) || row.created_at > (map.get(row.order_id) as string)) {
      map.set(row.order_id, row.created_at);
    }
  }
  return map;
}

/** Admin 오더정산 대상 목록 — DELIVERED UPS 오더 + 정산상태/기간/검색 필터. */
export async function getOrdersForCostSettlement(filter: CostSettlementFilter): Promise<CostSettlementListResult> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await assertAdmin(profile);
    if (permErr) return { success: false, error: permErr };

    if (!filter?.from || !filter?.to || filter.from > filter.to) {
      logger.warn(`getOrdersForCostSettlement: invalid date range ${filter?.from} ~ ${filter?.to}`);
      return { success: false, error: await trError('generic', { code: 'DATE_RANGE_INVALID' }) };
    }

    let query = supabase
      .from('zen_orders')
      .select('id, order_no, status, cost_settlement_status, cost_settled_at, created_at, shipper_id, agency_org_id, shipper:zen_organizations!shipper_id(name), agency:zen_organizations!agency_org_id(name)')
      .eq('transport_mode', 'UPS')
      .eq('status', 'DELIVERED')
      .limit(500);
    if (filter.status !== 'ALL') query = query.eq('cost_settlement_status', filter.status);
    if (filter.q?.trim()) query = query.ilike('order_no', `%${filter.q.trim()}%`);

    const { data: orders, error } = await query;
    if (error) {
      logger.error('getOrdersForCostSettlement: order lookup failed', error);
      return { success: false, error: await trError('generic', { code: 'ORDER_LIST_LOOKUP' }) };
    }
    if (!orders || orders.length === 0) return { success: true, orders: [], total: 0 };

    const orderIds = orders.map((o: any) => o.id);
    const [historyRes, costRes, invoiceRes] = await Promise.all([
      supabase.from('order_status_history').select('order_id, created_at').in('order_id', orderIds).eq('next_status', 'DELIVERED').order('created_at', { ascending: false }),
      supabase.from('zen_ups_actual_cost').select('order_id, ups_invoice_no').in('order_id', orderIds),
      supabase.from('zen_invoices').select('metadata').neq('status', 'CANCELED').filter('metadata->>source_order_id', 'in', `(${orderIds.join(',')})`),
    ]);

    // 보조 조회 실패를 무시하면 레거시 인보이스 오더가 정산 대상처럼 보이는 fail-open이 된다.
    if (historyRes.error) {
      logger.error('getOrdersForCostSettlement: delivery history lookup failed', historyRes.error);
      return { success: false, error: await trError('generic', { code: 'HISTORY_LOOKUP' }) };
    }
    if (costRes.error) {
      logger.error('getOrdersForCostSettlement: actual cost lookup failed', costRes.error);
      return { success: false, error: await trError('generic', { code: 'COST_LOOKUP' }) };
    }
    if (invoiceRes.error) {
      logger.error('getOrdersForCostSettlement: legacy invoice lookup failed', invoiceRes.error);
      return { success: false, error: await trError('generic', { code: 'LEGACY_INVOICE_LOOKUP' }) };
    }

    const deliveredMap = deliveredDateOf(historyRes.data as any);
    const costMap = new Map<string, string | null>((costRes.data ?? []).map((c: any) => [c.order_id, c.ups_invoice_no ?? null]));
    const legacyIds = new Set<string>((invoiceRes.data ?? []).map((inv: any) => inv.metadata?.source_order_id).filter(Boolean));

    const rows: CostSettlementOrderRow[] = [];
    for (const order of orders as any[]) {
      const deliveredAt = deliveredMap.get(order.id) ?? null;
      if (deliveredAt) {
        const day = deliveredAt.slice(0, 10);
        if (day < filter.from || day > filter.to) continue;
      } else {
        continue; // 배송완료일 미확인 오더는 기간 필터 대상이 아니다
      }
      const legacyInvoiced = legacyIds.has(order.id);
      rows.push({
        orderId: order.id,
        orderNo: order.order_no,
        shipperName: order.shipper?.name ?? null,
        agencyName: order.agency?.name ?? null,
        deliveredAt,
        settlementStatus: order.cost_settlement_status ?? 'NOT_SETTLED',
        costSettledAt: order.cost_settled_at ?? null,
        upsInvoiceNo: costMap.get(order.id) ?? null,
        hasActualCost: costMap.has(order.id),
        legacyInvoiced,
        excludedReason: legacyInvoiced ? 'LEGACY_INVOICED' : null,
      });
    }

    return { success: true, orders: rows, total: rows.length };
  } catch (err) {
    logger.error('getOrdersForCostSettlement failed:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

export async function unmarkOrderCostSettled(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await assertAdmin(profile);
    if (permErr) return { success: false, error: permErr };
    const { data: order, error: orderError } = await supabase
      .from('zen_orders').select('id, cost_settlement_status').eq('id', orderId).single();
    if (orderError || !order) {
      logger.error('unmarkOrderCostSettled: order lookup failed', orderError ?? orderId);
      return { success: false, error: await trError('order_not_found') };
    }
    if (order.cost_settlement_status !== 'SETTLED') {
      logger.warn(`unmarkOrderCostSettled: not settled (${orderId}, ${order.cost_settlement_status})`);
      return { success: false, error: await trError('not_found') };
    }
    // TASK-B-382 (#1463): 포함 여부는 SECURITY DEFINER RPC로만 확인한다(청구서 데이터 미노출).
    // RPC 오류·비정상 반환은 "미포함"으로 해석하지 않고 해제를 차단(fail-closed).
    const { data: included, error: inclusionError } = await supabase.rpc(
      'zen_billing_statement_order_included',
      { p_order_id: orderId },
    );
    if (inclusionError) {
      logger.error('unmarkOrderCostSettled: statement inclusion RPC failed', inclusionError);
      return { success: false, error: await trError('generic', { code: 'STATEMENT_ITEM_LOOKUP' }) };
    }
    if (typeof included !== 'boolean') {
      logger.error('unmarkOrderCostSettled: unexpected statement inclusion result', included ?? null);
      return { success: false, error: await trError('generic', { code: 'STATEMENT_ITEM_LOOKUP' }) };
    }
    if (included) {
      logger.warn(`unmarkOrderCostSettled: order included in billing statement (${orderId})`);
      return { success: false, error: await trError('statement_includes_order') };
    }
    // 조건부 UPDATE — 동시 되돌리기/재정산 경합에서 1건만 성공.
    const { data: updated, error: updateError } = await supabase
      .from('zen_orders')
      .update({ cost_settlement_status: 'NOT_SETTLED', cost_settled_at: null, cost_settled_by: null })
      .eq('id', orderId).eq('cost_settlement_status', 'SETTLED').select('id');
    if (updateError) {
      logger.error('unmarkOrderCostSettled: conditional update failed', updateError);
      return { success: false, error: await trError('generic', { code: 'UNMARK_UPDATE' }) };
    }
    if (!updated || updated.length === 0) {
      logger.warn(`unmarkOrderCostSettled: concurrent unmark detected (${orderId})`);
      return { success: false, error: await trError('not_found') };
    }
    revalidatePath(`/(dashboard)/orders/${orderId}`, 'page');
    revalidatePath('/admin/ups-actual-charges');
    return { success: true };
  } catch (err) {
    logger.error('unmarkOrderCostSettled failed:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}
