import 'server-only';

import { getOrderReleasedDate } from '@/lib/orders/order-released-date';
import { computeUpsActualCostKrw, type UpsActualCostAmounts } from '@/lib/ups/actual-cost';
import { estimateUpsFreightCore } from '@/lib/ups/estimate-core';
import {
  SettlementCurrencyError,
  type SettlementCostSummary,
  type SettlementRunCharge,
  type SettlementRunTierAmount,
  type UpsSettlementInput,
  type UpsSettlementPreview,
} from './types';

const toNum = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * 출고확정일(`getOrderReleasedDate`) 기준 환율 — §2-1 5단계.
 *
 * 정산마감 금액은 청구서에 그대로 반영되므로 `getExchangeRate`의 최후 fallback(1350)을
 * 쓰지 않는다. 해당 통화쌍의 유효 환율이 없으면 조용히 다른 금액으로 확정하지 않고
 * `SettlementCurrencyError` → `currency_conversion_failed`로 실패시킨다.
 */
async function resolveRate(supabase: any, currency: string, date: string): Promise<number> {
  const code = String(currency || 'KRW').toUpperCase();
  if (code === 'KRW') return 1;
  const { data, error } = await supabase
    .from('zen_exchange_rates')
    .select('rate')
    .eq('base_currency', code)
    .eq('quote_currency', 'KRW')
    .eq('is_active', true)
    .lte('rate_date', date)
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new SettlementCurrencyError(code);
  const rate = Number((data as { rate?: number } | null)?.rate);
  if (!Number.isFinite(rate) || rate <= 0) throw new SettlementCurrencyError(code);
  return rate;
}

/** 원가 저장용 금액(항목별 통화 → KRW) — 출고확정일 환율. */
export async function computeSettlementCost(
  supabase: any,
  order: { id: string; created_at?: string | null },
  input: UpsSettlementInput
): Promise<{ summary: SettlementCostSummary; amounts: UpsActualCostAmounts }> {
  const releasedDate = await getOrderReleasedDate(supabase, order.id, order.created_at ?? undefined);
  const baseCurrency = (input.baseFreight?.currency || 'KRW').toUpperCase();
  const currencies = new Set<string>([
    baseCurrency,
    (input.fuelSurcharge?.currency || 'KRW').toUpperCase(),
    (input.surgeFee?.currency || 'KRW').toUpperCase(),
    ...(input.otherCharges ?? []).map((c) => (c.currency || 'KRW').toUpperCase()),
    'KRW',
  ]);
  const exchangeRates: Record<string, number> = {};
  for (const currency of currencies) exchangeRates[currency] = await resolveRate(supabase, currency, releasedDate);

  const amounts: UpsActualCostAmounts = {
    baseFreight: { amount: toNum(input.baseFreight?.amount), currency: baseCurrency },
    fuelSurcharge: { amount: toNum(input.fuelSurcharge?.amount), currency: (input.fuelSurcharge?.currency || 'KRW').toUpperCase() },
    surgeFee: { amount: toNum(input.surgeFee?.amount), currency: (input.surgeFee?.currency || 'KRW').toUpperCase() },
    otherCharges: (input.otherCharges ?? []).map((c) => ({
      name: String(c.name ?? '').trim(),
      amount: toNum(c.amount),
      currency: (c.currency || 'KRW').toUpperCase(),
    })),
  };
  const computed = computeUpsActualCostKrw(amounts, { exchangeRates });

  return {
    summary: {
      releasedDate,
      baseCurrency,
      exchangeRates: computed.appliedExchangeRates,
      totalCostKrw: computed.totalCostKrw,
      baseCostKrw: computed.base.krw,
      fuelCostKrw: computed.fuel.krw,
      surgeCostKrw: computed.surge.krw,
      otherChargesCostKrw: computed.otherChargesKrwTotal,
      baseRawKrw: computed.base.krw,
      surchargeRate: computed.base.surchargeRate,
      surchargeAmountKrw: computed.base.surchargeAmountKrw,
      appliedExchangeRates: computed.appliedExchangeRates,
    },
    amounts,
  };
}

interface OrderForSettlement {
  id: string;
  ups_product_id?: string | null;
  ups_product_code?: string | null;
  recipient_country_code?: string | null;
  agency_org_id?: string | null;
  shipper_id?: string | null;
  incoterms?: string | null;
  snapshot?: { metadata?: Record<string, any> } | null;
}

/** run 금액·항목 payload(원가/매출 target 계산). `zen_order_costs`는 갱신하지 않는다. */
export async function buildSettlementPreview(
  supabase: any,
  order: OrderForSettlement,
  input: UpsSettlementInput,
  cost: SettlementCostSummary
): Promise<UpsSettlementPreview> {
  const snapshot = (order.snapshot?.metadata ?? null) as Record<string, any> | null;
  const productCode = order.ups_product_code || null;
  let productId = order.ups_product_id || null;
  if (!productId && productCode) {
    const { data } = await supabase.from('zen_ups_products').select('id').eq('product_code', productCode).maybeSingle();
    productId = data?.id ?? null;
  }

  const platformWeight = toNum(snapshot?.platform?.billingWeightKg) || toNum(snapshot?.platform?.chargeableWeightKg) || 0;
  const actualWeight = input.actualWeightKg ?? platformWeight;
  if (!productId || !order.recipient_country_code) {
    throw new Error('estimate_unavailable');
  }

  const estimate = await estimateUpsFreightCore(
    {
      productId,
      destCountryCode: order.recipient_country_code,
      actualWeightKg: actualWeight,
      dimL: input.actualLengthCm,
      dimW: input.actualWidthCm,
      dimH: input.actualHeightCm,
      incoterms: (order.incoterms as 'DDU' | 'DDP' | undefined) ?? undefined,
      agencyOrgId: order.agency_org_id ?? undefined,
      shipperOrgId: order.shipper_id ?? undefined,
    },
    supabase
  );

  const platform = estimate.platform;
  const platformComponents = {
    base: toNum(platform.baseSellingPrice),
    fuel: toNum(platform.fuelSurchargeSellingAmount),
    surge: toNum(platform.surgeFeeSellingAmount),
    other: toNum(platform.otherChargesSellingTotal),
  };
  const platformTotal = platformComponents.base + platformComponents.fuel + platformComponents.surge + platformComponents.other;

  const agency = estimate.agency;
  const shipper = estimate.shipper;
  const agencyComponents = agency
    ? { base: toNum(agency.baseSellingPrice), fuel: toNum(agency.fuelSurchargeSellingAmount), surge: toNum(agency.surgeFeeSellingAmount), other: toNum(agency.otherChargesSellingTotal) }
    : platformComponents;
  const shipperComponents = shipper
    ? { base: toNum(shipper.baseSellingPrice), fuel: toNum(shipper.fuelSurchargeSellingAmount), surge: toNum(shipper.surgeFeeSellingAmount), other: toNum(shipper.otherChargesSellingTotal) }
    : platformComponents;
  const agencyTarget = agency ? toNum(agency.agencyCostPrice) : platformTotal;
  const shipperTarget = shipper ? toNum(shipper.finalFreight) : platformTotal;

  const chargesKrw = (input.otherCharges ?? []).map((c, idx) => ({
    line_no: idx + 1,
    name: String(c.name ?? '').trim(),
    amount: round2(toNum(c.amount) * (cost.exchangeRates[(c.currency || 'KRW').toUpperCase()] ?? 1)),
  }));
  const chargesTotal = round2(chargesKrw.reduce((sum, c) => sum + c.amount, 0));

  const buildAmount = (tier: 'ADMIN_TO_AGENCY' | 'SHIPPER', comp: typeof platformComponents, target: number) => {
    const base = round2(comp.base);
    const fuel = round2(comp.fuel);
    const surge = round2(comp.surge);
    const other = round2(comp.other);
    const sum = round2(base + fuel + surge + other);
    const adjustment = round2(target - sum);
    return {
      tier,
      base_freight: base,
      fuel_surcharge: fuel,
      surge_fee: surge,
      other_charges: other,
      freight_adjustment: adjustment,
      settlement_charges_total: chargesTotal,
      line_total: round2(sum + adjustment + chargesTotal),
    } satisfies SettlementRunTierAmount;
  };

  const amounts: SettlementRunTierAmount[] = [
    buildAmount('ADMIN_TO_AGENCY', agencyComponents, agencyTarget),
    buildAmount('SHIPPER', shipperComponents, shipperTarget),
  ];
  const charges: SettlementRunCharge[] = [
    ...chargesKrw.map((c) => ({ tier: 'ADMIN_TO_AGENCY' as const, ...c })),
    ...chargesKrw.map((c) => ({ tier: 'SHIPPER' as const, ...c })),
  ];

  return {
    releasedDate: cost.releasedDate,
    chargeWeightKg: round2(toNum(platform.billingWeightKg) || actualWeight),
    cost,
    amounts,
    charges,
  };
}
