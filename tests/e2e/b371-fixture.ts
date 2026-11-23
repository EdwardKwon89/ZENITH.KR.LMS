// TASK-B-371 (Issue #1439) — 청구서관리 통합 검증 E2E용 자기완결형 fixture
//
// 원칙(이슈 [지켜야 할 것]):
//  · **자기완결형** — `scripts/seed-local.ts` 데이터에 의존하지 않고, 실행 후 정리한다.
//  · **로컬 전용 (R-14)** — `helpers/db.ts`의 원격 URL 가드를 그대로 쓴다.
//  · 실제 계정은 GoTrue admin API로 만들어 **브라우저 로그인**이 가능해야 한다
//    (SQL로만 INSERT하면 GoTrue `/user`가 못 읽는다 — DEF-B-161).
import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
if (!LOCAL_HOSTS.has(new URL(SUPABASE_URL).hostname)) {
  throw new Error(`[TASK-B-371] 원격 Supabase 접속 금지(R-14): ${SUPABASE_URL}`);
}

export const PASSWORD = 'password1234';

/** service client (fixture·검증 전용) */
export function serviceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required');
  return createClient(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** psql 직접 실행 — ISSUED/CLOSED 청구서 삭제(트리거 차단) 등 스키마 수준 정리에만 사용 (local only) */
function selectDbContainer(): string {
  const names = execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf-8' })
    .split('\n').map((s) => s.trim()).filter(Boolean);
  const candidates = names.filter((n) => n.startsWith('supabase_db_'));
  if (candidates.length === 1) return candidates[0];
  const env = process.env.SUPABASE_DB_CONTAINER;
  if (env && candidates.includes(env)) return env;
  if (env && names.includes(env)) return env;
  throw new Error(`[TASK-B-371] DB 컨테이너 모호: ${candidates.join(',')}`);
}

let cachedContainer: string | null = null;
export function psql(sql: string): string {
  cachedContainer ??= selectDbContainer();
  return execFileSync(
    'docker',
    ['exec', '-i', cachedContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-q', '-t', '-A', '-f', '-'],
    { input: sql, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
  ).trim();
}

// ───────────────────────────────────────────── ID (고정 — 정리·재현 용이)

export const IDS = {
  platformOrg: '37100000-0000-4000-8000-000000000001',
  agencyAOrg: '37100000-0000-4000-8000-000000000002',
  agencyBOrg: '37100000-0000-4000-8000-000000000003',
  shipperAOrg: '37100000-0000-4000-8000-000000000004',
  shipperBOrg: '37100000-0000-4000-8000-000000000005',
  // 오더
  orderSettle: '37100000-0000-4000-8000-000000000011', // A1: Admin이 정산 완료
  orderX: '37100000-0000-4000-8000-000000000012',       // A2~A5: 발행 청구서에 포함
  orderU: '37100000-0000-4000-8000-000000000013',       // A2: 미정산 → 후보 제외
  orderAd: '37100000-0000-4000-8000-000000000014',      // A2: 수기 화주(ADHOC)
  orderFree: '37100000-0000-4000-8000-000000000015',    // A5: 청구서 미포함 → unmark 성공
  orderDraft: '37100000-0000-4000-8000-000000000016',   // A5: DRAFT 청구서 포함 → 취소 후 unmark 성공
  orderB: '37100000-0000-4000-8000-000000000017',       // B1: 대리점 B의 청구서 (타 생성자 차단 대상)
};

export const ORDER_NOS = {
  settle: 'ZEN-371-SETTLE',
  x: 'ZEN-371-X',
  u: 'ZEN-371-U',
  ad: 'ZEN-371-ADHOC',
  free: 'ZEN-371-FREE',
  draft: 'ZEN-371-DRAFT',
  b: 'ZEN-371-B',
};

export const ADHOC_NAME = '(주)E2E 수기화주';
export const ACCOUNTS = {
  admin: { email: 'b371_admin@zenith.kr', name: 'B371 Admin' },
  agencyA: { email: 'b371_agency_a@zenith.kr', name: 'B371 Agency A' },
  agencyB: { email: 'b371_agency_b@zenith.kr', name: 'B371 Agency B' },
  shipperA: { email: 'b371_shipper_a@zenith.kr', name: 'B371 Shipper A' },
  shipperB: { email: 'b371_shipper_b@zenith.kr', name: 'B371 Shipper B' },
};

// ───────────────────────────────────────────── 계정

async function createOrg(sb: SupabaseClient, id: string, name: string, type: string) {
  const { error } = await sb.from('zen_organizations').upsert(
    { id, name, type, status: 'ACTIVE' }, { onConflict: 'id' },
  );
  if (error) throw new Error(`[B371] org create(${name}) failed: ${error.message}`);
}

/** GoTrue admin API로 **패스워드가 있는** 사용자 생성 (브라우저 로그인 가능) + 프로필 보정 */
/** RLS 정책(`zen_agency_shippers` 등)이 `auth.jwt() -> 'app_metadata' ->> 'org_id'`를 읽으므로
 *  **app_metadata를 반드시 함께 넣는다**(user_metadata만 넣으면 조직 RLS가 조용히 빈 집합이 된다). */
async function createUser(
  sb: SupabaseClient, email: string, fullName: string, role: string, orgId: string, orgType: string,
): Promise<string> {
  const { data: existing } = await sb.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === email);
  if (found) await sb.auth.admin.deleteUser(found.id);

  const { data: created, error } = await sb.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    user_metadata: { full_name: fullName, org_id: orgId, role },
    app_metadata: { provider: 'email', role, org_id: orgId, org_type: orgType, status: 'ACTIVE' },
  });
  if (error || !created.user) throw new Error(`[B371] user create(${email}) failed: ${error?.message}`);

  const { error: profileError } = await sb.from('zen_profiles').upsert({
    id: created.user.id, org_id: orgId, email, role, status: 'ACTIVE', full_name: fullName,
  }, { onConflict: 'id' });
  if (profileError) throw new Error(`[B371] profile upsert(${email}) failed: ${profileError.message}`);
  return created.user.id;
}

// ───────────────────────────────────────────── 오더

interface SeedOrderOpts {
  id: string; orderNo: string; shipperOrg: string; agencyOrg: string | null;
  settled: boolean; shipperName?: string; basisAt?: string; recipientName?: string; country?: string;
  /** SETTLED이면 필수 — `zen_orders_cost_settled_complete_check`(at·by 모두 NOT NULL) */
  settledBy?: string;
}

function seedOrder(sb: SupabaseClient, opts: SeedOrderOpts) {
  void sb;
  // CHECK: cost_settlement_status='SETTLED' → cost_settled_at·cost_settled_by 모두 NOT NULL
  const settled = opts.settled
    ? `'SETTLED', now(), '${opts.settledBy ?? ''}'`
    : `'NOT_SETTLED', NULL, NULL`;
  psql(`
    INSERT INTO public.zen_orders
      (id, order_no, cargo_details, transport_mode, status, shipper_id, agency_org_id,
       shipper_name, recipient_name, recipient_country_code,
       cost_settlement_status, cost_settled_at, cost_settled_by, created_at)
    VALUES ('${opts.id}', '${opts.orderNo}', '{}'::jsonb, 'UPS', 'DELIVERED',
            '${opts.shipperOrg}', ${opts.agencyOrg ? `'${opts.agencyOrg}'` : 'NULL'},
            ${opts.shipperName ? `'${opts.shipperName}'` : 'NULL'},
            ${opts.recipientName ? `'${opts.recipientName}'` : 'NULL'},
            '${opts.country ?? 'US'}', ${settled}, now())
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status, cost_settlement_status = EXCLUDED.cost_settlement_status,
      cost_settled_at = EXCLUDED.cost_settled_at, shipper_id = EXCLUDED.shipper_id,
      agency_org_id = EXCLUDED.agency_org_id, shipper_name = EXCLUDED.shipper_name,
      recipient_name = EXCLUDED.recipient_name, recipient_country_code = EXCLUDED.recipient_country_code;
    INSERT INTO public.order_status_history (order_id, prev_status, next_status, changed_by, created_at)
    VALUES ('${opts.id}', 'IN_TRANSIT', 'DELIVERED', NULL, '${opts.basisAt ?? new Date().toISOString()}')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.zen_order_rate_snapshots
      (id, order_id, applied_unit_price, applied_currency, applied_rule, metadata, snapshot_at)
    VALUES (gen_random_uuid(), '${opts.id}', 1000, 'KRW', 'B371',
            '{"platform":{"billingWeightKg":5,"chargeableWeightKg":4.78,"baseSellingPrice":100000,"fuelSurchargeSellingAmount":20000,"surgeFeeSellingAmount":5000,"otherChargesSellingTotal":1000,"currency":"KRW"}}'::jsonb,
            now())
    ON CONFLICT (order_id) DO UPDATE SET metadata = EXCLUDED.metadata;
    INSERT INTO public.zen_order_costs (id, order_id, cost_type, unit_price, quantity, currency, is_revenue, created_at)
    VALUES (gen_random_uuid(), '${opts.id}', 'BASE_FREIGHT', 100000, 1, 'KRW', true, now()),
          (gen_random_uuid(), '${opts.id}', 'FUEL_SURCHARGE', 20000, 1, 'KRW', true, now()),
          (gen_random_uuid(), '${opts.id}', 'SURGE_FEE', 5000, 1, 'KRW', true, now()),
          (gen_random_uuid(), '${opts.id}', 'OTHER_CHARGE', 1000, 1, 'KRW', true, now())
    ON CONFLICT DO NOTHING;
  `);
}

// ───────────────────────────────────────────── 정리

export async function cleanupFixture(): Promise<void> {
  const sb = serviceClient();
  // ISSUED/CLOSED 청구서는 상태 트리거로 삭제가 차단된다 — 정리 중에만 비활성화
  psql(`ALTER TABLE public.zen_billing_statements DISABLE TRIGGER trg_billing_statement_before_delete;`);
  psql(`DELETE FROM public.zen_billing_statements
        WHERE issuer_org_id IN ('${IDS.agencyAOrg}','${IDS.agencyBOrg}','${IDS.platformOrg}')
           OR billed_org_id IN ('${IDS.shipperAOrg}','${IDS.shipperBOrg}');`);
  psql(`ALTER TABLE public.zen_billing_statements ENABLE TRIGGER trg_billing_statement_before_delete;`);

  // 오더 ID만 추출 (org ID 5개는 제외) — 정확히 0011~0017
  const orderIds = Object.values(IDS)
    .filter((v) => /-4000-8000-00000000001[1-7]$/.test(v))
    .map((v) => `'${v}'`);
  psql(`DELETE FROM public.zen_ups_labels WHERE order_id IN (${orderIds});`);
  psql(`DELETE FROM public.zen_order_packages WHERE order_id IN (${orderIds});`);
  psql(`DELETE FROM public.zen_order_costs WHERE order_id IN (${orderIds});`);
  psql(`DELETE FROM public.zen_order_rate_snapshots WHERE order_id IN (${orderIds});`);
  psql(`DELETE FROM public.order_status_history WHERE order_id IN (${orderIds});`);
  psql(`DELETE FROM public.zen_orders WHERE id IN (${orderIds});`);
  psql(`DELETE FROM public.zen_agency_shippers
        WHERE agency_org_id IN ('${IDS.agencyAOrg}','${IDS.agencyBOrg}')
           OR shipper_org_id IN ('${IDS.shipperAOrg}','${IDS.shipperBOrg}');`);

  const emails = Object.values(ACCOUNTS).map((a) => `'${a.email}'`).join(',');
  psql(`DELETE FROM public.order_status_history WHERE changed_by IN (SELECT id FROM auth.users WHERE email IN (${emails}));`);
  psql(`DELETE FROM public.zen_profiles WHERE email IN (${emails});`);
  const { data: users } = await sb.auth.admin.listUsers();
  for (const u of users?.users ?? []) {
    if (u.email && Object.values(ACCOUNTS).some((a) => a.email === u.email)) {
      await sb.auth.admin.deleteUser(u.id);
    }
  }
  psql(`DELETE FROM public.zen_organizations WHERE id IN (
          '${IDS.platformOrg}','${IDS.agencyAOrg}','${IDS.agencyBOrg}','${IDS.shipperAOrg}','${IDS.shipperBOrg}');`);
}

// ───────────────────────────────────────────── 셋업

export interface Fixture {
  userIds: Record<keyof typeof ACCOUNTS, string>;
}

export async function seedFixture(): Promise<Fixture> {
  const sb = serviceClient();
  await cleanupFixture(); // 이전 잔여물 제거(멱등)

  await createOrg(sb, IDS.platformOrg, 'B371 Platform', 'PLATFORM');
  await createOrg(sb, IDS.agencyAOrg, 'B371 Agency A', 'AGENCY');
  await createOrg(sb, IDS.agencyBOrg, 'B371 Agency B', 'AGENCY');
  await createOrg(sb, IDS.shipperAOrg, 'B371 Shipper A', 'SHIPPER');
  await createOrg(sb, IDS.shipperBOrg, 'B371 Shipper B', 'SHIPPER');

  const userIds = {
    admin: await createUser(sb, ACCOUNTS.admin.email, ACCOUNTS.admin.name, 'ADMIN', IDS.platformOrg, 'PLATFORM'),
    agencyA: await createUser(sb, ACCOUNTS.agencyA.email, ACCOUNTS.agencyA.name, 'AGENCY', IDS.agencyAOrg, 'AGENCY'),
    agencyB: await createUser(sb, ACCOUNTS.agencyB.email, ACCOUNTS.agencyB.name, 'AGENCY', IDS.agencyBOrg, 'AGENCY'),
    shipperA: await createUser(sb, ACCOUNTS.shipperA.email, ACCOUNTS.shipperA.name, 'SHIPPER', IDS.shipperAOrg, 'SHIPPER'),
    shipperB: await createUser(sb, ACCOUNTS.shipperB.email, ACCOUNTS.shipperB.name, 'SHIPPER', IDS.shipperBOrg, 'SHIPPER'),
  } as Record<keyof typeof ACCOUNTS, string>;

  psql(`
    INSERT INTO public.zen_agency_shippers (id, agency_org_id, shipper_org_id, shipper_type, is_active, created_at)
    VALUES (gen_random_uuid(), '${IDS.agencyAOrg}', '${IDS.shipperAOrg}', 'INDIVIDUAL', TRUE, now()),
          (gen_random_uuid(), '${IDS.agencyBOrg}', '${IDS.shipperBOrg}', 'INDIVIDUAL', TRUE, now())
    ON CONFLICT DO NOTHING;
  `);

  const nowIso = new Date().toISOString();
  const settledBy = userIds.admin;
  seedOrder(sb, { id: IDS.orderSettle, orderNo: ORDER_NOS.settle, shipperOrg: IDS.shipperAOrg, agencyOrg: IDS.agencyAOrg, settled: false, recipientName: '정산대상', basisAt: nowIso });
  seedOrder(sb, { id: IDS.orderX, orderNo: ORDER_NOS.x, shipperOrg: IDS.shipperAOrg, agencyOrg: IDS.agencyAOrg, settled: true, settledBy, recipientName: '수하인X', basisAt: nowIso });
  seedOrder(sb, { id: IDS.orderU, orderNo: ORDER_NOS.u, shipperOrg: IDS.shipperAOrg, agencyOrg: IDS.agencyAOrg, settled: false, recipientName: '미정산U', basisAt: nowIso });
  seedOrder(sb, { id: IDS.orderAd, orderNo: ORDER_NOS.ad, shipperOrg: IDS.agencyAOrg, agencyOrg: null, settled: true, settledBy, shipperName: ADHOC_NAME, recipientName: '수기수하인', basisAt: nowIso });
  seedOrder(sb, { id: IDS.orderFree, orderNo: ORDER_NOS.free, shipperOrg: IDS.shipperAOrg, agencyOrg: IDS.agencyAOrg, settled: true, settledBy, recipientName: '자유F', basisAt: nowIso });
  seedOrder(sb, { id: IDS.orderDraft, orderNo: ORDER_NOS.draft, shipperOrg: IDS.shipperAOrg, agencyOrg: IDS.agencyAOrg, settled: true, settledBy, recipientName: '초안D', basisAt: nowIso });
  seedOrder(sb, { id: IDS.orderB, orderNo: ORDER_NOS.b, shipperOrg: IDS.shipperBOrg, agencyOrg: IDS.agencyBOrg, settled: true, settledBy, recipientName: '수하인B', basisAt: nowIso });

  return { userIds };
}
