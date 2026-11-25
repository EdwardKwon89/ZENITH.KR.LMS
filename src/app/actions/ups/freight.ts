'use server';

// UPS 요금 견적 조회 API — 세션 진입점.
// 전체 계산은 src/lib/ups/estimate-core.ts(server-only)에서 수행하고,
// 이 파일은 세션 역할·소속으로 범위를 정한 뒤 허용된 단계만 DTO로 반환한다. (TASK-B-373 PR-2)

import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import { hasAdminOrManagerRole } from '@/lib/auth/ups-rate-permissions';
import { estimateUpsFreightCore } from '@/lib/ups/estimate-core';
import { buildEstimateDto, type EstimateAccess } from '@/lib/ups/estimate-dto';
import type { EstimateUpsFreightInput } from '@/lib/ups/estimate-core';
import type { UpsFreightEstimateDto } from '@/lib/ups/estimate-dto';

export type { EstimateUpsFreightInput } from '@/lib/ups/estimate-core';
export type { UpsFreightEstimateDto as UpsFreightEstimate } from '@/lib/ups/estimate-dto';

async function resolveEstimateScope(
  supabase: Awaited<ReturnType<typeof validateUserAction>>['supabase'],
  role: string | undefined,
  orgId: string | null | undefined,
  input: EstimateUpsFreightInput
): Promise<{ agencyOrgId: string | null; shipperOrgId: string | null; isAgency: boolean }> {
  if (hasAdminOrManagerRole(role)) {
    return {
      agencyOrgId: input.agencyOrgId ?? null,
      shipperOrgId: input.shipperOrgId ?? null,
      isAgency: false,
    };
  }

  if (role === USER_ROLES.AGENCY) {
    const agencyOrgId = orgId ?? null;
    let shipperOrgId: string | null = null;
    // 대리점은 자기 소속 화주만 계산할 수 있다.
    if (agencyOrgId && input.shipperOrgId) {
      const { data } = await supabase
        .from('zen_agency_shippers')
        .select('shipper_org_id')
        .eq('agency_org_id', agencyOrgId)
        .eq('shipper_org_id', input.shipperOrgId)
        .eq('is_active', true)
        .maybeSingle();
      shipperOrgId = data ? input.shipperOrgId : null;
    }
    return { agencyOrgId, shipperOrgId, isAgency: true };
  }

  // 화주 계열: 소속은 세션 org로 고정, 대리점 소속은 서버에서 조회한다.
  const shipperOrgId = orgId ?? null;
  let agencyOrgId: string | null = null;
  if (shipperOrgId) {
    const { data } = await supabase
      .from('zen_agency_shippers')
      .select('agency_org_id')
      .eq('shipper_org_id', shipperOrgId)
      .eq('is_active', true)
      .maybeSingle();
    agencyOrgId = data?.agency_org_id ?? null;
  }
  return { agencyOrgId, shipperOrgId, isAgency: false };
}

export async function estimateUpsFreight(input: EstimateUpsFreightInput): Promise<UpsFreightEstimateDto> {
  const { profile, supabase } = await validateUserAction();
  const scope = await resolveEstimateScope(supabase, profile?.role, profile?.org_id, input);

  const full = await estimateUpsFreightCore(
    {
      ...input,
      agencyOrgId: scope.agencyOrgId,
      shipperOrgId: scope.shipperOrgId,
    },
    supabase
  );

  const isAdmin = hasAdminOrManagerRole(profile?.role);
  const affiliatedShipper = !scope.isAgency && !!scope.agencyOrgId;

  const access: EstimateAccess = isAdmin
    ? { includeCost: true, includePlatformSelling: true, includeAgency: true, includeShipper: true }
    : scope.isAgency
      ? { includeCost: false, includePlatformSelling: true, includeAgency: true, includeShipper: !!scope.shipperOrgId }
      : affiliatedShipper
        // 대리점 소속 화주: 플랫폼 판매가(1단계)를 전달하지 않고 자기 청구 단계만 전달
        ? { includeCost: false, includePlatformSelling: false, includeAgency: false, includeShipper: true }
        : { includeCost: false, includePlatformSelling: true, includeAgency: false, includeShipper: false };

  return buildEstimateDto(full, access);
}
