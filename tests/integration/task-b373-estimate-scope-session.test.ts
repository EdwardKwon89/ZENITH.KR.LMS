import { describe, it, expect } from 'vitest';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolveEstimateAccess, resolveEstimateCoreClient, resolveEstimateScope } from '@/lib/ups/estimate-scope';
import { estimateUpsFreightCore } from '@/lib/ups/estimate-core';
import { buildEstimateDto } from '@/lib/ups/estimate-dto';
import type { EstimateUpsFreightInput } from '@/lib/ups/estimate-core';

dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const PASSWORD = 'password1234';

const SHIPPER_OWNED_BY_ZENITH = 'a740996d-ccb8-4061-97ef-fb0ae04058ef'; // Agency Shipper Co (Zenith Agency Partners)
const ZENITH_AGENCY_ORG = 'd7964ba9-bd92-4b38-b8d8-7df183370c47';
const SHIPPER_OF_OTHER_AGENCY = '3d56593c-77d6-4b5e-86c5-febaca2b5c4c'; // TestShipper (SNTL Sub-Agency)

const INPUT: EstimateUpsFreightInput = {
  productId: '',
  destCountryCode: 'US',
  actualWeightKg: 5,
  direction: 'EXPORT',
};

async function session(email: string) {
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn failed: ${email}: ${error.message}`);
  const { data: userData } = await client.auth.getUser();
  const { data: profile, error: profileError } = await client
    .from('zen_profiles')
    .select('role, org_id')
    .eq('id', userData.user!.id)
    .single();
  if (profileError || !profile) throw new Error(`profile failed: ${email}`);
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

// 로컬 Supabase + 서비스 키가 준비된 환경에서만 실행한다(CI는 시크릿 미제공 시 skip).
// 로컬 시드 계정이 있는 DB에서만 실행한다(CI는 계정이 없어 실패하므로 명시 플래그 필요).
const HAS_LOCAL_ENV = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.RUN_B373_SESSION_TESTS === '1'
);

describe.skipIf(!HAS_LOCAL_ENV)('TASK-B-373 PR-2 — 실세션(RLS) 견적 범위·DTO', () => {
  it('관리자 — 원가 포함 전체', async () => {
    const { scope, dto } = await estimateFor('admin@zenith.kr', {
      agencyOrgId: ZENITH_AGENCY_ORG,
      shipperOrgId: SHIPPER_OWNED_BY_ZENITH,
    });
    expect(scope.kind).toBe('admin');
    expect(dto.platform.totalCostPrice).toBeGreaterThan(0);
    expect(dto.platform.totalSellingPrice).toBeGreaterThan(0);
    expect(dto.agency).not.toBeNull();
    expect(dto.shipper).not.toBeNull();
  }, 30000);

  it('대리점 — 자기 단계 포함, 원가 미포함', async () => {
    const { scope, dto } = await estimateFor('agency@zenith.kr', {});
    expect(scope.kind).toBe('agency');
    expect(scope.agencyOrgId).toBe(ZENITH_AGENCY_ORG);
    expect(dto.platform.totalCostPrice).toBeUndefined();
    expect(dto.agency).not.toBeNull();
    expect(dto.shipper).toBeNull();
  }, 30000);

  it('대리점 — 소속 화주 지정 시 화주 단계 포함', async () => {
    const { dto } = await estimateFor('agency@zenith.kr', { shipperOrgId: SHIPPER_OWNED_BY_ZENITH });
    expect(dto.shipper).not.toBeNull();
  }, 30000);

  it('대리점 — 타 대리점 소속 화주 지정은 거부', async () => {
    await expect(
      estimateFor('agency@zenith.kr', { shipperOrgId: SHIPPER_OF_OTHER_AGENCY })
    ).rejects.toThrow();
  }, 30000);

  it('대리점 소속 화주 — 자기 청구 단계만, 플랫폼 판매가 미전달', async () => {
    const { scope, dto } = await estimateFor('agency_shipper@zenith.kr', {});
    expect(scope.kind).toBe('shipper');
    expect(scope.agencyOrgId).toBe(ZENITH_AGENCY_ORG);
    expect(dto.platform.totalSellingPrice).toBeNull();
    expect(dto.agency).toBeNull();
    expect(dto.shipper).not.toBeNull();
    expect(dto.shipper!.finalFreight).toBeGreaterThan(0);
  }, 30000);

  it('OPERATOR — 입력 화주 소속을 서버에서 확정(세션 RLS 비의존)', async () => {
    const { scope, dto } = await estimateFor('operator@zenith.kr', { shipperOrgId: SHIPPER_OWNED_BY_ZENITH });
    expect(scope.kind).toBe('operator');
    expect(scope.agencyOrgId).toBe(ZENITH_AGENCY_ORG);
    expect(dto.platform.totalCostPrice).toBeUndefined();
    expect(dto.platform.totalSellingPrice).toBeNull();
    expect(dto.shipper).not.toBeNull();
  }, 30000);

  it('R-10: 소속 화주 — 변경 전후 표시 금액·estimated_cost 동일', async () => {
    const s = await session('agency_shipper@zenith.kr');
    const pid = await productId(s.client);
    const beforeFull = await estimateUpsFreightCore(
      { ...INPUT, productId: pid, agencyOrgId: ZENITH_AGENCY_ORG, shipperOrgId: s.orgId },
      s.client
    );
    const before = displayedAmount(beforeFull.platform.totalSellingPrice, beforeFull.shipper?.finalFreight ?? null);
    const { dto } = await estimateFor('agency_shipper@zenith.kr', {});
    const afterAmount = displayedAmount(dto.platform.totalSellingPrice, dto.shipper?.finalFreight ?? null);
    expect(before).toBeGreaterThan(0);
    expect(afterAmount).toBe(before);
  }, 30000);

  it('R-10: 대리점 — 변경 전후 표시 금액·estimated_cost 동일', async () => {
    const s = await session('agency@zenith.kr');
    const pid = await productId(s.client);
    const beforeFull = await estimateUpsFreightCore({ ...INPUT, productId: pid, agencyOrgId: s.orgId }, s.client);
    const before = displayedAmount(beforeFull.platform.totalSellingPrice, beforeFull.shipper?.finalFreight ?? null);
    const { dto } = await estimateFor('agency@zenith.kr', {});
    const afterAmount = displayedAmount(dto.platform.totalSellingPrice, dto.shipper?.finalFreight ?? null);
    expect(before).toBeGreaterThan(0);
    expect(afterAmount).toBe(before);
  }, 30000);

  it('R-10: 관리자 — 변경 전후 표시 금액·estimated_cost 동일', async () => {
    const s = await session('admin@zenith.kr');
    const pid = await productId(s.client);
    const extra = { agencyOrgId: ZENITH_AGENCY_ORG, shipperOrgId: SHIPPER_OWNED_BY_ZENITH };
    const beforeFull = await estimateUpsFreightCore({ ...INPUT, productId: pid, ...extra }, s.client);
    const before = displayedAmount(beforeFull.platform.totalSellingPrice, beforeFull.shipper?.finalFreight ?? null);
    const { dto } = await estimateFor('admin@zenith.kr', extra);
    const afterAmount = displayedAmount(dto.platform.totalSellingPrice, dto.shipper?.finalFreight ?? null);
    expect(afterAmount).toBe(before);
  }, 30000);

  it('R-10: OPERATOR — 변경 전 세션 요율 조회 불가, 변경 후 화주 단계 반환', async () => {
    const s = await session('operator@zenith.kr');
    const pid = await productId(s.client);
    await expect(
      estimateUpsFreightCore({ ...INPUT, productId: pid, agencyOrgId: ZENITH_AGENCY_ORG, shipperOrgId: SHIPPER_OWNED_BY_ZENITH }, s.client)
    ).rejects.toThrow();

    const { dto } = await estimateFor('operator@zenith.kr', { shipperOrgId: SHIPPER_OWNED_BY_ZENITH });
    expect(dto.shipper?.finalFreight ?? 0).toBeGreaterThan(0);
  }, 30000);

  it('R-10: 개인(비소속) — 변경 전후 표시 금액 동일', async () => {
    const s = await session('individual@zenith.kr');
    const pid = await productId(s.client);
    const beforeFull = await estimateUpsFreightCore({ ...INPUT, productId: pid }, s.client);
    const before = displayedAmount(beforeFull.platform.totalSellingPrice, beforeFull.shipper?.finalFreight ?? null);
    const { dto } = await estimateFor('individual@zenith.kr', {});
    const afterAmount = displayedAmount(dto.platform.totalSellingPrice, dto.shipper?.finalFreight ?? null);
    expect(before).toBeGreaterThan(0);
    expect(afterAmount).toBe(before);
  }, 30000);

  it('SUB_ADMIN — 견적 경로 없음(거부)', async () => {
    await expect(estimateFor('sntl@zenith.kr', {})).rejects.toThrow();
  }, 30000);

  it('INDIVIDUAL(org 없음) — 플랫폼 판매가만', async () => {
    const { scope, dto } = await estimateFor('individual@zenith.kr', {});
    expect(scope.kind).toBe('shipper');
    expect(scope.shipperOrgId).toBeNull();
    expect(dto.platform.totalSellingPrice).toBeGreaterThan(0);
    expect(dto.shipper).toBeNull();
  }, 30000);
});
