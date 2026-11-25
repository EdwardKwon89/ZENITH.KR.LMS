import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// TASK-B-381 PR-1: run 저장소·RLS·불변 트리거·정산마감 RPC 실DB 검증.
//   자기완결형 fixture — 이 파일이 조직·계정(GoTrue admin, 런타임 난수)·오더를 만들고 정리한다.
//   게이트/환경변수 없이 CI에서 그대로 실행된다(계정·비밀번호는 저장소에 기재하지 않음).

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

function psql(sql: string): string {
  return execFileSync(
    'docker',
    ['exec', '-i', 'supabase_db_ZENITH_LMS_001', 'psql', '-U', 'postgres', '-d', 'postgres', '-q', '-t', '-A', '-c', sql],
    { encoding: 'utf8' }
  ).trim();
}

const P = '38100000-0000-4000-8000-0000000000';
const PLATFORM_ORG = `${P}01`;
const AGENCY_ORG = `${P}02`;
const SHIPPER_ORG = `${P}03`;
const OTHER_AGENCY_ORG = `${P}04`;
const OTHER_SHIPPER_ORG = `${P}05`;
const ORG_IDS = [PLATFORM_ORG, AGENCY_ORG, SHIPPER_ORG, OTHER_AGENCY_ORG, OTHER_SHIPPER_ORG];

const O = {
  ok: `${P}21`, idem: `${P}22`, imm: `${P}23`, rls: `${P}24`, mgr: `${P}25`,
  deny: `${P}26`, inv: `${P}27`, bill: `${P}28`, norun: `${P}29`, atomic: `${P}2a`,
  reset: `${P}2b`, neg: `${P}2c`, err: `${P}2d`, paid: `${P}2e`, air: `${P}2f`,
} as const;
const ORDER_IDS = Object.values(O);

const AMOUNTS = [
  { tier: 'ADMIN_TO_AGENCY', base_freight: 100, fuel_surcharge: 10, surge_fee: 5, other_charges: 7, freight_adjustment: -2, settlement_charges_total: 6, line_total: 126 },
  { tier: 'SHIPPER', base_freight: 100, fuel_surcharge: 10, surge_fee: 5, other_charges: 7, freight_adjustment: -2, settlement_charges_total: 6, line_total: 126 },
];
const CHARGES = [
  { tier: 'ADMIN_TO_AGENCY', line_no: 1, name: '주소정정', amount: 6 },
  { tier: 'SHIPPER', line_no: 1, name: '주소정정', amount: 3 },
  { tier: 'SHIPPER', line_no: 2, name: '주소정정', amount: 3 },
];
const CHANGED = AMOUNTS.map((a) => ({ ...a, base_freight: a.base_freight + 1, line_total: a.line_total + 1 }));

interface Actor {
  client: SupabaseClient;
  userId: string;
  email: string;
  password: string;
}

let service: SupabaseClient;
let admin: Actor;
let manager: Actor;
let agency: Actor;
let shipper: Actor;
let otherAgency: Actor;
let otherShipper: Actor;
let actors: Actor[] = [];
let invoicesCreated = 0;

async function createActor(role: string, orgId: string | null): Promise<Actor> {
  const suffix = randomUUID().slice(0, 8);
  const email = `381-${suffix}@test.kr`;
  // CI Supabase 비밀번호 정책(소문자·대문자·숫자 각 1자 이상) 충족 — 런타임 생성, 저장소 미기재
  const password = `Aa1-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { role, org_id: orgId },
    user_metadata: { full_name: `381 ${role}` },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const userId = data.user.id;
  const { error: profileError } = await service.from('zen_profiles')
    .update({ role, org_id: orgId, status: 'ACTIVE' }).eq('id', userId);
  if (profileError) throw new Error(`profile update failed: ${profileError.message}`);

  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn failed: ${signInError.message}`);
  const actor = { client, userId, email, password };
  actors.push(actor);
  return actor;
}

async function createOrder(id: string, transport: 'UPS' | 'AIR' = 'UPS') {
  const { error } = await service.from('zen_orders').insert({
    id,
    order_no: `ZEN-381-${id.slice(-4)}`,
    cargo_details: {},
    transport_mode: transport,
    status: 'DELIVERED',
    shipper_id: SHIPPER_ORG,
    agency_org_id: AGENCY_ORG,
    cost_settlement_status: 'NOT_SETTLED',
  });
  if (error) throw new Error(`order insert failed: ${error.message}`);
}

function finalize(actor: Actor, orderId: string, amounts = AMOUNTS, charges = CHARGES) {
  return actor.client.rpc('finalize_ups_settlement_run', {
    p_order_id: orderId, p_charge_weight_kg: 5, p_amounts: amounts, p_charges: charges,
  });
}

function orderStatus(orderId: string): string {
  return psql(`SELECT cost_settlement_status FROM public.zen_orders WHERE id='${orderId}';`);
}

function runCount(orderId: string): number {
  return Number(psql(`SELECT count(*) FROM public.zen_ups_settlement_runs WHERE order_id='${orderId}';`));
}

async function cleanup() {
  try {
    psql(`
      SET session_replication_role = replica;
      DELETE FROM public.zen_invoices WHERE metadata->>'source_order_id' IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_ups_settlement_runs WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_orders WHERE id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_profiles WHERE id IN ('${actors.map((a) => a.userId).join("','")}') OR email LIKE '381-%@test.kr';
      DELETE FROM auth.users WHERE id IN ('${actors.map((a) => a.userId).join("','")}') OR email LIKE '381-%@test.kr';
      DELETE FROM public.zen_organizations WHERE id IN ('${ORG_IDS.join("','")}');
      RESET session_replication_role;
    `);
  } catch { /* best-effort */ }
}

describe('TASK-B-381 PR-1 — run 저장소·RPC·RLS 실DB (자기완결형)', () => {
  beforeAll(async () => {
    if (!URL || !ANON || !SERVICE) throw new Error('Supabase test env missing');
    service = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
    actors = [];
    await cleanup();
    const { error: orgError } = await service.from('zen_organizations').upsert([
      { id: PLATFORM_ORG, name: '381 Platform', type: 'CORPORATE', status: 'ACTIVE' },
      { id: AGENCY_ORG, name: '381 Agency', type: 'AGENCY', status: 'ACTIVE' },
      { id: SHIPPER_ORG, name: '381 Shipper', type: 'SHIPPER', status: 'ACTIVE' },
      { id: OTHER_AGENCY_ORG, name: '381 Other Agency', type: 'AGENCY', status: 'ACTIVE' },
      { id: OTHER_SHIPPER_ORG, name: '381 Other Shipper', type: 'SHIPPER', status: 'ACTIVE' },
    ], { onConflict: 'id' });
    if (orgError) throw new Error(`org insert failed: ${orgError.message}`);
    const { error: linkError } = await service.from('zen_agency_shippers').upsert({
      agency_org_id: AGENCY_ORG, shipper_org_id: SHIPPER_ORG, shipper_type: 'INDIVIDUAL', is_active: true,
    }, { onConflict: 'agency_org_id,shipper_org_id' });
    if (linkError) throw new Error(`agency link failed: ${linkError.message}`);

    admin = await createActor('ADMIN', PLATFORM_ORG);
    manager = await createActor('MANAGER', PLATFORM_ORG);
    agency = await createActor('AGENCY', AGENCY_ORG);
    shipper = await createActor('SHIPPER', SHIPPER_ORG);
    otherAgency = await createActor('AGENCY', OTHER_AGENCY_ORG);
    otherShipper = await createActor('SHIPPER', OTHER_SHIPPER_ORG);

    for (const id of ORDER_IDS) await createOrder(id, id === O.air ? 'AIR' : 'UPS');
    // 이전 실행이 GRANT 회수 테스트 도중 중단됐을 수 있으므로 기준 권한을 복구한다.
    psql(`GRANT EXECUTE ON FUNCTION public.finalize_ups_settlement_run(uuid,numeric,jsonb,jsonb) TO authenticated;`);
  }, 60000);

  afterAll(async () => {
    try { psql(`GRANT EXECUTE ON FUNCTION public.finalize_ups_settlement_run(uuid,numeric,jsonb,jsonb) TO authenticated;`); } catch { /* best-effort */ }
    await cleanup();
  }, 60000);

  it('RPC 성공 — run 양 tier·charges·오더 SETTLED (v1)', async () => {
    const { data, error } = await finalize(admin, O.ok);
    expect(error).toBeNull();
    expect(data?.[0]?.version).toBe(1);
    expect(orderStatus(O.ok)).toBe('SETTLED');
    expect(runCount(O.ok)).toBe(1);
    const amounts = psql(`SELECT count(*) FROM public.zen_ups_settlement_run_amounts a
      JOIN public.zen_ups_settlement_runs r ON r.id=a.run_id WHERE r.order_id='${O.ok}';`);
    expect(amounts).toBe('2');
    const charges = psql(`SELECT count(*) FROM public.zen_ups_settlement_run_charges c
      JOIN public.zen_ups_settlement_runs r ON r.id=c.run_id WHERE r.order_id='${O.ok}';`);
    expect(charges).toBe('3');
  }, 60000);

  it('멱등 — 같은 입력 2회는 run 1건·같은 run_id', async () => {
    const first = await finalize(admin, O.idem);
    const second = await finalize(admin, O.idem);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(second.data?.[0]?.run_id).toBe(first.data?.[0]?.run_id);
    expect(runCount(O.idem)).toBe(1);
  }, 60000);

  it('재마감 — unmark 후 같은 입력이면 SETTLED 복구, run/version 유지', async () => {
    const first = await finalize(admin, O.reset);
    const runId = first.data?.[0]?.run_id;
    await service.from('zen_orders').update({
      cost_settlement_status: 'NOT_SETTLED', cost_settled_at: null, cost_settled_by: null,
    }).eq('id', O.reset);
    const again = await finalize(admin, O.reset);
    expect(again.error).toBeNull();
    expect(again.data?.[0]?.run_id).toBe(runId);
    expect(again.data?.[0]?.version).toBe(1);
    expect(orderStatus(O.reset)).toBe('SETTLED');
    expect(runCount(O.reset)).toBe(1);

    await service.from('zen_orders').update({
      cost_settlement_status: 'NOT_SETTLED', cost_settled_at: null, cost_settled_by: null,
    }).eq('id', O.reset);
    const v2 = await finalize(admin, O.reset, CHANGED);
    expect(v2.error).toBeNull();
    expect(v2.data?.[0]?.version).toBe(2);
    expect(orderStatus(O.reset)).toBe('SETTLED');
  }, 60000);

  it('불변 트리거 — run UPDATE/DELETE 차단', async () => {
    const { data } = await finalize(admin, O.imm);
    const runId = data?.[0]?.run_id;
    const upd = await service.from('zen_ups_settlement_runs').update({ charge_weight_kg: 9 }).eq('id', runId);
    expect(upd.error?.message ?? '').toContain('ups_settlement_run_immutable');
    const del = await service.from('zen_ups_settlement_run_amounts').delete().eq('run_id', runId);
    expect(del.error?.message ?? '').toContain('ups_settlement_run_immutable');
  }, 60000);

  it('RLS — 관리자/대리점(2 tier)/화주(SHIPPER만)/비소속 0/anon 차단', async () => {
    const { data } = await finalize(admin, O.rls);
    const runId = data?.[0]?.run_id;
    const count = async (actor: Actor, table: string) => {
      const col = table === 'zen_ups_settlement_runs' ? 'id' : 'run_id';
      const { data: rows } = await actor.client.from(table).select(col).eq(col, runId);
      return rows?.length ?? 0;
    };
    expect(await count(admin, 'zen_ups_settlement_runs')).toBe(1);
    expect(await count(agency, 'zen_ups_settlement_runs')).toBe(1);
    expect(await count(shipper, 'zen_ups_settlement_runs')).toBe(1);
    expect(await count(otherAgency, 'zen_ups_settlement_runs')).toBe(0);
    expect(await count(otherShipper, 'zen_ups_settlement_runs')).toBe(0);
    expect(await count(agency, 'zen_ups_settlement_run_amounts')).toBe(2);
    expect(await count(shipper, 'zen_ups_settlement_run_amounts')).toBe(1);
    expect(await count(otherAgency, 'zen_ups_settlement_run_amounts')).toBe(0);
    expect(await count(otherShipper, 'zen_ups_settlement_run_amounts')).toBe(0);

    const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const anonRuns = await anon.from('zen_ups_settlement_runs').select('id').eq('id', runId);
    expect(anonRuns.error?.message ?? '').toMatch(/permission denied|권한/);
  }, 60000);

  it('MANAGER 양성 — 정산 성공', async () => {
    const { data, error } = await finalize(manager, O.mgr);
    expect(error).toBeNull();
    expect(data?.[0]?.version).toBe(1);
  }, 60000);

  it('비관리자 RPC 거부 — SHIPPER·AGENCY', async () => {
    expect((await finalize(shipper, O.deny)).error?.message ?? '').toContain('permission_denied');
    expect((await finalize(agency, O.deny)).error?.message ?? '').toContain('permission_denied');
  }, 60000);

  it('오류 코드 — not_ups_order·already_settled·paid_invoice_exists', async () => {
    expect((await finalize(admin, O.air)).error?.message ?? '').toContain('not_ups_order');

    await finalize(admin, O.err);
    expect((await finalize(admin, O.err, CHANGED)).error?.message ?? '').toContain('already_settled');

    const { error: paidErr } = await service.from('zen_invoices').insert({
      invoice_no: `INV-B381-${randomUUID().slice(0, 8)}`, shipper_id: SHIPPER_ORG,
      total_amount: 1, paid_amount: 1, currency: 'KRW', due_date: '2026-12-31', status: 'PAID',
      metadata: { source_order_id: O.paid },
    });
    expect(paidErr).toBeNull();
    invoicesCreated += 1;
    expect((await finalize(admin, O.paid)).error?.message ?? '').toContain('paid_invoice_exists');
  }, 60000);

  it('인보이스 방어 — 비취소 인보이스가 있으면 ups_invoice_exists', async () => {
    const { error: invErr } = await service.from('zen_invoices').insert({
      invoice_no: `INV-B381-${randomUUID().slice(0, 8)}`, shipper_id: SHIPPER_ORG,
      total_amount: 1, currency: 'KRW', due_date: '2026-12-31', status: 'UNPAID',
      metadata: { source_order_id: O.inv },
    });
    expect(invErr).toBeNull();
    invoicesCreated += 1;
    expect((await finalize(admin, O.inv)).error?.message ?? '').toContain('ups_invoice_exists');
    expect(runCount(O.inv)).toBe(0);
  }, 60000);

  it('billing_items_amounts — run 전용(항목 상세·조정), run 없으면 오류', async () => {
    await finalize(admin, O.bill);
    const { data, error } = await admin.client.rpc('billing_items_amounts', { p_order_ids: [O.bill], p_tier: 'SHIPPER' });
    expect(error).toBeNull();
    expect(data?.[0]?.line_total).toBe(126);
    expect(data?.[0]?.freight_adjustment).toBe(-2);
    expect(data?.[0]?.charge_details?.length).toBe(2);
    const missing = await admin.client.rpc('billing_items_amounts', { p_order_ids: [O.norun], p_tier: 'SHIPPER' });
    expect(missing.error?.message ?? '').toContain('settlement_run_missing');
  }, 60000);

  it('RPC 원자성 — 잘못된 payload면 run/상태 변경 없음', async () => {
    const bad = AMOUNTS.map((a) => ({ ...a, line_total: 999 }));
    expect((await finalize(admin, O.atomic, bad)).error?.message ?? '').toContain('invalid_run_payload');
    expect(runCount(O.atomic)).toBe(0);
    expect(orderStatus(O.atomic)).toBe('NOT_SETTLED');
  }, 60000);

  it('RPC 보안 카탈로그 — anon 차단·DEFINER·search_path, GRANT 회수 시 호출 실패', async () => {
    expect(psql(`SELECT has_function_privilege('anon', 'public.finalize_ups_settlement_run(uuid,numeric,jsonb,jsonb)', 'EXECUTE');`)).toBe('f');
    expect(psql(`SELECT has_function_privilege('authenticated', 'public.finalize_ups_settlement_run(uuid,numeric,jsonb,jsonb)', 'EXECUTE');`)).toBe('t');
    expect(psql(`SELECT prosecdef FROM pg_proc WHERE proname='finalize_ups_settlement_run';`)).toBe('t');
    expect(psql(`SELECT coalesce(array_to_string(proconfig,','),'') FROM pg_proc WHERE proname='finalize_ups_settlement_run';`)).toContain('search_path=public');

    psql(`REVOKE EXECUTE ON FUNCTION public.finalize_ups_settlement_run(uuid,numeric,jsonb,jsonb) FROM authenticated;`);
    try {
      const res = await finalize(admin, O.ok);
      expect(res.error?.message ?? '').toMatch(/permission denied|권한/);
    } finally {
      psql(`GRANT EXECUTE ON FUNCTION public.finalize_ups_settlement_run(uuid,numeric,jsonb,jsonb) TO authenticated;`);
    }
  }, 60000);
});
