import { logger } from '@/lib/logger';
import { withAction } from '@/lib/actions/wrapper';
"use server";

import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";
import { AdminRepository } from '@/lib/repositories';

/**
 * 요율 카드 등록 (마스터 + 슬랩 + 할증 통합 저장)
 * TISA 규정에 따라 동일 항로의 기존 ACTIVE 요율을 SUPERSEDED 처리함
 */
export const createRateCard = withAction(async function (payload: {
  card: any;
  tiers: any[];
  surcharges: any[];
}) {
  const { supabase, profile } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);

  if (!profile || (profile.role !== USER_ROLES.ADMIN && profile.role !== USER_ROLES.MANAGER)) {
    throw new Error("요율 등록 권한이 없습니다.");
  }

  const targetOrgId = payload.card.org_id || payload.card.carrier_id;
  if (!targetOrgId) throw new Error("운송사 정보(org_id)가 누락되었습니다.");

  const originCode = payload.card.origin_code || payload.card.origin_port;
  const destCode = payload.card.dest_code || payload.card.destination_port;
  const mode = payload.card.mode || payload.card.service_type;

  const { data: existingRates } = await adminRepo.findExistingActiveRateCards(targetOrgId, originCode, destCode, mode);

  let nextVersion = 1;
  if (existingRates && existingRates.length > 0) {
    const idsToUpdate = existingRates.map(r => r.id);
    await adminRepo.supersedeRateCards(idsToUpdate);
    nextVersion = Math.max(...existingRates.map(r => r.version_no)) + 1;
  }

  const { data: card, error: cardError } = await adminRepo.insertRateCard({
    ...payload.card,
    org_id: targetOrgId,
    origin_code: originCode,
    dest_code: destCode,
    mode: mode,
    status: "ACTIVE",
    version_no: nextVersion,
    created_at: new Date().toISOString()
  });

  if (cardError) throw new Error(`Rate card creation failed: ${cardError.message}`);

  if (payload.tiers && payload.tiers.length > 0) {
    const tiersToInsert = payload.tiers.map(tier => ({
      ...tier,
      rate_card_id: card.id
    }));
    const { error: tiersError } = await adminRepo.insertRateTiers(tiersToInsert);
    if (tiersError) throw new Error(`Rate tiers creation failed: ${tiersError.message}`);
  }

  if (payload.surcharges && payload.surcharges.length > 0) {
    const surchargesToInsert = payload.surcharges.map(s => ({
      ...s,
      rate_card_id: card.id
    }));
    const { error: surchargesError } = await adminRepo.insertRateSurcharges(surchargesToInsert);
    if (surchargesError) throw new Error(`Surcharges creation failed: ${surchargesError.message}`);
  }

  revalidatePath("/admin/rates");
  return card;
});

/**
 * 요율 카드 삭제 (Soft delete 대신 물리 삭제 적용, CASCADE 설정됨)
 */
export const deleteRateCard = withAction(async function (cardId: string) {
  const { supabase, profile } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);

  if (!profile || profile.role !== USER_ROLES.ADMIN) {
    throw new Error("요율 삭제 권한은 관리자(ADMIN)만 가능합니다.");
  }

  const { error } = await adminRepo.deleteRateCard(cardId);
  if (error) throw new Error(`Rate card deletion failed: ${error.message}`);

  revalidatePath("/admin/rates");
  return true;
});

/**
 * 역할 및 필터 기반 요율 목록 조회
 */
export async function getRateCards(filters: {
  origin_code?: string;
  dest_code?: string;
  origin_port?: string;
  destination_port?: string;
  mode?: string;
  service_type?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const { supabase, profile } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);

  const origin = filters.origin_code || filters.origin_port;
  const dest = filters.dest_code || filters.destination_port;
  const mode = filters.mode || filters.service_type;
  const orgId = profile?.role === USER_ROLES.CARRIER ? profile.org_id : undefined;

  const { data, error, count } = await adminRepo.findRateCards({
    origin_code: origin,
    dest_code: dest,
    mode: mode,
    status: filters.status,
    orgId,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
  });

  if (error) {
    logger.error("[ERROR] getRateCards failed:", error);
    throw new Error(`Rates query failed: ${error.message}`);
  }
  return { rateCards: data || [], total: count || 0 };
}
