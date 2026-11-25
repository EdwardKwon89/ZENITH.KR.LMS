import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolveEstimateAccess, resolveEstimateCoreClient, resolveEstimateScope } from '@/lib/ups/estimate-scope';
import { estimateUpsFreightCore } from '@/lib/ups/estimate-core';
import { buildEstimateDto } from '@/lib/ups/estimate-dto';
import type { EstimateUpsFreightInput } from '@/lib/ups/estimate-core';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// R-21: 계정·비밀번호는 저장소에 쓰지 않고 환경변수에서만 읽는다(값은 .env.local 등 저장소 밖).
const ACCOUNTS = {
  admin: process.env.B373_ADMIN_EMAIL,
  agency: process.env.B373_AGENCY_EMAIL,
  agencyShipper: process.env.B373_AGENCY_SHIPPER_EMAIL,
  operator: process.env.B373_OPERATOR_EMAIL,
  individual: process.env.B373_INDIVIDUAL_EMAIL,
  subAdmin: process.env.B373_SUB_ADMIN_EMAIL,
} as const;
const PASSWORD = process.env.B373_TEST_PASSWORD;

const INPUT: EstimateUpsFreightInput = {
  productId: '',
  destCountryCode: 'US',
  actualWeightKg: 5,
  direction: 'EXPORT',
};

const HAS_LOCAL_ENV =
  !!URL &&
  !!ANON &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !!PASSWORD &&
  Object.values(ACCOUNTS).every(Boolean) &&
  process.env.RUN_B373_SESSION_TESTS === '1';

async function session(email: string | undefined) {
  if (!email || !PASSWORD) throw new Error('test account env missing');
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn failed (${error.message})`);
  const { data: userData } = await client.auth.getUser();
  const { data: profile, error: profileError } = await client
    .from('zen_profiles')
    .select('role, org_id')
    .eq('id', userData.user!.id)
    .single();
  if (profileError || !profile) throw new Error('profile lookup failed');
  return { client, role: profile.role as string, orgId: (profile.org_id as string | null) ?? null };
}

async function productId(client: any): Promise<string> {
  const { data, error } = await client
    .from('zen_ups_products')
    .select('id')
    .eq('product_code', 'WW_SAVER_NONDOC')
    .eq('is_active', true)
    .single();
  if (error || !data) throw new Error(`product lookup failed: ${error?.message}`);
  return data.id as string;
}

function displayedAmount(platformTotal: number | null, shipperFinal: number | null): number {
  // 오더 등록 폼의 estimated_cost/표시 금액과 동일한 우선순위
  return shipperFinal ?? platformTotal ?? 0;
}

// 조직 ID는 하드코딩하지 않고 런타임(세션·소속)에서 도출한다.
let agencyOrgId: string;
let ownedShipperOrgId: string;
let otherAgencyShipperOrgId: string;

async function estimateFor(email: string, extra: Partial<EstimateUpsFreightInput>) {
  const s = await session(email);
  const input = { ...INPUT, productId: await productId(s.client), ...extra };
  const scope = await resolveEstimateScope(s.role, s.orgId, input);
  const coreClient = await resolveEstimateCoreClient(scope, s.client);
  const full = await estimateUpsFreightCore(
    { ...input, agencyOrgId: scope.agencyOrgId, shipperOrgId: scope.shipperOrgId },
    coreClient
  );
  const dto = buildEstimateDto(full, resolveEstimateAccess(scope));
  return { scope, dto, full };
}

describe.skipIf(!HAS_LOCAL_ENV)('TASK-B-373 PR-2 — 실세션(RLS) 견적 범위·DTO', () => {
  beforeAll(async () => {
    const agency = await session(ACCOUNTS.agency);
    if (!agency.orgId) throw new Error('agency org missing');
    agencyOrgId = agency.orgId;

    const admin = await session(ACCOUNTS.admin);
    const { data: owned } = await admin.client
      .from('zen_agency_shippers')
      .select('shipper_org_id')
      .eq('agency_org_id', agencyOrgId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (!owned) throw new Error('owned shipper fixture missing');
    ownedShipperOrgId = owned.shipper_org_id as string;

    const { data: others } = await admin.client
      .from('zen_agency_shippers')
      .select('shipper_org_id')
      .neq('agency_org_id', agencyOrgId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (!others) throw new Error('other-agency shipper fixture missing');
    otherAgencyShipperOrgId = others.shipper_org_id as string;
  }, 60000);

  it('관리자 — 원가 포함 전체', async () => {
    const { scope, dto } = await estimateFor(ACCOUNTS.admin!, {
      agencyOrgId,
      shipperOrgId: ownedShipperOrgId,
    });
    expect(scope.kind).toBe('admin');
    expect(dto.platform.totalCostPrice).toBeGreaterThan(0);
    expect(dto.platform.totalSellingPrice).toBeGreaterThan(0);
    expect(dto.agency).not.toBeNull();
    expect(dto.shipper).not.toBeNull();
  }, 30000);

  it('대리점 — 자기 단계 포함, 원가 미포함', async () => {
    const { scope, dto } = await estimateFor(ACCOUNTS.agency!, {});
    expect(scope.kind).toBe('agency');
    expect(scope.agencyOrgId).toBe(agencyOrgId);
    expect(dto.platform.totalCostPrice).toBeUndefined();
    expect(dto.agency).not.toBeNull();
    expect(dto.shipper).toBeNull();
  }, 30000);

  it('대리점 — 소속 화주 지정 시 화주 단계 포함', async () => {
    const { dto } = await estimateFor(ACCOUNTS.agency!, { shipperOrgId: ownedShipperOrgId });
    expect(dto.shipper).not.toBeNull();
  }, 30000);

  it('대리점 — 미소속 화주 지정도 성공, 화주 단계만 제외', async () => {
    const { scope, dto } = await estimateFor(ACCOUNTS.agency!, { shipperOrgId: otherAgencyShipperOrgId });
    expect(scope.shipperOrgId).toBeNull();
    expect(dto.shipper).toBeNull();
    expect(dto.platform.totalSellingPrice).toBeGreaterThan(0);
  }, 30000);

  it('대리점 — 본인 org 입력(폼 형태) 성공, 화주 단계 없음', async () => {
    const agency = await session(ACCOUNTS.agency!);
    const { scope, dto } = await estimateFor(ACCOUNTS.agency!, { shipperOrgId: agency.orgId ?? undefined });
    expect(scope.shipperOrgId).toBeNull();
    expect(dto.shipper).toBeNull();
    expect(dto.platform.totalSellingPrice).toBeGreaterThan(0);
  }, 30000);

  it('폼 입력 형태 — 관리자/OPERATOR/소속 화주/개인', async () => {
    // 폼은 shipperOrgId=로그인 사용자 본인 org, agencyOrgId=해당 조회 결과를 넘긴다.
    const admin = await session(ACCOUNTS.admin!);
    const adminRes = await estimateFor(ACCOUNTS.admin!, { shipperOrgId: admin.orgId ?? undefined, agencyOrgId: null });
    expect(adminRes.dto.platform.totalCostPrice).toBeGreaterThan(0);
    expect(adminRes.dto.shipper).toBeNull();

    const operator = await session(ACCOUNTS.operator!);
    const operatorRes = await estimateFor(ACCOUNTS.operator!, { shipperOrgId: operator.orgId ?? undefined, agencyOrgId: null });
    expect(operatorRes.dto.platform.totalCostPrice).toBeUndefined();
    expect(operatorRes.dto.platform.totalSellingPrice).toBeGreaterThan(0);
    expect(operatorRes.dto.shipper).toBeNull();

    const shipper = await session(ACCOUNTS.agencyShipper!);
    const shipperRes = await estimateFor(ACCOUNTS.agencyShipper!, { shipperOrgId: shipper.orgId ?? undefined });
    expect(shipperRes.dto.shipper).not.toBeNull();

    const individual = await session(ACCOUNTS.individual!);
    const individualRes = await estimateFor(ACCOUNTS.individual!, { shipperOrgId: individual.orgId ?? undefined });
    expect(individualRes.dto.platform.totalSellingPrice).toBeGreaterThan(0);
    expect(individualRes.dto.shipper).toBeNull();
  }, 60000);

  it('대리점 소속 화주 — 자기 청구 단계만, 플랫폼 판매가 미전달', async () => {
    const { scope, dto } = await estimateFor(ACCOUNTS.agencyShipper!, {});
    expect(scope.kind).toBe('shipper');
    expect(scope.agencyOrgId).toBe(agencyOrgId);
    expect(dto.platform.totalSellingPrice).toBeNull();
    expect(dto.agency).toBeNull();
    expect(dto.shipper).not.toBeNull();
    expect(dto.shipper!.finalFreight).toBeGreaterThan(0);
  }, 30000);

  it('OPERATOR — 입력 화주 소속을 서버에서 확정(세션 RLS 비의존)', async () => {
    const { scope, dto } = await estimateFor(ACCOUNTS.operator!, { shipperOrgId: ownedShipperOrgId });
    expect(scope.kind).toBe('operator');
    expect(scope.agencyOrgId).toBe(agencyOrgId);
    expect(dto.platform.totalCostPrice).toBeUndefined();
    expect(dto.platform.totalSellingPrice).toBeNull();
    expect(dto.shipper).not.toBeNull();
  }, 30000);

  it('R-10: 소속 화주 — 변경 전후 표시 금액·estimated_cost 동일', async () => {
    const s = await session(ACCOUNTS.agencyShipper!);
    const pid = await productId(s.client);
    const beforeFull = await estimateUpsFreightCore(
      { ...INPUT, productId: pid, agencyOrgId, shipperOrgId: s.orgId },
      s.client
    );
    const before = displayedAmount(beforeFull.platform.totalSellingPrice, beforeFull.shipper?.finalFreight ?? null);
    const { dto } = await estimateFor(ACCOUNTS.agencyShipper!, {});
    const afterAmount = displayedAmount(dto.platform.totalSellingPrice, dto.shipper?.finalFreight ?? null);
    expect(before).toBeGreaterThan(0);
    expect(afterAmount).toBe(before);
  }, 30000);

  it('R-10: 대리점(폼 입력 포함) — 변경 전후 표시 금액·estimated_cost 동일', async () => {
    const s = await session(ACCOUNTS.agency!);
    const pid = await productId(s.client);
    const beforeFull = await estimateUpsFreightCore({ ...INPUT, productId: pid, shipperOrgId: s.orgId }, s.client);
    const before = displayedAmount(beforeFull.platform.totalSellingPrice, beforeFull.shipper?.finalFreight ?? null);
    // 폼과 같은 입력(본인 org)과 빈 입력 모두 동일해야 한다.
    for (const extra of [{}, { shipperOrgId: s.orgId ?? undefined }]) {
      const { dto } = await estimateFor(ACCOUNTS.agency!, extra);
      const afterAmount = displayedAmount(dto.platform.totalSellingPrice, dto.shipper?.finalFreight ?? null);
      expect(before).toBeGreaterThan(0);
      expect(afterAmount).toBe(before);
    }
  }, 30000);

  it('R-10: 관리자 — 변경 전후 표시 금액·estimated_cost 동일', async () => {
    const s = await session(ACCOUNTS.admin!);
    const pid = await productId(s.client);
    const extra = { agencyOrgId, shipperOrgId: ownedShipperOrgId };
    const beforeFull = await estimateUpsFreightCore({ ...INPUT, productId: pid, ...extra }, s.client);
    const before = displayedAmount(beforeFull.platform.totalSellingPrice, beforeFull.shipper?.finalFreight ?? null);
    const { dto } = await estimateFor(ACCOUNTS.admin!, extra);
    const afterAmount = displayedAmount(dto.platform.totalSellingPrice, dto.shipper?.finalFreight ?? null);
    expect(afterAmount).toBe(before);
  }, 30000);

  it('R-10: OPERATOR — 변경 전 세션 요율 조회 불가, 변경 후 화주 단계 반환', async () => {
    const s = await session(ACCOUNTS.operator!);
    const pid = await productId(s.client);
    await expect(
      estimateUpsFreightCore({ ...INPUT, productId: pid, agencyOrgId, shipperOrgId: ownedShipperOrgId }, s.client)
    ).rejects.toThrow();

    const { dto } = await estimateFor(ACCOUNTS.operator!, { shipperOrgId: ownedShipperOrgId });
    expect(dto.shipper?.finalFreight ?? 0).toBeGreaterThan(0);
  }, 30000);

  it('R-10: 개인(비소속) — 변경 전후 표시 금액 동일', async () => {
    const s = await session(ACCOUNTS.individual!);
    const pid = await productId(s.client);
    const beforeFull = await estimateUpsFreightCore({ ...INPUT, productId: pid }, s.client);
    const before = displayedAmount(beforeFull.platform.totalSellingPrice, beforeFull.shipper?.finalFreight ?? null);
    const { dto } = await estimateFor(ACCOUNTS.individual!, {});
    const afterAmount = displayedAmount(dto.platform.totalSellingPrice, dto.shipper?.finalFreight ?? null);
    expect(before).toBeGreaterThan(0);
    expect(afterAmount).toBe(before);
  }, 30000);

  it('비소속 화주(임시 계정) — 폼 입력에서 플랫폼 판매가만', async () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const admin = createClient(URL, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const email = `b373-nonaff-${suffix}@example.test`;
    const password = crypto.randomUUID();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        is_new_org: true,
        org_name: `B373 NonAff ${suffix}`,
        business_number: '0000000000',
        org_type: 'SHIPPER',
        role: 'CORPORATE',
        full_name: 'B373 NonAff',
      },
    });
    if (createError || !created.user) throw new Error(`temp user create failed: ${createError?.message}`);

    const userId = created.user.id;
    try {
      const { data: profile } = await admin.from('zen_profiles').select('role, org_id').eq('id', userId).single();
      expect(profile?.role).toBe('CORPORATE');
      expect(profile?.org_id).toBeTruthy();

      const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });
      expect(signInError).toBeNull();

      const input = { ...INPUT, productId: await productId(client), shipperOrgId: profile!.org_id as string };
      const scope = await resolveEstimateScope('CORPORATE', profile!.org_id as string, input);
      expect(scope.agencyOrgId).toBeNull();
      const coreClient = await resolveEstimateCoreClient(scope, client);
      const full = await estimateUpsFreightCore({ ...input, agencyOrgId: scope.agencyOrgId, shipperOrgId: scope.shipperOrgId }, coreClient);
      const dto = buildEstimateDto(full, resolveEstimateAccess(scope));
      expect(dto.platform.totalSellingPrice).toBeGreaterThan(0);
      expect(dto.shipper).toBeNull();
    } finally {
      await admin.from('zen_profiles').delete().eq('id', userId);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      const { data: orgRows } = await admin.from('zen_organizations').select('id').like('name', `B373 NonAff ${suffix}%`);
      for (const row of orgRows ?? []) {
        await admin.from('zen_organizations').delete().eq('id', row.id as string);
      }
    }
  }, 60000);

  it('SUB_ADMIN — 견적 경로 없음(거부)', async () => {
    await expect(estimateFor(ACCOUNTS.subAdmin!, {})).rejects.toThrow();
  }, 30000);

  it('INDIVIDUAL(org 없음) — 플랫폼 판매가만', async () => {
    const { scope, dto } = await estimateFor(ACCOUNTS.individual!, {});
    expect(scope.kind).toBe('shipper');
    expect(scope.shipperOrgId).toBeNull();
    expect(dto.platform.totalSellingPrice).toBeGreaterThan(0);
    expect(dto.shipper).toBeNull();
  }, 30000);
});
