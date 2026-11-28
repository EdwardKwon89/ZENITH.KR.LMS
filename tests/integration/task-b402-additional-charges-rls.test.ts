// TASK-B-402 (Issue #1451, B-377 구현 PR-A) — 실DB 검증:
//   ① zen_ups_settlement_run_charges tier×역할 RLS 매트릭스(신규)
//   ② getOrderAdditionalCharges 세션 — 소유·admin 통과 / 타인 거부 / 최신 version / DTO는 항목 컬럼만(원가 미반환)
//   ③ SUB_ADMIN 비파괴 회귀 — getUpsActualCost·수익금 집계(getSubAgencyProfitSummary) 유지
// 자기완결형 fixture — 이 파일이 조직·계정(런타임 난수)·오더·run·항목을 만들고 정리한다.
// 계정·비밀번호는 저장소에 기재하지 않으며 CI에서 그대로 실행된다.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: vi.fn() }));

import { validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { trError } from '@/lib/i18n/action-error';
import { getOrderAdditionalCharges } from '@/app/actions/finance/additional-charges';
import { getUpsActualCost } from '@/app/actions/finance/ups-actual-cost';
import { getSubAgencyProfitSummary } from '@/app/actions/finance/order-revenue-cost';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

function psql(sql: string): string {
  return execFileSync(
    'docker',
    ['exec', '-i', 'supabase_db_ZENITH_LMS_001', 'psql', '-U', 'postgres', '-d', 'postgres', '-q', '-t', '-A', '-c', sql],
    { encoding: 'utf8' },
  ).trim();
}

const P = '40200000-0000-4000-8000-0000000000';
const PLATFORM_ORG = `${P}01`;
const AGENCY_ORG = `${P}02`;
const SHIPPER_ORG = `${P}03`;
const OTHER_SHIPPER_ORG = `${P}04`;
const SUB_ADMIN_ORG = `${P}05`;
const ORG_IDS = [PLATFORM_ORG, AGENCY_ORG, SHIPPER_ORG, OTHER_SHIPPER_ORG, SUB_ADMIN_ORG];

const ORDER_ID = `${P}11`;
const RUN1 = `${P}12`;
const RUN2 = `${P}13`;
const ACTUAL_COST = `${P}14`;
const CHARGE_IDS = [`${P}21`, `${P}22`, `${P}23`, `${P}24`];

interface Actor {
  client: SupabaseClient;
  userId: string;
}

let service: SupabaseClient;
let admin: Actor;
let agency: Actor;
let shipper: Actor;
let otherShipper: Actor;
let subAdmin: Actor;
const actors: Actor[] = [];

async function createActor(role: string, orgId: string): Promise<Actor> {
  const suffix = randomUUID().slice(0, 8);
  const email = `402-${suffix}@test.kr`;
  const password = `Aa1-${randomUUID()}`; // CI 비밀번호 정책 충족 — 런타임 생성, 저장소 미기재
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role, org_id: orgId },
    user_metadata: { full_name: `402 ${role}` },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const userId = data.user.id;
  // zen_profiles는 auth.users 생성 트리거로 자동 생성 → B-381과 동일하게 update로 갱신
  const { error: profileError } = await service
    .from('zen_profiles')
    .update({ role, org_id: orgId, status: 'ACTIVE', full_name: `402 ${role}` })
    .eq('id', userId);
  if (profileError) throw new Error(`profile insert failed: ${profileError.message}`);

  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn failed: ${signInError.message}`);
  const actor = { client, userId };
  actors.push(actor);
  return actor;
}

function asActor(actor: Actor, role: string, orgId: string | null) {
  vi.mocked(validateUserAction).mockResolvedValue({
    supabase: actor.client,
    profile: { id: actor.userId, role, org_id: orgId },
  } as never);
}

async function chargeRows(actor: Actor): Promise<Array<{ tier: string }>> {
  const { data, error } = await actor.client
    .from('zen_ups_settlement_run_charges')
    .select('tier')
    .in('run_id', [RUN1, RUN2]);
  if (error) throw new Error(`charges select failed: ${error.message}`);
  return (data ?? []) as Array<{ tier: string }>;
}

describe('TASK-B-402 — run_charges tier×역할 RLS 매트릭스 + 가더 함수 실DB (자기완결형)', () => {
  beforeAll(async () => {
    service = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

    await service.from('zen_organizations').insert(
      ORG_IDS.map((id, i) => ({ id, name: `B402 Org ${i}`, type: i === 0 ? 'PLATFORM' : 'SHIPPER' })),
    );

    admin = await createActor('ADMIN', PLATFORM_ORG);
    agency = await createActor('AGENCY', AGENCY_ORG);
    shipper = await createActor('SHIPPER', SHIPPER_ORG);
    otherShipper = await createActor('SHIPPER', OTHER_SHIPPER_ORG);
    subAdmin = await createActor('SUB_ADMIN', SUB_ADMIN_ORG);

    const { error: orderErr } = await service.from('zen_orders').insert({
      id: ORDER_ID,
      order_no: `ZEN-402-${ORDER_ID.slice(-4)}`,
      cargo_details: {},
      transport_mode: 'UPS',
      status: 'DELIVERED',
      shipper_id: SHIPPER_ORG,
      agency_org_id: AGENCY_ORG,
      cost_settlement_status: 'NOT_SETTLED',
    });
    if (orderErr) throw new Error(`order insert failed: ${orderErr.message}`);

    // version 1·2 두 run — 최신 version 판정용(금액이 다르다)
    const { error: runErr } = await service.from('zen_ups_settlement_runs').insert([
      { id: RUN1, order_id: ORDER_ID, version: 1, charge_weight_kg: 5, currency: 'KRW', source: 'MANUAL', settled_at: new Date().toISOString() },
      { id: RUN2, order_id: ORDER_ID, version: 2, charge_weight_kg: 6, currency: 'KRW', source: 'MANUAL', settled_at: new Date().toISOString() },
    ]);
    if (runErr) throw new Error(`run insert failed: ${runErr.message}`);

    const { error: chErr } = await service.from('zen_ups_settlement_run_charges').insert([
      { id: CHARGE_IDS[0], run_id: RUN1, tier: 'SHIPPER', line_no: 1, name: '주소정정', amount: 111, currency: 'KRW' },
      { id: CHARGE_IDS[1], run_id: RUN1, tier: 'ADMIN_TO_AGENCY', line_no: 1, name: '주소정정', amount: 111, currency: 'KRW' },
      { id: CHARGE_IDS[2], run_id: RUN2, tier: 'SHIPPER', line_no: 1, name: '긴급할증', amount: 222, currency: 'KRW' },
      { id: CHARGE_IDS[3], run_id: RUN2, tier: 'ADMIN_TO_AGENCY', line_no: 1, name: '긴급할증', amount: 222, currency: 'KRW' },
    ]);
    if (chErr) throw new Error(`charges insert failed: ${chErr.message}`);

    const { error: costErr } = await service.from('zen_ups_actual_cost').insert({
      id: ACTUAL_COST,
      order_id: ORDER_ID,
      total_cost_krw: 9999,
    });
    if (costErr) throw new Error(`actual cost insert failed: ${costErr.message}`);
  });

  afterAll(async () => {
    try {
      psql(`
        SET session_replication_role = replica;
        DELETE FROM public.zen_ups_settlement_run_charges WHERE run_id IN ('${RUN1}','${RUN2}');
        DELETE FROM public.zen_ups_settlement_runs WHERE order_id = '${ORDER_ID}';
        DELETE FROM public.zen_ups_actual_cost WHERE order_id = '${ORDER_ID}';
        DELETE FROM public.zen_orders WHERE id = '${ORDER_ID}';
        DELETE FROM public.zen_profiles WHERE email LIKE '402-%@test.kr';
        DELETE FROM auth.users WHERE email LIKE '402-%@test.kr';
        DELETE FROM public.zen_organizations WHERE id IN ('${ORG_IDS.join("','")}');
        RESET session_replication_role;
      `);
    } catch {
      /* best-effort */
    }
  });

  it('RLS 매트릭스: admin은 두 run·두 tier 전체(4행)', async () => {
    const rows = await chargeRows(admin);
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map((r) => r.tier))).toEqual(new Set(['SHIPPER', 'ADMIN_TO_AGENCY']));
  });

  it('RLS 매트릭스: 대리점은 자기 tier(ADMIN_TO_Agency)만 2행, 다른 tier 0행', async () => {
    const rows = await chargeRows(agency);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.tier === 'ADMIN_TO_AGENCY')).toBe(true);
  });

  it('RLS 매트릭스: 화주는 자기 tier(SHIPPER)만 2행', async () => {
    const rows = await chargeRows(shipper);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.tier === 'SHIPPER')).toBe(true);
  });

  it('RLS 매트릭스: 타인 화주는 0행', async () => {
    const rows = await chargeRows(otherShipper);
    expect(rows).toHaveLength(0);
  });

  it('getOrderAdditionalCharges: admin — 최신 version(2)의 전체 tier + DTO는 항목 컬럼만(원가 미반환)', async () => {
    vi.clearAllMocks();
    asActor(admin, 'ADMIN', PLATFORM_ORG);

    const res = await getOrderAdditionalCharges(ORDER_ID);

    expect(res.success).toBe(true);
    expect(res.version).toBe(2);
    expect(res.items).toHaveLength(2);
    // 최신 version 판정: v1(111)이 아니라 v2(222)
    expect(res.items.every((i) => i.amount === 222)).toBe(true);
    // DTO 키 제한 — 원가 계열 컬럼 미반환
    for (const item of res.items) {
      expect(Object.keys(item).sort()).toEqual(['amount', 'currency', 'lineNo', 'name', 'tier']);
    }
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('getOrderAdditionalCharges: 자기 화주 — 자기 tier(SHIPPER) 1행·최신 version', async () => {
    vi.clearAllMocks();
    asActor(shipper, 'SHIPPER', SHIPPER_ORG);

    const res = await getOrderAdditionalCharges(ORDER_ID);

    expect(res.success).toBe(true);
    expect(res.version).toBe(2);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].tier).toBe('SHIPPER');
    expect(res.items[0].amount).toBe(222);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('getOrderAdditionalCharges: 자기 대리점 — 자기 tier(ADMIN_TO_AGENCY) 1행', async () => {
    vi.clearAllMocks();
    asActor(agency, 'AGENCY', AGENCY_ORG);

    const res = await getOrderAdditionalCharges(ORDER_ID);

    expect(res.success).toBe(true);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].tier).toBe('ADMIN_TO_AGENCY');
  });

  it('getOrderAdditionalCharges: 타인 화주 — RLS가 오더를 숨겨 order_not_found로 차단(존재 노출 없음)', async () => {
    vi.clearAllMocks();
    asActor(otherShipper, 'SHIPPER', OTHER_SHIPPER_ORG);

    const res = await getOrderAdditionalCharges(ORDER_ID);

    // 오더 RLS가 타인 화주에게 행을 숨기므로 소유 논리 이전에 not_found로 차단된다
    // (ownership denied 경로는 단위 테스트가 덮는다)
    expect(res.success).toBe(false);
    expect(res.error).toBe(await trError('order_not_found'));
    expect(res.items).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('SUB_ADMIN 비파괴 회귀: getUpsActualCost 통과(현행 원가 관리 유지) + warn 없음', async () => {
    vi.clearAllMocks();
    asActor(subAdmin, 'SUB_ADMIN', SUB_ADMIN_ORG);

    const data = await getUpsActualCost(ORDER_ID);

    expect(data).not.toBeNull();
    expect((data as { order_id?: string }).order_id).toBe(ORDER_ID);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('SUB_ADMIN 비파괴 회귀: 수익금 집계(getSubAgencyProfitSummary) 통과, SHIPPER는 거부', async () => {
    vi.clearAllMocks();
    asActor(subAdmin, 'SUB_ADMIN', SUB_ADMIN_ORG);
    await expect(getSubAgencyProfitSummary({})).resolves.toBeDefined();

    vi.clearAllMocks();
    asActor(shipper, 'SHIPPER', SHIPPER_ORG);
    await expect(getSubAgencyProfitSummary({})).rejects.toThrow('권한이 없습니다');
  });
});
