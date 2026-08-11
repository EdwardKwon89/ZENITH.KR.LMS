import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

// TASK-B-280 (Issue #1060 / DEF-B-052): cancelUpsRegistration()이 voidUpsLabel()과 달리
// unlockAllPackagesIntlRef()를 호출하지 않아 UPS등록취소 후 zen_order_packages.intl_ref_locked가
// true로 남던 버그 회귀 테스트.
//
// 실제 로컬 DB(docker supabase_db_ZENITH_LMS_001)에 fixture를 세팅하고, 실제
// cancelUpsRegistration() 서버 액션을 실행한 뒤 DB 상태를 직접 조회해 검증한다.
// (auth/supabase 클라이언트만 서비스롤로 mock — RLS 우회가 아니라 DB 상태 전이 검증)
//
// ⚠️ 되돌리기 검증: unlockAllPackagesIntlRef() 호출을 제거하면 intl_ref_locked=true가 그대로
// 남아 아래 TC-280-01이 실패함을 보장한다.

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

// ── mocks ────────────────────────────────────────────────────────────────
const mockValidateUserAction = vi.hoisted(() => vi.fn());
const mockRemoveorder = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: mockValidateUserAction,
}));
vi.mock('@/lib/shxk/order', () => ({
  createorder: vi.fn(),
  getnewlabel: vi.fn(),
  removeorder: mockRemoveorder,
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/ups/label-mapping', () => ({
  buildCreateOrderPayload: vi.fn(),
  determineOrderCargotype: vi.fn(),
  buildCargovolume: vi.fn(),
  buildInvoiceFromItems: vi.fn(),
}));
vi.mock('@/lib/shxk/validate-payload', () => ({ validateShxkPayload: vi.fn() }));

// 테스트 전용 UUID 상수
const ADMIN_USER = '28000000-0000-4000-8000-000000000001';
const ADMIN_ORG = '28000000-0000-4000-8000-000000000002';
const SHIPPER_ORG = '28000000-0000-4000-8000-000000000003';
const ORDER = '28000000-0000-4000-8000-000000000010';
const PKG1 = '28000000-0000-4000-8000-000000000020';
const PKG2 = '28000000-0000-4000-8000-000000000021';
const LABEL = '28000000-0000-4000-8000-000000000030';

function setupFixture() {
  psql(`
    DELETE FROM public.zen_order_packages WHERE order_id='${ORDER}';
    DELETE FROM public.zen_ups_labels WHERE order_id='${ORDER}';
    DELETE FROM public.zen_ups_label_documents WHERE order_id='${ORDER}';
    DELETE FROM public.zen_tracking_configs WHERE order_id='${ORDER}';
    DELETE FROM public.zen_orders WHERE id='${ORDER}';
    DELETE FROM public.zen_profiles WHERE id IN ('${ADMIN_USER}');
    DELETE FROM auth.users WHERE id IN ('${ADMIN_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_ORG}');
  `);
  psql(`
    INSERT INTO public.zen_organizations (id, name, type, status) VALUES
      ('${ADMIN_ORG}', '280 Admin Org', 'CORPORATE', 'ACTIVE'),
      ('${SHIPPER_ORG}', '280 Shipper Org', 'SHIPPER', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
    INSERT INTO auth.users (id, email) VALUES
      ('${ADMIN_USER}', '280-admin@test.kr')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    INSERT INTO public.zen_profiles (id, org_id, email, role, status) VALUES
      ('${ADMIN_USER}', '${ADMIN_ORG}', '280-admin@test.kr', 'ADMIN', 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;
    INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, transport_mode, status, recipient_name, recipient_phone, cargo_details) VALUES
      ('${ORDER}', 'ZEN-280-CANCEL', '${SHIPPER_ORG}', NULL, 'UPS', 'PACKED', 'Recv', '010-1', '{}'::jsonb);
    -- 취소 이전 상태 재현: intl_ref_no/intl_ref_locked=true (markAllPackagesIssued 후 상태)
    INSERT INTO public.zen_order_packages (id, order_id, packing_unit, packing_count, gross_weight, intl_ref_no, intl_ref_locked) VALUES
      ('${PKG1}', '${ORDER}', 'BOX', 1, 10, '1Z280PKG1', true),
      ('${PKG2}', '${ORDER}', 'BOX', 1, 12, '1Z280PKG2', true);
    INSERT INTO public.zen_ups_labels (id, order_id, reference_no, tracking_number, label_format, storage_path, is_voided) VALUES
      ('${LABEL}', '${ORDER}', 'REF-280-CANCEL', '1Z280TRACK', 'PDF', '', false);
    INSERT INTO public.zen_tracking_configs (order_id, tracking_no, provider_type, provider_name) VALUES
      ('${ORDER}', '1Z280TRACK', 'VIRTUAL', 'TEST');
  `);
}

function cleanupFixture() {
  psql(`
    DELETE FROM public.zen_order_packages WHERE order_id='${ORDER}';
    DELETE FROM public.zen_ups_labels WHERE order_id='${ORDER}';
    DELETE FROM public.zen_ups_label_documents WHERE order_id='${ORDER}';
    DELETE FROM public.zen_tracking_configs WHERE order_id='${ORDER}';
    DELETE FROM public.zen_orders WHERE id='${ORDER}';
    DELETE FROM public.zen_profiles WHERE id IN ('${ADMIN_USER}');
    DELETE FROM auth.users WHERE id IN ('${ADMIN_USER}');
    DELETE FROM public.zen_organizations WHERE id IN ('${ADMIN_ORG}','${SHIPPER_ORG}');
  `);
}

function getPkgState(): { locked: string; refNo: string } {
  const locked = psql(`SELECT intl_ref_locked FROM public.zen_order_packages WHERE order_id='${ORDER}' AND id='${PKG1}'`);
  const refNo = psql(`SELECT coalesce(intl_ref_no, '') FROM public.zen_order_packages WHERE order_id='${ORDER}' AND id='${PKG1}'`);
  return { locked, refNo };
}

describe('DEF-B-052: UPS등록취소 시 패키지 intl_ref_locked 미해제 (Issue #1060)', () => {
  let supabase: SupabaseClient;

  beforeEach(async () => {
    if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in env');
    supabase = createClient(URL, SERVICE_KEY);
    setupFixture();
    mockValidateUserAction.mockResolvedValue({
      supabase,
      user: { id: ADMIN_USER },
      profile: { id: ADMIN_USER, role: 'ADMIN', org_id: ADMIN_ORG },
    });
    (mockRemoveorder as any).mockResolvedValue({ success: 1, message: '订单移除成功' });
  });

  afterAll(() => {
    cleanupFixture();
  });

  it('TC-280-01: cancelUpsRegistration 후 intl_ref_locked=false (실 DB, voidUpsLabel 명세와 동일)', async () => {
    // 사전 상태 확인
    expect(getPkgState().locked).toBe('t');
    expect(getPkgState().refNo).toBe('1Z280PKG1');

    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const result = await cancelUpsRegistration(ORDER);

    expect(result.success).toBe(true);
    // DB에 intl_ref_locked=false로 반영되어야 함 (OutboundProcessForm의 "라벨 재발급 필요" 판단 기준)
    const state = getPkgState();
    expect(state.locked).toBe('f');
    // intl_ref_no는 voidUpsLabel 명세와 동일하게 유지 (unlockAllPackagesIntlRef는 locked만 해제 —
    //   재등록 시 markAllPackagesIssued가 덮어씀. OutboundProcessForm은 intl_ref_locked만 판단)
    expect(state.refNo).toBe('1Z280PKG1');
  });

  it('TC-280-02: cancelUpsRegistration 실패 시(라벨 없음) intl_ref_locked 유지 (회귀 방지)', async () => {
    // 라벨 레코드를 제거하면 "취소할 UPS 라벨 레코드가 없습니다."로 실패 → unlock 미호출
    psql(`DELETE FROM public.zen_ups_labels WHERE id='${LABEL}'`);

    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const result = await cancelUpsRegistration(ORDER);

    expect(result.success).toBe(false);
    const state = getPkgState();
    expect(state.locked).toBe('t'); // 실패 시 유지
  });

  it('TC-280-03: undoUpsRegistration(PACKED→WAREHOUSED) 경유 시에도 intl_ref_locked 해제 (통합)', async () => {
    const { undoUpsRegistration } = await import('@/app/actions/operations/warehouse');
    const result = await undoUpsRegistration(ORDER);

    expect(result.success).toBe(true);
    const state = getPkgState();
    expect(state.locked).toBe('f');

    // 오더 상태는 WAREHOUSED로 전환되었어야 함
    const status = psql(`SELECT status FROM public.zen_orders WHERE id='${ORDER}'`);
    expect(status).toBe('WAREHOUSED');
  });
});
