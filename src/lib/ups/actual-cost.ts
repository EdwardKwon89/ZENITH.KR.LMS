// TASK-B-364 (Issue #1374): UPS 실제원가(KRW) 계산 단일 함수.
//
// 배경(설계 TASK-B-358 / Issue #1363):
//   - 기존에는 경로 A(`recordActualCostAndFinalize`)만 기본운임에 +7%를 적용했고,
//     경로 B(`recordUpsActualCost`)·미리보기는 가산이 없었으며 클라이언트에도 +7% 계산이 중복돼
//     같은 오더가 입력 경로에 따라 다른 원가를 가졌다.
//   - 이 함수는 항목별 통화(`{amount, currency}`)와 통화→KRW 환율 맵을 받아 KRW 원가를 계산한다.
//     가산은 **기본운임에만** 적용하고, 가산율은 `UPS_COST_SURCHARGE_RATE` 한 곳만 참조한다.
//
// 규칙:
//   1) krw = round(amount × rate)
//   2) base.krw = round(amount × rate × (1 + surchargeRate))
//      surchargeAmountKrw = base.krw − round(amount × rate)
//   3) total = base + fuel + surge + Σ(other)
//   4) KRW는 환율 1로 간주하고, 그 외 통화의 환율이 없으면 `MISSING_RATE:<currency>` throw.
import { UPS_COST_SURCHARGE_RATE } from './pricing-engine';

export interface CurrencyAmount {
  amount: number;
  currency: string;
}

export interface RawOtherCharge {
  name: string;
  amount: number;
  currency: string;
}

export interface UpsActualCostAmounts {
  baseFreight: CurrencyAmount;
  fuelSurcharge: CurrencyAmount;
  surgeFee: CurrencyAmount;
  otherCharges: RawOtherCharge[];
}

export interface UpsActualCostRates {
  /** 통화 → KRW 환율 (출고확정일 기준). KRW는 1로 간주한다. */
  exchangeRates: Record<string, number>;
  /** 기본운임 가산율. 미지정 시 UPS_COST_SURCHARGE_RATE. */
  surchargeRate?: number;
}

export interface ComputedLine {
  raw: CurrencyAmount;
  exchangeRate: number;
  krw: number;
}

export interface UpsActualCostComputed {
  base: ComputedLine & { surchargeRate: number; surchargeAmountKrw: number };
  fuel: ComputedLine;
  surge: ComputedLine;
  otherCharges: Array<RawOtherCharge & { exchangeRate: number; krw: number }>;
  otherChargesKrwTotal: number;
  totalCostKrw: number;
  appliedExchangeRates: Record<string, number>;
}

function toAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function resolveRate(currency: string, rates: Record<string, number>): number {
  if (currency === 'KRW') return 1;
  const rate = rates?.[currency];
  if (rate == null || !Number.isFinite(Number(rate))) {
    throw new Error(`MISSING_RATE:${currency}`);
  }
  return Number(rate);
}

/** 항목별 통화를 KRW로 환산해 UPS 실제원가를 계산한다(순수 함수). */
export function computeUpsActualCostKrw(
  amounts: UpsActualCostAmounts,
  rates: UpsActualCostRates,
): UpsActualCostComputed {
  const surchargeRate = rates?.surchargeRate ?? UPS_COST_SURCHARGE_RATE;
  const exchangeRates = rates?.exchangeRates ?? {};
  const appliedExchangeRates: Record<string, number> = {};

  const line = (item: CurrencyAmount): ComputedLine => {
    const raw: CurrencyAmount = { amount: toAmount(item?.amount), currency: item?.currency ?? 'KRW' };
    const exchangeRate = resolveRate(raw.currency, exchangeRates);
    appliedExchangeRates[raw.currency] = exchangeRate;
    return { raw, exchangeRate, krw: Math.round(raw.amount * exchangeRate) };
  };

  const baseLine = line(amounts.baseFreight);
  const baseKrw = Math.round(baseLine.raw.amount * baseLine.exchangeRate * (1 + surchargeRate));
  const surchargeAmountKrw = baseKrw - baseLine.krw;

  const fuel = line(amounts.fuelSurcharge);
  const surge = line(amounts.surgeFee);
  const otherCharges = (amounts.otherCharges ?? []).map((item) => {
    const computed = line(item);
    return { ...item, amount: computed.raw.amount, currency: computed.raw.currency, exchangeRate: computed.exchangeRate, krw: computed.krw };
  });
  const otherChargesKrwTotal = otherCharges.reduce((sum, item) => sum + item.krw, 0);

  return {
    base: { ...baseLine, krw: baseKrw, surchargeRate, surchargeAmountKrw },
    fuel,
    surge,
    otherCharges,
    otherChargesKrwTotal,
    totalCostKrw: baseKrw + fuel.krw + surge.krw + otherChargesKrwTotal,
    appliedExchangeRates,
  };
}
