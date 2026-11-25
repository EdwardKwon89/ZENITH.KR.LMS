import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import { execFileSync } from 'node:child_process';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const PASSWORD = process.env.B381_TEST_PASSWORD;
const EMAILS = {
  admin: process.env.B381_ADMIN_EMAIL,
  manager: process.env.B381_MANAGER_EMAIL,
  agency: process.env.B381_AGENCY_EMAIL,
  shipper: process.env.B381_SHIPPER_EMAIL,
};

const HAS_ENV = !!(URL && ANON && SERVICE && PASSWORD && Object.values(EMAILS).every(Boolean) && process.env.RUN_B381_DB_TESTS === '1');

function psql(sql: string): string {
  return execFileSync('docker', ['exec', '-i', 'supabase_db_ZENITH_LMS_001', 'psql', '-U', 'postgres', '-d', 'postgres', '-q', '-t', '-A', '-c', sql], { encoding: 'utf8' }).trim();
}

async function session(email: string | undefined) {
  if (!email || !PASSWORD) throw new Error('env missing');
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn failed: ${error.message}`);
  const { data: user } = await client.auth.getUser();
  const { data: profile } = await client.from('zen_profiles').select('role, org_id').eq('id', user.user!.id).single();
  return { client, role: profile?.role as string, orgId: profile?.org_id as string | null };
}

const AMOUNTS = [
  { tier: 'ADMIN_TO_AGENCY', base_freight: 100, fuel_surcharge: 10, surge_fee: 5, other_charges: 7, freight_adjustment: -2, settlement_charges_total: 6, line_total: 126 },
  { tier: 'SHIPPER', base_freight: 100, fuel_surcharge: 10, surge_fee: 5, other_charges: 7, freight_adjustment: -2, settlement_charges_total: 6, line_total: 126 },
];
const CHARGES = [
  { tier: 'ADMIN_TO_AGENCY', line_no: 1, name: '주소정정', amount: 6 },
  { tier: 'SHIPPER', line_no: 1, name: '주소정정', amount: 3 },
  { tier: 'SHIPPER', line_no: 2, name: '주소정정', amount: 3 },
];

let service: SupabaseClient;
let admin: Awaited<ReturnType<typeof session>>;
let manager: Awaited<ReturnType<typeof session>>;
let agency: Awaited<ReturnType<typeof session>>;
let shipper: Awaited<ReturnType<typeof session>>;
let agencyOrgId: string;
let shipperOrgId: string;
const orderIds: string[] = [];
const invoiceIds: string[] = [];

async function createOrder(suffix: string) {
  const { data, error } = await service.from('zen_orders').insert({
    order_no: `B381-TEST-${Date.now()}-${suffix}`,
    cargo_details: {},
    status: 'DELIVERED',
    transport_mode: 'UPS',
    shipper_id: shipperOrgId,
    agency_org_id: agencyOrgId,
    cost_settlement_status: 'NOT_SETTLED',
  }).select('id').single();
  if (error || !data) throw new Error(`order create failed: ${error?.message}`);
  orderIds.push(data.id);
  return data.id as string;
}

async function finalize(client: SupabaseClient, orderId: string, amounts = AMOUNTS, charges = CHARGES) {
  return client.rpc('finalize_ups_settlement_run', {
    p_order_id: orderId,
    p_charge_weight_kg: 5,
    p_amounts: amounts,
    p_charges: charges,
  });
}

describe.skipIf(!HAS_ENV)('TASK-B-381 PR-1 — run 저장소·RPC·RLS 실DB', () => {
  beforeAll(async () => {
    service = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
    admin = await session(EMAILS.admin);
    manager = await session(EMAILS.manager);
    agency = await session(EMAILS.agency);
    shipper = await session(EMAILS.shipper);
    if (!agency.orgId || !shipper.orgId) throw new Error('org fixture missing');
    agencyOrgId = agency.orgId;
    shipperOrgId = shipper.orgId;
  }, 60000);

  afterAll(() => {
    if (orderIds.length) {
      const list = orderIds.map((id) => `'${id}'`).join(',');
      if (invoiceIds.length) {
        const inv = invoiceIds.map((id) => `'${id}'`).join(',');
        psql(`DELETE FROM public.zen_invoices WHERE id IN (${inv});`);
      }
      psql(`ALTER TABLE public.zen_ups_settlement_runs DISABLE TRIGGER USER;`);
      psql(`ALTER TABLE public.zen_ups_settlement_run_amounts DISABLE TRIGGER USER;`);
      psql(`ALTER TABLE public.zen_ups_settlement_run_charges DISABLE TRIGGER USER;`);
      psql(`DELETE FROM public.zen_ups_settlement_runs WHERE order_id IN (${list});`);
      psql(`DELETE FROM public.zen_orders WHERE id IN (${list});`);
      psql(`ALTER TABLE public.zen_ups_settlement_runs ENABLE TRIGGER USER;`);
      psql(`ALTER TABLE public.zen_ups_settlement_run_amounts ENABLE TRIGGER USER;`);
      psql(`ALTER TABLE public.zen_ups_settlement_run_charges ENABLE TRIGGER USER;`);
    }
  }, 60000);

  it('RPC 성공 — run 양 tier·charges 저장 + 오더 SETTLED (v1)', async () => {
    const orderId = await createOrder('ok');
    const { data, error } = await finalize(admin.client, orderId);
    expect(error).toBeNull();
    expect(data?.[0]?.version).toBe(1);

    const runId = data?.[0]?.run_id;
    const { data: order } = await service.from('zen_orders').select('cost_settlement_status').eq('id', orderId).single();
    expect(order?.cost_settlement_status).toBe('SETTLED');
    const { data: amounts } = await service.from('zen_ups_settlement_run_amounts').select('tier,line_total,freight_adjustment').eq('run_id', runId);
    expect(amounts?.length).toBe(2);
    const { data: charges } = await service.from('zen_ups_settlement_run_charges').select('tier,line_no,name,amount').eq('run_id', runId);
    expect(charges?.length).toBe(3);
    expect(charges?.filter((c) => c.name === '주소정정').length).toBe(3);
  }, 60000);

  it('멱등 — 같은 입력 2회는 새 version을 만들지 않는다', async () => {
    const orderId = await createOrder('idem');
    const first = await finalize(admin.client, orderId);
    const second = await finalize(admin.client, orderId);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(second.data?.[0]?.run_id).toBe(first.data?.[0]?.run_id);
    const count = psql(`SELECT count(*) FROM public.zen_ups_settlement_runs WHERE order_id='${orderId}';`);
    expect(Number(count)).toBe(1);
  }, 60000);

  it('불변 트리거 — run UPDATE/DELETE 차단', async () => {
    const orderId = await createOrder('imm');
    const { data } = await finalize(admin.client, orderId);
    const runId = data?.[0]?.run_id;
    const upd = await service.from('zen_ups_settlement_runs').update({ charge_weight_kg: 9 }).eq('id', runId);
    expect(upd.error?.message ?? '').toContain('ups_settlement_run_immutable');
    const del = await service.from('zen_ups_settlement_run_amounts').delete().eq('run_id', runId);
    expect(del.error?.message ?? '').toContain('ups_settlement_run_immutable');
  }, 60000);

  it('RLS — 관리자/대리점/화주/anon tier 가시성', async () => {
    const orderId = await createOrder('rls');
    const { data } = await finalize(admin.client, orderId);
    const runId = data?.[0]?.run_id;

    const adminRuns = await admin.client.from('zen_ups_settlement_runs').select('id').eq('id', runId);
    expect(adminRuns.data?.length).toBe(1);

    const agencyRuns = await agency.client.from('zen_ups_settlement_runs').select('id').eq('id', runId);
    expect(agencyRuns.data?.length).toBe(1);
    const agencyAmounts = await agency.client.from('zen_ups_settlement_run_amounts').select('tier').eq('run_id', runId);
    expect(new Set((agencyAmounts.data ?? []).map((r) => r.tier))).toEqual(new Set(['ADMIN_TO_AGENCY', 'SHIPPER']));

    const shipperAmounts = await shipper.client.from('zen_ups_settlement_run_amounts').select('tier').eq('run_id', runId);
    expect((shipperAmounts.data ?? []).map((r) => r.tier)).toEqual(['SHIPPER']);
    const shipperCharges = await shipper.client.from('zen_ups_settlement_run_charges').select('id').eq('run_id', runId);
    expect(shipperCharges.data?.length).toBe(2);

    const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const anonRuns = await anon.from('zen_ups_settlement_runs').select('id').eq('id', runId);
    expect((anonRuns.data ?? []).length === 0 || anonRuns.error !== null).toBe(true);
  }, 60000);

  it('MANAGER 양성 — 정산마감 성공', async () => {
    const orderId = await createOrder('mgr');
    const { data, error } = await finalize(manager.client, orderId);
    expect(error).toBeNull();
    expect(data?.[0]?.version).toBe(1);
  }, 60000);

  it('비관리자 RPC 거부 — SHIPPER/AGENCY/permission', async () => {
    const orderId = await createOrder('deny');
    const s1 = await finalize(shipper.client, orderId);
    expect(s1.error?.message ?? '').toContain('permission_denied');
    const s2 = await finalize(agency.client, orderId);
    expect(s2.error?.message ?? '').toContain('permission_denied');
  }, 60000);

  it('인보이스 방어 — 비취소 인보이스가 있으면 ups_invoice_exists', async () => {
    const orderId = await createOrder('inv');
    const { data: inv, error } = await service.from('zen_invoices').insert({
      invoice_no: `INV-B381-${Date.now()}`,
      shipper_id: shipperOrgId,
      total_amount: 1,
      currency: 'KRW',
      due_date: '2026-12-31',
      status: 'UNPAID',
      metadata: { source_order_id: orderId },
    }).select('id').single();
    expect(error).toBeNull();
    invoiceIds.push(inv!.id);

    const { error: rpcError } = await finalize(manager.client, orderId);
    expect(rpcError?.message ?? '').toContain('ups_invoice_exists');
  }, 60000);

  it('billing_items_amounts — run 전용(항목 상세·조정 분리), run 없으면 오류', async () => {
    const orderId = await createOrder('bill');
    await finalize(admin.client, orderId);
    const { data, error } = await admin.client.rpc('billing_items_amounts', { p_order_ids: [orderId], p_tier: 'SHIPPER' });
    expect(error).toBeNull();
    expect(data?.[0]?.line_total).toBe(126);
    expect(data?.[0]?.freight_adjustment).toBe(-2);
    expect(data?.[0]?.charge_details?.length).toBe(2);

    const noRunOrder = await createOrder('norun');
    const missing = await admin.client.rpc('billing_items_amounts', { p_order_ids: [noRunOrder], p_tier: 'SHIPPER' });
    expect(missing.error?.message ?? '').toContain('settlement_run_missing');
  }, 60000);

  it('RPC 원자성 — 잘못된 payload면 run/상태 변경 없음', async () => {
    const orderId = await createOrder('atomic');
    const badAmounts = [
      { ...AMOUNTS[0], line_total: 999 },
      AMOUNTS[1],
    ];
    const { error } = await finalize(admin.client, orderId, badAmounts);
    expect(error?.message ?? '').toContain('invalid_run_payload');
    const runCount = psql(`SELECT count(*) FROM public.zen_ups_settlement_runs WHERE order_id='${orderId}';`);
    expect(Number(runCount)).toBe(0);
    const status = psql(`SELECT cost_settlement_status FROM public.zen_orders WHERE id='${orderId}';`);
    expect(status).toBe('NOT_SETTLED');
  }, 60000);
});
