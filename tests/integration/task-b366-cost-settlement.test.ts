// TASK-B-366 (Issue #1376): 오더정산 완료·정산 후 잠금·스냅샷 저장 — 실제 로컬 DB 검증
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  return execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' },
  ).trim();
}

const ADMIN_USER = '36600000-0000-4000-8000-000000000001';
const ADMIN_ORG = '36600000-0000-4000-8000-000000000002';
const SHIPPER_ORG = '36600000-0000-4000-8000-000000000003';
const ORDER_SETTLE = '36600000-0000-4000-8000-000000000010';
const ORDER_NO_COST = '36600000-0000-4000-8000-000000000011';
const ORDER_SETTLED = '36600000-0000-4000-8000-000000000012';
const ORDER_SNAPSHOT = '36600000-0000-4000-8000-000000000013';
const ORDER_LEGACY = '36600000-0000-4000-8000-000000000014';
const ORDER_LEGACY_CANCELED = '36600000-0000-4000-8000-000000000015';
const INVOICE_LEGACY = '36600000-0000-4000-8000-000000000020';
const INVOICE_LEGACY_CANCELED = '36600000-0000-4000-8000-000000000021';

const mockValidateUserAction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidateUserAction }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));

function cleanup() {
  psql(`DELETE FROM public.order_status_history WHERE order_id IN ('${ORDER_SETTLE}','${ORDER_NO_COST}','${ORDER_SETTLED}','${ORDER_SNAPSHOT}');`);
  psql(`DELETE FROM public.zen_ups_actual_other_charges WHERE order_id IN ('${ORDER_SETTLE}','${ORDER_NO_COST}','${ORDER_SETTLED}','${ORDER_SNAPSHOT}');`);
  psql(`DELETE FROM public.zen_ups_actual_cost WHERE order_id IN ('${ORDER_SETTLE}','${ORDER_NO_COST}','${ORDER_SETTLED}','${ORDER_SNAPSHOT}');`);
  psql(`DELETE FROM public.zen_orders WHERE id IN ('${ORDER_SETTLE}','${ORDER_NO_COST}','${ORDER_SETTLED}','${ORDER_SNAPSHOT}','${ORDER_LEGACY}','${ORDER_LEGACY_CANCELED}');`);
  psql(`DELETE FROM public.zen_invoices WHERE id IN ('${INVOICE_LEGACY}','${INVOICE_LEGACY_CANCELED}');`);
  psql(`DELETE FROM public.zen_profiles WHERE id='${ADMIN_USER}';`);
  psql(`DELETE FROM auth.users WHERE id='${ADMIN_USER}';`);
  psql(`DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_ORG}');`);
}

function setup() {
  try { cleanup(); } catch { /* leftover rows — 아래에서 unique order_no 로 정리 */ }
  psql(`DELETE FROM public.zen_orders WHERE order_no LIKE 'ZEN-366-%';`);
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${ADMIN_ORG}', '366 Admin Org', 'CORPORATE', 'ACTIVE'),
      ('${SHIPPER_ORG}', '366 Shipper Org', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
    INSERT INTO auth.users (id, email) VALUES ('${ADMIN_USER}', '366-admin@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${ADMIN_USER}', '${ADMIN_ORG}', '366-admin@test.kr', 'ADMIN', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    INSERT INTO public.zen_orders (id, order_no, shipper_id, transport_mode, status, recipient_name, recipient_phone, cargo_details, cost_settlement_status, cost_settled_at, cost_settled_by) VALUES
      ('${ORDER_SETTLE}',  'ZEN-366-SETTLE',   '${SHIPPER_ORG}', 'UPS', 'DELIVERED', 'R', '010', '{}'::jsonb, 'NOT_SETTLED', NULL, NULL),
      ('${ORDER_NO_COST}', 'ZEN-366-NOCOST',   '${SHIPPER_ORG}', 'UPS', 'DELIVERED', 'R', '010', '{}'::jsonb, 'NOT_SETTLED', NULL, NULL),
      ('${ORDER_SETTLED}', 'ZEN-366-SETTLED',  '${SHIPPER_ORG}', 'UPS', 'DELIVERED', 'R', '010', '{}'::jsonb, 'SETTLED', now(), '${ADMIN_USER}'),
      ('${ORDER_SNAPSHOT}','ZEN-366-SNAPSHOT', '${SHIPPER_ORG}', 'UPS', 'DELIVERED', 'R', '010', '{}'::jsonb, 'NOT_SETTLED', NULL, NULL),
      ('${ORDER_LEGACY}','ZEN-366-LEGACY', '${SHIPPER_ORG}', 'UPS', 'DELIVERED', 'R', '010', '{}'::jsonb, 'NOT_SETTLED', NULL, NULL),
      ('${ORDER_LEGACY_CANCELED}','ZEN-366-LEGACY-CANCELED', '${SHIPPER_ORG}', 'UPS', 'DELIVERED', 'R', '010', '{}'::jsonb, 'NOT_SETTLED', NULL, NULL)
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, cost_settlement_status = EXCLUDED.cost_settlement_status, cost_settled_at = EXCLUDED.cost_settled_at, cost_settled_by = EXCLUDED.cost_settled_by;
    INSERT INTO public.order_status_history (order_id, prev_status, next_status, changed_by, created_at) VALUES
      ('${ORDER_SETTLE}',  'IN_TRANSIT', 'DELIVERED', '${ADMIN_USER}', '2026-11-18T10:00:00Z'),
      ('${ORDER_NO_COST}', 'IN_TRANSIT', 'DELIVERED', '${ADMIN_USER}', '2026-11-18T10:00:00Z'),
      ('${ORDER_SETTLED}', 'IN_TRANSIT', 'DELIVERED', '${ADMIN_USER}', '2026-11-18T10:00:00Z'),
      ('${ORDER_SNAPSHOT}','IN_TRANSIT', 'DELIVERED', '${ADMIN_USER}', '2026-11-18T10:00:00Z'),
      ('${ORDER_LEGACY}', 'IN_TRANSIT', 'DELIVERED', '${ADMIN_USER}', '2026-11-18T10:00:00Z'),
      ('${ORDER_LEGACY_CANCELED}','IN_TRANSIT', 'DELIVERED', '${ADMIN_USER}', '2026-11-18T10:00:00Z');
    INSERT INTO public.zen_ups_actual_cost (order_id, base_freight_hkd, total_cost_krw, entered_by, calc_version) VALUES
      ('${ORDER_SETTLE}', 100, 1000, '${ADMIN_USER}', 2),
      ('${ORDER_SETTLED}',100, 1000, '${ADMIN_USER}', 2),
      ('${ORDER_LEGACY}', 100, 1000, '${ADMIN_USER}', 2),
      ('${ORDER_LEGACY_CANCELED}', 100, 1000, '${ADMIN_USER}', 2);
    INSERT INTO public.zen_invoices (id, invoice_no, shipper_id, total_amount, currency, due_date, status, metadata, created_by) VALUES
      ('${INVOICE_LEGACY}', 'INV-366-LEGACY', '${SHIPPER_ORG}', 1000, 'KRW', '2026-12-31', 'UNPAID', '{"source_order_id":"${ORDER_LEGACY}"}'::jsonb, '${ADMIN_USER}'),
      ('${INVOICE_LEGACY_CANCELED}', 'INV-366-LEGACY-CANCELED', '${SHIPPER_ORG}', 1000, 'KRW', '2026-12-31', 'CANCELED', '{"source_order_id":"${ORDER_LEGACY_CANCELED}"}'::jsonb, '${ADMIN_USER}')
    ON CONFLICT (id) DO NOTHING;
  `);
}

import { getOrdersForCostSettlement, markOrderCostSettled, recordUpsActualCost, previewUpsActualCost } from '@/app/actions/finance/ups-actual-cost';

const serviceClient = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

beforeAll(() => {
  if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
  setup();
  mockValidateUserAction.mockResolvedValue({
    supabase: serviceClient,
    user: { id: ADMIN_USER },
    profile: { id: ADMIN_USER, role: 'ADMIN', org_id: ADMIN_ORG },
  });
});

afterAll(() => {
  try { cleanup(); } catch { /* best-effort */ }
});

describe('markOrderCostSettled — DoD (실DB)', () => {
  it('원가 미입력 오더는 cost_not_entered 로 거부한다', async () => {
    const res = await markOrderCostSettled(ORDER_NO_COST);
    expect(res.success).toBe(false);
    expect(res.error).toBe('실제 원가를 먼저 입력해야 합니다.');
  });

  it('동시 요청 2건 중 1건만 성공한다 (조건부 UPDATE)', async () => {
    const [a, b] = await Promise.all([
      markOrderCostSettled(ORDER_SETTLE),
      markOrderCostSettled(ORDER_SETTLE),
    ]);
    const successes = [a, b].filter((r) => r.success);
    expect(successes).toHaveLength(1);
    expect([a, b].find((r) => !r.success)?.error).toBe('이미 오더정산이 완료되었습니다.');

    const row = psql(`SELECT cost_settlement_status || '|' || (cost_settled_by IS NOT NULL) || '|' || (cost_settled_at IS NOT NULL) FROM public.zen_orders WHERE id='${ORDER_SETTLE}';`);
    expect(row).toBe('SETTLED|true|true');
  });

  it('목록에서 레거시/정산 상태·기간 필터가 적용된다', async () => {
    const res = await getOrdersForCostSettlement({
      status: 'ALL',
      from: '2026-01-01',
      to: '2030-12-31',
    });
    expect(res.success).toBe(true);
    const settled = res.orders?.find((o) => o.orderId === ORDER_SETTLE);
    expect(settled?.settlementStatus).toBe('SETTLED');
    expect(settled?.excludedReason).toBeNull();
  });
});

describe('정산 후 수정 잠금·스냅샷 (실DB)', () => {
  it('SETTLED 오더는 recordUpsActualCost 가 cost_settled_locked 로 거부한다', async () => {
    const res = await recordUpsActualCost(ORDER_SETTLED, { baseFreightHkd: 100 });
    expect(res.success).toBe(false);
    expect(res.error).toBe('오더정산이 완료된 오더는 원가·중량을 수정할 수 없습니다. 먼저 정산을 해제하세요.');
  });

  it('SETTLED 오더라도 previewUpsActualCost 는 잠금 오류를 반환하지 않는다', async () => {
    const res = await previewUpsActualCost(ORDER_SETTLED, { baseFreightHkd: 100 });
    expect(res.error).not.toBe('오더정산이 완료된 오더는 원가·중량을 수정할 수 없습니다. 먼저 정산을 해제하세요.');
  });

  it('recordUpsActualCost 저장 시 calc_version=2·가산율·환율맵 스냅샷이 실DB에 기록된다', async () => {
    const res = await recordUpsActualCost(ORDER_SNAPSHOT, {
      baseFreightHkd: 1000,
      fuelSurchargeHkd: 300,
      surgeFeeHkd: 50,
    });
    expect(res.success).toBe(true);

    const raw = psql(`SELECT calc_version || '|' || cost_surcharge_rate || '|' || (cost_surcharge_amount_krw > 0) || '|' || (applied_exchange_rates ? 'HKD') || '|' || applied_exchange_rate FROM public.zen_ups_actual_cost WHERE order_id='${ORDER_SNAPSHOT}';`);
    const [version, rate, surchargePositive, hasHkd, appliedRate] = raw.split('|');
    expect(Number(version)).toBe(2);
    expect(Number(rate)).toBeCloseTo(0.07, 4);
    expect(surchargePositive).toBe('true');
    expect(hasHkd).toBe('true');
    // 가산액 ≈ round(기본운임 원금액 × 환율 × 0.07) — 저장된 환율맵/컬럼과 교차 검증
    const surcharge = Number(psql(`SELECT cost_surcharge_amount_krw FROM public.zen_ups_actual_cost WHERE order_id='${ORDER_SNAPSHOT}';`));
    expect(Math.abs(surcharge - Math.round(1000 * Number(appliedRate) * 0.07))).toBeLessThanOrEqual(1);
  });
});

describe('레거시 오더별 인보이스 판정 (실DB)', () => {
  it('기존(미취소) 오더별 인보이스가 있으면 mark 가 legacy_invoiced_order 로 거부한다', async () => {
    const res = await markOrderCostSettled(ORDER_LEGACY);
    expect(res.success).toBe(false);
    expect(res.error).toBe('기존 오더별 인보이스가 발행된 오더입니다. 신규 정산 대상이 아닙니다.');

    const status = psql(`SELECT cost_settlement_status FROM public.zen_orders WHERE id='${ORDER_LEGACY}';`);
    expect(status).toBe('NOT_SETTLED');
  });

  it('목록에서 레거시 인보이스 오더를 legacyInvoiced=true·LEGACY_INVOICED 로 표시한다', async () => {
    const res = await getOrdersForCostSettlement({ status: 'ALL', from: '2026-11-01', to: '2026-11-30' });
    expect(res.success).toBe(true);
    const row = res.orders?.find((o) => o.orderId === ORDER_LEGACY);
    expect(row?.legacyInvoiced).toBe(true);
    expect(row?.excludedReason).toBe('LEGACY_INVOICED');
  });

  it('CANCELED 인보이스만 있으면 정상적으로 정산할 수 있다', async () => {
    const res = await markOrderCostSettled(ORDER_LEGACY_CANCELED);
    expect(res.success).toBe(true);

    const row = psql(`SELECT cost_settlement_status || '|' || (cost_settled_by IS NOT NULL) FROM public.zen_orders WHERE id='${ORDER_LEGACY_CANCELED}';`);
    expect(row).toBe('SETTLED|true');
  });
});
