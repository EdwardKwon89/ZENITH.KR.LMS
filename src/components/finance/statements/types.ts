// TASK-B-361 (Issue #1367) — 청구서 화면 공용 타입/헬퍼.
// 서버 액션 DTO(billing-statements.ts)와 구조적으로 동일한 로컬 타입을 사용한다.
// 권한 판정은 절대 클라이언트 role/scope 계산으로 하지 않고 서버 응답의 scope만 사용한다.

export type StatementScope = 'MINE' | 'RECEIVED' | 'SUPERVISED';
export type StatementStatus = 'DRAFT' | 'ISSUED' | 'CLOSED';
export type DateBasis = 'DELIVERED' | 'RELEASED';

export interface StatementTarget {
  id: string;
  name: string;
  type?: string;
}

export interface BillableOrderRow {
  orderId: string;
  orderNo: string;
  basisDate: string | null;
  shipperName: string | null;
  agencyName: string | null;
  chargeWeightKg: number;
  baseFreight: number;
  fuelSurcharge: number;
  surgeFee: number;
  otherCharges: number;
  lineTotal: number;
}

export interface StatementListRow {
  id: string;
  statementNo: string;
  billedName: string | null;
  billedOrgId: string | null;
  billedPartyType: string;
  tier: string;
  periodYear: number;
  periodMonth: number;
  roundNo: number;
  totalAmount: number;
  status: string;
  scope: StatementScope;
  createdAt: string;
}

export interface StatementItemRow {
  orderId: string;
  orderNo: string | null;
  chargeWeightKg: number;
  baseFreight: number;
  fuelSurcharge: number;
  surgeFee: number;
  otherCharges: number;
  lineTotal: number;
}

export interface StatementDetail {
  id: string;
  statementNo: string;
  billedPartyType: string;
  billedOrgId: string | null;
  billedName: string | null;
  billedBizNo: string | null;
  tier: string;
  periodYear: number;
  periodMonth: number;
  roundNo: number;
  periodFrom: string | null;
  periodTo: string | null;
  totalAmount: number;
  status: string;
  issuerOrgId: string;
  scope: StatementScope;
  createdAt: string;
  items: StatementItemRow[];
}

export interface AdhocShipperName {
  name: string;
  normalized: string;
  count: number;
  billableCount: number;
}

const krwFormatter = new Intl.NumberFormat('ko-KR');

/** KRW 천 단위 포맷 — 서버 금액을 그대로 표시(클라이언트 재계산 없음). */
export function formatKrw(value: number): string {
  return krwFormatter.format(Math.round(Number(value) || 0));
}

export function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function isIssuerScope(scope: StatementScope): boolean {
  // MINE만 작업 가능. RECEIVED/SUPERVISED는 읽기 전용 경로 — 서버가 이미 이 값을 내려준다.
  return scope === 'MINE';
}
