'use server';

// TASK-B-360 (Issue #1366) — 청구서관리 ③ 서버 액션 (WBS 4.1~4.5)
// 설계: .agent/tasks/TASK-B-360_..._설계의견.md [설계 확정]
//   · 모든 DB/RPC 호출은 user-session client(validateUserAction)로만 — service_role은 #1397 RLS·트리거 우회
//   · 상태 전이·중복 방지는 조건부 UPDATE rowCount + DB 트리거/CHECK에 의존 (선조회는 오류 분류에만 사용)
//   · 금액은 클라이언트 값 미사용 — billing_items_amounts(단일 원천)에서 산출
//   · "생성자" = issuer_org_id = 내 org (조건 2, #1397 RLS 정책과 동일)

import { revalidatePath } from 'next/cache';
import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';
import { trError, type ErrorKey } from '@/lib/i18n/action-error';

// ───────────────────────────────────────────── types

export type BillableTarget =
  | { type: 'ORG'; orgId: string }
  | { type: 'ADHOC'; shipperName: string; bizNo?: string };

export type DateBasis = 'DELIVERED' | 'RELEASED'; // 배송완료일 / 출고확정일

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

export interface ListBillableOrdersInput {
  billedTarget: BillableTarget;
  dateBasis: DateBasis;
  dateFrom: string;
  dateTo: string;
}

export interface BillableOrdersResult {
  success: boolean;
  orders?: BillableOrderRow[];
  total?: number;
  totalAmount?: number;
  excludedUnsettled?: number;
  /** 상한(500) 도달 시 true — 일부 후보가 누락될 수 있음을 알린다 (조용한 누락 방지) */
  truncated?: boolean;
  error?: string;
}

export interface AdhocShipperNameRow {
  name: string;
  normalized: string;
  count: number;
  billableCount: number; // SETTLED且 청구서 미포함
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
  scope: 'MINE' | 'RECEIVED' | 'SUPERVISED';
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
  scope: 'MINE' | 'RECEIVED' | 'SUPERVISED';
  createdAt: string;
  items: StatementItemRow[];
}

// ───────────────────────────────────────────── 상수·헬퍼

const ISSUER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.ZENITH_SUPER_ADMIN, USER_ROLES.AGENCY] as string[];

/** DB/RPC 원문 → 사용자 Errors 키 (원문 노출 금지 — 이슈 코멘트 3번) */
const DB_ERROR_KEYS: Array<[RegExp, ErrorKey]> = [
  [/order_already_inclusive|zen_billing_statement_items_order_uq/, 'order_already_inclusive'],
  [/(item_order_not_eligible|order_not_eligible)/, 'order_not_eligible'],
  [/adhoc_requires_agency/, 'adhoc_requires_agency'],
  [/adhoc_name_required/, 'adhoc_name_required'],
  [/(target_org_not_found|target_not_linked|target_not_allowed|tier_mismatch|invalid_tier)/, 'target_not_allowed'],
  [/order_ids_required/, 'order_ids_required'],
  [/order_not_found/, 'order_not_found'],
  [/profile_not_found/, 'profile_not_found'],
  [/create_not_allowed/, 'permission_denied'],
  [/issue_without_items/, 'statement_empty'],
  [/header_delete_forbidden|items_locked_after_issue|invalid_status_transition/, 'not_draft'],
  [/zen_billing_statements_paid_check/, 'payment_amount_mismatch'],
  [/header_not_found/, 'statement_not_found'],
  [/unsupported_cost_currency/, 'unsupported_cost_currency'],
];

/** 수기 화주명 정규화 — RPC `billed_key`의 ADHOC 규칙과 동일 (공백 압축·양끝 제거·소문자) */
export function normalizeShipperName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

async function userError(raw: string, where: string): Promise<string> {
  for (const [re, key] of DB_ERROR_KEYS) {
    if (re.test(raw)) return trError(key);
  }
  logger.error(`[${where}] unmapped DB error`, new Error(raw));
  return trError('generic', { code: 'UNEXPECTED' });
}

async function issuerRoleError(role: string): Promise<string | null> {
  if (ISSUER_ROLES.includes(role)) return null;
  logger.warn(`[billing] create not allowed for role=${role}`);
  return trError('permission_denied');
}

/** 기간 검증: 시작·끝 필수 + 역전 금지 (B-366과 동일한 generic 코드 재사용) */
async function dateRangeError(from?: string, to?: string): Promise<string | null> {
  if (!from || !to || from > to) {
    logger.warn(`[billing] invalid date range ${from ?? '(none)'} ~ ${to ?? '(none)'}`);
    return trError('generic', { code: 'DATE_RANGE_INVALID' });
  }
  return null;
}

/** 조건 3: 발행자 org 유형 + 청구 대상 유형 → tier (서버가 도출, 클라이언트 미전달) */
function deriveTier(issuerType: string, targetType: string | null, isAdhoc: boolean): string {
  if (isAdhoc) return 'AGENCY_TO_SHIPPER'; // 조건 6: ADHOC은 대리점만 (호출 전에 이미 검증)
  if (issuerType === 'AGENCY') return 'AGENCY_TO_SHIPPER';
  return targetType === 'AGENCY' ? 'ADMIN_TO_AGENCY' : 'ADMIN_TO_SHIPPER';
}

interface ProfileCtx {
  userId: string;
  orgId: string;
  orgType: string;
  role: string;
}

async function profileContext(): Promise<
  { ctx: ProfileCtx; supabase: any } | { error: string }
> {
  const { supabase, profile } = await validateUserAction();
  if (!profile?.org_id) {
    logger.error('[billing] profile missing org_id');
    return { error: await trError('profile_not_found') };
  }
  const { data: org, error } = await supabase
    .from('zen_organizations')
    .select('type')
    .eq('id', profile.org_id)
    .maybeSingle();
  if (error) {
    logger.error('[billing] org lookup failed', error);
    return { error: await trError('generic', { code: 'ORG_LOOKUP' }) };
  }
  return {
    ctx: { userId: profile.id, orgId: profile.org_id, orgType: org?.type ?? '', role: profile.role },
    supabase,
  };
}

/** 범위 배지: 내가 청구 / 내가 청구받음 / Admin 감독 (이슈 5번·An_17 §6-5b) */
function scopeOf(issuerOrgId: string, myOrgId: string, role: string): StatementListRow['scope'] {
  if (issuerOrgId === myOrgId) return 'MINE';
  if (role === USER_ROLES.ADMIN || role === USER_ROLES.ZENITH_SUPER_ADMIN) return 'SUPERVISED';
  return 'RECEIVED';
}

// ───────────────────────────────────────────── 1. 후보 조회 (WBS 4.1)

/** 조회 상한 — 초과 시 조용히 통과시키지 않고 `truncated: true` 신호 (금전 영향 조용한 누락 방지) */
const BILLABLE_ORDER_LIMIT = 500;
const ADHOC_NAME_LIMIT = 1000;

const BILLABLE_ORDER_FIELDS =
  'id, order_no, status, cost_settlement_status, shipper_id, agency_org_id, shipper_name, shipper_biz_no, ' +
  'shipper:zen_organizations!shipper_id(name), agency:zen_organizations!agency_org_id(name)';

interface ResolvedTarget {
  tier: string;
  applyFilter: (q: any) => any;
  adhocName?: string;
  adhocBizNo?: string;
}

/** 대상 검증 + tier 도출(조건 3) — 발행자 소속 필터까지 함께 만든다. */
async function resolveBillableTarget(
  supabase: any,
  ctx: ProfileCtx,
  target: BillableTarget | undefined,
): Promise<{ resolved: ResolvedTarget } | { error: string }> {
  if (target?.type === 'ADHOC') {
    if (ctx.orgType !== 'AGENCY') return { error: await trError('adhoc_requires_agency') };
    if (!target.shipperName?.trim()) return { error: await trError('adhoc_name_required') };
    return {
      resolved: {
        tier: deriveTier(ctx.orgType, null, true),
        applyFilter: (q) => q.eq('shipper_id', ctx.orgId),
        adhocName: target.shipperName,
        adhocBizNo: target.bizNo,
      },
    };
  }
  if (target?.type !== 'ORG') return { error: await trError('target_not_allowed') };

  const { data: tOrg, error } = await supabase
    .from('zen_organizations').select('type, id').eq('id', target.orgId).maybeSingle();
  if (error) {
    logger.error('[resolveBillableTarget] target org lookup failed', error);
    return { error: await trError('generic', { code: 'TARGET_LOOKUP' }) };
  }
  if (!tOrg) return { error: await trError('target_not_allowed') };

  if (ctx.orgType === 'AGENCY') {
    if (tOrg.type === 'AGENCY') return { error: await trError('target_not_allowed') };
    const { data: link, error: lErr } = await supabase.from('zen_agency_shippers').select('id')
      .eq('agency_org_id', ctx.orgId).eq('shipper_org_id', target.orgId).eq('is_active', true).maybeSingle();
    if (lErr) {
      logger.error('[resolveBillableTarget] agency link lookup failed', lErr);
      return { error: await trError('generic', { code: 'LINK_LOOKUP' }) };
    }
    if (!link) return { error: await trError('target_not_allowed') };
  }

  const tier = deriveTier(ctx.orgType, tOrg.type, false);
  // 대상 소속 필터 — RPC의 자격 검증과 동일해야 후보가 정확하다
  const applyFilter =
    tier === 'ADMIN_TO_AGENCY' ? (q: any) => q.eq('agency_org_id', target.orgId)
    : ctx.orgType === 'AGENCY'  ? (q: any) => q.eq('shipper_id', target.orgId).eq('agency_org_id', ctx.orgId)
    :                            (q: any) => q.eq('shipper_id', target.orgId);
  return { resolved: { tier, applyFilter } };
}

/** 후보 오더 조회 — 상한 도달 시 `truncated` 신호, ADHOC은 정규화 일치(부분문자 아님)로 재검증 */
async function fetchScopedOrders(
  supabase: any,
  target: ResolvedTarget,
): Promise<{ orders: any[]; truncated: boolean } | { error: string }> {
  let query = supabase.from('zen_orders')
    .select(BILLABLE_ORDER_FIELDS)
    .eq('transport_mode', 'UPS')
    .eq('status', 'DELIVERED')
    .order('created_at', { ascending: false })
    .limit(BILLABLE_ORDER_LIMIT);
  query = target.applyFilter(query);
  const { data, error } = await query;
  if (error) {
    logger.error('[fetchScopedOrders] order lookup failed', error);
    return { error: await trError('generic', { code: 'ORDER_LIST_LOOKUP' }) };
  }

  const all = data ?? [];
  const truncated = all.length >= BILLABLE_ORDER_LIMIT;
  if (truncated) {
    logger.warn(`[fetchScopedOrders] limit ${BILLABLE_ORDER_LIMIT} reached — 후보가 상한에 걸려 일부가 누락될 수 있다`);
  }
  if (!target.adhocName) return { orders: all, truncated };

  const norm = normalizeShipperName(target.adhocName);
  const biz = target.adhocBizNo?.trim();
  return {
    orders: all.filter((o: any) =>
      normalizeShipperName(String(o.shipper_name ?? '')) === norm &&
      (!biz || String(o.shipper_biz_no ?? '') === biz)),
    truncated,
  };
}

/** 기준일 + 이미 포함된 오더 — 기간은 DB 쪽 필터, 포함 조회는 후보 id로 한정(전체 1,000행 상한 회피) */
async function fetchBasisAndIncluded(
  supabase: any,
  orderIds: string[],
  tier: string,
  basis: DateBasis,
  dateFrom: string,
  dateTo: string,
): Promise<{ dateOf: Map<string, string>; included: Set<string> } | { error: string }> {
  const [histRes, incRes] = await Promise.all([
    supabase.from('order_status_history').select('order_id, created_at')
      .in('order_id', orderIds).eq('next_status', basis)
      .gte('created_at', `${dateFrom}T00:00:00`).lte('created_at', `${dateTo}T23:59:59`)
      .order('created_at', { ascending: false }),
    supabase.from('zen_billing_statement_items').select('order_id, tier')
      .eq('tier', tier).in('order_id', orderIds),
  ]);
  // 보조 조회 실패를 무시하면 빈 목록으로 위장된다 (코멘트 4번 fail-open 금지)
  if (histRes.error) {
    logger.error('[fetchBasisAndIncluded] basis date lookup failed', histRes.error);
    return { error: await trError('generic', { code: 'HISTORY_LOOKUP' }) };
  }
  if (incRes.error) {
    logger.error('[fetchBasisAndIncluded] included lookup failed', incRes.error);
    return { error: await trError('generic', { code: 'INCLUDED_LOOKUP' }) };
  }
  const dateOf = new Map<string, string>();
  for (const h of histRes.data ?? []) {
    if (!dateOf.has(h.order_id)) dateOf.set(h.order_id, String(h.created_at).slice(0, 10));
  }
  return { dateOf, included: new Set<string>((incRes.data ?? []).map((r: any) => r.order_id)) };
}

/** 기간 내 후보 분리 — 미정산은 건수로 분리, 이미 포함된 오더는 제외 */
function partitionCandidates(
  scoped: any[],
  dateOf: Map<string, string>,
  included: Set<string>,
  dateFrom: string,
  dateTo: string,
): { candidates: any[]; excludedUnsettled: number } {
  const inRange = scoped.filter((o: any) => {
    const d = dateOf.get(o.id);
    return !!d && d >= dateFrom && d <= dateTo;
  });
  const excludedUnsettled = inRange.filter((o: any) => o.cost_settlement_status !== 'SETTLED').length;
  const candidates = inRange.filter(
    (o: any) => o.cost_settlement_status === 'SETTLED' && !included.has(o.id),
  );
  return { candidates, excludedUnsettled };
}

/** 후보 행 + 금액 스냅샷 매핑 (금액은 RPC `billing_items_amounts` 단일 원천) */
async function mapBillableRows(
  supabase: any,
  candidates: any[],
  dateOf: Map<string, string>,
  tier: string,
): Promise<{ rows: BillableOrderRow[]; totalAmount: number } | { error: string }> {
  const amtRes = await supabase.rpc('billing_items_amounts', {
    p_order_ids: candidates.map((o) => o.id), p_tier: tier,
  });
  if (amtRes.error) {
    logger.error('[mapBillableRows] amount snapshot failed', amtRes.error);
    return { error: await trError('generic', { code: 'AMOUNT_LOOKUP' }) };
  }
  const amtMap = new Map<string, any>((amtRes.data ?? []).map((r: any) => [r.order_id, r]));
  const rows: BillableOrderRow[] = candidates.map((o: any) => {
    const a = amtMap.get(o.id) ?? {};
    return {
      orderId: o.id,
      orderNo: o.order_no,
      basisDate: dateOf.get(o.id) ?? null,
      shipperName: (o.shipper as any)?.name ?? o.shipper_name ?? null,
      agencyName: (o.agency as any)?.name ?? null,
      chargeWeightKg: Number(a.charge_weight_kg ?? 0),
      baseFreight: Number(a.base_freight ?? 0),
      fuelSurcharge: Number(a.fuel_surcharge ?? 0),
      surgeFee: Number(a.surge_fee ?? 0),
      otherCharges: Number(a.other_charges ?? 0),
      lineTotal: Number(a.line_total ?? 0),
    };
  });
  return { rows, totalAmount: rows.reduce((s, r) => s + r.lineTotal, 0) };
}

export async function listBillableOrders(input: ListBillableOrdersInput): Promise<BillableOrdersResult> {
  try {
    const auth = await profileContext();
    if ('error' in auth) return { success: false, error: auth.error };
    const { ctx, supabase } = auth;

    const roleErr = await issuerRoleError(ctx.role);
    if (roleErr) return { success: false, error: roleErr };
    const rangeErr = await dateRangeError(input?.dateFrom, input?.dateTo);
    if (rangeErr) return { success: false, error: rangeErr };

    const targetRes = await resolveBillableTarget(supabase, ctx, input.billedTarget);
    if ('error' in targetRes) return { success: false, error: targetRes.error };

    const fetched = await fetchScopedOrders(supabase, targetRes.resolved);
    if ('error' in fetched) return { success: false, error: fetched.error };
    const { orders: scoped, truncated } = fetched;
    if (!scoped.length) {
      return { success: true, orders: [], total: 0, totalAmount: 0, excludedUnsettled: 0, truncated };
    }

    const basisRes = await fetchBasisAndIncluded(
      supabase, scoped.map((o) => o.id), targetRes.resolved.tier,
      input.dateBasis, input.dateFrom, input.dateTo,
    );
    if ('error' in basisRes) return { success: false, error: basisRes.error };

    const { candidates, excludedUnsettled } = partitionCandidates(
      scoped, basisRes.dateOf, basisRes.included, input.dateFrom!, input.dateTo!,
    );
    if (!candidates.length) {
      return { success: true, orders: [], total: 0, totalAmount: 0, excludedUnsettled, truncated };
    }
    const mapped = await mapBillableRows(supabase, candidates, basisRes.dateOf, targetRes.resolved.tier);
    if ('error' in mapped) return { success: false, error: mapped.error };
    return {
      success: true, orders: mapped.rows, total: mapped.rows.length,
      totalAmount: mapped.totalAmount, excludedUnsettled, truncated,
    };
  } catch (err) {
    logger.error('[listBillableOrders] failed:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

// ───────────────────────────────────────────── 2. 수기 화주명 자동완성 (WBS 4.1b)

/** 발행 대리점의 수기 화주 오더 조회 — 상한 도달 시 `truncated` 신호 */
async function fetchAdhocOrders(
  supabase: any, ctx: ProfileCtx, q?: string,
): Promise<{ orders: any[]; truncated: boolean } | { error: string }> {
  let query = supabase.from('zen_orders')
    .select('id, shipper_name, cost_settlement_status')
    .eq('shipper_id', ctx.orgId)
    .eq('transport_mode', 'UPS')
    .not('shipper_name', 'is', null)
    .neq('shipper_name', '')
    .order('created_at', { ascending: false })
    .limit(ADHOC_NAME_LIMIT);
  if (q?.trim()) query = query.ilike('shipper_name', `%${q.trim()}%`);

  const { data, error } = await query;
  if (error) {
    logger.error('[fetchAdhocOrders] order lookup failed', error);
    return { error: await trError('generic', { code: 'ORDER_LIST_LOOKUP' }) };
  }
  const all = data ?? [];
  const truncated = all.length >= ADHOC_NAME_LIMIT;
  if (truncated) {
    logger.warn(`[fetchAdhocOrders] limit ${ADHOC_NAME_LIMIT} reached — 일부 화주명이 누락될 수 있다`);
  }
  return { orders: all, truncated };
}

/** 정규화 그룹 집계 — 청구서 포함(id, tier)은 후보 id로 한정 조회 */
async function groupAdhocNames(
  supabase: any, orders: any[],
): Promise<{ names: AdhocShipperNameRow[] } | { error: string }> {
  const { data: inc, error } = await supabase
    .from('zen_billing_statement_items').select('order_id, tier')
    .eq('tier', 'AGENCY_TO_SHIPPER').in('order_id', orders.map((o) => o.id));
  if (error) {
    logger.error('[groupAdhocNames] included lookup failed', error);
    return { error: await trError('generic', { code: 'INCLUDED_LOOKUP' }) };
  }
  const included = new Set<string>((inc ?? []).map((r: any) => r.order_id));

  const groups = new Map<string, AdhocShipperNameRow>();
  for (const o of orders) {
    const name = String(o.shipper_name);
    const normalized = normalizeShipperName(name);
    const g = groups.get(normalized) ?? { name, normalized, count: 0, billableCount: 0 };
    g.count += 1;
    if (o.cost_settlement_status === 'SETTLED' && !included.has(o.id)) g.billableCount += 1;
    groups.set(normalized, g);
  }
  return {
    names: [...groups.values()].sort((a, b) => b.billableCount - a.billableCount || b.count - a.count),
  };
}

export async function listAdhocShipperNames(q?: string): Promise<{
  success: boolean; names?: AdhocShipperNameRow[]; truncated?: boolean; error?: string;
}> {
  try {
    const auth = await profileContext();
    if ('error' in auth) return { success: false, error: auth.error };
    const { ctx, supabase } = auth;
    if (ctx.orgType !== 'AGENCY') {
      logger.warn(`[listAdhocShipperNames] non-agency issuer orgType=${ctx.orgType}`);
      return { success: false, error: await trError('adhoc_requires_agency') };
    }

    const fetched = await fetchAdhocOrders(supabase, ctx, q);
    if ('error' in fetched) return { success: false, error: fetched.error };
    if (!fetched.orders.length) {
      return { success: true, names: [], truncated: fetched.truncated };
    }

    const grouped = await groupAdhocNames(supabase, fetched.orders);
    if ('error' in grouped) return { success: false, error: grouped.error };
    return { success: true, names: grouped.names, truncated: fetched.truncated };
  } catch (err) {
    logger.error('[listAdhocShipperNames] failed:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

// ───────────────────────────────────────────── 3. 청구서 생성 (WBS 4.2)

export interface CreateBillingStatementInput {
  billedTarget: BillableTarget;
  year: number;
  month: number;
  orderIds: string[];
  periodFrom?: string | null;
  periodTo?: string | null;
}

/** 통합 생성 RPC 인자 구성 (생성 함수를 50줄 이내로 유지하기 위한 분리) */
function createStatementRpcArgs(input: CreateBillingStatementInput, orderIds: string[]) {
  const t = input.billedTarget;
  return {
    p_billed_org_id: t?.type === 'ORG' ? t.orgId : null,
    p_billed_name: t?.type === 'ADHOC' ? t.shipperName : null,
    p_billed_biz_no: t?.type === 'ADHOC' ? t.bizNo ?? null : null,
    p_year: input.year,
    p_month: input.month,
    p_period_from: input.periodFrom ?? null,
    p_period_to: input.periodTo ?? null,
    p_order_ids: orderIds,
  };
}

export async function createBillingStatement(input: CreateBillingStatementInput): Promise<{
  success: boolean; statementId?: string; statementNo?: string; roundNo?: number; error?: string;
}> {
  try {
    const auth = await profileContext();
    if ('error' in auth) return { success: false, error: auth.error };
    const { ctx, supabase } = auth;
    const roleErr = await issuerRoleError(ctx.role);
    if (roleErr) return { success: false, error: roleErr };

    // 중복 id 제거 — RPC의 count(*) 대조가 order_not_found로 오해되지 않도록 (비차단 리뷰)
    const raw = Array.isArray(input?.orderIds) ? input.orderIds : [];
    const orderIds = [...new Set(raw)];
    if (!orderIds.length) {
      logger.warn('[createBillingStatement] empty orderIds');
      return { success: false, error: await trError('order_ids_required') };
    }
    if (orderIds.length !== raw.length) {
      logger.warn(`[createBillingStatement] duplicate orderIds removed: ${raw.length} -> ${orderIds.length}`);
    }
    const { data, error } = await supabase.rpc(
      'create_billing_statement_with_items', createStatementRpcArgs(input, orderIds),
    );
    if (error) {
      logger.warn(`[createBillingStatement] rpc rejected: ${error.message}`);
      return { success: false, error: await userError(error.message, 'createBillingStatement') };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.stmt_id) {
      logger.error('[createBillingStatement] rpc returned no row', data);
      return { success: false, error: await trError('generic', { code: 'STATEMENT_CREATE' }) };
    }
    if (Number(row.zero_amount_count ?? 0) > 0) {
      // 조건 4b: 원천이 실제로 0이면 저장은 허용 — 발행자가 알 수 있게 경고만
      logger.warn(`[createBillingStatement] ${row.zero_amount_count} order(s) with zero amount (${row.stmt_no})`);
    }
    revalidatePath('/finance/statements');
    revalidatePath('/agency/statements');
    return { success: true, statementId: row.stmt_id, statementNo: row.stmt_no, roundNo: Number(row.stmt_round ?? 0) };
  } catch (err) {
    logger.error('[createBillingStatement] failed:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

// ───────────────────────────────────────────── 4. 초안 취소(삭제) (WBS 4.3)

async function loadOwnStatement(supabase: any, ctx: ProfileCtx, id: string) {
  const { data, error } = await supabase
    .from('zen_billing_statements')
    .select('id, issuer_org_id, status, total_amount')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    logger.error('[billing] statement lookup failed', error);
    return { error: await trError('generic', { code: 'STATEMENT_LOOKUP' }) };
  }
  // RLS로 안 보이는 행 → 미존재와 동일 응답 (존재 비노출)
  if (!data) {
    return { error: await trError('statement_not_found') };
  }
  // 보이지만 내 발행분이 아닌 경우(청구받은 경로·Admin 감독) — 조건 2: not_issuer
  if (data.issuer_org_id !== ctx.orgId) {
    logger.warn(`[billing] not issuer org (${id}, issuer=${data.issuer_org_id})`);
    return { error: await trError('not_issuer') };
  }
  return { row: data };
}

export async function cancelBillingStatement(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await profileContext();
    if ('error' in auth) return { success: false, error: auth.error };
    const { ctx, supabase } = auth;
    const roleErr = await issuerRoleError(ctx.role);
    if (roleErr) return { success: false, error: roleErr };

    const loaded = await loadOwnStatement(supabase, ctx, id);
    if ('error' in loaded) return { success: false, error: loaded.error };
    if (loaded.row.status !== 'DRAFT') {
      logger.warn(`[cancelBillingStatement] not DRAFT (${id}, ${loaded.row.status})`);
      return { success: false, error: await trError('not_draft') };
    }

    // 조건부 DELETE가 authority (선조회는 오류 분류용 — TOCTOU 방어)
    const { data, error } = await supabase
      .from('zen_billing_statements')
      .delete()
      .eq('id', id)
      .eq('issuer_org_id', ctx.orgId)
      .eq('status', 'DRAFT')
      .select('id');
    if (error) {
      logger.error('[cancelBillingStatement] delete failed', error);
      return { success: false, error: await trError('generic', { code: 'STATEMENT_CANCEL' }) };
    }
    if (!data?.length) {
      logger.warn(`[cancelBillingStatement] rowCount=0 (state changed concurrently: ${id})`);
      return { success: false, error: await trError('not_draft') };
    }
    revalidatePath('/finance/statements');
    revalidatePath('/agency/statements');
    return { success: true };
  } catch (err) {
    logger.error('[cancelBillingStatement] failed:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

// ───────────────────────────────────────────── 5. 발행(확정) (WBS 4.3)

export async function issueBillingStatement(id: string): Promise<{
  success: boolean; issuedAt?: string; error?: string;
}> {
  try {
    const auth = await profileContext();
    if ('error' in auth) return { success: false, error: auth.error };
    const { ctx, supabase } = auth;
    const roleErr = await issuerRoleError(ctx.role);
    if (roleErr) return { success: false, error: roleErr };

    const loaded = await loadOwnStatement(supabase, ctx, id);
    if ('error' in loaded) return { success: false, error: loaded.error };
    if (loaded.row.status !== 'DRAFT') {
      logger.warn(`[issueBillingStatement] not DRAFT (${id}, ${loaded.row.status})`);
      return { success: false, error: loaded.row.status === 'ISSUED' || loaded.row.status === 'CLOSED'
        ? await trError('already_issued') : await trError('not_draft') };
    }

    const issuedAt = new Date().toISOString();
    // 조건부 UPDATE가 authority — 항목 0건은 DB 트리거(issue_without_items)가 최종 방어
    const { data, error } = await supabase
      .from('zen_billing_statements')
      .update({ status: 'ISSUED', issued_at: issuedAt, issued_by: ctx.userId })
      .eq('id', id)
      .eq('issuer_org_id', ctx.orgId)
      .eq('status', 'DRAFT')
      .select('id, status');
    if (error) {
      logger.warn(`[issueBillingStatement] rejected: ${error.message}`);
      return { success: false, error: await userError(error.message, 'issueBillingStatement') };
    }
    if (!data?.length) {
      logger.warn(`[issueBillingStatement] rowCount=0 (state changed concurrently: ${id})`);
      return { success: false, error: await trError('not_draft') };
    }
    revalidatePath('/finance/statements');
    revalidatePath('/agency/statements');
    return { success: true, issuedAt };
  } catch (err) {
    logger.error('[issueBillingStatement] failed:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

// ───────────────────────────────────────────── 6. 입금확인(전액만 → CLOSED) (WBS 4.4)

/** 입금확인 대상 분류 — CLOSED/ISSUED 여부를 오류로 구분 (선조회는 분류 전용, 결정은 조�건부 UPDATE가 담당) */
async function loadPaymentTarget(
  supabase: any, ctx: ProfileCtx, id: string,
): Promise<{ row: any } | { error: string }> {
  const loaded = await loadOwnStatement(supabase, ctx, id);
  if ('error' in loaded) return loaded;
  if (loaded.row.status === 'CLOSED') {
    logger.warn(`[confirmStatementPayment] already CLOSED (${id})`);
    return { error: await trError('already_closed') };
  }
  if (loaded.row.status !== 'ISSUED') {
    logger.warn(`[confirmStatementPayment] not ISSUED (${id}, ${loaded.row.status})`);
    return { error: await trError('not_issued') };
  }
  return { row: loaded.row };
}

/** 조건부 UPDATE가 authority (선조회는 분류 전용 — TOCTOU 방어). rowCount=0 → 상태가 바뀐 경우 */
async function applyClosedPayment(
  supabase: any, ctx: ProfileCtx, id: string, amount: number, paidAt: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('zen_billing_statements')
    .update({
      status: 'CLOSED', paid_amount: amount, paid_date: paidAt,
      closed_at: new Date().toISOString(), closed_by: ctx.userId,
    })
    .eq('id', id)
    .eq('issuer_org_id', ctx.orgId)
    .eq('status', 'ISSUED')
    .select('id, status');
  if (error) {
    logger.warn(`[confirmStatementPayment] rejected: ${error.message}`);
    return { success: false, error: await userError(error.message, 'confirmStatementPayment') };
  }
  if (!data?.length) {
    logger.warn(`[confirmStatementPayment] rowCount=0 (state changed concurrently: ${id})`);
    return { success: false, error: await trError('not_issued') };
  }
  revalidatePath('/finance/statements');
  revalidatePath('/agency/statements');
  return { success: true };
}

export async function confirmStatementPayment(
  id: string,
  input: { paidAt?: string; amount: number },
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await profileContext();
    if ('error' in auth) return { success: false, error: auth.error };
    const { ctx, supabase } = auth;
    const roleErr = await issuerRoleError(ctx.role);
    if (roleErr) return { success: false, error: roleErr };

    const target = await loadPaymentTarget(supabase, ctx, id);
    if ('error' in target) return { success: false, error: target.error };
    // 전액만 (Q7) — 불일치면 **저장하지 않고** 오류 (DB CHECK도 이중 방어)
    const amount = Number(input?.amount);
    const total = Number(target.row.total_amount);
    if (!Number.isFinite(amount) || amount !== total) {
      logger.warn(`[confirmStatementPayment] amount mismatch (${id}: paid=${amount} vs total=${total})`);
      return { success: false, error: await trError('payment_amount_mismatch') };
    }

    const paidAt = input?.paidAt ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
      logger.warn(`[confirmStatementPayment] invalid paidAt format (${id}: ${paidAt})`);
      return { success: false, error: await trError('generic', { code: 'PAID_AT_INVALID' }) };
    }
    return applyClosedPayment(supabase, ctx, id, amount, paidAt);
  } catch (err) {
    logger.error('[confirmStatementPayment] failed:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

// ───────────────────────────────────────────── 7. 청구서 목록 (RLS 3경로) (WBS 4.5)

export interface GetStatementsFilter {
  billedOrgId?: string;
  year?: number;
  month?: number;
  status?: 'DRAFT' | 'ISSUED' | 'CLOSED';
}

export async function getBillingStatements(filter?: GetStatementsFilter): Promise<{
  success: boolean; statements?: StatementListRow[]; total?: number; error?: string;
}> {
  try {
    const auth = await profileContext();
    if ('error' in auth) return { success: false, error: auth.error };
    const { ctx, supabase } = auth;

    let query = supabase
      .from('zen_billing_statements')
      .select('id, statement_no, billed_name, billed_org_id, billed_party_type, tier, period_year, period_month, round_no, total_amount, status, issuer_org_id, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (filter?.billedOrgId) query = query.eq('billed_org_id', filter.billedOrgId);
    if (filter?.year) query = query.eq('period_year', filter.year);
    if (filter?.month) query = query.eq('period_month', filter.month);
    if (filter?.status) query = query.eq('status', filter.status);

    const { data, error } = await query;
    if (error) {
      logger.error('[getBillingStatements] lookup failed', error);
      return { success: false, error: await trError('generic', { code: 'STATEMENT_LOOKUP' }) };
    }
    // RLS가 3경로 범위를 이미 강제 — 서버는 배지만 계산
    const rows: StatementListRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      statementNo: r.statement_no,
      billedName: r.billed_name,
      billedOrgId: r.billed_org_id,
      billedPartyType: r.billed_party_type,
      tier: r.tier,
      periodYear: r.period_year,
      periodMonth: r.period_month,
      roundNo: r.round_no,
      totalAmount: Number(r.total_amount ?? 0),
      status: r.status,
      scope: scopeOf(r.issuer_org_id, ctx.orgId, ctx.role),
      createdAt: r.created_at,
    }));
    return { success: true, statements: rows, total: rows.length };
  } catch (err) {
    logger.error('[getBillingStatements] failed:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}

// ───────────────────────────────────────────── 8. 청구서 상세 (존재 비노출) (WBS 4.5)

/** 청구서 항목 조회 — items→헤더 FK가 단일·복합 2개라 embed 모호(TASK-B-360 실측) → 복수 쿼리 */
async function fetchStatementItems(
  supabase: any, statementId: string,
): Promise<{ items: any[] } | { error: string }> {
  const { data, error } = await supabase
    .from('zen_billing_statement_items')
    .select('order_id, charge_weight_kg, base_freight, fuel_surcharge, surge_fee, other_charges, line_total, order:zen_orders(order_no)')
    .eq('statement_id', statementId);
  if (error) {
    logger.error('[fetchStatementItems] lookup failed', error);
    return { error: await trError('generic', { code: 'STATEMENT_LOOKUP' }) };
  }
  return { items: (data ?? []) as any[] };
}

/** 항목 행 매핑 */
function mapDetailRows(items: any[]): StatementItemRow[] {
  return items.map((i: any) => ({
    orderId: i.order_id,
    orderNo: i.order?.order_no ?? null,
    chargeWeightKg: Number(i.charge_weight_kg ?? 0),
    baseFreight: Number(i.base_freight ?? 0),
    fuelSurcharge: Number(i.fuel_surcharge ?? 0),
    surgeFee: Number(i.surge_fee ?? 0),
    otherCharges: Number(i.other_charges ?? 0),
    lineTotal: Number(i.line_total ?? 0),
  }));
}

/** 헤더+항목+범위 배지 → 상세 DTO */
function buildStatementDetail(data: any, rows: StatementItemRow[], ctx: ProfileCtx): StatementDetail {
  return {
    id: data.id,
    statementNo: data.statement_no,
    billedPartyType: data.billed_party_type,
    billedOrgId: data.billed_org_id,
    billedName: data.billed_name,
    billedBizNo: data.billed_biz_no,
    tier: data.tier,
    periodYear: data.period_year,
    periodMonth: data.period_month,
    roundNo: data.round_no,
    periodFrom: data.period_from,
    periodTo: data.period_to,
    totalAmount: Number(data.total_amount ?? 0),
    status: data.status,
    issuerOrgId: data.issuer_org_id,
    scope: scopeOf(data.issuer_org_id, ctx.orgId, ctx.role),
    createdAt: data.created_at,
    items: rows,
  };
}

export async function getBillingStatementDetail(id: string): Promise<{
  success: boolean; detail?: StatementDetail; error?: string;
}> {
  try {
    const auth = await profileContext();
    if ('error' in auth) return { success: false, error: auth.error };
    const { ctx, supabase } = auth;

    // 헤더·항목을 복수 쿼리로 조회 — items→헤더 FK가 2개(단일·복합)라 embed가 모호하다
    const { data, error } = await supabase
      .from('zen_billing_statements')
      .select('id, statement_no, billed_party_type, billed_org_id, billed_name, billed_biz_no, tier, period_year, period_month, round_no, period_from, period_to, total_amount, status, issuer_org_id, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      logger.error('[getBillingStatementDetail] lookup failed', error);
      return { success: false, error: await trError('generic', { code: 'STATEMENT_LOOKUP' }) };
    }
    // RLS로 안 보이는 행은 null — 타 생성자도 미존재와 동일 응답 (존재 비노출)
    if (!data) {
      return { success: false, error: await trError('statement_not_found') };
    }
    const itemRes = await fetchStatementItems(supabase, id);
    if ('error' in itemRes) return { success: false, error: itemRes.error };
    const rows = mapDetailRows(itemRes.items);
    return { success: true, detail: buildStatementDetail(data, rows, ctx) };
  } catch (err) {
    logger.error('[getBillingStatementDetail] failed:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}
