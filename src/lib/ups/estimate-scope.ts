import 'server-only';

import { createAdminClient } from '@/utils/supabase/server';
import { USER_ROLES } from '@/lib/auth/rbac';
import { hasAdminOrManagerRole } from '@/lib/auth/ups-rate-permissions';
import { logger } from '@/lib/logger';
import { trError } from '@/lib/i18n/action-error';
import type { EstimateUpsFreightInput } from './estimate-core';
import type { EstimateAccess } from './estimate-dto';

/**
 * TASK-B-373 PR-2 — 견적 요청의 서버 범위 결정.
 * 소속 판정은 세션 RLS에 의존하지 않고 서비스 롤 클라이언트로 **소속 ID만** 조회한다.
 */

export type EstimateScopeKind = 'admin' | 'agency' | 'operator' | 'shipper';

export interface EstimateScope {
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
async function resolveAgencyForShipper(shipperOrgId: string): Promise<string | null> {
  const admin = await createAdminClient();
  const { data, error } = await admin
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

/**
 * 대리점 견적의 화주 단계 포함 여부를 결정한다.
 * - 대리점 대리 등록은 화주를 임의 작성할 수 있으므로 **소속이 아니어도 거부하지 않는다**.
 * - 본인 org와 같거나 빈 값은 '화주 지정'이 아니다.
 * - 실제 소속으로 확인된 경우에만 화주 단계를 포함하고, 조회 실패는 화주 단계만 제외한다.
 */
async function resolveAgencyOwnedShipper(
  agencyOrgId: string,
  requestedShipperOrgId: string | null | undefined
): Promise<string | null> {
  if (!requestedShipperOrgId || requestedShipperOrgId === agencyOrgId) return null;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('zen_agency_shippers')
    .select('shipper_org_id')
    .eq('agency_org_id', agencyOrgId)
    .eq('shipper_org_id', requestedShipperOrgId)
    .eq('is_active', true);

  if (error) {
    logger.error('[ESTIMATE_SCOPE] agency-owned shipper query failed', { error: error.message });
    return null;
  }
  const rows = (data ?? []) as Array<{ shipper_org_id: string }>;
  return rows.length > 0 ? requestedShipperOrgId : null;
}

export async function resolveEstimateScope(
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
    const shipperOrgId = await resolveAgencyOwnedShipper(agencyOrgId, input.shipperOrgId);
    return { kind: 'agency', agencyOrgId, shipperOrgId };
  }

  // 내부 운영 역할: 입력 화주 기준으로 계산하되 원가 계열은 전달하지 않는다.
  if (role === USER_ROLES.OPERATOR) {
    const shipperOrgId = input.shipperOrgId ?? null;
    const agencyOrgId = shipperOrgId ? await resolveAgencyForShipper(shipperOrgId) : null;
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
    const agencyOrgId = await resolveAgencyForShipper(shipperOrgId);
    return { kind: 'shipper', agencyOrgId, shipperOrgId };
  }

  // 견적 화면 경로가 없는 역할(SUB_ADMIN·CARRIER·CUSTOMS_BROKER·DELIVERY_AGENT·USER 등)
  logger.warn('[ESTIMATE_SCOPE] role not allowed for estimate', { role });
  throw new Error(await trError('permission_denied'));
}

/**
 * 계산 코어에 넘길 클라이언트를 결정한다.
 * OPERATOR는 요율 테이블 SELECT 정책이 없어 세션 클라이언트로 계산할 수 없으므로 서비스 롤을 사용한다.
 */
export async function resolveEstimateCoreClient(scope: EstimateScope, sessionClient: any): Promise<any> {
  if (scope.kind === 'operator') return createAdminClient();
  return sessionClient;
}

export function resolveEstimateAccess(scope: EstimateScope): EstimateAccess {
  const affiliatedShipper =
    (scope.kind === 'shipper' || scope.kind === 'operator') && !!scope.agencyOrgId;

  if (scope.kind === 'admin') {
    return { includeCost: true, includePlatformSelling: true, includeAgency: true, includeShipper: true, includeChargeItems: true };
  }
  if (scope.kind === 'agency') {
    return {
      includeCost: false,
      includePlatformSelling: true,
      includeAgency: true,
      includeShipper: !!scope.shipperOrgId,
      includeChargeItems: true,
    };
  }
  if (affiliatedShipper) {
    // 대리점 소속 화주: 플랫폼 판매가(1단계)는 미전달. 부가항목 행은 화주 청구 단계와 동일 금액(할인 미적용)이라 표시 동일성을 위해 포함한다.
    return { includeCost: false, includePlatformSelling: false, includeAgency: false, includeShipper: true, includeChargeItems: true };
  }
  // 비소속 화주(및 내부 운영): 플랫폼 판매가만 전달
  return { includeCost: false, includePlatformSelling: true, includeAgency: false, includeShipper: false, includeChargeItems: true };
}
