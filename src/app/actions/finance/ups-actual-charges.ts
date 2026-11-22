'use server';

import { revalidatePath } from 'next/cache';
import { validateAdminAction, validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { trError } from '@/lib/i18n/action-error';
import { createAdminClient } from '@/utils/supabase/server';

export interface UpsActualChargeInput {
  chargeType: string;
  amount: number;
  currency: string;
  upsInvoiceNo?: string;
  upsInvoiceDate?: string;
  notes?: string;
}

const ADMIN_ROLES = ['ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const;

/**
 * TASK-B-372 (Issue #1356 / DEF-150 §1.1): AGENCY 스코프 화주 목록.
 * `settlement.ts`의 `resolveAgencyShipperIds()` 패턴과 동일하게
 * 소속 화주(active) + 대리점 자가화주(`agencyOrgId`)를 포함한다(DEF-B-141).
 */
async function resolveAgencyScopeShipperIds(
  supabase: any,
  agencyOrgId: string | null | undefined,
): Promise<string[]> {
  if (!agencyOrgId) return [];
  const { data, error } = await supabase
    .from('zen_agency_shippers')
    .select('shipper_org_id')
    .eq('agency_org_id', agencyOrgId)
    .eq('is_active', true);
  if (error) {
    // 조회 실패 시 자가화주만 허용(안전한 축소) — 전체 허용으로 열지 않는다.
    logger.error('resolveAgencyScopeShipperIds: zen_agency_shippers lookup failed', error);
    return [agencyOrgId];
  }
  const downstream = (data || []).map((row: any) => row.shipper_org_id).filter(Boolean) as string[];
  return [...new Set([...downstream, agencyOrgId])];
}

/** TASK-B-352: 권한 실패는 throw 대신 로케일 문장을 반환한다(사용자 도달 경로). */
async function assertAdminOrAgency(profile: { role: string; org_id?: string }): Promise<string | null> {
  if (ADMIN_ROLES.includes(profile.role as any)) return null;
  if (profile.role === 'AGENCY') return null;
  logger.warn(`[assertAdminOrAgency] Denied for role: ${profile.role}`);
  return trError('permission_denied');
}

export async function recordUpsActualCharges(
  orderId: string,
  charges: UpsActualChargeInput[]
): Promise<{ success: boolean; adjustmentAmount?: number; error?: string }> {
  try {
    const { supabase, user, profile } = await validateUserAction();
    const permErr = await assertAdminOrAgency(profile);
    if (permErr) return { success: false, error: permErr };

    // TASK-B-372 리뷰 ①: service_role 쓰기는 RLS의 ACTIVE 조건을 우회하므로 명시 검증.
    if (profile.role === 'AGENCY' && profile.status !== 'ACTIVE') {
      logger.warn(`recordUpsActualCharges: inactive agency profile (${profile.id ?? 'unknown'})`);
      return { success: false, error: await trError('permission_denied') };
    }

    const { data: order, error: orderError } = await supabase
      .from('zen_orders')
      .select('status, transport_mode, shipper_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      if (orderError) logger.error('recordUpsActualCharges: zen_orders select failed', orderError);
      else logger.warn(`recordUpsActualCharges: order not found (${orderId})`);
      return { success: false, error: await trError('order_not_found') };
    }

    if (order.transport_mode !== 'UPS') {
      logger.warn(`recordUpsActualCharges: not a UPS order (${orderId})`);
      return { success: false, error: await trError('not_ups_order') };
    }

    // AGENCY: 소속 화주 + 대리점 자가화주 오더만 허용 (DEF-150 §1.1 / DEF-B-141)
    if (profile.role === 'AGENCY') {
      const shipperIds = await resolveAgencyScopeShipperIds(supabase, profile.org_id);
      if (!order.shipper_id || !shipperIds.includes(order.shipper_id)) {
        logger.warn(`recordUpsActualCharges: shipper out of agency scope (${orderId})`);
        return { success: false, error: await trError('shipper_scope_denied') };
      }
    }

    if (order.status !== 'IN_TRANSIT' && order.status !== 'DELIVERED') {
      logger.warn(`recordUpsActualCharges: invalid status ${order.status} (${orderId})`);
      return { success: false, error: await trError('ups_actual_charge_status_invalid') };
    }

    // TASK-B-372 (#1356): AGENCY는 소속/자가화주 검증을 통과한 뒤에만 service_role로
    // 쓰기를 수행한다(zen_ups_actual_charges·zen_order_costs·zen_invoices 모두 AGENCY
    // INSERT/UPDATE 정책이 없어 사용자 세션으로는 실비등록이 불가능 — DEF-150 §1.1).
    if (charges.some((c) => !Number.isFinite(c.amount))) {
      logger.warn(`recordUpsActualCharges: non-finite amount (${orderId})`);
      return { success: false, error: await trError('cost_amount_invalid') };
    }

    const writeDb = profile.role === 'AGENCY' ? await createAdminClient() : supabase;

    const { data: existingInvoices } = await writeDb
      .from('zen_invoices')
      .select('id, is_finalized, invoice_tier, billed_org_id, metadata')
      .filter('metadata->>source_order_id', 'eq', orderId)
      .neq('status', 'CANCELED');

    // 리뷰 ②: 쓰기(실비 DELETE/INSERT) 이전에 마감 인보이스 여부를 확정한다.
    // AGENCY는 마감 조정(createPostFinalizationAdjustment, admin 전용)을 호출할 수 없으므로
    // 부분 쓰기를 만들지 않고 사전 거부한다.
    const finalizedInvoices = (existingInvoices || []).filter((inv: any) => inv.is_finalized);
    if (profile.role === 'AGENCY' && finalizedInvoices.length > 0) {
      logger.warn(`recordUpsActualCharges: finalized invoice exists for agency (${orderId})`);
      return { success: false, error: await trError('invoice_already_finalized') };
    }

    const { error: deleteError } = await writeDb
      .from('zen_ups_actual_charges')
      .delete()
      .eq('order_id', orderId);

    if (deleteError) {
      logger.error('recordUpsActualCharges: zen_ups_actual_charges delete failed', deleteError);
      return { success: false, error: await trError('generic', { code: 'CHARGES_DELETE' }) };
    }

    let additionalSum = 0;
    const actualChargesToInsert = charges.map((c) => {
      additionalSum += c.amount;
      return {
        order_id: orderId,
        charge_type: c.chargeType,
        charge_amount: c.amount,
        currency: c.currency,
        ups_invoice_no: c.upsInvoiceNo || null,
        ups_invoice_date: c.upsInvoiceDate || null,
        notes: c.notes || null,
        entered_by: user.id,
      };
    });

    if (actualChargesToInsert.length > 0) {
      const { error: insertError } = await writeDb
        .from('zen_ups_actual_charges')
        .insert(actualChargesToInsert);

      if (insertError) {
        logger.error('recordUpsActualCharges: zen_ups_actual_charges insert failed', insertError);
        return { success: false, error: await trError('generic', { code: 'CHARGES_INSERT' }) };
      }
    }

    const { data: estimatedCosts, error: estError } = await writeDb
      .from('zen_order_costs')
      .select('cost_type, unit_price, quantity')
      .eq('order_id', orderId)
      .in('cost_type', ['BASE_FREIGHT', 'FUEL_SURCHARGE', 'SURGE_FEE', 'OTHER_CHARGE']);

    if (estError) {
      logger.error('recordUpsActualCharges: estimated cost lookup failed', estError);
      return { success: false, error: await trError('generic', { code: 'ESTIMATED_COST_LOOKUP' }) };
    }

    const estimatedSum = (estimatedCosts || []).reduce((sum, cost) => {
      return sum + (Number(cost.unit_price) * Number(cost.quantity || 1));
    }, 0);

    const actualSum = estimatedSum + additionalSum;
    const adjustmentAmount = actualSum - estimatedSum;

    // 마감 후 조정: 신규 추가 인보이스 발행 경로 (TASK-194-C) — ADMIN/MANAGER 전용
    if (finalizedInvoices.length > 0) {
      const { createPostFinalizationAdjustment } = await import('@/app/actions/finance/settlement');
      const results = await Promise.all(
        finalizedInvoices.map((inv: any) =>
          createPostFinalizationAdjustment(orderId, adjustmentAmount, charges[0]?.currency || 'USD', user.id, inv.id)
        )
      );
      const failed = results.find((r: any) => !r.success);
      if (failed) {
        logger.error('recordUpsActualCharges: post-finalization adjustment failed', failed.error);
        return { success: false, error: await trError('generic', { code: 'POST_FINALIZATION_ADJUST' }) };
      }
      return { success: true, adjustmentAmount };
    }

    // zen_order_costs에 UPS_ACTUAL_ADJUSTMENT upsert
    if (adjustmentAmount === 0) {
      const { error: deleteCostError } = await writeDb
        .from('zen_order_costs')
        .delete()
        .eq('order_id', orderId)
        .eq('cost_type', 'UPS_ACTUAL_ADJUSTMENT');

      if (deleteCostError) {
        logger.error('recordUpsActualCharges: adjustment cost delete failed', deleteCostError);
        return { success: false, error: await trError('generic', { code: 'ADJUSTMENT_DELETE' }) };
      }
    } else {
      const { data: existingAdjustId, error: checkCostError } = await writeDb
        .from('zen_order_costs')
        .select('id')
        .eq('order_id', orderId)
        .eq('cost_type', 'UPS_ACTUAL_ADJUSTMENT')
        .maybeSingle();

      if (checkCostError) {
        logger.error('recordUpsActualCharges: adjustment cost lookup failed', checkCostError);
        return { success: false, error: await trError('generic', { code: 'ADJUSTMENT_LOOKUP' }) };
      }

      const defaultCurrency = charges[0]?.currency || 'USD';

      if (existingAdjustId) {
        const { error: updateCostError } = await writeDb
          .from('zen_order_costs')
          .update({ unit_price: adjustmentAmount, currency: defaultCurrency })
          .eq('id', existingAdjustId.id);

        if (updateCostError) {
          logger.error('recordUpsActualCharges: adjustment cost update failed', updateCostError);
          return { success: false, error: await trError('generic', { code: 'ADJUSTMENT_UPDATE' }) };
        }
      } else {
        const { error: insertCostError } = await writeDb
          .from('zen_order_costs')
          .insert({
            order_id: orderId,
            cost_type: 'UPS_ACTUAL_ADJUSTMENT',
            unit_price: adjustmentAmount,
            quantity: 1,
            currency: defaultCurrency,
            is_revenue: true,
          });

        if (insertCostError) {
          logger.error('recordUpsActualCharges: adjustment cost insert failed', insertCostError);
          return { success: false, error: await trError('generic', { code: 'ADJUSTMENT_INSERT' }) };
        }
      }
    }

    // 마감 전 갱신: 연결된 인보이스 total_amount 재계산
    for (const inv of (existingInvoices || [])) {
      // 리뷰 ③: AGENCY가 플랫폼→대리점(ADMIN_TO_AGENCY) 청구액을 바꾸지 않도록 제외.
      // AGENCY는 자신이 발행하는 AGENCY_TO_SHIPPER만 실비 반영한다(설계 의견 — Aiden 확인 요청).
      if (profile.role === 'AGENCY' && inv.invoice_tier !== 'AGENCY_TO_SHIPPER') continue;
      if (inv.invoice_tier === 'ADMIN_TO_AGENCY') {
        // ADMIN_TO_AGENCY: metadata.platform_breakdown에서 platformTotal 계산 + additionalSum
        const meta = (inv.metadata || {}) as Record<string, any>;
        const breakdown = meta.platform_breakdown || {};
        const platformTotal = Number(breakdown.baseFreight || 0)
          + Number(breakdown.fuelSurcharge || 0)
          + Number(breakdown.surgeFee || 0)
          + Number(breakdown.otherCharges || 0);
        const newTotal = platformTotal + additionalSum;

        const { error: updateInvError } = await writeDb
          .from('zen_invoices')
          .update({ total_amount: newTotal })
          .eq('id', inv.id);

        if (updateInvError) {
          logger.error('recordUpsActualCharges: ADMIN_TO_AGENCY invoice amount update failed', updateInvError);
          return { success: false, error: await trError('generic', { code: 'INVOICE_AMOUNT_UPDATE' }) };
        }
      } else {
        // AGENCY_TO_SHIPPER / ADMIN_TO_SHIPPER: 기존 로직 (zen_order_costs 기반)
        if (adjustmentAmount !== 0) {
          const { error: linkError } = await writeDb
            .from('zen_order_costs')
            .update({ invoice_id: inv.id })
            .eq('order_id', orderId)
            .eq('cost_type', 'UPS_ACTUAL_ADJUSTMENT')
            .is('invoice_id', null);

          if (linkError) {
            logger.error('recordUpsActualCharges: adjustment cost link failed', linkError);
            return { success: false, error: await trError('generic', { code: 'ADJUSTMENT_LINK' }) };
          }
        }

        const { data: linkedCosts, error: costsError } = await writeDb
          .from('zen_order_costs')
          .select('unit_price, quantity')
          .eq('invoice_id', inv.id);

        if (costsError) {
          logger.error('recordUpsActualCharges: linked cost lookup failed', costsError);
          return { success: false, error: await trError('generic', { code: 'LINKED_COST_LOOKUP' }) };
        }

        const newTotal = (linkedCosts || []).reduce((sum, c) => {
          return sum + (Number(c.unit_price) * Number(c.quantity || 1));
        }, 0);

        const { error: updateInvError } = await writeDb
          .from('zen_invoices')
          .update({ total_amount: newTotal })
          .eq('id', inv.id);

        if (updateInvError) {
          logger.error('recordUpsActualCharges: invoice amount update failed', updateInvError);
          return { success: false, error: await trError('generic', { code: 'INVOICE_AMOUNT_UPDATE' }) };
        }
      }
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/(dashboard)/orders/${orderId}`);
    revalidatePath(`/admin/ups-actual-charges`);

    return { success: true, adjustmentAmount };
  } catch (err: any) {
    logger.error('Error recording UPS actual charges:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

export async function getUpsActualCharges(orderId: string) {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_ups_actual_charges')
    .select(`
      *,
      entered_by_profile:entered_by (
        full_name,
        email
      )
    `)
    .eq('order_id', orderId)
    .order('entered_at', { ascending: true });

  if (error) {
    logger.error('getUpsActualCharges: zen_ups_actual_charges select failed', error);
    throw new Error(await trError('generic', { code: 'ACTUAL_CHARGES_LOOKUP' }));
  }

  return data;
}

export async function getUpsChargeReconciliation(orderId: string) {
  const { supabase } = await validateUserAction();

  // 1. 예상비용 합산
  const { data: estimatedCosts, error: estError } = await supabase
    .from('zen_order_costs')
    .select('cost_type, unit_price, quantity, currency')
    .eq('order_id', orderId)
    .in('cost_type', ['BASE_FREIGHT', 'FUEL_SURCHARGE', 'SURGE_FEE', 'OTHER_CHARGE']);

  if (estError) {
    logger.error('getUpsChargeReconciliation: estimated cost lookup failed', estError);
    throw new Error(await trError('generic', { code: 'ESTIMATED_COST_LOOKUP' }));
  }

  const currency = estimatedCosts?.[0]?.currency || 'USD';
  const estimated = (estimatedCosts || []).reduce((sum, cost) => {
    return sum + (Number(cost.unit_price) * Number(cost.quantity || 1));
  }, 0);

  const estimatedBreakdown = (estimatedCosts || []).map((cost) => ({
    costType: cost.cost_type,
    amount: Number(cost.unit_price) * Number(cost.quantity || 1),
    currency: cost.currency,
  }));

  // 2. 실제청구 합산
  const { data: actualCharges, error: actError } = await supabase
    .from('zen_ups_actual_charges')
    .select('charge_amount')
    .eq('order_id', orderId);

  if (actError) {
    logger.error('getUpsChargeReconciliation: actual charge lookup failed', actError);
    throw new Error(await trError('generic', { code: 'ACTUAL_CHARGES_LOOKUP' }));
  }

  const additionalSum = (actualCharges || []).reduce((sum, charge) => {
    return sum + Number(charge.charge_amount);
  }, 0);

  const actual = estimated + additionalSum;

  const variance = actual - estimated;

  // 3. 정산 마감 여부 확인 + 청구서 정보 조회
  const { data: existingInvoice } = await supabase
    .from('zen_invoices')
    .select('id, invoice_no, created_at, is_finalized')
    .filter('metadata->>source_order_id', 'eq', orderId)
    .neq('status', 'CANCELED')
    .maybeSingle();

  return {
    estimated,
    estimatedBreakdown,
    actual,
    variance,
    currency,
    isFinalized: !!existingInvoice?.is_finalized,
    invoiceNo: existingInvoice?.invoice_no ?? null,
    invoiceDate: existingInvoice?.created_at ?? null,
  };
}

export async function searchDeliveredUpsOrders(query: string) {
  const { supabase, profile } = await validateUserAction();
  const permErr = await assertAdminOrAgency(profile);
  if (permErr) throw new Error(permErr);

  const trimmed = query.trim();
  if (!trimmed) return [];

  // 1. zen_orders 에서 order_no 검색
  const { data: orders, error } = await supabase
    .from('zen_orders')
    .select(`
      id,
      order_no,
      status,
      transport_mode,
      shipper_id,
      dest_country_code:recipient_country_code,
      created_at,
      tracking_config:zen_tracking_configs(tracking_no)
    `)
    .eq('transport_mode', 'UPS')
    .in('status', ['IN_TRANSIT', 'DELIVERED'])
    .ilike('order_no', `%${trimmed}%`);

  if (error) {
    logger.error('searchDeliveredUpsOrders: zen_orders search failed', error);
    throw new Error(await trError('generic', { code: 'ORDER_SEARCH' }));
  }

  // AGENCY: 소속 화주 + 대리점 자가화주 오더만 필터링 (DEF-150 §1.1 / DEF-B-141)
  // 1단계(order_no)와 2단계(tracking_no) 모두 같은 스코프를 적용한다.
  const agencyScope = profile.role === 'AGENCY'
    ? new Set(await resolveAgencyScopeShipperIds(supabase, profile.org_id))
    : null;
  let resultList = orders || [];
  if (agencyScope) {
    resultList = resultList.filter((o) => o.shipper_id != null && agencyScope.has(o.shipper_id));
  }

  const orderIds = new Set<string>(resultList.map((o) => o.id));

  // 2. tracking_no 로 검색
  const { data: trackingMatches, error: trackErr } = await supabase
    .from('zen_tracking_configs')
    .select('order_id')
    .ilike('tracking_no', `%${trimmed}%`);

  if (trackErr) {
    logger.error('searchDeliveredUpsOrders: tracking number lookup failed', trackErr);
  }
  if (!trackErr && trackingMatches) {
    const matchedIds = trackingMatches.map((m) => m.order_id).filter(Boolean) as string[];
    const idsToFetch = matchedIds.filter(id => !orderIds.has(id));

    if (idsToFetch.length > 0) {
      let moreOrdersQuery = supabase
        .from('zen_orders')
        .select(`
          id,
          order_no,
          status,
          transport_mode,
          shipper_id,
          dest_country_code:recipient_country_code,
          created_at,
          tracking_config:zen_tracking_configs(tracking_no)
        `)
        .eq('transport_mode', 'UPS')
        .in('status', ['IN_TRANSIT', 'DELIVERED'])
        .in('id', idsToFetch);

      const { data: moreOrders } = await moreOrdersQuery;

      if (moreOrders) {
        moreOrders.forEach((o) => {
          // 2단계 결과에도 AGENCY 스코프를 적용한다(누락 시 타 화주 오더 노출).
          if (agencyScope && (o.shipper_id == null || !agencyScope.has(o.shipper_id))) return;
          if (!orderIds.has(o.id)) {
            resultList.push(o);
            orderIds.add(o.id);
          }
        });
      }
    }
  }

  return resultList;
}
