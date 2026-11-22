'use server';

import { revalidatePath } from 'next/cache';
import { validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { getExchangeRate } from '@/lib/finance/exchange-rate';
import { estimateUpsFreight } from '@/app/actions/ups/freight';
import { trError } from '@/lib/i18n/action-error';
import { computeUpsActualCostKrw, type UpsActualCostAmounts } from '@/lib/ups/actual-cost';
import { getOrderReleasedDate } from '@/lib/orders/order-released-date';

export interface UpsActualCostInput {
  upsInvoiceNo?: string;
  upsInvoiceDate?: string;
  actualWeightKg?: number;
  actualLengthCm?: number;
  actualWidthCm?: number;
  actualHeightCm?: number;
  baseFreightHkd?: number;
  baseFreightCurrency?: string; // TASK-B-317: 기본운임 통화 선택
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

type CurrencyAwareInput = UpsActualCostInput & {
  baseFreightKrw?: number;
  baseFreightCurrency?: string;
  fuelSurchargeKrw?: number;
  surgeFeeKrw?: number;
  otherChargesKrw?: number;
  otherCharges?: { name: string; amount: number; currency: string }[];
};

/** 청구확정(A) 입력 형태인지 판별한다. B(원가 폼)는 HKD 필드만 사용한다. */
function isFinalizeCostInput(input: CurrencyAwareInput): boolean {
  return input.baseFreightCurrency != null
    || input.baseFreightKrw != null
    || input.fuelSurchargeKrw != null
    || input.otherChargesKrw != null;
}

/** 입력을 통합 계산 함수의 `amounts`/`rates` 형태로 정규화한다. */
function buildCostAmounts(input: CurrencyAwareInput, baseExchangeRate: number) {
  const toNumLocal = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  if (isFinalizeCostInput(input)) {
    const currency = input.baseFreightCurrency || 'KRW';
    const otherCharges = (input.otherCharges ?? []).map((c) => ({
      name: c.name,
      amount: toNumLocal(c.amount),
      currency: c.currency || 'KRW',
    }));
    const otherKrw = toNumLocal(input.otherChargesKrw ?? input.otherChargesHkd);
    if (otherCharges.length === 0 && otherKrw > 0) {
      otherCharges.push({ name: '기타부가운임', amount: otherKrw, currency: 'KRW' });
    }
    return {
      amounts: {
        baseFreight: { amount: toNumLocal(input.baseFreightKrw ?? input.baseFreightHkd), currency },
        fuelSurcharge: { amount: toNumLocal(input.fuelSurchargeKrw ?? input.fuelSurchargeHkd), currency: 'KRW' },
        surgeFee: { amount: toNumLocal(input.surgeFeeKrw ?? input.surgeFeeHkd), currency: 'KRW' },
        otherCharges,
      } as UpsActualCostAmounts,
      exchangeRates: { KRW: 1, [currency]: baseExchangeRate } as Record<string, number>,
    };
  }

  const otherHkd = toNumLocal(input.otherChargesHkd);
  return {
    amounts: {
      baseFreight: { amount: toNumLocal(input.baseFreightHkd), currency: 'HKD' },
      fuelSurcharge: { amount: toNumLocal(input.fuelSurchargeHkd), currency: 'HKD' },
      surgeFee: { amount: toNumLocal(input.surgeFeeHkd), currency: 'HKD' },
      otherCharges: otherHkd > 0
        ? [{ name: '기타부가운임', amount: otherHkd, currency: 'HKD' }]
        : [],
    } as UpsActualCostAmounts,
    exchangeRates: { HKD: baseExchangeRate, KRW: 1 } as Record<string, number>,
  };
}

const ADMIN_ROLES = ['ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const;

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

  if (error) {
    logger.error('getUpsActualCost: zen_ups_actual_cost select failed', error);
    throw new Error(await trError('generic', { code: 'ACTUAL_COST_LOOKUP' }));
  }
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
    const permErr = await assertAdmin(profile);
    if (permErr) return { success: false, error: permErr };

    const { data: order, error: orderError } = await supabase
      .from('zen_orders')
      .select(`
        id,
        order_no,
        status,
        cost_settlement_status,
        transport_mode,
        shipper_id,
        agency_org_id,
        recipient_country_code,
        ups_product_code,
        incoterms,
        created_at,
        snapshot:zen_order_rate_snapshots ( metadata )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      if (orderError) logger.error('recordUpsActualCost: zen_orders select failed', orderError);
      else logger.warn(`recordUpsActualCost: order not found (${orderId})`);
      return { success: false, error: await trError('order_not_found') };
    }
    if (order.transport_mode !== 'UPS') {
      logger.warn(`recordUpsActualCost: not a UPS order (${orderId})`);
      return { success: false, error: await trError('not_ups_order') };
    }
    if (order.status !== 'IN_TRANSIT' && order.status !== 'DELIVERED') {
      logger.warn(`recordUpsActualCost: invalid status ${order.status} (${orderId})`);
      return { success: false, error: await trError('ups_actual_cost_status_invalid') };
    }
    // TASK-B-366: 정산 완료 오더는 원가 수정 금지(먼저 정산 해제 필요)
    if ((order as any).cost_settlement_status === 'SETTLED') {
      logger.warn(`recordUpsActualCost: cost settlement locked (${orderId})`);
      return { success: false, error: await trError('cost_settled_locked') };
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
    if (upsertError) {
      logger.error('recordUpsActualCost: zen_ups_actual_cost upsert failed', upsertError);
      return { success: false, error: await trError('generic', { code: 'ACTUAL_COST_SAVE' }) };
    }

    // 2. RELEASED 일자 기준 HKD/KRW 환율 → 통합 계산(기본운임 +7% 포함)
    const releasedDate = await getOrderReleasedDate(supabase, orderId, order.created_at);
    const exchangeRate = await getExchangeRate('HKD', 'KRW', releasedDate, supabase);
    const { amounts, exchangeRates } = buildCostAmounts(input, exchangeRate);
    const computed = computeUpsActualCostKrw(amounts, { exchangeRates });
    const totalCostKrw = computed.totalCostKrw;

    const { error: updateError } = await supabase
      .from('zen_ups_actual_cost')
      .update({
        applied_exchange_rate: exchangeRate,
        total_cost_krw: totalCostKrw,
        cost_surcharge_rate: computed.base.surchargeRate,
        cost_surcharge_amount_krw: computed.base.surchargeAmountKrw,
        applied_exchange_rates: computed.appliedExchangeRates,
        calc_version: 2,
      })
      .eq('order_id', orderId);
    if (updateError) {
      logger.error('recordUpsActualCost: exchange rate update failed', updateError);
      return { success: false, error: await trError('generic', { code: 'ACTUAL_COST_EXCHANGE_SAVE' }) };
    }

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

      if (invError) {
        logger.error('recordUpsActualCost: zen_invoices lookup failed', invError);
        return { success: false, error: await trError('generic', { code: 'INVOICE_LOOKUP' }) };
      }

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
            if (!res.success) {
              logger.error('recordUpsActualCost: ADMIN_TO_AGENCY post-finalization adjustment failed', res.error);
              return { success: false, error: await trError('generic', { code: 'POST_FINALIZATION_ADJUST' }) };
            }
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
          if (updErr) {
            logger.error('recordUpsActualCost: ADMIN_TO_AGENCY invoice update failed', updErr);
            return { success: false, error: await trError('generic', { code: 'INVOICE_UPDATE' }) };
          }
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
            if (!res.success) {
              logger.error('recordUpsActualCost: shipper post-finalization adjustment failed', res.error);
              return { success: false, error: await trError('generic', { code: 'POST_FINALIZATION_ADJUST' }) };
            }
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
          if (insErr) {
            logger.error('recordUpsActualCost: shipper adjustment cost insert failed', insErr);
            return { success: false, error: await trError('generic', { code: 'ADJUSTMENT_COST_CREATE' }) };
          }
        }

        const { data: linkedCosts, error: costsError } = await supabase
          .from('zen_order_costs')
          .select('unit_price, quantity')
          .eq('invoice_id', inv.id);
        if (costsError) {
          logger.error('recordUpsActualCost: linked cost lookup failed', costsError);
          return { success: false, error: await trError('generic', { code: 'LINKED_COST_LOOKUP' }) };
        }

        const newTotal = (linkedCosts || []).reduce((sum, c) => sum + toNum(c.unit_price) * toNum(c.quantity), 0);
        const { error: updInvErr } = await supabase
          .from('zen_invoices')
          .update({ total_amount: newTotal })
          .eq('id', inv.id);
        if (updInvErr) {
          logger.error('recordUpsActualCost: shipper invoice amount update failed', updInvErr);
          return { success: false, error: await trError('generic', { code: 'INVOICE_AMOUNT_UPDATE' }) };
        }
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
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

/** 실제 원가 확정 미리보기 — 저장 없이 적용 환율/원가/재계산 결과만 반환 */
export async function previewUpsActualCost(
  orderId: string,
  input: CurrencyAwareInput
): Promise<UpsActualCostResult> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await assertAdmin(profile);
    if (permErr) return { success: false, error: permErr };

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
        incoterms,
        created_at,
        snapshot:zen_order_rate_snapshots ( metadata )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      if (orderError) logger.error('UPS actual cost: zen_orders select failed', orderError);
      else logger.warn(`UPS actual cost: order not found (${orderId})`);
      return { success: false, error: await trError('order_not_found') };
    }
    if (order.transport_mode !== 'UPS') {
      logger.warn(`UPS actual cost: not a UPS order (${orderId})`);
      return { success: false, error: await trError('not_ups_order') };
    }

    const rawSnapshot = (order as any).snapshot;
    const snapshotMeta = (Array.isArray(rawSnapshot) ? rawSnapshot?.[0]?.metadata : rawSnapshot?.metadata) as Record<string, any> | null;
    (order as any).snapshot = snapshotMeta || {};

    const hkdTotal = toNum(input.baseFreightHkd) + toNum(input.fuelSurchargeHkd) + toNum(input.surgeFeeHkd) + toNum(input.otherChargesHkd);
    const releasedDate = await getOrderReleasedDate(supabase, orderId, order.created_at);
    const previewInput = input as CurrencyAwareInput;
    const previewIsFinalize = isFinalizeCostInput(previewInput);
    const previewCurrency = previewInput.baseFreightCurrency || 'KRW';
    const baseExchangeRate = !previewIsFinalize
      ? await getExchangeRate('HKD', 'KRW', releasedDate, supabase)
      : previewCurrency === 'KRW'
        ? 1
        : await getExchangeRate(previewCurrency, 'KRW', releasedDate, supabase);
    const { amounts, exchangeRates } = buildCostAmounts(previewInput, baseExchangeRate);
    for (const currency of new Set(amounts.otherCharges.map((c) => c.currency))) {
      if (currency !== 'KRW' && exchangeRates[currency] == null) {
        exchangeRates[currency] = await getExchangeRate(currency, 'KRW', releasedDate, supabase);
      }
    }
    const computed = computeUpsActualCostKrw(amounts, { exchangeRates });
    const totalCostKrw = computed.totalCostKrw;
    const appliedRate = computed.base.exchangeRate;

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

    return { success: true, releasedDate, appliedExchangeRate: appliedRate, hkdTotal, totalCostKrw, recalc };
  } catch (err: any) {
    logger.error('Error previewing UPS actual cost:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

// TASK-B-317 (Issue #1158, 4단계): 개별 오더 청구확정 — 실제원가 저장 + 인보이스 마감
export async function recordActualCostAndFinalize(
  orderId: string,
  input: UpsActualCostInput & {
    baseFreightKrw?: number;
    fuelSurchargeKrw?: number;
    surgeFeeKrw?: number;
    otherChargesKrw?: number;
    otherCharges?: { name: string; amount: number; currency: string }[];
    invoiceId?: string;
    reason?: string;
  }
): Promise<UpsActualCostResult & { finalized?: boolean }> {
  try {
    const { supabase, profile, user } = await validateUserAction();
    if (!profile) return { success: false, error: await trError('profile_not_found') };
    const permErr = await assertAdmin(profile);
    if (permErr) return { success: false, error: permErr };

    // 1. 오더 조회
    const { data: order, error: orderError } = await supabase
      .from('zen_orders')
      .select('id, status, transport_mode, cost_settlement_status, shipper_id, created_at')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      if (orderError) logger.error('UPS actual cost: zen_orders select failed', orderError);
      else logger.warn(`UPS actual cost: order not found (${orderId})`);
      return { success: false, error: await trError('order_not_found') };
    }
    if (order.transport_mode !== 'UPS') {
      logger.warn(`UPS actual cost: not a UPS order (${orderId})`);
      return { success: false, error: await trError('not_ups_order') };
    }

    // 2. 상태 검증 (IN_TRANSIT 또는 DELIVERED에서만 가능)
    if (!['IN_TRANSIT', 'DELIVERED'].includes(order.status)) {
      logger.warn(`recordActualCostAndFinalize: invalid status ${order.status} (${orderId})`);
      return { success: false, error: await trError('billing_finalize_status_invalid') };
    }
    // TASK-B-366: 정산 완료 오더는 원가 수정 금지(먼저 정산 해제 필요)
    if ((order as any).cost_settlement_status === 'SETTLED') {
      logger.warn(`recordActualCostAndFinalize: cost settlement locked (${orderId})`);
      return { success: false, error: await trError('cost_settled_locked') };
    }

    // 3. 출고확정일 환율 조회
    const releasedDate = await getOrderReleasedDate(supabase, orderId, order.created_at);
    const exchangeRate = await getExchangeRate('HKD', 'KRW', releasedDate, supabase);

    // 4. KRW 금액 계산 — 통합 함수(항목별 통화, 기본운임에만 +7%)
    const baseFreightCurrency = input.baseFreightCurrency || 'KRW';
    const baseCurrencyRate = baseFreightCurrency === 'KRW'
      ? 1
      : await getExchangeRate(baseFreightCurrency, 'KRW', releasedDate, supabase);
    const finalizeInput = input as CurrencyAwareInput;
    const { amounts, exchangeRates } = buildCostAmounts(finalizeInput, baseCurrencyRate);
    exchangeRates.HKD = exchangeRates.HKD ?? exchangeRate;
    for (const currency of new Set(amounts.otherCharges.map((c) => c.currency))) {
      if (currency !== 'KRW' && exchangeRates[currency] == null) {
        exchangeRates[currency] = await getExchangeRate(currency, 'KRW', releasedDate, supabase);
      }
    }
    const computed = computeUpsActualCostKrw(amounts, { exchangeRates });
    const baseFreightKrw = computed.base.krw;
    const totalCostKrw = computed.totalCostKrw;
    const otherChargesKrw = computed.otherChargesKrwTotal;
    const appliedExchangeRate = computed.base.exchangeRate;

    // 5. zen_ups_actual_cost upsert
    const { error: upsertError } = await supabase
      .from('zen_ups_actual_cost')
      .upsert({
        order_id: orderId,
        ups_invoice_no: input.upsInvoiceNo || null,
        ups_invoice_date: input.upsInvoiceDate || null,
        actual_weight_kg: input.actualWeightKg || null,
        actual_length_cm: input.actualLengthCm || null,
        actual_width_cm: input.actualWidthCm || null,
        actual_height_cm: input.actualHeightCm || null,
        base_freight_hkd: baseFreightKrw, // 환율 적용된 KRW 값 (스키마 변경은 후속 PR)
        fuel_surcharge_hkd: computed.fuel.krw,
        surge_fee_hkd: computed.surge.krw,
        other_charges_hkd: otherChargesKrw,
        base_freight_currency: baseFreightCurrency,
        fuel_surcharge_currency: 'KRW',
        surge_fee_currency: 'KRW',
        applied_exchange_rate: appliedExchangeRate,
        total_cost_krw: totalCostKrw,
        cost_surcharge_rate: computed.base.surchargeRate,
        cost_surcharge_amount_krw: computed.base.surchargeAmountKrw,
        applied_exchange_rates: computed.appliedExchangeRates,
        calc_version: 2,
        entered_by: user.id,
        notes: input.notes || null,
      }, { onConflict: 'order_id' });

    if (upsertError) {
      logger.error('recordActualCostAndFinalize: zen_ups_actual_cost upsert failed', upsertError);
      return { success: false, error: await trError('generic', { code: 'ACTUAL_COST_SAVE' }) };
    }

    // 6. 기타부가운임 저장 (zen_ups_actual_other_charges)
    // DEF-B-159: 목록이 비어도 항상 기존 자식 행을 삭제해 메인 합계와 정합을 맞춘다.
    await supabase
      .from('zen_ups_actual_other_charges')
      .delete()
      .eq('order_id', orderId);

    if (computed.otherCharges.length > 0) {
      // 새 기타부가운임 삽입 (목록 정규화 결과)
      const charges = computed.otherCharges.map((c) => ({
        order_id: orderId,
        charge_name: c.name,
        amount: c.amount,
        currency: c.currency,
      }));

      if (charges.length > 0) {
        const { error: chargesError } = await supabase
          .from('zen_ups_actual_other_charges')
          .insert(charges);

        if (chargesError) {
          logger.error('recordActualCostAndFinalize: other charges insert failed', chargesError);
          return { success: false, error: await trError('generic', { code: 'OTHER_CHARGES_SAVE' }) };
        }
      }
    }

    // 7. 인보이스 마감 (finalizeInvoice)
    let finalized = false;
    if (input.invoiceId) {
      const { finalizeInvoice } = await import('./settlement');
      const result = await finalizeInvoice(input.invoiceId, input.reason || '청구확정');
      if (!result.success) {
        logger.warn('Invoice finalization failed:', result.error);
        // 인보이스 마감 실패해도 실제 원가는 저장됨
      } else {
        finalized = true;
      }
    }

    revalidatePath('/(dashboard)/finance/daily-billing', 'page');
    revalidatePath(`/(dashboard)/orders/${orderId}`, 'page');

    return {
      success: true,
      releasedDate,
      appliedExchangeRate: exchangeRate,
      hkdTotal: toNum(input.baseFreightHkd) + toNum(input.fuelSurchargeHkd) + toNum(input.surgeFeeHkd) + toNum(input.otherChargesHkd),
      totalCostKrw,
      finalized,
    };
  } catch (err: any) {
    logger.error('Error recording actual cost and finalizing:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

// ─── TASK-B-366 (Issue #1376): 오더정산 목록·정산완료 서버 액션 ────────────────

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

/** 컷오버일 이전 오더 판정 — 실제 기준일은 #1369에서 확정한다. */
function isBeforeCutover(_order: { created_at?: string | null }): boolean {
  // TODO(#1369): 컷오버일 확정 후 구현. 이번 Task에서는 항상 false(stub).
  return false;
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

/** Admin 오더정산 완료 — DELIVERED·UPS·원가 입력·레거시 미청구·미정산 조건을 모두 만족해야 한다. */
export async function markOrderCostSettled(orderId: string): Promise<{ success: boolean; settledAt?: string; error?: string }> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await assertAdmin(profile);
    if (permErr) return { success: false, error: permErr };

    const { data: order, error: orderError } = await supabase
      .from('zen_orders')
      .select('id, status, transport_mode, cost_settlement_status, created_at')
      .eq('id', orderId)
      .single();
    if (orderError || !order) {
      logger.warn(`markOrderCostSettled: order not found (${orderId})`);
      return { success: false, error: await trError('order_not_found') };
    }
    if (order.transport_mode !== 'UPS') return { success: false, error: await trError('not_ups_order') };
    if (order.status !== 'DELIVERED') {
      logger.warn(`markOrderCostSettled: order not delivered (${orderId}, ${order.status})`);
      return { success: false, error: await trError('ups_actual_cost_status_invalid') };
    }
    if (order.cost_settlement_status === 'SETTLED') {
      logger.warn(`markOrderCostSettled: already settled (${orderId})`);
      return { success: false, error: await trError('already_settled') };
    }
    if (isBeforeCutover(order)) {
      logger.warn(`markOrderCostSettled: before cutover (${orderId})`);
      return { success: false, error: await trError('legacy_invoiced_order') };
    }

    const { data: costRow } = await supabase.from('zen_ups_actual_cost').select('id').eq('order_id', orderId).maybeSingle();
    if (!costRow) {
      logger.warn(`markOrderCostSettled: actual cost missing (${orderId})`);
      return { success: false, error: await trError('cost_not_entered') };
    }

    const { data: legacyInvoices } = await supabase
      .from('zen_invoices')
      .select('id')
      .filter('metadata->>source_order_id', 'eq', orderId)
      .neq('status', 'CANCELED')
      .limit(1);
    if (legacyInvoices && legacyInvoices.length > 0) {
      logger.warn(`markOrderCostSettled: legacy per-order invoice exists (${orderId})`);
      return { success: false, error: await trError('legacy_invoiced_order') };
    }

    const settledAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('zen_orders')
      .update({ cost_settlement_status: 'SETTLED', cost_settled_at: settledAt, cost_settled_by: profile!.id })
      .eq('id', orderId)
      .eq('cost_settlement_status', 'NOT_SETTLED')
      .select('id');
    if (updateError) {
      logger.error('markOrderCostSettled: conditional update failed', updateError);
      return { success: false, error: await trError('generic', { code: 'SETTLE_UPDATE' }) };
    }
    if (!updated || updated.length === 0) {
      logger.warn(`markOrderCostSettled: concurrent settle detected (${orderId})`);
      return { success: false, error: await trError('already_settled') };
    }

    revalidatePath(`/(dashboard)/orders/${orderId}`, 'page');
    revalidatePath('/admin/ups-actual-charges');
    return { success: true, settledAt };
  } catch (err) {
    logger.error('markOrderCostSettled failed:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

/** TASK-B-367 (#1377): Admin 오더정산 되돌리기 — 청구서에 포함된 오더는 거부한다. */
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
    // 어떤 tier든 청구서 항목이 있으면 거부 — 조회 오류는 "없음"이 아니라 실패로 처리.
    const { data: items, error: itemsError } = await supabase
      .from('zen_billing_statement_items').select('id').eq('order_id', orderId).limit(1);
    if (itemsError) {
      logger.error('unmarkOrderCostSettled: statement items lookup failed', itemsError);
      return { success: false, error: await trError('generic', { code: 'STATEMENT_ITEM_LOOKUP' }) };
    }
    if (items && items.length > 0) {
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
