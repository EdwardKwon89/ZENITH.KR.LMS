'use server';

import { revalidatePath } from 'next/cache';
import { validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { getExchangeRate } from '@/lib/finance/exchange-rate';
import { estimateUpsFreight } from '@/app/actions/ups/freight';

export interface UpsActualCostInput {
  upsInvoiceNo?: string;
  upsInvoiceDate?: string;
  actualWeightKg?: number;
  actualLengthCm?: number;
  actualWidthCm?: number;
  actualHeightCm?: number;
  baseFreightHkd?: number;
  fuelSurchargeHkd?: number;
  surgeFeeHkd?: number;
  otherChargesHkd?: number;
  notes?: string;
}

export interface UpsActualCostResult {
  success: boolean;
  error?: string;
  releasedDate?: string;
  appliedExchangeRate?: number;
  hkdTotal?: number;
  totalCostKrw?: number;
  recalc?: {
    weightOrDimsChanged: boolean;
    newAgencyTotal: number;
    newShipperTotal: number;
    agencyDelta: number;
    shipperDelta: number;
  };
}

const ADMIN_ROLES = ['ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const;

function assertAdmin(profile: { role: string }) {
  if (ADMIN_ROLES.includes(profile.role as any)) return;
  throw new Error('UPS 실제 원가 확정 권한이 없습니다 (ADMIN/MANAGER만 가능).');
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 오더 출고확정(RELEASED) 일자 조회 — order_status_history에서 to_status=RELEASED 최신 시각 */
export async function getOrderReleasedDate(supabase: any, orderId: string, fallbackCreatedAt?: string): Promise<string> {
  const { data } = await supabase
    .from('order_status_history')
    .select('created_at')
    .eq('order_id', orderId)
    .eq('next_status', 'RELEASED')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const ts = data?.created_at || fallbackCreatedAt;
  if (!ts) return new Date().toISOString().slice(0, 10);
  return String(ts).slice(0, 10);
}

/** 기존 실제 원가 확정 기록 조회 */
export async function getUpsActualCost(orderId: string) {
  const { supabase } = await validateUserAction();
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

  if (error) throw new Error(`실제 원가 조회 실패: ${error.message}`);
  return data;
}

/** 실측값 기반 매출(agency/shipper) 재계산 — estimateUpsFreight 재호출 */
async function recomputeRevenue(
  supabase: any,
  order: any,
  actual: { actualWeightKg?: number; actualLengthCm?: number; actualWidthCm?: number; actualHeightCm?: number }
) {
  const productId = order.ups_product_id || null;
  const productCode = order.ups_product_code || null;

  const platformBase = toNum(order.snapshot?.platform?.totalSellingPrice);
  const hasSnapshot = !!order.snapshot?.platform;

  if (!productCode) {
    return { newAgencyTotal: platformBase, newShipperTotal: platformBase, estimate: null, hasSnapshot };
  }

  let resolvedProductId = productId;
  if (!resolvedProductId) {
    const { data: product } = await supabase
      .from('zen_ups_products')
      .select('id')
      .eq('product_code', productCode)
      .maybeSingle();
    resolvedProductId = product?.id || null;
  }

  if (!resolvedProductId) {
    return { newAgencyTotal: platformBase, newShipperTotal: platformBase, estimate: null, hasSnapshot };
  }

  const estimate = await estimateUpsFreight({
    productId: resolvedProductId,
    destCountryCode: order.recipient_country_code,
    actualWeightKg: actual.actualWeightKg ?? toNum((order.snapshot?.platform as any)?.chargeableWeightKg),
    dimL: actual.actualLengthCm,
    dimW: actual.actualWidthCm,
    dimH: actual.actualHeightCm,
    incoterms: order.incoterms,
    agencyOrgId: order.agency_org_id ?? undefined,
    shipperOrgId: order.shipper_id,
  });

  const platform = estimate.platform || {};
  const newPlatformTotal =
    toNum(platform.baseSellingPrice) +
    toNum(platform.fuelSurchargeSellingAmount) +
    toNum(platform.surgeFeeSellingAmount) +
    toNum(platform.otherChargesSellingTotal);

  const agency = estimate.agency;
  const newAgencyTotal = agency
    ? toNum(agency.agencyCostPrice) > 0
      ? toNum(agency.agencyCostPrice)
      : newPlatformTotal
    : newPlatformTotal;

  const shipper = estimate.shipper;
  const newShipperTotal = shipper ? toNum(shipper.finalFreight) : newPlatformTotal;

  return { newAgencyTotal, newShipperTotal, estimate, hasSnapshot: true };
}

/** 실제 원가 확정 저장 (Issue #1009) */
export async function recordUpsActualCost(
  orderId: string,
  input: UpsActualCostInput
): Promise<UpsActualCostResult> {
  try {
    const { supabase, user, profile } = await validateUserAction();
    assertAdmin(profile);

    const { data: order, error: orderError } = await supabase
      .from('zen_orders')
      .select(`
        id,
        order_no,
        status,
        transport_mode,
        shipper_id,
        agency_org_id,
        recipient_country_code,
        ups_product_code,
        ups_product_id,
        incoterms,
        created_at,
        snapshot:zen_order_rate_snapshots ( metadata )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) return { success: false, error: '오더를 찾을 수 없습니다.' };
    if (order.transport_mode !== 'UPS') return { success: false, error: 'UPS 오더가 아닙니다.' };
    if (order.status !== 'IN_TRANSIT' && order.status !== 'DELIVERED') {
      return { success: false, error: '오더가 IN_TRANSIT 또는 DELIVERED 상태일 때만 실제 원가를 입력할 수 있습니다.' };
    }

    const rawSnapshot = (order as any).snapshot;
    const snapshotMeta = (Array.isArray(rawSnapshot) ? rawSnapshot?.[0]?.metadata : rawSnapshot?.metadata) as Record<string, any> | null;
    (order as any).snapshot = snapshotMeta || {};

    const hkdTotal = toNum(input.baseFreightHkd) + toNum(input.fuelSurchargeHkd) + toNum(input.surgeFeeHkd) + toNum(input.otherChargesHkd);

    // 1. 실제 원가 행 upsert
    const { error: upsertError } = await supabase.from('zen_ups_actual_cost').upsert(
      {
        order_id: orderId,
        ups_invoice_no: input.upsInvoiceNo || null,
        ups_invoice_date: input.upsInvoiceDate || null,
        actual_weight_kg: input.actualWeightKg ?? null,
        actual_length_cm: input.actualLengthCm ?? null,
        actual_width_cm: input.actualWidthCm ?? null,
        actual_height_cm: input.actualHeightCm ?? null,
        base_freight_hkd: toNum(input.baseFreightHkd),
        fuel_surcharge_hkd: toNum(input.fuelSurchargeHkd),
        surge_fee_hkd: toNum(input.surgeFeeHkd),
        other_charges_hkd: toNum(input.otherChargesHkd),
        entered_by: user.id,
        notes: input.notes || null,
      },
      { onConflict: 'order_id' }
    );
    if (upsertError) return { success: false, error: `실제 원가 저장 실패: ${upsertError.message}` };

    // 2. RELEASED 일자 기준 HKD/KRW 환율 → KRW 환산 원가
    const releasedDate = await getOrderReleasedDate(supabase, orderId, order.created_at);
    const exchangeRate = await getExchangeRate('HKD', 'KRW', releasedDate, supabase);
    const totalCostKrw = Math.round(hkdTotal * exchangeRate * 100) / 100;

    const { error: updateError } = await supabase
      .from('zen_ups_actual_cost')
      .update({ applied_exchange_rate: exchangeRate, total_cost_krw: totalCostKrw })
      .eq('order_id', orderId);
    if (updateError) return { success: false, error: `원가 환산 저장 실패: ${updateError.message}` };

    // 3. 부피/최종중량 변경 시 agency/shipper 매출 연동 재계산
    const weightOrDimsChanged =
      input.actualWeightKg != null || input.actualLengthCm != null || input.actualWidthCm != null || input.actualHeightCm != null;

    let recalc: UpsActualCostResult['recalc'] = {
      weightOrDimsChanged: false,
      newAgencyTotal: 0,
      newShipperTotal: 0,
      agencyDelta: 0,
      shipperDelta: 0,
    };

    if (weightOrDimsChanged) {
      const revenue = await recomputeRevenue(supabase, order, input);
      recalc = {
        weightOrDimsChanged: true,
        newAgencyTotal: revenue.newAgencyTotal,
        newShipperTotal: revenue.newShipperTotal,
        agencyDelta: 0,
        shipperDelta: 0,
      };

      const { data: existingInvoices, error: invError } = await supabase
        .from('zen_invoices')
        .select('id, invoice_tier, total_amount, is_finalized, currency, metadata')
        .filter('metadata->>source_order_id', 'eq', orderId)
        .neq('status', 'CANCELED');

      if (invError) return { success: false, error: `인보이스 조회 실패: ${invError.message}` };

      const shipperInvoices = (existingInvoices || []).filter(
        (inv: any) => inv.invoice_tier === 'AGENCY_TO_SHIPPER' || inv.invoice_tier === 'ADMIN_TO_SHIPPER'
      );
      const agencyInvoice = (existingInvoices || []).find((inv: any) => inv.invoice_tier === 'ADMIN_TO_AGENCY');

      // ADMIN_TO_AGENCY — total_amount 직접 갱신 + platform_breakdown 갱신 / 마감 후 조정
      if (agencyInvoice) {
        const oldAgency = toNum(agencyInvoice.total_amount);
        const agencyDelta = Math.round((revenue.newAgencyTotal - oldAgency) * 100) / 100;
        recalc.agencyDelta = agencyDelta;

        if (agencyInvoice.is_finalized) {
          if (agencyDelta !== 0) {
            const { createPostFinalizationAdjustment } = await import('@/app/actions/finance/settlement');
            const res = await createPostFinalizationAdjustment(
              orderId, agencyDelta, agencyInvoice.currency || 'USD', user.id, agencyInvoice.id
            );
            if (!res.success) return { success: false, error: `ADMIN_TO_AGENCY 마감 후 조정 실패: ${res.error}` };
          }
        } else {
          const meta = (agencyInvoice.metadata || {}) as Record<string, any>;
          const est = revenue.estimate as any;
          const ag = est?.agency;
          const platform = (est?.platform || {}) as Record<string, any>;
          const hasAgencyBreakdown = !!ag && typeof ag.baseSellingPrice === 'number';
          const newBreakdown = {
            baseFreight: hasAgencyBreakdown ? toNum(ag.baseSellingPrice) : toNum(platform.baseSellingPrice),
            fuelSurcharge: hasAgencyBreakdown ? toNum(ag.fuelSurchargeSellingAmount) : toNum(platform.fuelSurchargeSellingAmount),
            surgeFee: hasAgencyBreakdown ? toNum(ag.surgeFeeSellingAmount) : toNum(platform.surgeFeeSellingAmount),
            otherCharges: hasAgencyBreakdown ? toNum(ag.otherChargesSellingTotal) : toNum(platform.otherChargesSellingTotal),
          };
          const { error: updErr } = await supabase
            .from('zen_invoices')
            .update({ total_amount: revenue.newAgencyTotal, metadata: { ...meta, platform_breakdown: newBreakdown } })
            .eq('id', agencyInvoice.id);
          if (updErr) return { success: false, error: `ADMIN_TO_AGENCY 인보이스 갱신 실패: ${updErr.message}` };
        }
      }

      // AGENCY_TO_SHIPPER / ADMIN_TO_SHIPPER — UPS_ACTUAL_COST_ADJ 델타 반영
      for (const inv of shipperInvoices) {
        const oldShipper = toNum(inv.total_amount);
        const shipperDelta = Math.round((revenue.newShipperTotal - oldShipper) * 100) / 100;
        recalc.shipperDelta = shipperDelta;

        if (inv.is_finalized) {
          if (shipperDelta !== 0) {
            const { createPostFinalizationAdjustment } = await import('@/app/actions/finance/settlement');
            const res = await createPostFinalizationAdjustment(
              orderId, shipperDelta, inv.currency || 'USD', user.id, inv.id
            );
            if (!res.success) return { success: false, error: `화주 인보이스 마감 후 조정 실패: ${res.error}` };
          }
          continue;
        }

        // 멱등성: 기존 UPS_ACTUAL_COST_ADJ 삭제 후 델타 재생성
        await supabase
          .from('zen_order_costs')
          .delete()
          .eq('order_id', orderId)
          .eq('cost_type', 'UPS_ACTUAL_COST_ADJ');

        if (shipperDelta !== 0) {
          const { error: insErr } = await supabase.from('zen_order_costs').insert({
            order_id: orderId,
            cost_type: 'UPS_ACTUAL_COST_ADJ',
            unit_price: shipperDelta,
            quantity: 1,
            currency: inv.currency || 'USD',
            is_revenue: true,
            invoice_id: inv.id,
          });
          if (insErr) return { success: false, error: `화주 조정 비용 생성 실패: ${insErr.message}` };
        }

        const { data: linkedCosts, error: costsError } = await supabase
          .from('zen_order_costs')
          .select('unit_price, quantity')
          .eq('invoice_id', inv.id);
        if (costsError) return { success: false, error: `연결 비용 조회 실패: ${costsError.message}` };

        const newTotal = (linkedCosts || []).reduce((sum, c) => sum + toNum(c.unit_price) * toNum(c.quantity), 0);
        const { error: updInvErr } = await supabase
          .from('zen_invoices')
          .update({ total_amount: newTotal })
          .eq('id', inv.id);
        if (updInvErr) return { success: false, error: `화주 인보이스 금액 갱신 실패: ${updInvErr.message}` };
      }
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/(dashboard)/orders/${orderId}`);
    revalidatePath(`/admin/ups-actual-charges`);

    return {
      success: true,
      releasedDate,
      appliedExchangeRate: exchangeRate,
      hkdTotal,
      totalCostKrw,
      recalc,
    };
  } catch (err: any) {
    logger.error('Error recording UPS actual cost:', err);
    return { success: false, error: err.message || '알 수 없는 서버 오류' };
  }
}

/** 실제 원가 확정 미리보기 — 저장 없이 적용 환율/원가/재계산 결과만 반환 */
export async function previewUpsActualCost(
  orderId: string,
  input: UpsActualCostInput
): Promise<UpsActualCostResult> {
  try {
    const { supabase, profile } = await validateUserAction();
    assertAdmin(profile);

    const { data: order, error: orderError } = await supabase
      .from('zen_orders')
      .select(`
        id,
        status,
        transport_mode,
        shipper_id,
        agency_org_id,
        recipient_country_code,
        ups_product_code,
        ups_product_id,
        incoterms,
        created_at,
        snapshot:zen_order_rate_snapshots ( metadata )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) return { success: false, error: '오더를 찾을 수 없습니다.' };
    if (order.transport_mode !== 'UPS') return { success: false, error: 'UPS 오더가 아닙니다.' };

    const rawSnapshot = (order as any).snapshot;
    const snapshotMeta = (Array.isArray(rawSnapshot) ? rawSnapshot?.[0]?.metadata : rawSnapshot?.metadata) as Record<string, any> | null;
    (order as any).snapshot = snapshotMeta || {};

    const hkdTotal = toNum(input.baseFreightHkd) + toNum(input.fuelSurchargeHkd) + toNum(input.surgeFeeHkd) + toNum(input.otherChargesHkd);
    const releasedDate = await getOrderReleasedDate(supabase, orderId, order.created_at);
    const exchangeRate = await getExchangeRate('HKD', 'KRW', releasedDate, supabase);
    const totalCostKrw = Math.round(hkdTotal * exchangeRate * 100) / 100;

    const weightOrDimsChanged =
      input.actualWeightKg != null || input.actualLengthCm != null || input.actualWidthCm != null || input.actualHeightCm != null;

    let recalc: UpsActualCostResult['recalc'] = undefined;
    if (weightOrDimsChanged) {
      const revenue = await recomputeRevenue(supabase, order, input);
      recalc = {
        weightOrDimsChanged: true,
        newAgencyTotal: revenue.newAgencyTotal,
        newShipperTotal: revenue.newShipperTotal,
        agencyDelta: 0,
        shipperDelta: 0,
      };
    }

    return { success: true, releasedDate, appliedExchangeRate: exchangeRate, hkdTotal, totalCostKrw, recalc };
  } catch (err: any) {
    logger.error('Error previewing UPS actual cost:', err);
    return { success: false, error: err.message || '알 수 없는 서버 오류' };
  }
}
