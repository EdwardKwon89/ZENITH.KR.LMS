// TASK-B-360 ⒝-2 (Issue #1366) — 청구서 Excel 출력용 데이터 조회·검증
// 설계: docs/02_Analysis/An_17_부록A_청구서_Excel_출력양식_설계.md v1.0 §1·§3·§4
//   · 금액은 저장값(스냅샷)만 쓴다 — 재계산하지 않는다(§1-1)
//   · 출력 직전 `항목 line_total 합 = 헤더 total_amount` 검증, 불일치면 파일 미생성(§1-1)
//   · 접근 권한은 getBillingStatementDetail과 동일한 RLS — 안 보이면 404(존재 비노출, §1-5)
//   · user-session client만 사용 (service_role 금지)

import { logger } from '@/lib/logger';
import { kstDateString } from '@/lib/utils/date-kst';

// ───────────────────────────────────────────── types

export interface StatementIssuerInfo {
  name: string | null;
  bizNo: string | null;
  repName: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
}

export interface StatementExportHeader {
  id: string;
  statementNo: string;
  tier: string;
  status: 'DRAFT' | 'ISSUED' | 'CLOSED';
  periodYear: number;
  periodMonth: number;
  roundNo: number;
  periodFrom: string | null;
  periodTo: string | null;
  totalAmount: number;
  issuedAt: string | null;
  paidDate: string | null;
  paidAmount: number | null;
  billedPartyType: 'ORG' | 'ADHOC';
  billedName: string | null;
  billedBizNo: string | null;
  billedOrgName: string | null;
  billedOrgBizNo: string | null;
  issuer: StatementIssuerInfo;
}

export interface StatementExportRow {
  orderNo: string | null;
  /** 운송장번호 — voided 제외, 다중이면 쉼표 연결 (§4-C) */
  trackingNo: string;
  /** 기준일 (KST 달력일 → Date) — 없으면 null */
  basisDate: Date | null;
  /** ADMIN_TO_AGENCY 전용 화주명 (§4-E) */
  shipperName: string | null;
  recipientName: string | null;
  recipientCountry: string | null;
  chargeWeightKg: number;
  baseFreight: number;
  fuelSurcharge: number;
  surgeFee: number;
  otherCharges: number;
  lineTotal: number;
}

export interface StatementExportTotals {
  itemCount: number;
  chargeWeightKg: number;
  baseFreight: number;
  fuelSurcharge: number;
  surgeFee: number;
  otherCharges: number;
  lineTotal: number;
}

export interface StatementExportData {
  header: StatementExportHeader;
  rows: StatementExportRow[];
  totals: StatementExportTotals;
}

export type StatementExportLoad =
  | { ok: true; data: StatementExportData }
  | { ok: false; status: 404 | 500; reason: string };

const HEADER_SELECT =
  'id, statement_no, tier, status, period_year, period_month, round_no, period_from, period_to, ' +
  'total_amount, issued_at, paid_date, paid_amount, billed_party_type, billed_name, billed_biz_no, ' +
  'issuer:zen_organizations!issuer_org_id(name, biz_no, rep_name, address, contact_name, contact_phone), ' +
  'billed:zen_organizations!billed_org_id(name, biz_no)';

// ───────────────────────────────────────────── 조회

/** 헤더 + 발행자/청구대상 조직 — RLS로 안 보이면 null (미존재와 동일, §7) */
async function loadStatementHeader(
  supabase: any,
  id: string,
): Promise<{ header: StatementExportHeader } | { status: 404 | 500; reason: string }> {
  const { data, error } = await supabase
    .from('zen_billing_statements')
    .select(HEADER_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    logger.error('[statement-export] header lookup failed', error);
    return { status: 500, reason: 'HEADER_LOOKUP' };
  }
  if (!data) return { status: 404, reason: 'NOT_FOUND' };
  const issuer = (data.issuer ?? {}) as any;
  const billed = (data.billed ?? null) as any;
  return {
    header: {
      id: data.id,
      statementNo: data.statement_no,
      tier: data.tier,
      status: data.status,
      periodYear: data.period_year,
      periodMonth: data.period_month,
      roundNo: data.round_no,
      periodFrom: data.period_from,
      periodTo: data.period_to,
      totalAmount: Number(data.total_amount ?? 0),
      issuedAt: data.issued_at,
      paidDate: data.paid_date,
      paidAmount: data.paid_amount === null ? null : Number(data.paid_amount),
      billedPartyType: data.billed_party_type,
      billedName: data.billed_name,
      billedBizNo: data.billed_biz_no,
      billedOrgName: billed?.name ?? null,
      billedOrgBizNo: billed?.biz_no ?? null,
      issuer: {
        name: issuer.name ?? null,
        bizNo: issuer.biz_no ?? null,
        repName: issuer.rep_name ?? null,
        address: joinAddress(issuer.address, issuer.address_detail),
        contactName: issuer.contact_name ?? null,
        contactPhone: issuer.contact_phone ?? null,
      },
    },
  };
}

function joinAddress(address?: string | null, detail?: string | null): string | null {
  const parts = [address, detail].filter((p): p is string => !!p && p.trim() !== '');
  return parts.length ? parts.join(' ') : null;
}

/** 항목 + 오더 설명 열 (수하인·도착국가·화주명 — 금액 스냅샷이 아닌 표시용, §4) */
async function loadStatementItems(
  supabase: any,
  id: string,
): Promise<{ items: any[] } | { status: 404 | 500; reason: string }> {
  const { data, error } = await supabase
    .from('zen_billing_statement_items')
    .select(
      'order_id, charge_weight_kg, base_freight, fuel_surcharge, surge_fee, other_charges, line_total, ' +
      'order:zen_orders!order_id(order_no, recipient_name, recipient_country_code, shipper_name, ' +
      'shipper:zen_organizations!shipper_id(name))',
    )
    .eq('statement_id', id);
  if (error) {
    logger.error('[statement-export] items lookup failed', error);
    return { status: 500, reason: 'ITEMS_LOOKUP' };
  }
  return { items: (data ?? []) as any[] };
}

/** 운송장번호 (voided 제외) — order_id → 쉼표 연결 문자열 */
async function loadTrackingMap(
  supabase: any,
  orderIds: string[],
): Promise<Map<string, string>> {
  if (!orderIds.length) return new Map();
  const { data, error } = await supabase
    .from('zen_ups_labels')
    .select('order_id, tracking_number')
    .in('order_id', orderIds)
    .eq('is_voided', false);
  if (error) {
    logger.error('[statement-export] labels lookup failed', error);
    return new Map();
  }
  const map = new Map<string, string[]>();
  for (const r of (data ?? []) as any[]) {
    const list = map.get(r.order_id) ?? [];
    if (!list.includes(r.tracking_number)) list.push(r.tracking_number);
    map.set(r.order_id, list);
  }
  return new Map([...map].map(([k, v]) => [k, v.join(',')]));
}

/** 기준일 — 배송완료(DELIVERED) 우선, 없으면 출고확정(RELEASED) (§4-D) */
async function loadBasisDates(
  supabase: any,
  orderIds: string[],
): Promise<Map<string, Date>> {
  if (!orderIds.length) return new Map();
  const { data, error } = await supabase
    .from('order_status_history')
    .select('order_id, next_status, created_at')
    .in('order_id', orderIds)
    .in('next_status', ['DELIVERED', 'RELEASED']);
  if (error) {
    logger.error('[statement-export] basis history lookup failed', error);
    return new Map();
  }
  const best = new Map<string, { status: string; at: string }>();
  for (const h of (data ?? []) as any[]) {
    const cur = best.get(h.order_id);
    const prefer = h.next_status === 'DELIVERED';
    const curPrefer = cur?.status === 'DELIVERED';
    if (!cur || (prefer && !curPrefer) || (prefer === curPrefer && h.created_at > cur.at)) {
      best.set(h.order_id, { status: h.next_status, at: h.created_at });
    }
  }
  const out = new Map<string, Date>();
  for (const [orderId, v] of best) out.set(orderId, kstDateToUtcDate(kstDateString(v.at)));
  return out;
}

/** KST 달력일 문자열 → 해당 날짜를 가리키는 Date (ExcelJS는 UTC 필드로 직렬화) */
export function kstDateToUtcDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// ───────────────────────────────────────────── 집계·검증

export function totalsOf(rows: StatementExportRow[]): StatementExportTotals {
  const sum = (pick: (r: StatementExportRow) => number) => rows.reduce((s, r) => s + pick(r), 0);
  return {
    itemCount: rows.length,
    chargeWeightKg: sum((r) => r.chargeWeightKg),
    baseFreight: sum((r) => r.baseFreight),
    fuelSurcharge: sum((r) => r.fuelSurcharge),
    surgeFee: sum((r) => r.surgeFee),
    otherCharges: sum((r) => r.otherCharges),
    lineTotal: sum((r) => r.lineTotal),
  };
}

/** §1-1: 항목 합 = 헤더 total_amount. 불일치면 파일을 만들지 않는다 */
export function totalsMatchHeader(totals: StatementExportTotals, header: StatementExportHeader): boolean {
  return totals.lineTotal === header.totalAmount;
}

// ───────────────────────────────────────────── orchestration

/** 청구서 Excel 출력용 데이터 로드 — 404(존재 비노출) / 500(조회 실패·합계 불일치) 구분 */
export async function loadStatementExport(supabase: any, id: string): Promise<StatementExportLoad> {
  if (!id) return { ok: false, status: 404, reason: 'NOT_FOUND' };
  const head = await loadStatementHeader(supabase, id);
  if ('status' in head) return { ok: false, ...head };

  const itemRes = await loadStatementItems(supabase, id);
  if ('status' in itemRes) return { ok: false, ...itemRes };

  const orderIds = itemRes.items.map((i: any) => i.order_id);
  const [tracking, basis] = await Promise.all([
    loadTrackingMap(supabase, orderIds),
    loadBasisDates(supabase, orderIds),
  ]);

  const rows = itemRes.items.map((i: any) => toItemRow(i, tracking, basis));
  const totals = totalsOf(rows);
  if (!totalsMatchHeader(totals, head.header)) {
    // 부분 파일 금지 — 생성 자체를 거부한다 (§1-1, §7)
    logger.error(
      `[statement-export] total mismatch (id=${id}, items=${totals.lineTotal} vs header=${head.header.totalAmount})`,
    );
    return { ok: false, status: 500, reason: 'TOTAL_MISMATCH' };
  }
  return { ok: true, data: { header: head.header, rows, totals } };
}

function toItemRow(
  item: any,
  tracking: Map<string, string>,
  basis: Map<string, Date>,
): StatementExportRow {
  const order = (item.order ?? {}) as any;
  const shipperOrg = (order.shipper ?? null) as any;
  return {
    orderNo: order.order_no ?? null,
    trackingNo: tracking.get(item.order_id) ?? '',
    basisDate: basis.get(item.order_id) ?? null,
    shipperName: shipperOrg?.name ?? order.shipper_name ?? null,
    recipientName: order.recipient_name ?? null,
    recipientCountry: order.recipient_country_code ?? null,
    chargeWeightKg: Number(item.charge_weight_kg ?? 0),
    baseFreight: Number(item.base_freight ?? 0),
    fuelSurcharge: Number(item.fuel_surcharge ?? 0),
    surgeFee: Number(item.surge_fee ?? 0),
    otherCharges: Number(item.other_charges ?? 0),
    lineTotal: Number(item.line_total ?? 0),
  };
}
