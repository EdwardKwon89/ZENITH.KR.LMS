import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// TASK-B-403 (Issue #1579) — 대상 RPC 실행 권한·호출자 검증을 실DB 세션으로 검증한다.
//   목표 상태만 기록한다(R-21 §2): 인증된 호출자만 실행, 역할을 확인할 수 없는 호출은 거부,
//   허용 역할은 종전 규칙대로 동작.
//   자기완결형 fixture — 런타임 난수 계정·정리 포함, skipIf 없음.

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

const P = '40300000-0000-4000-8000-0000000000';
const PLATFORM_ORG = `${P}01`;
const SHIPPER_ORG = `${P}02`;
const APPROVE_ORG = `${P}03`;
const REJECT_ORG = `${P}04`;
const SUPPLEMENT_ORG = `${P}05`;
const NO_PROFILE_ORG = `${P}06`;
const SERVICE_ORG = `${P}07`;
const ORG_IDS = [PLATFORM_ORG, SHIPPER_ORG, APPROVE_ORG, REJECT_ORG, SUPPLEMENT_ORG, NO_PROFILE_ORG, SERVICE_ORG];

const BASE_ORDER_ID = `${P}21`;
const MASTER_ORDER_ID = `${P}31`;
const MASTER_NO = 'M-403-TEST';

const TARGET_RPCS = [
  'public.approve_organization(uuid)',
  'public.reject_organization(uuid,text)',
  'public.request_organization_supplement(uuid,text)',
  'public.get_next_order_sequence(text,text)',
  'public.create_order_atomic(jsonb,uuid,uuid)',
  'public.create_order_services_atomic(uuid,jsonb,uuid)',
  'public.dissolve_master_order_atomic(uuid,uuid)',
] as const;

interface Actor {
  client: SupabaseClient;
  userId: string;
  role: string;
  orgId: string;
}

let service: SupabaseClient;
let admin: Actor;
let shipper: Actor;
let noProfile: Actor;
let anon: SupabaseClient;
const createdOrderIds = new Set<string>([BASE_ORDER_ID]);

async function createActor(role: string, orgId: string): Promise<Actor> {
  const suffix = randomUUID().slice(0, 8);
  const email = `403-${suffix}@example.test`;
  const password = `Aa1-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { role, org_id: orgId },
    user_metadata: { full_name: `403 ${role}` },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const { error: profileError } = await service.from('zen_profiles')
    .update({ role, org_id: orgId, status: 'ACTIVE' }).eq('id', data.user.id);
  if (profileError) throw new Error(`profile update failed: ${profileError.message}`);
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn failed: ${signInError.message}`);
  return { client, userId: data.user.id, role, orgId };
}

async function createNoProfileActor(): Promise<Actor> {
  const suffix = randomUUID().slice(0, 8);
  const email = `403-noprofile-${suffix}@example.test`;
  const password = `Aa1-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: '403 no profile' },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const { error: deleteError } = await service.from('zen_profiles').delete().eq('id', data.user.id);
  if (deleteError) throw new Error(`profile delete failed: ${deleteError.message}`);
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn failed: ${signInError.message}`);
  return { client, userId: data.user.id, role: 'NONE', orgId: '' };
}

function errorText(error: { message?: string } | null): string {
  return error?.message ?? '';
}

async function cleanup() {
  try {
    const orderIds = [...createdOrderIds].map((id) => `'${id}'`).join(',');
    psql(`
      SET session_replication_role = replica;
      DELETE FROM public.zen_order_services WHERE order_id IN (${orderIds});
      DELETE FROM public.zen_order_items WHERE order_id IN (${orderIds});
      DELETE FROM public.zen_order_packages WHERE order_id IN (${orderIds});
      DELETE FROM public.zen_tracking_configs WHERE order_id IN (${orderIds});
      DELETE FROM public.order_status_history WHERE order_id IN (${orderIds});
      DELETE FROM public.zen_orders WHERE id IN (${orderIds});
      DELETE FROM public.zen_master_order_history WHERE master_no = '${MASTER_NO}';
      DELETE FROM public.zen_master_orders WHERE id = '${MASTER_ORDER_ID}';
      DELETE FROM public.zen_profiles WHERE email LIKE '403-%@example.test';
      DELETE FROM auth.users WHERE email LIKE '403-%@example.test';
      DELETE FROM public.zen_organizations WHERE id IN ('${ORG_IDS.join("','")}');
      RESET session_replication_role;
    `);
  } catch { /* best-effort */ }
}

async function insertBaseOrder() {
  const { error } = await service.from('zen_orders').insert({
    id: BASE_ORDER_ID,
    order_no: 'ZEN-403-BASE',
    cargo_details: {},
    transport_mode: 'AIR',
    status: 'REGISTERED',
    shipper_id: SHIPPER_ORG,
    agency_org_id: null,
    cost_settlement_status: 'NOT_SETTLED',
  });
  if (error) throw new Error(`base order insert failed: ${error.message}`);
}

async function insertMasterOrder() {
  const { error } = await service.from('zen_master_orders').insert({
    id: MASTER_ORDER_ID,
    master_no: MASTER_NO,
    status: 'CREATED',
    total_house_count: 0,
    created_by: admin.userId,
  });
  if (error) throw new Error(`master order insert failed: ${error.message}`);
}

describe('TASK-B-403 — 대상 RPC 실행 권한·호출자 검증', () => {
  beforeAll(async () => {
    if (!URL || !ANON || !SERVICE) throw new Error('Supabase test env missing');
    service = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
    await cleanup();
    const { error: orgError } = await service.from('zen_organizations').upsert([
      { id: PLATFORM_ORG, name: '403 Platform', type: 'CORPORATE', status: 'ACTIVE' },
      { id: SHIPPER_ORG, name: '403 Shipper', type: 'SHIPPER', status: 'ACTIVE' },
      { id: APPROVE_ORG, name: '403 Approve', type: 'SHIPPER', status: 'PENDING' },
      { id: REJECT_ORG, name: '403 Reject', type: 'SHIPPER', status: 'PENDING' },
      { id: SUPPLEMENT_ORG, name: '403 Supplement', type: 'SHIPPER', status: 'PENDING' },
      { id: NO_PROFILE_ORG, name: '403 No Profile', type: 'SHIPPER', status: 'PENDING' },
      { id: SERVICE_ORG, name: '403 Service', type: 'SHIPPER', status: 'PENDING' },
    ], { onConflict: 'id' });
    if (orgError) throw new Error(`org insert failed: ${orgError.message}`);

    admin = await createActor('ADMIN', PLATFORM_ORG);
    shipper = await createActor('SHIPPER', SHIPPER_ORG);
    noProfile = await createNoProfileActor();
    anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    await insertBaseOrder();
    await insertMasterOrder();
  }, 120000);

  afterAll(async () => {
    await cleanup();
  }, 60000);

  it('카탈로그 — 대상 RPC는 anon/PUBLIC 실행 불가, authenticated/service_role 실행 가능', () => {
    for (const sig of TARGET_RPCS) {
      expect(psql(`SELECT has_function_privilege('anon', '${sig}', 'EXECUTE');`), `${sig} anon`).toBe('f');
      expect(psql(`SELECT has_function_privilege('authenticated', '${sig}', 'EXECUTE');`), `${sig} authenticated`).toBe('t');
      expect(psql(`SELECT has_function_privilege('service_role', '${sig}', 'EXECUTE');`), `${sig} service_role`).toBe('t');
      const publicExec = psql(`
        SELECT EXISTS (
          SELECT 1
          FROM pg_proc p,
               aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
          WHERE p.oid = '${sig}'::regprocedure
            AND a.grantee = 0
            AND a.privilege_type = 'EXECUTE'
        );`);
      expect(publicExec, `${sig} PUBLIC`).toBe('f');
    }
  }, 60000);

  it('비인증 호출 — 대상 RPC 7개 모두 거부', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [
      ['approve_organization', { target_org_id: APPROVE_ORG }],
      ['reject_organization', { target_org_id: REJECT_ORG, comment: '403' }],
      ['request_organization_supplement', { target_org_id: SUPPLEMENT_ORG, comment: '403' }],
      ['get_next_order_sequence', { p_year: '2026', p_prefix: 'ZEN' }],
      ['create_order_atomic', { p_payload: {}, p_user_id: admin.userId, p_org_id: SHIPPER_ORG }],
      ['create_order_services_atomic', { p_order_id: BASE_ORDER_ID, p_services: [], p_user_id: admin.userId }],
      ['dissolve_master_order_atomic', { p_master_order_id: MASTER_ORDER_ID, p_user_id: admin.userId }],
    ];
    for (const [fn, args] of calls) {
      const { error } = await (anon.rpc as (name: string, params: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>)(fn, args);
      expect(errorText(error), fn).toMatch(/permission denied|권한/);
    }
  }, 60000);

  it('비허용 역할 호출 — 역할 확인 대상 RPC 4개는 거부', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [
      ['approve_organization', { target_org_id: APPROVE_ORG }],
      ['reject_organization', { target_org_id: REJECT_ORG, comment: '403' }],
      ['request_organization_supplement', { target_org_id: SUPPLEMENT_ORG, comment: '403' }],
      ['get_next_order_sequence', { p_year: '2026', p_prefix: 'ZEN' }],
    ];
    for (const [fn, args] of calls) {
      const { error } = await (shipper.client.rpc as (name: string, params: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>)(fn, args);
      expect(errorText(error), fn).toMatch(/Access Denied/);
    }
    expect(psql(`SELECT status FROM public.zen_organizations WHERE id='${APPROVE_ORG}';`)).toBe('PENDING');
  }, 60000);

  it('허용 역할 호출 — 역할 확인 대상 RPC 4개는 정상 동작', async () => {
    const approve = await admin.client.rpc('approve_organization', { target_org_id: APPROVE_ORG });
    expect(approve.error).toBeNull();
    expect(String(approve.data ?? '')).toMatch(/^\d{6}$/);
    expect(psql(`SELECT status FROM public.zen_organizations WHERE id='${APPROVE_ORG}';`)).toBe('ACTIVE');

    const reject = await admin.client.rpc('reject_organization', { target_org_id: REJECT_ORG, comment: '403 reject' });
    expect(reject.error).toBeNull();
    expect(reject.data).toBe(true);
    expect(psql(`SELECT status FROM public.zen_organizations WHERE id='${REJECT_ORG}';`)).toBe('REJECTED');

    const supplement = await admin.client.rpc('request_organization_supplement', { target_org_id: SUPPLEMENT_ORG, comment: '403 supplement' });
    expect(supplement.error).toBeNull();
    expect(supplement.data).toBe(true);
    expect(psql(`SELECT status FROM public.zen_organizations WHERE id='${SUPPLEMENT_ORG}';`)).toBe('SUPPLEMENT_REQUIRED');

    const seq = await admin.client.rpc('get_next_order_sequence', { p_year: '2026', p_prefix: 'ZEN' });
    expect(seq.error).toBeNull();
    expect(String(seq.data ?? '')).toMatch(/^ZEN-2026-\d{6}$/);
  }, 60000);

  it('역할 미확인 호출 — 역할 확인 대상 RPC 4개는 거부', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [
      ['approve_organization', { target_org_id: NO_PROFILE_ORG }],
      ['reject_organization', { target_org_id: NO_PROFILE_ORG, comment: '403' }],
      ['request_organization_supplement', { target_org_id: NO_PROFILE_ORG, comment: '403' }],
      ['get_next_order_sequence', { p_year: '2026', p_prefix: 'ZEN' }],
    ];
    for (const [fn, args] of calls) {
      const { error } = await (noProfile.client.rpc as (name: string, params: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>)(fn, args);
      expect(errorText(error), fn).toMatch(/Access Denied/);
    }
    expect(psql(`SELECT status FROM public.zen_organizations WHERE id='${NO_PROFILE_ORG}';`)).toBe('PENDING');
  }, 60000);

  it('서버 내부 키 호출 — 역할 확인 대상 RPC 4개 정상', async () => {
    const approve = await service.rpc('approve_organization', { target_org_id: SERVICE_ORG });
    expect(approve.error).toBeNull();
    expect(String(approve.data ?? '')).toMatch(/^\d{6}$/);
    expect(psql(`SELECT status FROM public.zen_organizations WHERE id='${SERVICE_ORG}';`)).toBe('ACTIVE');

    const reject = await service.rpc('reject_organization', { target_org_id: SERVICE_ORG, comment: '403 service' });
    expect(reject.error).toBeNull();
    expect(reject.data).toBe(true);

    const supplement = await service.rpc('request_organization_supplement', { target_org_id: SERVICE_ORG, comment: '403 service' });
    expect(supplement.error).toBeNull();
    expect(supplement.data).toBe(true);

    const seq = await service.rpc('get_next_order_sequence', { p_year: '2026', p_prefix: 'ZEN' });
    expect(seq.error).toBeNull();
    expect(String(seq.data ?? '')).toMatch(/^ZEN-2026-\d{6}$/);
  }, 60000);

  it('허용 역할 호출 — 오더 계열 RPC 3개는 인증 세션에서 정상 동작', async () => {
    const services = await admin.client.rpc('create_order_services_atomic', {
      p_order_id: BASE_ORDER_ID, p_services: [], p_user_id: admin.userId,
    });
    expect(services.error).toBeNull();
    expect(services.data).toEqual([]);

    const { data: origin } = await service.from('zen_ports').select('id').eq('type', 'AIR').order('code').limit(1).single();
    const { data: dest } = await service.from('zen_ports').select('id').eq('type', 'AIR').order('code', { ascending: false }).limit(1).single();
    expect(origin?.id).toBeTruthy();
    expect(dest?.id).toBeTruthy();

    const payload = {
      order_type: 'B2B',
      shipper_id: SHIPPER_ORG,
      shipper_name: '403 Shipper',
      origin_port_id: origin?.id,
      dest_port_id: dest?.id,
      recipient_name: '403 Recipient',
      recipient_country_code: 'US',
      transport_mode: 'AIR',
      packages: [{
        packing_unit: 'BOX', packing_count: 1, gross_weight: 5,
        special_cargo_type: 'NONE', content_type: 'GENERAL',
        items: [{ item_name: '403 Item', quantity: 1, unit_price: 10, currency: 'USD', item_packing_unit: 'PCE' }],
      }],
    };
    const created = await admin.client.rpc('create_order_atomic', {
      p_payload: payload, p_user_id: admin.userId, p_org_id: SHIPPER_ORG,
    });
    expect(created.error).toBeNull();
    const createdId = String((created.data as { id?: string } | null)?.id ?? '');
    expect(createdId).toMatch(/^[0-9a-f-]{36}$/);
    createdOrderIds.add(createdId);
    expect(psql(`SELECT count(*) FROM public.zen_orders WHERE id='${createdId}';`)).toBe('1');

    const dissolved = await admin.client.rpc('dissolve_master_order_atomic', {
      p_master_order_id: MASTER_ORDER_ID, p_user_id: admin.userId,
    });
    expect(dissolved.error).toBeNull();
    expect(psql(`SELECT count(*) FROM public.zen_master_orders WHERE id='${MASTER_ORDER_ID}';`)).toBe('0');
  }, 60000);
});
