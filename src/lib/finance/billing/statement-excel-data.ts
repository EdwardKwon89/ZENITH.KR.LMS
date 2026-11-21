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
  'issuer:zen_organizations!issuer_org_id(name, biz_no, rep_name, address, address_detail, contact_name, contact_phone), ' +
  'billed:zen_organizations!billed_org_id(name, biz_no)';

// ───────────────────────────────────────────── 조회
// ───────────────────────────────────────────── 페이징 조회 (PostgREST `max_rows=1000` 잘림 방지)

/** 페이지 크기 — supabase/config.toml `max_rows=1000`보다 작게 잡아 페이지 경계 잘림을 피한다 */
const PAGE_SIZE = 500;
/** 안전 상한 — 이 행 수를 넘어도 페이지가 비지 않으면 이상 상태로 보고 500 (조용한 부분 출력 금지) */
const MAX_ROWS = 10000;

type PageFetch = (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>;
type PageResult = { rows: any[] } | { status: 500; reason: string };

/**
 * 페이지 단위 전량 조회 — 조회 실패는 빈 결과로 삼키지 않고 500으로 전파한다(§7 부분 파일 금지).
 * 상한 초과 시에도 500 — 라벨·이력처럼 합계로 역산할 수 없는 조회라 조용한 잘림이 더 위험하다.
 */
async function fetchAllPages(
  logLabel: string,
  failReason: string,
  fetchPage: PageFetch,
): Promise<PageResult> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) {
      logger.error(`[statement-export] ${logLabel} lookup failed`, error);
      return { status: 500, reason: failReason };
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { rows };
    if (rows.length >= MAX_ROWS) {
      logger.error(`[statement-export] ${logLabel} exceeded ${MAX_ROWS} rows — 출력 중단`);
      return { status: 500, reason: `${failReason}_LIMIT` };
    }
  }
}


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
): Promise<{ items: any[] } | { status: 500; reason: string }> {
  const paged = await fetchAllPages('items', 'ITEMS_LOOKUP', (from, to) =>
    supabase
      .from('zen_billing_statement_items')
      .select(
        'order_id, charge_weight_kg, base_freight, fuel_surcharge, surge_fee, other_charges, line_total, ' +
        'order:zen_orders!order_id(order_no, recipient_name, recipient_country_code, shipper_name, ' +
        'shipper:zen_organizations!shipper_id(name))',
      )
      .eq('statement_id', id)
      .order('id', { ascending: true })
      .range(from, to),
  );
  if ('status' in paged) return paged;
  // RLS로 order 임베드가 null이면 빈 칸 행이 조용히 만들어진다 — 명시적 실패로 전환(§7)
  const broken = paged.rows.filter((i: any) => !i.order);
  if (broken.length) {
    logger.error(
      `[statement-export] order embed is null for ${broken.length} item(s) (statement=${id})`,
    );
    return { status: 500, reason: 'ORDER_EMBED_NULL' };
  }
  return { items: paged.rows };
}

/** 운송장번호 (voided 제외) — order_id → 쉼표 연결 문자열 */
async function loadTrackingMap(
  supabase: any,
  orderIds: string[],
): Promise<{ map: Map<string, string> } | { status: 500; reason: string }> {
  if (!orderIds.length) return { map: new Map() };
  const paged = await fetchAllPages('labels', 'LABELS_LOOKUP', (from, to) =>
    supabase
      .from('zen_ups_labels')
      .select('order_id, tracking_number')
      .in('order_id', orderIds)
      .eq('is_voided', false)
      .order('id', { ascending: true })
      .range(from, to),
  );
  if ('status' in paged) return paged;
  const map = new Map<string, string[]>();
  for (const r of paged.rows) {
    const list = map.get(r.order_id) ?? [];
    if (!list.includes(r.tracking_number)) list.push(r.tracking_number);
    map.set(r.order_id, list);
  }
  return { map: new Map([...map].map(([k, v]) => [k, v.join(',')])) };
}

/** 기준일 — 배송완료(DELIVERED) 우선, 없으면 출고확정(RELEASED) (§4-D) */
async function loadBasisDates(
  supabase: any,
  orderIds: string[],
): Promise<{ map: Map<string, Date> } | { status: 500; reason: string }> {
  if (!orderIds.length) return { map: new Map() };
  const paged = await fetchAllPages('history', 'HISTORY_LOOKUP', (from, to) =>
    supabase
      .from('order_status_history')
      .select('order_id, next_status, created_at')
      .in('order_id', orderIds)
      .in('next_status', ['DELIVERED', 'RELEASED'])
      .order('id', { ascending: true })
      .range(from, to),
  );
  if ('status' in paged) return paged;
  const best = new Map<string, { status: string; at: string }>();
  for (const h of paged.rows) {
    const cur = best.get(h.order_id);
    const prefer = h.next_status === 'DELIVERED';
    const curPrefer = cur?.status === 'DELIVERED';
    if (!cur || (prefer && !curPrefer) || (prefer === curPrefer && h.created_at > cur.at)) {
      best.set(h.order_id, { status: h.next_status, at: h.created_at });
    }
  }
  const out = new Map<string, Date>();
  for (const [orderId, v] of best) out.set(orderId, kstDateToUtcDate(kstDateString(v.at)));
  return { map: out };
}

/** KST 달력일 문자열 → 해당 날짜를 가리키는 Date (ExcelJS는 UTC 필드로 직렬화) */
export function kstDateToUtcDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// ───────────────────────────────────────────── 집계·검증

/**
 * 금액을 **정수 분 단위(1/100)** 로 환산한다.
 * `10.10 + 20.20`은 JS 부동소수에서 `30.299999999999997`이 되어 `===` 비교와 문자열화가 깨진다.
 * DB는 `numeric(14,2)`라 항상 2자리 → 분 단위 정수로 합산·비교한다.
 */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function totalsOf(rows: StatementExportRow[]): StatementExportTotals {
  const centsOf = (pick: (r: StatementExportRow) => number) =>
    rows.reduce((acc, r) => acc + toCents(pick(r)), 0);
  const won = (cents: number) => cents / 100;
  return {
    itemCount: rows.length,
    chargeWeightKg: won(centsOf((r) => r.chargeWeightKg)),
    baseFreight: won(centsOf((r) => r.baseFreight)),
    fuelSurcharge: won(centsOf((r) => r.fuelSurcharge)),
    surgeFee: won(centsOf((r) => r.surgeFee)),
    otherCharges: won(centsOf((r) => r.otherCharges)),
    lineTotal: won(centsOf((r) => r.lineTotal)),
  };
}

/** §1-1: 항목 합 = 헤더 total_amount — **분 단위 정수로 비교**(부동소수 오탐 방지). 0.01 어긋나도 실패한다 */
export function totalsMatchHeader(totals: StatementExportTotals, header: StatementExportHeader): boolean {
  return toCents(totals.lineTotal) === toCents(header.totalAmount);
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
  const [trackingRes, basisRes] = await Promise.all([
    loadTrackingMap(supabase, orderIds),
    loadBasisDates(supabase, orderIds),
  ]);
  // 라벨·기준일 조회 실패를 빈 칸으로 삼으면 공란 파일이 200으로 나간다 — 500으로 전파(§7)
  if ('status' in trackingRes) return { ok: false, ...trackingRes };
  if ('status' in basisRes) return { ok: false, ...basisRes };

  const rows = itemRes.items.map((i: any) => toItemRow(i, trackingRes.map, basisRes.map));
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
