import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const mockValidate = vi.hoisted(() => vi.fn());
const notifyMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidate }));
vi.mock('@/app/actions/misc/notifications', () => ({ sendInAppNotification: notifyMock }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));
// 화면 문구 대신 오류 키를 반환시켜 거부 사유를 정확히 단언한다.
vi.mock('@/lib/i18n/action-error', () => ({
  trError: async (key: string) => key,
  actionLocale: async () => 'ko',
  trNotification: async (key: string, params?: Record<string, unknown>) =>
    params?.orderNo ? `${key}:${params.orderNo}` : key,
}));

import { getUpsActualCost } from '@/app/actions/finance/ups-actual-cost';
import {
  previewUpsSettlement,
  saveUpsSettlementDraft,
  finalizeUpsSettlement,
} from '@/app/actions/finance/ups-settlement';

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

const P = '38120000-0000-4000-8000-0000000000';
const PLATFORM_ORG = `${P}01`;
const AGENCY_ORG = `${P}02`;
const SHIPPER_ORG = `${P}03`;
const O = {
  preview: `${P}21`, draft: `${P}22`, final: `${P}23`, idem: `${P}24`,
  lock: `${P}25`, invoice: `${P}26`, deny: `${P}27`, curr: `${P}28`, nochange: `${P}29`,
  nocountry: `${P}2a`, invErr: `${P}2b`, rt: `${P}2c`, notify: `${P}2d`, notifyFail: `${P}2e`,
  notifyLookup: `${P}2f`,
} as const;
const ORDER_IDS = Object.values(O);
const ORG_IDS = [PLATFORM_ORG, AGENCY_ORG, SHIPPER_ORG];

interface Actor {
  client: SupabaseClient;
  userId: string;
  role: string;
  orgId: string;
}

let service: SupabaseClient;
let admin: Actor;
let shipperActor: Actor;
let managerActor: Actor;
let superActor: Actor;

async function createActor(role: string, orgId: string): Promise<Actor> {
  const suffix = randomUUID().slice(0, 8);
  const email = `381a-${suffix}@test.kr`;
  const password = `Aa1-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { role, org_id: orgId },
    user_metadata: { full_name: `381a ${role}` },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const { error: profileError } = await service.from('zen_profiles').update({ role, org_id: orgId, status: 'ACTIVE' }).eq('id', data.user.id);
  if (profileError) throw new Error(`profile update failed: ${profileError.message}`);
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn failed: ${signInError.message}`);
  return { client, userId: data.user.id, role, orgId };
}

function asActor(actor: Actor, client: SupabaseClient = actor.client) {
  mockValidate.mockResolvedValue({
    supabase: client,
    user: { id: actor.userId },
    profile: { id: actor.userId, role: actor.role, org_id: actor.orgId, status: 'ACTIVE' },
  });
}

function clientWithInvoiceLookupError(client: SupabaseClient): SupabaseClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string) => {
          if (table === 'zen_invoices') {
            return {
              select: () => ({
                filter: async () => ({ data: null, error: { message: 'forced invoice lookup failure' } }),
              }),
            };
          }
          return (target as any).from(table);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseClient;
}

async function createOrder(id: string, opts: { transport?: 'UPS' | 'AIR'; productCode?: string; countryCode?: string | null } = {}) {
  const { error } = await service.from('zen_orders').insert({
    id,
    order_no: `ZEN-381A-${id.slice(-4)}`,
    cargo_details: {},
    transport_mode: opts.transport ?? 'UPS',
    status: 'DELIVERED',
    shipper_id: SHIPPER_ORG,
    agency_org_id: AGENCY_ORG,
    recipient_country_code: opts.countryCode === undefined ? 'US' : opts.countryCode,
    ups_product_code: opts.productCode ?? 'WW_SAVER_NONDOC',
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
  baseFreight: { amount: 1000, currency: 'KRW' },
  fuelSurcharge: { amount: 100, currency: 'KRW' },
  surgeFee: { amount: 50, currency: 'KRW' },
  otherCharges: [{ name: '주소정정', amount: 30, currency: 'KRW' }],
};

async function cleanup() {
  try {
    psql(`
      SET session_replication_role = replica;
      DELETE FROM public.zen_invoices WHERE metadata->>'source_order_id' IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_ups_settlement_runs WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_ups_actual_other_charges WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_ups_actual_cost WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_order_costs WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_order_rate_snapshots WHERE order_id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_orders WHERE id IN ('${ORDER_IDS.join("','")}');
      DELETE FROM public.zen_profiles WHERE email LIKE '381a-%@test.kr';
      DELETE FROM auth.users WHERE email LIKE '381a-%@test.kr';
      DELETE FROM public.zen_organizations WHERE id IN ('${ORG_IDS.join("','")}');
      RESET session_replication_role;
    `);
  } catch { /* best-effort */ }
}

describe('TASK-B-381 PR-2 — UPS 정산마감 서버 액션 실DB (자기완결형)', () => {
  beforeAll(async () => {
    if (!URL || !ANON || !SERVICE) throw new Error('Supabase test env missing');
    service = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
    notifyMock.mockResolvedValue(undefined);
    await cleanup();
    const { error } = await service.from('zen_organizations').upsert([
      { id: PLATFORM_ORG, name: '381a Platform', type: 'CORPORATE', status: 'ACTIVE' },
      { id: AGENCY_ORG, name: '381a Agency', type: 'AGENCY', status: 'ACTIVE' },
      { id: SHIPPER_ORG, name: '381a Shipper', type: 'SHIPPER', status: 'ACTIVE' },
    ], { onConflict: 'id' });
    if (error) throw new Error(`org insert failed: ${error.message}`);
    await service.from('zen_agency_shippers').upsert({
      agency_org_id: AGENCY_ORG, shipper_org_id: SHIPPER_ORG, shipper_type: 'INDIVIDUAL', is_active: true,
    }, { onConflict: 'agency_org_id,shipper_org_id' });

    admin = await createActor('ADMIN', PLATFORM_ORG);
    shipperActor = await createActor('SHIPPER', SHIPPER_ORG);
    managerActor = await createActor('MANAGER', PLATFORM_ORG);
    superActor = await createActor('ZENITH_SUPER_ADMIN', PLATFORM_ORG);

    for (const id of ORDER_IDS) { if (id === O.nochange || id === O.nocountry) continue; await createOrder(id); }
    await createOrder(O.nocountry, { countryCode: null });
    await psql(`GRANT EXECUTE ON FUNCTION public.finalize_ups_settlement_run(uuid,numeric,jsonb,jsonb) TO authenticated;`);
  }, 60000);

  afterAll(async () => {
    try { psql(`GRANT EXECUTE ON FUNCTION public.finalize_ups_settlement_run(uuid,numeric,jsonb,jsonb) TO authenticated;`); } catch { /* ignore */ }
    await cleanup();
  }, 60000);

  it('preview — DB 쓰기 없이 금액·run payload 반환', async () => {
    asActor(admin);
    const res = await previewUpsSettlement({ orderId: O.preview, ...INPUT });
    expect(res.success).toBe(true);
    expect(res.preview?.amounts).toHaveLength(2);
    expect(res.preview?.charges.length).toBe(2);
    // 부가항목은 KRW 고정 fixture — 값으로 단언한다.
    expect(res.preview?.charges.map((c) => [c.tier, c.line_no, c.name, c.amount])).toEqual([
      ['ADMIN_TO_AGENCY', 1, '주소정정', 30],
      ['SHIPPER', 1, '주소정정', 30],
    ]);
    for (const amount of res.preview!.amounts) {
      expect(amount.settlement_charges_total).toBe(30);
      expect(amount.line_total).toBe(
        round2(
          amount.base_freight + amount.fuel_surcharge + amount.surge_fee + amount.other_charges +
          amount.freight_adjustment + amount.settlement_charges_total,
        ),
      );
    }
    expect(runCount(O.preview)).toBe(0);
    expect(costCount(O.preview)).toBe(0);
  }, 60000);

  it('draft — 원가만 저장, run/ SETTLED 없음', async () => {
    asActor(admin);
    const res = await saveUpsSettlementDraft({ orderId: O.draft, ...INPUT });
    expect(res.success).toBe(true);
    expect(costCount(O.draft)).toBe(1);
    expect(otherChargeCount(O.draft)).toBe(1);
    expect(runCount(O.draft)).toBe(0);
    expect(status(O.draft)).toBe('NOT_SETTLED');
  }, 60000);

  it('draft 라운드트립 — 원금액 복원, 재저장 이중가산 없음, 부가항목 유지', async () => {
    asActor(admin);
    const first = await saveUpsSettlementDraft({ orderId: O.rt, ...INPUT });
    expect(first.success).toBe(true);

    const saved = await getUpsActualCost(O.rt);
    expect(Number(saved.base_freight_hkd)).toBe(1000); // +7% 가산 전 원금액
    expect(saved.base_freight_currency).toBe('KRW');
    expect(Number(saved.fuel_surcharge_hkd)).toBe(100);
    expect(Number(saved.surge_fee_hkd)).toBe(50);
    expect(Number(saved.other_charges_hkd)).toBe(30);
    expect(Number(saved.calc_version)).toBe(3);

    const { data: chargeRows } = await service
      .from('zen_ups_actual_other_charges')
      .select('charge_name, amount, currency')
      .eq('order_id', O.rt);
    expect(chargeRows).toHaveLength(1);
    expect(Number(chargeRows![0].amount)).toBe(30);
    expect(chargeRows![0].charge_name).toBe('주소정정');

    const restored = {
      orderId: O.rt,
      baseFreight: { amount: Number(saved.base_freight_hkd), currency: saved.base_freight_currency },
      fuelSurcharge: { amount: Number(saved.fuel_surcharge_hkd), currency: saved.fuel_surcharge_currency },
      surgeFee: { amount: Number(saved.surge_fee_hkd), currency: saved.surge_fee_currency },
      otherCharges: (chargeRows ?? []).map((c: any) => ({ name: c.charge_name, amount: Number(c.amount), currency: c.currency })),
    };

    const totalBefore = Number(psql(`SELECT total_cost_krw FROM public.zen_ups_actual_cost WHERE order_id='${O.rt}'`));
    const preview = await previewUpsSettlement(restored);
    expect(preview.success).toBe(true);
    expect(preview.preview!.cost.totalCostKrw).toBe(totalBefore);

    await saveUpsSettlementDraft(restored);
    const totalAfter = Number(psql(`SELECT total_cost_krw FROM public.zen_ups_actual_cost WHERE order_id='${O.rt}'`));
    expect(totalAfter).toBe(totalBefore);
    expect(otherChargeCount(O.rt)).toBe(1);
  }, 60000);

  it('finalize 알림 — 관리자 3역할 전원에게 발송, 실패해도 정산 유지(best-effort)', async () => {
    asActor(admin);
    notifyMock.mockClear();
    const ok = await finalizeUpsSettlement({ orderId: O.notify, ...INPUT });
    expect(ok.success).toBe(true);

    const notifiedIds = notifyMock.mock.calls.map((call) => call[0].userId);
    expect(notifiedIds).toEqual(expect.arrayContaining([admin.userId, managerActor.userId, superActor.userId]));
    expect(notifiedIds).not.toContain(shipperActor.userId);
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({
      orderId: O.notify,
      type: 'SYSTEM',
      title: 'title',
      message: expect.stringContaining('body:ZEN-381A-'),
    }));

    notifyMock.mockRejectedValueOnce(new Error('notify failure'));
    const res = await finalizeUpsSettlement({ orderId: O.notifyFail, ...INPUT });
    expect(res.success).toBe(true);
    expect(status(O.notifyFail)).toBe('SETTLED');
  }, 60000);

  it('finalize — run 2 tier·charges·SETTLED, 원장/ADJ 미변경', async () => {
    asActor(admin);
    const beforeCosts = Number(psql(`SELECT count(*) FROM public.zen_order_costs WHERE order_id='${O.final}'`));
    const preview = await previewUpsSettlement({ orderId: O.final, ...INPUT });
    expect(preview.success).toBe(true);
    const res = await finalizeUpsSettlement({ orderId: O.final, ...INPUT });
    expect(res.success).toBe(true);
    expect(res.version).toBe(1);
    expect(runCount(O.final)).toBe(1);
    expect(status(O.final)).toBe('SETTLED');
    expect(Number(psql(`SELECT count(*) FROM public.zen_ups_settlement_run_amounts a JOIN public.zen_ups_settlement_runs r ON r.id=a.run_id WHERE r.order_id='${O.final}'`))).toBe(2);
    expect(Number(psql(`SELECT count(*) FROM public.zen_ups_settlement_run_charges c JOIN public.zen_ups_settlement_runs r ON r.id=c.run_id WHERE r.order_id='${O.final}'`))).toBe(2);
    expect(Number(psql(`SELECT count(*) FROM public.zen_order_costs WHERE order_id='${O.final}'`))).toBe(beforeCosts);
    expect(Number(psql(`SELECT count(*) FROM public.zen_order_costs WHERE order_id='${O.final}' AND cost_type='UPS_ACTUAL_COST_ADJ'`))).toBe(0);

    // 저장된 run 금액이 미리보기 값과 일치하는지 값으로 단언한다.
    const stored = await latestRun(O.final);
    expect(stored.amounts).toHaveLength(2);
    for (const expected of preview.preview!.amounts) {
      const row = stored.amounts.find((a) => a.tier === expected.tier)!;
      for (const key of AMOUNT_KEYS) expect(Number(row[key])).toBe(expected[key]);
      const tierCharges = stored.charges.filter((c) => c.tier === expected.tier);
      expect(tierCharges).toHaveLength(1);
      expect(Number(tierCharges[0].amount)).toBe(30);
      expect(round2(tierCharges.reduce((sum, c) => sum + Number(c.amount), 0))).toBe(expected.settlement_charges_total);
    }

    // 청구 항목 금액의 단일 원천(billing_items_amounts)이 같은 값을 반환한다.
    const { data: billRows, error: billError } = await service.rpc('billing_items_amounts', {
      p_order_ids: [O.final],
      p_tier: 'ADMIN_TO_AGENCY',
    });
    expect(billError).toBeNull();
    const billRow = (billRows as any[])[0];
    const agencyRow = stored.amounts.find((a) => a.tier === 'ADMIN_TO_AGENCY')!;
    for (const key of AMOUNT_KEYS) expect(Number(billRow[key])).toBe(Number(agencyRow[key]));
    expect(Number(billRow.charge_weight_kg)).toBe(preview.preview!.chargeWeightKg);
    expect((billRow.charge_details as any[])).toHaveLength(1);
    expect(Number((billRow.charge_details as any[])[0].amount)).toBe(30);
  }, 60000);

  it('finalize 멱등 — 같은 입력 재호출은 새 version 없음', async () => {
    asActor(admin);
    await finalizeUpsSettlement({ orderId: O.idem, ...INPUT });
    const again = await finalizeUpsSettlement({ orderId: O.idem, ...INPUT });
    expect(again.success).toBe(true);
    expect(again.version).toBe(1);
    expect(runCount(O.idem)).toBe(1);
  }, 60000);

  it('SETTLED 잠금 — 다른 금액 재정산 거부, 원가 불변', async () => {
    asActor(admin);
    await finalizeUpsSettlement({ orderId: O.lock, ...INPUT });
    const costBefore = psql(`SELECT total_cost_krw FROM public.zen_ups_actual_cost WHERE order_id='${O.lock}'`);
    const res = await finalizeUpsSettlement({
      orderId: O.lock,
      ...INPUT,
      otherCharges: [{ name: '주소정정', amount: 999, currency: 'KRW' }],
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('already_settled');
    expect(runCount(O.lock)).toBe(1);
    expect(psql(`SELECT total_cost_krw FROM public.zen_ups_actual_cost WHERE order_id='${O.lock}'`)).toBe(costBefore);
  }, 60000);

  it('인보이스 방어 — 비취소 인보이스가 있으면 실패', async () => {
    await service.from('zen_invoices').insert({
      invoice_no: `INV-381A-${randomUUID().slice(0, 8)}`, shipper_id: SHIPPER_ORG,
      total_amount: 1, currency: 'KRW', due_date: '2026-12-31', status: 'UNPAID',
      metadata: { source_order_id: O.invoice },
    });
    asActor(admin);
    const res = await finalizeUpsSettlement({ orderId: O.invoice, ...INPUT });
    expect(res.success).toBe(false);
    expect(res.error).toBe('ups_invoice_exists');
    expect(runCount(O.invoice)).toBe(0);
  }, 60000);

  it('비관리자 거부 — SHIPPER', async () => {
    asActor(shipperActor);
    const res = await finalizeUpsSettlement({ orderId: O.deny, ...INPUT });
    expect(res.success).toBe(false);
    expect(res.error).toBe('permission_denied');
  }, 60000);

  it('환율 실패 — 알 수 없는 통화는 currency_conversion_failed', async () => {
    asActor(admin);
    const res = await previewUpsSettlement({ orderId: O.curr, ...INPUT, otherCharges: [{ name: 'X', amount: 1, currency: 'ZZZ' }] });
    expect(res.success).toBe(false);
    expect(res.error).toBe('currency_conversion_failed');
    expect(runCount(O.curr)).toBe(0);
    expect(costCount(O.curr)).toBe(0);
  }, 60000);

  it('오더 가드 — 비UPS 거부', async () => {
    await createOrder(O.nochange, { transport: 'AIR' });
    asActor(admin);
    const res = await previewUpsSettlement({ orderId: O.nochange, ...INPUT });
    expect(res.success).toBe(false);
    expect(res.error).toBe('not_ups_order');
  }, 60000);

  it('도착국 미확인 — ups_estimate_unavailable', async () => {
    asActor(admin);
    const res = await previewUpsSettlement({ orderId: O.nocountry, ...INPUT });
    expect(res.success).toBe(false);
    expect(res.error).toBe('ups_estimate_unavailable');
  }, 60000);

  it('인보이스 조회 오류 — fail-closed(rpc_failed), 원가/run 미저장', async () => {
    asActor(admin, clientWithInvoiceLookupError(admin.client));
    const res = await finalizeUpsSettlement({ orderId: O.invErr, ...INPUT });
    expect(res.success).toBe(false);
    expect(res.error).toBe('rpc_failed');
    expect(costCount(O.invErr)).toBe(0);
    expect(runCount(O.invErr)).toBe(0);
    expect(status(O.invErr)).toBe('NOT_SETTLED');
  }, 60000);
});

const AMOUNT_KEYS = [
  'base_freight', 'fuel_surcharge', 'surge_fee', 'other_charges',
  'freight_adjustment', 'settlement_charges_total', 'line_total',
] as const;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function latestRun(orderId: string) {
  const { data: run } = await service
    .from('zen_ups_settlement_runs')
    .select('id')
    .eq('order_id', orderId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!run) return { run: null, amounts: [] as any[], charges: [] as any[] };
  const { data: amounts } = await service.from('zen_ups_settlement_run_amounts').select('*').eq('run_id', (run as any).id);
  const { data: charges } = await service.from('zen_ups_settlement_run_charges').select('*').eq('run_id', (run as any).id);
  return { run, amounts: (amounts ?? []) as any[], charges: (charges ?? []) as any[] };
}

function runCount(orderId: string): number {
  return Number(psql(`SELECT count(*) FROM public.zen_ups_settlement_runs WHERE order_id='${orderId}'`));
}
function costCount(orderId: string): number {
  return Number(psql(`SELECT count(*) FROM public.zen_ups_actual_cost WHERE order_id='${orderId}'`));
}
function otherChargeCount(orderId: string): number {
  return Number(psql(`SELECT count(*) FROM public.zen_ups_actual_other_charges WHERE order_id='${orderId}'`));
}
function status(orderId: string): string {
  return psql(`SELECT cost_settlement_status FROM public.zen_orders WHERE id='${orderId}'`);
}
