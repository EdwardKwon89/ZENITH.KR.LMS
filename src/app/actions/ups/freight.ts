'use server';

// UPS 요금 견적 조회 API — 세션 진입점.
// 전체 계산은 src/lib/ups/estimate-core.ts(server-only)에서 수행하고,
// 이 파일은 세션 역할·소속으로 범위를 정한 뒤 허용된 단계만 DTO로 반환한다. (TASK-B-373 PR-2)

import { validateUserAction } from '@/lib/auth/guards';
import { estimateUpsFreightCore } from '@/lib/ups/estimate-core';
import { resolveEstimateAccess, resolveEstimateCoreClient, resolveEstimateScope } from '@/lib/ups/estimate-scope';
import { buildEstimateDto } from '@/lib/ups/estimate-dto';
import type { EstimateUpsFreightInput } from '@/lib/ups/estimate-core';
import type { UpsFreightEstimateDto } from '@/lib/ups/estimate-dto';

export type { EstimateUpsFreightInput } from '@/lib/ups/estimate-core';
export type { UpsFreightEstimateDto as UpsFreightEstimate } from '@/lib/ups/estimate-dto';

export async function estimateUpsFreight(input: EstimateUpsFreightInput): Promise<UpsFreightEstimateDto> {
  const { profile, supabase } = await validateUserAction();
  const scope = await resolveEstimateScope(profile?.role, profile?.org_id, input);

  const coreClient = await resolveEstimateCoreClient(scope, supabase);

  const full = await estimateUpsFreightCore(
    {
      ...input,
      agencyOrgId: scope.agencyOrgId,
      shipperOrgId: scope.shipperOrgId,
    },
    coreClient
  );

  return buildEstimateDto(full, resolveEstimateAccess(scope));
}
