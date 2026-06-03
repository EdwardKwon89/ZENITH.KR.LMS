"use server";

import { logger } from '@/lib/logger';
import { withAction } from '@/lib/actions/wrapper';
import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";
import { AdminRepository } from '@/lib/repositories';

/**
 * 요율 카드 등록 (TISA 3계층 구조 통합 저장)
 * tiers는 JSONB로 zen_rate_cards 내재화, 동일 carrier+mode 기존 활성 카드는 비활성화
 */
export const createRateCard = withAction(async function (payload: {
  card: {
    carrier_id: string;
    transport_mode: string;
    currency?: string;
    origin_port_id?: string | null;
    dest_port_id?: string | null;
    tiers: any[];
    valid_from: string;
    valid_to?: string;
    carrier_cost?: number;
    margin_rate?: number;
    platform_fee_rate?: number;
  };
  surcharges: any[];
}) {
  const { supabase, profile } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);

  if (!profile || (profile.role !== USER_ROLES.ADMIN && profile.role !== USER_ROLES.MANAGER)) {
    throw new Error("요율 등록 권한이 없습니다.");
  }

  if (!payload.card.carrier_id) throw new Error("운송사 정보(carrier_id)가 누락되었습니다.");
  if (!payload.card.transport_mode) throw new Error("운송 모드(transport_mode)가 누락되었습니다.");

  const { data: existingRates } = await adminRepo.findExistingActiveRateCards(
    payload.card.carrier_id,
    payload.card.transport_mode
  );

  if (existingRates && existingRates.length > 0) {
    const idsToUpdate = existingRates.map(r => r.id);
    await adminRepo.supersedeRateCards(idsToUpdate);
  }

  const { data: card, error: cardError } = await adminRepo.insertRateCard({
    carrier_id: payload.card.carrier_id,
    transport_mode: payload.card.transport_mode,
    currency: payload.card.currency ?? 'USD',
    origin_port_id: payload.card.origin_port_id || null,
    dest_port_id: payload.card.dest_port_id || null,
    tiers: payload.card.tiers,
    carrier_cost: payload.card.carrier_cost ?? null,
    margin_rate: payload.card.margin_rate ?? 15.0,
    platform_fee_rate: payload.card.platform_fee_rate ?? 5.0,
    valid_from: payload.card.valid_from,
    valid_until: payload.card.valid_to ?? null,
    is_active: true,
    created_at: new Date().toISOString()
  });

  if (cardError) throw new Error(`Rate card creation failed: ${cardError.message}`);

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
 * 요율 카드 비활성화 (Soft delete — is_active = false)
 */
export const deleteRateCard = withAction(async function (cardId: string) {
  const { supabase, profile } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);

  if (!profile || profile.role !== USER_ROLES.ADMIN) {
    throw new Error("요율 삭제 권한은 관리자(ADMIN)만 가능합니다.");
  }

  const { error } = await adminRepo.deleteRateCard(cardId);
  if (error) throw new Error(`Rate card deactivation failed: ${error.message}`);

  revalidatePath("/admin/rates");
  return true;
});

/**
 * 역할 및 필터 기반 요율 목록 조회
 */
export async function getRateCards(filters: {
  transport_mode?: string;
  carrier_id?: string;
  is_active?: boolean;
  page?: number;
  pageSize?: number;
} = {}) {
  const { supabase, profile } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);

  const { data, error, count } = await adminRepo.findRateCards({
    carrier_id: filters.carrier_id,
    transport_mode: filters.transport_mode,
    is_active: filters.is_active,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
  });

  if (error) {
    logger.error("[ERROR] getRateCards failed:", error);
    throw new Error(`Rates query failed: ${error.message}`);
  }
  return { rateCards: data || [], total: count || 0 };
}
