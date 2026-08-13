import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

// TASK-B-295 (Issue #1100): 서류/라벨 데이터 빌더가 사용하는 getOrderDocumentData가
// shipper_name(자유 입력 화주명)과 shipper.name(조직명)을 모두 반환하는지 검증 —
// 빌더의 `orderData.shipper_name || orderData.shipper?.name || fallback` 폴백이 동작하도록.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  return execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  ).trim();
}

const mockValidateUserAction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidateUserAction }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }));

const USER = '29500000-0000-4000-8000-000000000010';
const ORG = '29500000-0000-4000-8000-000000000011';

function getPortId(type: string): string {
  return psql(`SELECT id FROM public.zen_ports WHERE type='${type}' LIMIT 1`);
}

function setupFixture() {
  psql(`
    DELETE FROM public.zen_orders WHERE created_by='${USER}';
    DELETE FROM public.zen_profiles WHERE id='${USER}';
    DELETE FROM auth.users WHERE id='${USER}';
    DELETE FROM public.zen_organizations WHERE id='${ORG}';
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES ('${ORG}', '295 Doc Org', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
    INSERT INTO auth.users (id, email) VALUES ('${USER}', '295doc@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES ('${USER}', '${ORG}', '295doc@test.kr', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
  `);
}

describe('TASK-B-295: 서류 데이터 shipper_name/shpper.name 반환 (Issue #1100)', () => {
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

  it('TC-295-08: getOrderDocumentData가 shipper_name(수기입력)과 shipper.name(조직명)을 모두 반환', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    const payload = {
      order_type: 'B2B' as const,
      shipper_id: ORG,
      shipper_name: 'Custom Doc Shipper', // 수기입력 화주명
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
    };
    const created = await createOrder(payload as any);
    expect(created.id).toBeTruthy();
    const orderNo = created.order_no;

    const { getOrderDocumentData } = await import('@/app/actions/finance/invoice');
    const doc = await getOrderDocumentData(orderNo);

    // 수기입력 화주명 존재 → CI/PL/UPS Invoice 빌더가 shipper_name 우선 사용 가능
    expect(doc.shipper_name).toBe('Custom Doc Shipper');
    // 조직명도 함께 있어 폴백 가능 (shipper_name 미입력 레거시 오더 대비)
    expect(doc.shipper?.name).toBe('295 Doc Org');
  });

  it('TC-295-09: shipper_name 미입력 오더 → shipper_name 없음 + shipper.name로 폴백 가능', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    const payload = {
      order_type: 'B2B' as const,
      shipper_id: ORG,
      recipient_name: 'Jane',
      recipient_address: '456 Oak',
      recipient_phone: '010-2',
      recipient_country_code: 'US',
      recipient_zipcode: '90002',
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
    };
    const created = await createOrder(payload as any);
    expect(created.id).toBeTruthy();

    const { getOrderDocumentData } = await import('@/app/actions/finance/invoice');
    const doc = await getOrderDocumentData(created.order_no);

    expect(doc.shipper_name).toBeNull();
    expect(doc.shipper?.name).toBe('295 Doc Org'); // 폴백용 조직명
  });
});
