import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const mockValidate = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidate }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/i18n/action-error', () => ({
  trError: async (key: string) => key,
  actionLocale: async () => 'ko',
  trNotification: async (key: string, params?: Record<string, unknown>) =>
    params?.orderNo ? `${key}:${params.orderNo}` : key,
}));

import { finalizeUpsSettlement } from '@/app/actions/finance/ups-settlement';

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

const P = '38140000-0000-4000-8000-0000000000';
const PLATFORM_ORG = `${P}01`;
const AGENCY_ORG = `${P}02`;
const SHIPPER_ORG = `${P}03`;
const ORDER_IDS = [`${P}21`, `${P}22`, `${P}23`] as const;
const ORG_IDS = [PLATFORM_ORG, AGENCY_ORG, SHIPPER_ORG];
const ROLES = ['ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'] as const;

interface Actor {
  client: SupabaseClient;
  userId: string;
  role: string;
}

let service: SupabaseClient;
const actors: Actor[] = [];
let shipperActor: Actor;
let agencyActor: Actor;

async function createActor(role: string, orgId: string): Promise<Actor> {
  const suffix = randomUUID().slice(0, 8);
  const email = `381n-${suffix}@test.kr`;
  const password = `Aa1-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { role, org_id: orgId },
    user_metadata: { full_name: `381n ${role}` },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const { error: profileError } = await service
    .from('zen_profiles')
    .update({ role, org_id: orgId, status: 'ACTIVE' })
    .eq('id', data.user.id);
  if (profileError) throw new Error(`profile update failed: ${profileError.message}`);
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn failed: ${signInError.message}`);
  return { client, userId: data.user.id, role };
}

function asActor(actor: Actor) {
  mockValidate.mockResolvedValue({
    supabase: actor.client,
    user: { id: actor.userId },
    profile: { id: actor.userId, role: actor.role, org_id: PLATFORM_ORG, status: 'ACTIVE' },
  });
}

async function createOrder(id: string) {
  const { error } = await service.from('zen_orders').insert({
    id,
    order_no: `ZEN-381N-${id.slice(-4)}`,
    cargo_details: {},
    transport_mode: 'UPS',
    status: 'DELIVERED',
    shipper_id: SHIPPER_ORG,
    agency_org_id: AGENCY_ORG,
    recipient_country_code: 'US',
    ups_product_code: 'WW_SAVER_NONDOC',
    incoterms: 'DDP',
    cost_settlement_status: 'NOT_SETTLED',
  });
  if (error) throw new Error(`order insert failed: ${error.message}`);
  const { error: snapError } = await service.from('zen_order_rate_snapshots').insert({
    order_id: id,
    applied_unit_price: 0,
    applied_currency: 'KRW',
    applied_rule: 'TEST',
    metadata: { platform: { billingWeightKg: 5, chargeableWeightKg: 5, baseSellingPrice: 100, fuelSurchargeSellingAmount: 10, surgeFeeSellingAmount: 5, otherChargesSellingTotal: 5 } },
  });
  if (snapError) throw new Error(`snapshot insert failed: ${snapError.message}`);
}

const INPUT = {
  actualWeightKg: 5,
  baseFreight: { amount: 1000, currency: 'KRW' },
  fuelSurcharge: { amount: 100, currency: 'KRW' },
  surgeFee: { amount: 50, currency: 'KRW' },
  otherCharges: [{ name: '주소정정', amount: 30, currency: 'KRW' }],
};

async function cleanup() {
  try {
    psql(`
      SET session_replication_role = replica;
      DELETE FROM public.zen_notifications WHERE order_id IN ('${ORDER_IDS.join("','")}') OR user_id IN (SELECT id FROM auth.users WHERE email LIKE '381n-%@test.kr');
      DELETE FROM public.zen_ups_settlement_runs WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_ups_actual_other_charges WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_ups_actual_cost WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_order_costs WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_order_rate_snapshots WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_orders WHERE id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_profiles WHERE email LIKE '381n-%@test.kr';
      DELETE FROM auth.users WHERE email LIKE '381n-%@test.kr';
      DELETE FROM public.zen_organizations WHERE id IN ('${ORG_IDS.join("','")}');
      RESET session_replication_role;
    `);
  } catch { /* best-effort */ }
}

async function notificationCount(orderId: string, userId: string): Promise<number> {
  const { count } = await service
    .from('zen_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .eq('user_id', userId);
  return count ?? 0;
}

describe('TASK-B-381 PR-4a — 정산마감 알림 실DB 발송(모킹 없음)', () => {
  beforeAll(async () => {
    if (!URL || !ANON || !SERVICE) throw new Error('Supabase test env missing');
    service = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
    await cleanup();
    const { error } = await service.from('zen_organizations').upsert([
      { id: PLATFORM_ORG, name: '381n Platform', type: 'CORPORATE', status: 'ACTIVE' },
      { id: AGENCY_ORG, name: '381n Agency', type: 'AGENCY', status: 'ACTIVE' },
      { id: SHIPPER_ORG, name: '381n Shipper', type: 'SHIPPER', status: 'ACTIVE' },
    ], { onConflict: 'id' });
    if (error) throw new Error(`org insert failed: ${error.message}`);
    await service.from('zen_agency_shippers').upsert({
      agency_org_id: AGENCY_ORG, shipper_org_id: SHIPPER_ORG, shipper_type: 'INDIVIDUAL', is_active: true,
    }, { onConflict: 'agency_org_id,shipper_org_id' });

    for (const role of ROLES) actors.push(await createActor(role, PLATFORM_ORG));
    shipperActor = await createActor('SHIPPER', SHIPPER_ORG);
    agencyActor = await createActor('AGENCY', AGENCY_ORG);

    for (const id of ORDER_IDS) {
      await createOrder(id);
      const { data: snap } = await service
        .from('zen_order_rate_snapshots')
        .select('metadata')
        .eq('order_id', id)
        .maybeSingle();
      const platform = (snap?.metadata as any)?.platform;
      if (!platform || !platform.chargeableWeightKg) {
        throw new Error(`snapshot missing for ${id}: ${JSON.stringify(snap)}`);
      }
    }
    psql(`GRANT EXECUTE ON FUNCTION public.finalize_ups_settlement_run(uuid,numeric,jsonb,jsonb) TO authenticated;`);
  }, 90000);

  afterAll(async () => {
    try { psql(`GRANT EXECUTE ON FUNCTION public.finalize_ups_settlement_run(uuid,numeric,jsonb,jsonb) TO authenticated;`); } catch { /* ignore */ }
    await cleanup();
  }, 60000);

  it('ADMIN·MANAGER·ZENITH_SUPER_ADMIN 실행 모두 수신자 3명분 알림 행을 만든다', async () => {
    for (let i = 0; i < ROLES.length; i += 1) {
      const actor = actors[i];
      const orderId = ORDER_IDS[i];
      asActor(actor);
      const res = await finalizeUpsSettlement({ orderId, ...INPUT });
      expect(res.success, `${actor.role}: ${res.error ?? ''}`).toBe(true);

      for (const recipient of actors) {
        expect(await notificationCount(orderId, recipient.userId), `${actor.role} → ${recipient.role}`).toBe(1);
      }
      expect(await notificationCount(orderId, shipperActor.userId)).toBe(0);
      expect(await notificationCount(orderId, agencyActor.userId)).toBe(0);

      const { data: row } = await service
        .from('zen_notifications')
        .select('type, title, message')
        .eq('order_id', orderId)
        .eq('user_id', actors[0].userId)
        .single();
      expect(row?.type).toBe('SYSTEM');
      expect(row?.title).toBeTruthy();
      expect(row?.message).toContain(`ZEN-381N-${orderId.slice(-4)}`);
    }
  }, 90000);
});
