import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const mockValidate = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: mockValidate,
  validateAdminAction: mockValidate,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/i18n/action-error', () => ({
  trError: async (key: string) => key,
  actionLocale: async () => 'ko',
  trNotification: async (key: string) => key,
}));

import { generateInvoicesForOrder } from '@/app/actions/finance/settlement';
import { finalizeDailyShipperInvoices } from '@/app/actions/finance/daily-billing';
import { InvoiceGenerator } from '@/lib/finance/settlement/invoice-generator';

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

const P = '40000000-0000-4000-8000-0000000000';
const PLATFORM_ORG = `${P}01`;
const AGENCY_ORG = `${P}02`;
const SHIPPER_ORG = `${P}03`;
const ORG_IDS = [PLATFORM_ORG, AGENCY_ORG, SHIPPER_ORG];

const O = { ups: `${P}21`, air: `${P}22` } as const;
const INV = { ups: `${P}31`, air: `${P}32` } as const;
const ORDER_IDS = Object.values(O);
const INVOICE_IDS = Object.values(INV);

interface Actor {
  client: SupabaseClient;
  userId: string;
  role: string;
  orgId: string;
}

let service: SupabaseClient;
let admin: Actor;
let agency: Actor;

async function createActor(role: string, orgId: string): Promise<Actor> {
  const suffix = randomUUID().slice(0, 8);
  const email = `400-${suffix}@test.kr`;
  const password = `Aa1-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { role, org_id: orgId },
    user_metadata: { full_name: `400 ${role}` },
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

function asActor(actor: Actor) {
  mockValidate.mockResolvedValue({
    supabase: actor.client,
    user: { id: actor.userId },
    profile: { id: actor.userId, role: actor.role, org_id: actor.orgId, status: 'ACTIVE' },
  });
}

async function createOrder(id: string, transport: 'UPS' | 'AIR') {
  const { error } = await service.from('zen_orders').insert({
    id,
    order_no: `ZEN-400-${id.slice(-4)}`,
    cargo_details: {},
    transport_mode: transport,
    status: 'DELIVERED',
    shipper_id: SHIPPER_ORG,
    agency_org_id: AGENCY_ORG,
    cost_settlement_status: 'NOT_SETTLED',
  });
  if (error) throw new Error(`order insert failed: ${error.message}`);
}

async function createInvoice(id: string, orderId: string, tier: string) {
  const { error } = await service.from('zen_invoices').insert({
    id,
    invoice_no: `INV-400-${id.slice(-4)}`,
    shipper_id: SHIPPER_ORG,
    billed_org_id: AGENCY_ORG,
    invoice_tier: tier,
    total_amount: 100,
    currency: 'KRW',
    status: 'UNPAID',
    due_date: '2026-12-31',
    metadata: { source_order_id: orderId },
  });
  if (error) throw new Error(`invoice insert failed: ${error.message}`);
}

async function cleanup() {
  try {
    psql(`
      SET session_replication_role = replica;
      DELETE FROM public.zen_invoice_history WHERE invoice_id IN ('${INVOICE_IDS.join("','")}');
      DELETE FROM public.zen_invoices WHERE id IN ('${INVOICE_IDS.join("','")}');
      DELETE FROM public.zen_ups_settlement_runs WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_ups_actual_other_charges WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_ups_actual_cost WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_order_costs WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_order_rate_snapshots WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_orders WHERE id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_profiles WHERE email LIKE '400-%@test.kr';
      DELETE FROM auth.users WHERE email LIKE '400-%@test.kr';
      DELETE FROM public.zen_organizations WHERE id IN ('${ORG_IDS.join("','")}');
      RESET session_replication_role;
    `);
  } catch { /* best-effort */ }
}

function invoiceStatus(id: string): string {
  return psql(`SELECT status FROM public.zen_invoices WHERE id='${id}'`);
}

describe('TASK-B-400 — B-381 PR-3 서버 가드 실세션 통합 검증', () => {
  beforeAll(async () => {
    if (!URL || !ANON || !SERVICE) throw new Error('Supabase test env missing');
    service = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
    await cleanup();
    const { error: orgError } = await service.from('zen_organizations').upsert([
      { id: PLATFORM_ORG, name: '400 Platform', type: 'CORPORATE', status: 'ACTIVE' },
      { id: AGENCY_ORG, name: '400 Agency', type: 'AGENCY', status: 'ACTIVE' },
      { id: SHIPPER_ORG, name: '400 Shipper', type: 'SHIPPER', status: 'ACTIVE' },
    ], { onConflict: 'id' });
    if (orgError) throw new Error(`org insert failed: ${orgError.message}`);
    const { error: linkError } = await service.from('zen_agency_shippers').upsert({
      agency_org_id: AGENCY_ORG, shipper_org_id: SHIPPER_ORG, shipper_type: 'INDIVIDUAL', is_active: true,
    }, { onConflict: 'agency_org_id,shipper_org_id' });
    if (linkError) throw new Error(`link insert failed: ${linkError.message}`);

    admin = await createActor('ADMIN', PLATFORM_ORG);
    agency = await createActor('AGENCY', AGENCY_ORG);

    await createOrder(O.ups, 'UPS');
    await createOrder(O.air, 'AIR');
    await createInvoice(INV.ups, O.ups, 'ADMIN_TO_AGENCY');
    await createInvoice(INV.air, O.air, 'ADMIN_TO_AGENCY');
  }, 90000);

  afterAll(async () => {
    await cleanup();
  }, 60000);

  it('AGENCY 실세션에서 UPS 인보이스 생성 가드는 거부하고 비UPS는 UPS 키로 막히지 않는다', async () => {
    asActor(agency);

    await expect(generateInvoicesForOrder(O.ups)).rejects.toThrow('ups_invoice_blocked');
    // 비UPS는 UPS 가드가 아니라 후속 생성/검증 단계에서 실패해야 한다(UPS 키가 아님).
    const airError = await generateInvoicesForOrder(O.air).then(
      () => null,
      (error: unknown) => String((error as Error)?.message ?? ''),
    );
    expect(airError ?? '').not.toContain('ups_invoice_blocked');
  }, 60000);

  it('AGENCY 실세션 일괄 마감은 UPS 인보이스를 건너뛰고 상태를 바꾸지 않는다', async () => {
    asActor(agency);

    const res = await finalizeDailyShipperInvoices([INV.ups, INV.air], 'TASK-B-400');

    expect(res.success).toBe(true);
    expect(res.skippedCount).toBe(1);
    expect(res.failedCount + res.finalizedCount).toBe(1);
    expect(invoiceStatus(INV.ups)).toBe('UNPAID');
  }, 60000);

  it('ADMIN 실세션도 UPS 인보이스 일괄 마감에서 제외한다', async () => {
    asActor(admin);

    const res = await finalizeDailyShipperInvoices([INV.ups], 'TASK-B-400');

    expect(res.success).toBe(true);
    expect(res.skippedCount).toBe(1);
    expect(res.failedCount).toBe(0);
    expect(res.finalizedCount).toBe(0);
    expect(invoiceStatus(INV.ups)).toBe('UNPAID');
  }, 60000);

  it('InvoiceGenerator 공통 진입점은 UPS를 거부한다', async () => {
    const result = await new InvoiceGenerator().generateInvoice(O.ups);
    expect(result.success).toBe(false);
    expect((result as { message?: string }).message).toBe('ups_invoice_blocked');
  }, 60000);

});
