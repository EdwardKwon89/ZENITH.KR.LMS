'use server';

// UPS 요금 견적 조회 API — 세션 진입점.
// 전체 계산은 src/lib/ups/estimate-core.ts(server-only)에서 수행하고,
// 이 파일은 세션 역할·소속으로 범위를 정한 뒤 허용된 단계만 DTO로 반환한다. (TASK-B-373 PR-2)

import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import { hasAdminOrManagerRole } from '@/lib/auth/ups-rate-permissions';
import { logger } from '@/lib/logger';
import { trError } from '@/lib/i18n/action-error';
import { estimateUpsFreightCore } from '@/lib/ups/estimate-core';
import { buildEstimateDto, type EstimateAccess } from '@/lib/ups/estimate-dto';
import type { EstimateUpsFreightInput } from '@/lib/ups/estimate-core';
import type { UpsFreightEstimateDto } from '@/lib/ups/estimate-dto';

export type { EstimateUpsFreightInput } from '@/lib/ups/estimate-core';
export type { UpsFreightEstimateDto as UpsFreightEstimate } from '@/lib/ups/estimate-dto';

type EstimateScopeKind = 'admin' | 'agency' | 'operator' | 'shipper';

interface EstimateScope {
  kind: EstimateScopeKind;
  agencyOrgId: string | null;
  shipperOrgId: string | null;
}

const SHIPPER_ROLES: readonly string[] = [
  USER_ROLES.SHIPPER,
  USER_ROLES.CORPORATE,
  USER_ROLES.AGENCY_SHIPPER,
  USER_ROLES.INDIVIDUAL,
];

/**
 * 화주 org의 대리점 소속을 서버에서 확정한다.
 * - 조회 오류/다중 소속은 **소속 미확정**으로 처리하고 비소속 경로로 폴백하지 않는다(fail-closed).
 * - 활성 소속이 없으면 null(비소속)이다.
 */
async function resolveAgencyForShipper(
  supabase: Awaited<ReturnType<typeof validateUserAction>>['supabase'],
  shipperOrgId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('zen_agency_shippers')
    .select('agency_org_id')
    .eq('shipper_org_id', shipperOrgId)
    .eq('is_active', true);

  if (error) {
    logger.error('[ESTIMATE_SCOPE] agency membership query failed', { error: error.message });
    throw new Error('소속 조직 확인에 실패하여 견적을 계산할 수 없습니다.');
  }
  const rows = (data ?? []) as Array<{ agency_org_id: string }>;
  if (rows.length > 1) {
    logger.error('[ESTIMATE_SCOPE] ambiguous agency membership', { count: rows.length });
    throw new Error('소속 조직 확인이 모호하여 견적을 계산할 수 없습니다.');
  }
  return rows[0]?.agency_org_id ?? null;
}

async function resolveEstimateScope(
  supabase: Awaited<ReturnType<typeof validateUserAction>>['supabase'],
  role: string | undefined,
  orgId: string | null | undefined,
  input: EstimateUpsFreightInput
): Promise<EstimateScope> {
  if (hasAdminOrManagerRole(role)) {
    return {
      kind: 'admin',
      agencyOrgId: input.agencyOrgId ?? null,
      shipperOrgId: input.shipperOrgId ?? null,
    };
  }

  if (role === USER_ROLES.AGENCY) {
    const agencyOrgId = orgId ?? null;
    if (!agencyOrgId) {
      logger.warn('[ESTIMATE_SCOPE] agency session without org');
      throw new Error(await trError('permission_denied'));
    }
    if (!input.shipperOrgId) {
      return { kind: 'agency', agencyOrgId, shipperOrgId: null };
    }
    const { data, error } = await supabase
      .from('zen_agency_shippers')
      .select('shipper_org_id')
      .eq('agency_org_id', agencyOrgId)
      .eq('shipper_org_id', input.shipperOrgId)
      .eq('is_active', true);
    if (error) {
      logger.error('[ESTIMATE_SCOPE] agency-owned shipper query failed', { error: error.message });
      throw new Error('소속 화주 확인에 실패하여 견적을 계산할 수 없습니다.');
    }
    const rows = (data ?? []) as Array<{ shipper_org_id: string }>;
    if (rows.length === 0) {
      // 소유하지 않은 화주 지정은 거부한다(PR-1 `own_agency_only` 패턴 정합).
      throw new Error(await trError('own_agency_only'));
    }
    return { kind: 'agency', agencyOrgId, shipperOrgId: input.shipperOrgId };
  }

  // 내부 운영 역할: 입력 화주 기준으로 계산하되 원가 계열은 전달하지 않는다.
  if (role === USER_ROLES.OPERATOR) {
    const shipperOrgId = input.shipperOrgId ?? null;
    const agencyOrgId = shipperOrgId ? await resolveAgencyForShipper(supabase, shipperOrgId) : null;
    return { kind: 'operator', agencyOrgId, shipperOrgId };
  }

  if (role && SHIPPER_ROLES.includes(role)) {
    const shipperOrgId = orgId ?? null;
    if (!shipperOrgId) {
      // 개인 화주(org 없음)는 플랫폼 판매가 범위만 허용한다.
      if (role === USER_ROLES.INDIVIDUAL) {
        return { kind: 'shipper', agencyOrgId: null, shipperOrgId: null };
      }
      logger.warn('[ESTIMATE_SCOPE] shipper session without org');
      throw new Error(await trError('permission_denied'));
    }
    const agencyOrgId = await resolveAgencyForShipper(supabase, shipperOrgId);
    return { kind: 'shipper', agencyOrgId, shipperOrgId };
  }

  // 견적 화면 경로가 없는 역할(SUB_ADMIN·CARRIER·CUSTOMS_BROKER·DELIVERY_AGENT·USER 등)
  logger.warn('[ESTIMATE_SCOPE] role not allowed for estimate', { role });
  throw new Error(await trError('permission_denied'));
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

  const affiliatedShipper = (scope.kind === 'shipper' || scope.kind === 'operator') && !!scope.agencyOrgId;

  let access: EstimateAccess;
  if (scope.kind === 'admin') {
    access = { includeCost: true, includePlatformSelling: true, includeAgency: true, includeShipper: true, includeChargeItems: true };
  } else if (scope.kind === 'agency') {
    access = {
      includeCost: false,
      includePlatformSelling: true,
      includeAgency: true,
      includeShipper: !!scope.shipperOrgId,
      includeChargeItems: true,
    };
  } else if (affiliatedShipper) {
    // 대리점 소속 화주: 플랫폼 판매가(1단계)는 미전달. 부가항목 행은 화주 청구 단계와 동일 금액(할인 미적용)이라 표시 동일성을 위해 포함한다.
    access = { includeCost: false, includePlatformSelling: false, includeAgency: false, includeShipper: true, includeChargeItems: true };
  } else {
    // 비소속 화주(및 내부 운영): 플랫폼 판매가만 전달
    access = { includeCost: false, includePlatformSelling: true, includeAgency: false, includeShipper: false, includeChargeItems: true };
  }

  return buildEstimateDto(full, access);
}
