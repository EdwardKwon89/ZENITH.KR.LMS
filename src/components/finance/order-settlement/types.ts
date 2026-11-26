// TASK-B-369 (Issue #1425) — 오더정산 화면 공용 타입/표시 헬퍼.
// 서버 액션 DTO(getOrdersForCostSettlement)와 구조적으로 동일한 로컬 타입을 사용한다.
// 권한·금액 판정은 클라이언트에서 재계산하지 않고 서버 응답값만 표시한다.

export type CostSettlementStatus = 'NOT_SETTLED' | 'SETTLED';

export interface OrderSettlementRow {
  orderId: string;
  orderNo: string;
  shipperName: string | null;
  agencyName: string | null;
  deliveredAt: string | null;
  settlementStatus: CostSettlementStatus;
  costSettledAt: string | null;
  upsInvoiceNo: string | null;
  hasActualCost: boolean;
  legacyInvoiced: boolean;
  excludedReason: 'LEGACY_INVOICED' | null;
}

export interface OrderSettlementFilter {
  status: CostSettlementStatus | 'ALL';
  from: string;
  to: string;
  q?: string;
}

export interface SystemValues {
  actualWeightKg: number | null;
  volumetricWeightKg: number | null;
  chargeableWeightKg: number | null;
  billingWeightKg: number | null;
  totalSellingPrice: number | null;
}

export interface SavedActualCost {
  upsInvoiceNo: string | null;
  upsInvoiceDate: string | null;
  actualWeightKg: number | null;
  actualLengthCm: number | null;
  actualWidthCm: number | null;
  actualHeightCm: number | null;
  baseFreightHkd: number | null;
  baseFreightCurrency: string | null;
  fuelSurchargeHkd: number | null;
  fuelSurchargeCurrency: string | null;
  surgeFeeHkd: number | null;
  surgeFeeCurrency: string | null;
  otherChargesHkd: number | null;
  otherCharges: Array<{ name: string; amount: number; currency: string }>;
  calcVersion: number;
  notes: string | null;
  totalCostKrw: number;
  /** KRW 기준으로 저장된 기존 행이면 HKD 입력으로 프리필하지 않는다. */
  krwBased: boolean;
}

export interface OrderSettlementDetailData {
  orderId: string;
  orderNo: string;
  settlementStatus: CostSettlementStatus;
  costSettledAt: string | null;
  deliveredAt: string | null;
  releasedAt: string | null;
  shipperName: string | null;
  agencyName: string | null;
  upsProductCode: string | null;
  recipientCountryCode: string | null;
  exchangeRate: number | null;
  legacyInvoiced: boolean;
  system: SystemValues | null;
  revenueBaseline: { agencyTotal: number; shipperTotal: number };
  savedCost: SavedActualCost | null;
}

const krwFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });

/** KRW 천 단위 포맷 — 서버 금액을 그대로 표시(클라이언트 재계산 없음). */
export function formatKrw(value: number | null | undefined): string {
  return krwFormatter.format(Math.round(Number(value) || 0));
}

/** 중량·치수 등 소수 표시. */
export function formatDecimal(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return decimalFormatter.format(Number(value));
}

/** ISO 타임스탬프 → KST 날짜(YYYY-MM-DD). 목록/상세의 배송완료·정산일 표시용. */
export function formatKstDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

/** 금액 입력 문자열 → 숫자 | null (빈 문자열은 미입력으로 취급). */
export function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
