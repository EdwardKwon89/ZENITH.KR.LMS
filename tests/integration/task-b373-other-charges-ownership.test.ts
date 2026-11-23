// TASK-B-373 PR-1 (Issue #1362 / Aiden 2026-11-23) — 대리점 부가요금 소유권 검증 실DB 테스트
//
// 원칙:
//  · 실제 서버 액션을 호출한다(실제 JWT 세션 + 실제 service_role `createAdminClient`)
//  · AGENCY A가 **AGENCY B** 대상으로 3개 함수를 호출 → 거부 + **DB 불변**
//  · 자기 대리점·ZENITH_SUPER_ADMIN 양성 대조
//  · 소스 문자열 검사·skip 금지, 실제 반환값/DB 값으로만 단언
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import { createTestOrg, getUserClient, psql, assertOrgIdClaim } from './helpers/db';

const mockValidateUserAction = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', async () => {
  const rbac = await import('@/lib/auth/rbac');
  return { validateUserAction: mockValidateUserAction, checkPermission: rbac.checkPermission };
});
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  getAgencyOtherCharges,
  upsertAgencyOtherCharge,
  deactivateAgencyOtherCharge,
} from '@/app/actions/agency/other-charges';

type Identity = Awaited<ReturnType<typeof createTestOrg>>;

/** 거부 메시지 (`Errors.own_agency_only`, DEFAULT_LOCALE=ko) */
const DENY = '본인 소속 대리점만 처리할 수 있습니다.';

const run = randomUUID().slice(0, 8);
const OC_A = randomUUID();
const OC_B = randomUUID();
const OC_NEW = randomUUID();
const LINK_A = randomUUID();
const LINK_B = randomUUID();

let agencyA: Identity;
let agencyB: Identity;
let superAdmin: Identity;

function asUser(identity: Identity) {
  mockValidateUserAction.mockResolvedValue({
    supabase: getUserClient(identity.jwt),
    user: { id: identity.userId },
    profile: { id: identity.userId, role: identity.role, org_id: identity.orgId, status: 'ACTIVE' },
  });
}

const linkRow = (id: string) =>
  psql(`SELECT selling_price::text || '|' || cost_price::text || '|' || is_active::text
          FROM public.zen_agency_other_charges WHERE id = '${id}'`);
const countForAgency = (orgId: string) =>
  Number(psql(`SELECT count(*) FROM public.zen_agency_other_charges WHERE agency_org_id = '${orgId}'`));

function resetLinks() {
  if (!agencyA) return;
  psql(`
    UPDATE public.zen_agency_other_charges
       SET selling_price = 10, cost_price = 8, is_active = TRUE
     WHERE id = '${LINK_A}';
    UPDATE public.zen_agency_other_charges
       SET selling_price = 20, cost_price = 18, is_active = TRUE
     WHERE id = '${LINK_B}';
    DELETE FROM public.zen_agency_other_charges
     WHERE id NOT IN ('${LINK_A}','${LINK_B}')
       AND agency_org_id IN ('${agencyA.orgId}','${agencyB.orgId}');
  `);
}

describe('TASK-B-373 PR-1 대리점 부가요금 소유권 검증', () => {
  beforeAll(async () => {
    agencyA = await createTestOrg({ prefix: `b373_agencyA_${run}`, role: 'AGENCY', orgType: 'AGENCY' });
    agencyB = await createTestOrg({ prefix: `b373_agencyB_${run}`, role: 'AGENCY', orgType: 'AGENCY' });
    superAdmin = await createTestOrg({ prefix: `b373_super_${run}`, role: 'ZENITH_SUPER_ADMIN', orgType: 'PLATFORM' });
    assertOrgIdClaim(agencyA.jwt, agencyA.orgId);
    assertOrgIdClaim(agencyB.jwt, agencyB.orgId);

    psql(`
      INSERT INTO public.zen_ups_other_charges
        (id, charge_code, charge_name, unit, selling_price, cost_price, currency, is_active)
      VALUES
        ('${OC_A}', 'B373A_${run}', 'B373 Charge A', 'EA', 10, 8, 'KRW', TRUE),
        ('${OC_B}', 'B373B_${run}', 'B373 Charge B', 'EA', 20, 18, 'KRW', TRUE),
        ('${OC_NEW}', 'B373N_${run}', 'B373 Charge New', 'EA', 30, 25, 'KRW', TRUE)
      ON CONFLICT DO NOTHING;

      INSERT INTO public.zen_agency_other_charges
        (id, agency_org_id, other_charge_id, selling_price, cost_price, is_active)
      VALUES
        ('${LINK_A}', '${agencyA.orgId}', '${OC_A}', 10, 8, TRUE),
        ('${LINK_B}', '${agencyB.orgId}', '${OC_B}', 20, 18, TRUE)
      ON CONFLICT DO NOTHING;
    `);

    agencyA.addCleanup(() => psql(`DELETE FROM public.zen_agency_other_charges WHERE agency_org_id = '${agencyA.orgId}'`));
    agencyB.addCleanup(() => psql(`DELETE FROM public.zen_agency_other_charges WHERE agency_org_id = '${agencyB.orgId}'`));
  });

  afterEach(() => { resetLinks(); });

  afterAll(async () => {
    try {
      psql(`DELETE FROM public.zen_agency_other_charges
             WHERE agency_org_id IN ('${agencyA?.orgId ?? '00000000-0000-0000-0000-000000000000'}',
                                     '${agencyB?.orgId ?? '00000000-0000-0000-0000-000000000000'}');`);
      psql(`DELETE FROM public.zen_ups_other_charges WHERE id IN ('${OC_A}','${OC_B}','${OC_NEW}');`);
    } catch { /* best-effort */ }
    await Promise.all([agencyA, agencyB, superAdmin]
      .filter((i): i is Identity => !!i)
      .map((i) => i.cleanup().catch(() => undefined)));
  });

  it('1. getAgencyOtherCharges — 타 대리점은 거부, 자기/SUPER_ADMIN은 성공', async () => {
    asUser(agencyA);
    await expect(getAgencyOtherCharges(agencyB.orgId)).rejects.toThrow(DENY);

    const own = await getAgencyOtherCharges(agencyA.orgId);
    expect(own.some((r) => r.id === LINK_A)).toBe(true);
    expect(own.some((r) => r.id === LINK_B)).toBe(false);

    asUser(superAdmin);
    const supervised = await getAgencyOtherCharges(agencyB.orgId);
    expect(supervised.some((r) => r.id === LINK_B)).toBe(true);
  });

  it('2. upsertAgencyOtherCharge — 타 대리점 명의 쓰기 차단 + **DB 불변**, 자기/SUPER_ADMIN 성공', async () => {
    const beforeB = linkRow(LINK_B);
    const countBBefore = countForAgency(agencyB.orgId);
    const newRowCountBefore = Number(
      psql(`SELECT count(*) FROM public.zen_agency_other_charges WHERE other_charge_id = '${OC_NEW}'`),
    );

    asUser(agencyA);
    await expect(
      upsertAgencyOtherCharge(agencyB.orgId, { other_charge_id: OC_NEW, selling_price: 99, cost_price: 88 }),
    ).rejects.toThrow(DENY);

    // **DB 불변** — 타 대리점 행 값·행 수, 거부된 upsert의 신규 행 0
    expect(linkRow(LINK_B)).toBe(beforeB);
    expect(countForAgency(agencyB.orgId)).toBe(countBBefore);
    expect(Number(psql(`SELECT count(*) FROM public.zen_agency_other_charges WHERE other_charge_id = '${OC_NEW}'`)))
      .toBe(newRowCountBefore);

    // 자기 소속은 정상
    await expect(
      upsertAgencyOtherCharge(agencyA.orgId, { other_charge_id: OC_A, selling_price: 11, cost_price: 9 }),
    ).resolves.toMatchObject({ success: true });
    expect(linkRow(LINK_A)).toContain('11.00|9.00|true');

    // SUPER_ADMIN 예외 (측정 후 복원)
    asUser(superAdmin);
    await expect(
      upsertAgencyOtherCharge(agencyB.orgId, { other_charge_id: OC_B, selling_price: 21, cost_price: 19 }),
    ).resolves.toMatchObject({ success: true });
    expect(linkRow(LINK_B)).toContain('21.00|19.00|true');
  });

  it('3. deactivateAgencyOtherCharge — 타 대리점 행 비활성화 차단 + **is_active 불변**, 자기/SUPER_ADMIN 성공', async () => {
    const beforeB = linkRow(LINK_B);

    asUser(agencyA);
    await expect(deactivateAgencyOtherCharge(LINK_B)).rejects.toThrow(DENY);
    expect(linkRow(LINK_B)).toBe(beforeB); // is_active 포함 불변

    // 자기 소속은 정상
    await expect(deactivateAgencyOtherCharge(LINK_A)).resolves.toMatchObject({ success: true });
    expect(linkRow(LINK_A)).toContain('|false');

    // SUPER_ADMIN 예외 (측정 후 복원)
    asUser(superAdmin);
    await expect(deactivateAgencyOtherCharge(LINK_B)).resolves.toMatchObject({ success: true });
    expect(linkRow(LINK_B)).toContain('|false');
  });
});
