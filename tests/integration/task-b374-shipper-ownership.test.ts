// TASK-B-374 (Issue #1349) — DEF-149 §1.1 대리점 소유권 검증(교차 테넌트 IDOR) 실DB 검증
//
// 원칙(이슈 요구 조건):
//  · **실제 서버 액션을 호출**한다 (DB만 모의가 아닌, 실제 JWT 세션 + 실제 service_role `createAdminClient`)
//  · 대리점 A 세션이 **대리점 B**의 대상으로 5개 함수 전부 호출 → 거부 / 자기 대리점·SUPER_ADMIN은 성공
//  · 거부 케이스는 **DB 변경 없음**(행 수·값 불변)까지 단언
//  · 소스 문자열 검사·테스트 생략으로 대체하는 것은 금지 — 실제 반환값/DB 값으로만 단언
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import {
  createTestOrg, getServiceClient, getUserClient, psql, assertOrgIdClaim,
} from './helpers/db';

const mockValidateUserAction = vi.hoisted(() => vi.fn());

// guards는 validateUserAction만 모의 — checkPermission은 **실제 rbac**을 쓴다(권한 경로 사실 검증)
vi.mock('@/lib/auth/guards', async () => {
  const rbac = await import('@/lib/auth/rbac');
  return { validateUserAction: mockValidateUserAction, checkPermission: rbac.checkPermission };
});
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/notifications/email', () => ({
  generateTempPassword: () => 'B374Temp#Pass1',
  sendShipperWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

import {
  getAgencyShippers, createAgencyShipper, updateAgencyShipperGrade,
  getAgencyShipperById, updateAgencyShipper,
} from '@/app/actions/agency/shippers';
import { getAgencyOrgIdByShipper } from '@/app/actions/agency/shipper-link';

type Identity = Awaited<ReturnType<typeof createTestOrg>>;

/** 거부 메시지 (`Errors.own_agency_only`, DEFAULT_LOCALE=ko) */
const DENY = '본인 소속 대리점만 처리할 수 있습니다.';

const LINK_A = '37400000-0000-4000-8000-000000000021'; // agencyA ↔ shipperA
const LINK_B = '37400000-0000-4000-8000-000000000022'; // agencyB ↔ shipperB (공격 대상)

let agencyA: Identity;
let agencyB: Identity;
let shipperA: Identity;
let shipperB: Identity;
let superAdmin: Identity;
const run = randomUUID().slice(0, 8);
const sb = getServiceClient();

function asUser(identity: Identity) {
  mockValidateUserAction.mockResolvedValue({
    supabase: getUserClient(identity.jwt),
    user: { id: identity.userId },
    profile: { id: identity.userId, role: identity.role, org_id: identity.orgId, status: 'ACTIVE' },
  });
}

const countLinks = (orgId: string) =>
  Number(psql(`SELECT count(*) FROM public.zen_agency_shippers WHERE agency_org_id = '${orgId}'`));

describe('DEF-149 §1.1 대리점 소유권 검증 (TASK-B-374)', () => {
  beforeAll(async () => {
    await purgeLeftover();
    agencyA = await createTestOrg({ prefix: `b374_agencyA_${run}`, role: 'AGENCY', orgType: 'AGENCY' });
    agencyB = await createTestOrg({ prefix: `b374_agencyB_${run}`, role: 'AGENCY', orgType: 'AGENCY' });
    shipperA = await createTestOrg({ prefix: `b374_shipperA_${run}`, role: 'SHIPPER', orgType: 'INDIVIDUAL' });
    shipperB = await createTestOrg({ prefix: `b374_shipperB_${run}`, role: 'SHIPPER', orgType: 'INDIVIDUAL' });
    superAdmin = await createTestOrg({ prefix: `b374_super_${run}`, role: 'ZENITH_SUPER_ADMIN', orgType: 'PLATFORM' });
    assertOrgIdClaim(agencyA.jwt, agencyA.orgId);

    psql(`
      INSERT INTO public.zen_agency_shippers
        (id, agency_org_id, shipper_org_id, shipper_type, discount_rate, grade, is_active, created_at)
      VALUES ('${LINK_A}', '${agencyA.orgId}', '${shipperA.orgId}', 'INDIVIDUAL', 0.10, 'BRONZE', TRUE, now()),
            ('${LINK_B}', '${agencyB.orgId}', '${shipperB.orgId}', 'INDIVIDUAL', 0.00, 'SILVER', TRUE, now())
      ON CONFLICT DO NOTHING;
    `);
  });

  afterAll(async () => {
    try {
      // 테스트가 만든 행·계정 정리 (prefix/email로 자기완결)
      psql(`DELETE FROM public.zen_agency_shippers
            WHERE id IN ('${LINK_A}','${LINK_B}')
               OR agency_org_id IN ('${agencyA.orgId}','${agencyB.orgId}');`);
      psql(`DELETE FROM public.order_status_history
            WHERE changed_by IN (SELECT id FROM auth.users WHERE email LIKE 'b374_%');`);
      psql(`DELETE FROM public.zen_profiles WHERE email LIKE 'b374_%';`);
      psql(`DELETE FROM public.zen_organizations WHERE name ILIKE 'b374\_%';`);
      const { data } = await sb.auth.admin.listUsers();
      for (const u of data?.users ?? []) {
        if (u.email && u.email.startsWith('b374_')) await sb.auth.admin.deleteUser(u.id);
      }
      psql(`DELETE FROM auth.users WHERE email LIKE 'b374_%';`);
    } catch { /* best-effort */ }
    await Promise.all([agencyA, agencyB, shipperA, shipperB, superAdmin]
      .filter((i): i is Identity => !!i).map((i) => i.cleanup()).map((p) => p.catch(() => undefined)));
  });

  // 되돌리기 측정·실패 시에도 다음 테스트가 오염되지 않도록 **기본값 복원** (측정 정확성)
  afterEach(async () => {
    if (!agencyA) return;
    psql(`UPDATE public.zen_agency_shippers
          SET grade = 'BRONZE', discount_rate = 0.10, shipper_type = 'INDIVIDUAL', is_active = TRUE
          WHERE id = '${LINK_A}'`);
    psql(`UPDATE public.zen_agency_shippers
          SET grade = 'SILVER', discount_rate = 0.00, shipper_type = 'INDIVIDUAL', is_active = TRUE
          WHERE id = '${LINK_B}'`);
    psql(`UPDATE public.zen_organizations SET name = '${agencyA.prefix}', biz_no = NULL WHERE id = '${shipperA.orgId}'`);
    psql(`UPDATE public.zen_organizations SET name = '${agencyB.prefix}', biz_no = NULL WHERE id = '${shipperB.orgId}'`);
  });

  // ───────────────────── 1. getAgencyShippers(agencyOrgId)

  it('1. getAgencyShippers — 타 대리점 agencyOrgId는 거부, 자기/SUPER_ADMIN은 성공', async () => {
    asUser(agencyA);
    const before = countLinks(agencyB.orgId);

    await expect(getAgencyShippers(agencyB.orgId)).rejects.toThrow(DENY);
    expect(countLinks(agencyB.orgId)).toBe(before); // 조회 함수 — 변경 없음(방어적으로 확인)

    // 자기 대리점: 정상 동작 (호출처는 전부 profile.org_id를 전달 — R-20 실측)
    const own = await getAgencyShippers(agencyA.orgId);
    expect(own.shippers.some((l: any) => l.shipper_org_id === shipperA.orgId)).toBe(true);
    expect(own.shippers.some((l: any) => l.shipper_org_id === shipperB.orgId)).toBe(false);

    // SUPER_ADMIN 예외 (checkPermission 전역 바이패스와 정합)
    asUser(superAdmin);
    const supervised = await getAgencyShippers(agencyB.orgId);
    expect(supervised.shippers.some((l: any) => l.shipper_org_id === shipperB.orgId)).toBe(true);
  });

  // ───────────────────── 2. createAgencyShipper(agencyOrgId, ...)

  it('2. createAgencyShipper — 타 대리점 명의 생성 차단 + **DB 불변**, 자기 소속은 생성 성공', async () => {
    const deniedEmail = `b374_denied_${run}@test.kr`;
    const okEmail = `b374_ok_${run}@test.kr`;
    const linksBefore = countLinks(agencyB.orgId);
    const usersBefore = Number(psql(`SELECT count(*) FROM auth.users WHERE email LIKE 'b374_%'`));

    asUser(agencyA);
    const denied = await createAgencyShipper(agencyB.orgId, {
      name: 'B374 타대리점 명의 화주',
      shipper_type: 'INDIVIDUAL',
      discount_rate: 0.1,
      login_email: deniedEmail,
    });
    expect(denied.success).toBe(false);
    expect(denied.success === false && denied.fieldErrors._form).toBe(DENY);
    // **DB 불변** — 연결 행 증가 없음, Auth 계정 미생성 (생성 부수효과 전에 차단)
    expect(countLinks(agencyB.orgId)).toBe(linksBefore);
    expect(Number(psql(`SELECT count(*) FROM auth.users WHERE email = '${deniedEmail}'`))).toBe(0);
    expect(Number(psql(`SELECT count(*) FROM auth.users WHERE email LIKE 'b374_%'`))).toBe(usersBefore);
    expect(Number(psql(`SELECT count(*) FROM public.zen_organizations WHERE name = 'B374 타대리점 명의 화주'`))).toBe(0);

    // 자기 소속 대리점은 정상 생성 (정상 흐름 회귀)
    const ok = await createAgencyShipper(agencyA.orgId, {
      name: 'B374 정상 화주',
      shipper_type: 'INDIVIDUAL',
      discount_rate: 0.1,
      login_email: okEmail,
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      const { data: created } = await sb.from('zen_agency_shippers')
        .select('agency_org_id, shipper_org_id, discount_rate').eq('id', ok.shipperId).single();
      expect(created?.agency_org_id).toBe(agencyA.orgId);
      expect(Number(created?.discount_rate)).toBeCloseTo(0.1, 4);
      expect(Number(psql(`SELECT count(*) FROM auth.users WHERE email = '${okEmail}'`))).toBe(1);
    }
  });

  // ───────────────────── 3. updateAgencyShipperGrade(id, grade, discountRate)

  it('3. updateAgencyShipperGrade — 타 대리점 연결 행 수정 차단 + 값 불변, 자기/SUPER_ADMIN 성공', async () => {
    const readB = () => psql(`SELECT grade || '|' || discount_rate::text FROM public.zen_agency_shippers WHERE id = '${LINK_B}'`);
    const beforeB = readB();

    asUser(agencyA);
    await expect(updateAgencyShipperGrade(LINK_B, 'GOLD', 0.5)).rejects.toThrow(DENY);
    expect(readB()).toBe(beforeB); // **값 불변**

    // 자기 연결 행은 정상 수정 (그대로 복원)
    await expect(updateAgencyShipperGrade(LINK_A, 'SILVER', 0.15)).resolves.toMatchObject({ success: true });
    expect(psql(`SELECT grade FROM public.zen_agency_shippers WHERE id = '${LINK_A}'`)).toBe('SILVER');
    await updateAgencyShipperGrade(LINK_A, 'BRONZE', 0.10);
    expect(psql(`SELECT grade FROM public.zen_agency_shippers WHERE id = '${LINK_A}'`)).toBe('BRONZE');

    // SUPER_ADMIN 예외 — 타 대리점 행도 수정 가능(기존 정책 정합), 측정 후 **원래 값**으로 복원
    asUser(superAdmin);
    await expect(updateAgencyShipperGrade(LINK_B, 'GOLD', 0.5)).resolves.toMatchObject({ success: true });
    expect(readB()).toContain('GOLD');
    const [origGrade, origDiscount] = beforeB.split('|');
    await updateAgencyShipperGrade(LINK_B, origGrade, Number(origDiscount));
    expect(readB()).toBe(beforeB);
  });

  // ───────────────────── 4. getAgencyShipperById(shipperId)

  it('4. getAgencyShipperById — 타 대리점 화주 상세 열람 차단, 자기/SUPER_ADMIN 성공', async () => {
    asUser(agencyA);
    await expect(getAgencyShipperById(LINK_B)).rejects.toThrow(DENY);

    const own = await getAgencyShipperById(LINK_A);
    expect(own.shipper.shipper_org_id).toBe(shipperA.orgId);

    asUser(superAdmin);
    const supervised = await getAgencyShipperById(LINK_B);
    expect(supervised.shipper.shipper_org_id).toBe(shipperB.orgId);
  });

  // ───────────────────── 5. updateAgencyShipper(shipperId, data)

  it('5. updateAgencyShipper — 타 대리점 화주 정보·할인율 변조 차단 + 값 불변, 자기/SUPER_ADMIN 성공', async () => {
    const readOrgB = () => psql(`SELECT name FROM public.zen_organizations WHERE id = '${shipperB.orgId}'`);
    const readDiscountB = () => psql(`SELECT discount_rate::text FROM public.zen_agency_shippers WHERE id = '${LINK_B}'`);
    const beforeName = readOrgB();
    const beforeDiscount = readDiscountB();

    asUser(agencyA);
    const denied = await updateAgencyShipper(LINK_B, {
      name: 'B374 변조된이름',
      shipper_type: 'INDIVIDUAL',
      discount_rate: 0.9,
    });
    expect(denied.success).toBe(false);
    expect(denied.success === false && denied.fieldErrors._form).toBe(DENY);
    expect(readOrgB()).toBe(beforeName);         // **조직명 불변**
    expect(readDiscountB()).toBe(beforeDiscount); // **할인율 불변**

    // 자기 소속 정상 수정 (이름·할인율 복원 포함)
    const ownBefore = psql(`SELECT name FROM public.zen_organizations WHERE id = '${shipperA.orgId}'`);
    const ok = await updateAgencyShipper(LINK_A, {
      name: `${ownBefore}-수정`,
      shipper_type: 'INDIVIDUAL',
      discount_rate: 0.12,
    });
    expect(ok.success).toBe(true);
    expect(psql(`SELECT name FROM public.zen_organizations WHERE id = '${shipperA.orgId}'`)).toBe(`${ownBefore}-수정`);
    await updateAgencyShipper(LINK_A, { name: ownBefore, shipper_type: 'INDIVIDUAL', discount_rate: 0.10 });

    // SUPER_ADMIN 예외 — INDIVIDUAL는 할인율이 0으로 강제되므로(코드 규칙) CORPORATE로 실제 값 반영을 확인한 뒤 복원
    asUser(superAdmin);
    const sup = await updateAgencyShipper(LINK_B, {
      name: `${beforeName}-감독`, shipper_type: 'CORPORATE', biz_no: '123-45-67890', discount_rate: 0.2,
    });
    expect(sup.success).toBe(true);
    expect(readOrgB()).toBe(`${beforeName}-감독`);
    expect(Number(readDiscountB())).toBeCloseTo(0.2, 4);
    await updateAgencyShipper(LINK_B, { name: beforeName, shipper_type: 'INDIVIDUAL', discount_rate: 0.2 });
    expect(readOrgB()).toBe(beforeName);
    expect(readDiscountB()).toBe(beforeDiscount); // INDIVIDUAL → 0 (fixture와 동일)
  });

  // ───────────────────── 6. shipper-link 점검 (이슈 §5 함께 점검 요청)

  it('6. getAgencyOrgIdByShipper — 액션 내 소유권 가드 없음 → RLS로 방어되는지 실측', async () => {
    // 대리점 세션: 자기 화주의 연결은 보임
    asUser(agencyA);
    expect(await getAgencyOrgIdByShipper(shipperA.orgId)).toBe(agencyA.orgId);
    // 타 대리점 화주는 **null** (zen_agency_shippers RLS: agency_own / shipper_select)
    expect(await getAgencyOrgIdByShipper(shipperB.orgId)).toBeNull();

    // 화주 세션: 자기 org은 보이고 타 화주는 null
    asUser(shipperA);
    expect(await getAgencyOrgIdByShipper(shipperA.orgId)).toBe(agencyA.orgId);
    expect(await getAgencyOrgIdByShipper(shipperB.orgId)).toBeNull();
  });
});

function purgeLeftover() {
  const ids = `'${LINK_A}','${LINK_B}'`;
  psql(`DELETE FROM public.zen_agency_shippers WHERE id IN (${ids}) OR agency_org_id IN (
          SELECT id FROM public.zen_organizations WHERE name ILIKE 'b374\_%');`);
  psql(`DELETE FROM public.order_status_history WHERE changed_by IN (SELECT id FROM auth.users WHERE email LIKE 'b374_%');`);
  psql(`DELETE FROM public.zen_profiles WHERE email LIKE 'b374_%';`);
  psql(`DELETE FROM public.zen_organizations WHERE name ILIKE 'b374\_%';`);
  psql(`DELETE FROM auth.users WHERE email LIKE 'b374_%';`);
}
