import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

// TASK-B-295 (Issue #1100): 오더 화주명(발송인 표시명) 자유 입력 — 실제 DB 저장/수정 검증.
//
// 실제 로컬 DB에 화주 조직/사용자를 세팅하고, 실제 createOrder()/updateOrder() 서버 액션으로
// shipper_name이 zen_orders.shipper_name 컬럼에 저장·갱신되는지 직접 조회해 검증한다.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

const mockValidateUserAction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidateUserAction }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));

const USER = '29500000-0000-4000-8000-000000000001';
const ORG = '29500000-0000-4000-8000-000000000002';

function getPortId(type: string): string {
  return psql(`SELECT id FROM public.zen_ports WHERE type='${type}' LIMIT 1`);
}

function setupFixture() {
  psql(`
    DELETE FROM public.zen_orders WHERE created_by='${USER}';
    DELETE FROM public.zen_profiles WHERE id='${USER}';
    DELETE FROM auth.users WHERE id='${USER}';
    DELETE FROM public.zen_organizations WHERE id='${ORG}';
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES ('${ORG}', '295 Shipper Org', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
    INSERT INTO auth.users (id, email) VALUES ('${USER}', '295@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES ('${USER}', '${ORG}', '295@test.kr', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
  `);
}

function getShipperName(orderId: string): string {
  return psql(`SELECT coalesce(shipper_name, '') FROM public.zen_orders WHERE id='${orderId}'`);
}

// 최신 등록(created_by=USER)된 오더 id 조회
function getLatestOrderId(): string {
  return psql(`SELECT id FROM public.zen_orders WHERE created_by='${USER}' ORDER BY created_at DESC LIMIT 1`);
}

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    order_type: 'B2B' as const,
    shipper_id: ORG,
    shipper_name: 'Test Shipper ABC', // TASK-B-295: 수기입력 화주명
    recipient_name: 'John Doe',
    recipient_address: '123 Main St',
    recipient_phone: '010-1111-2222',
    recipient_country_code: 'US',
    recipient_zipcode: '90001',
    recipient_city: 'LA',
    shipper_contact_phone: '010-0000-0000',
    transport_mode: 'AIR' as const,
    origin_port_id: getPortId('AIR'),
    dest_port_id: getPortId('AIR'),
    packages: [{
      packing_unit: 'BOX', packing_count: 1, physical_box_count: 1, length: 0, width: 0, height: 0,
      gross_weight: 5, special_cargo_type: 'NONE', content_type: 'GENERAL',
      items: [{ item_name: 'Widget', quantity: 1, unit_price: 10, currency: 'USD', item_packing_unit: 'EA' }],
    }],
    ...overrides,
  };
}

describe('TASK-B-295: 오더 화주명 shipper_name 저장/수정 (Issue #1100)', () => {
  let supabase: SupabaseClient;

  beforeEach(async () => {
    if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in env');
    supabase = createClient(URL, SERVICE_KEY);
    setupFixture();
    mockValidateUserAction.mockResolvedValue({
      supabase,
      user: { id: USER },
      profile: { id: USER, role: 'SHIPPER', org_id: ORG },
    });
  });

  afterAll(() => {
    psql(`
      DELETE FROM public.zen_orders WHERE created_by='${USER}';
      DELETE FROM public.zen_profiles WHERE id='${USER}';
      DELETE FROM auth.users WHERE id='${USER}';
      DELETE FROM public.zen_organizations WHERE id='${ORG}';
    `);
  });

  it('TC-295-01: 신규 등록 시 shipper_name이 zen_orders.shipper_name에 실제 저장된다', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    const result = await createOrder(buildPayload() as any);
    expect(result.id).toBeTruthy();

    const stored = getShipperName(result.id);
    expect(stored).toBe('Test Shipper ABC');
  });

  it('TC-295-02: 오더 수정 시 shipper_name 변경이 실제 반영된다', async () => {
    const { createOrder, updateOrder } = await import('@/app/actions/operations/orders');
    const created = await createOrder(buildPayload() as any);
    expect(created.id).toBeTruthy();

    const updated = await updateOrder(created.id, buildPayload({ shipper_name: 'Renamed Shipper' }) as any);
    expect(updated.success).toBe(true);

    const stored = getShipperName(created.id);
    expect(stored).toBe('Renamed Shipper');
  });

  it('TC-295-03: shipper_name 미입력(레거시) 시 NULL로 저장된다 (폴백 테스트 기준)', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    const { shipper_name, ...noName } = buildPayload();
    const result = await createOrder(noName as any);
    expect(result.id).toBeTruthy();

    const stored = getShipperName(result.id);
    expect(stored).toBe('');
  });
});
