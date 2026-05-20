"use server";

import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";

/**
 * 요율 카드 등록 (마스터 + 슬랩 + 할증 통합 저장)
 * TISA 규정에 따라 동일 항로의 기존 ACTIVE 요율을 SUPERSEDED 처리함
 */
export async function createRateCard(payload: {
  card: any;
  tiers: any[];
  surcharges: any[];
}) {
  const { supabase, profile } = await validateUserAction();
  
  if (!profile || (profile.role !== USER_ROLES.ADMIN && profile.role !== USER_ROLES.MANAGER)) {
    throw new Error("요율 등록 권한이 없습니다.");
  }

  // BUG-FR-001 보완: org_id 확정 (ADMIN 등록 시에도 selectedCarrier의 ID가 org_id로 저장되어야 함)
  const targetOrgId = payload.card.org_id || payload.card.carrier_id;
  if (!targetOrgId) throw new Error("운송사 정보(org_id)가 누락되었습니다.");

  // BUG-FR-002: TISA 버전 관리 - 기존 ACTIVE 요율 SUPERSEDED 처리
  // 동일 항로 조건: org_id, origin_code, dest_code, mode, customer_id
  const { data: existingRates } = await supabase
    .from("zen_rate_cards")
    .select("id, version_no")
    .eq("org_id", targetOrgId)
    .eq("origin_code", payload.card.origin_code || payload.card.origin_port)
    .eq("dest_code", payload.card.dest_code || payload.card.destination_port)
    .eq("mode", payload.card.mode || payload.card.service_type)
    .eq("status", "ACTIVE");

  let nextVersion = 1;
  if (existingRates && existingRates.length > 0) {
    // 기존 요율 SUPERSEDED 처리
    const idsToUpdate = existingRates.map(r => r.id);
    await supabase
      .from("zen_rate_cards")
      .update({ status: "SUPERSEDED" })
      .in("id", idsToUpdate);
    
    // 버전 번호 산출 (최대값 + 1)
    nextVersion = Math.max(...existingRates.map(r => r.version_no)) + 1;
  }

  // 1. 요율 마스터 저장
  const { data: card, error: cardError } = await supabase
    .from("zen_rate_cards")
    .insert({
      ...payload.card,
      org_id: targetOrgId,
      origin_code: payload.card.origin_code || payload.card.origin_port,
      dest_code: payload.card.dest_code || payload.card.destination_port,
      mode: payload.card.mode || payload.card.service_type,
      status: "ACTIVE",
      version_no: nextVersion,
      created_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (cardError) throw new Error(`Rate card creation failed: ${cardError.message}`);

  // 2. 요율 슬랩(tiers) 저장
  if (payload.tiers && payload.tiers.length > 0) {
    const tiersToInsert = payload.tiers.map(tier => ({
      ...tier,
      rate_card_id: card.id
    }));
    const { error: tiersError } = await supabase
      .from("zen_rate_tiers")
      .insert(tiersToInsert);
    
    if (tiersError) throw new Error(`Rate tiers creation failed: ${tiersError.message}`);
  }

  // 3. 할증 항목(surcharges) 저장
  if (payload.surcharges && payload.surcharges.length > 0) {
    const surchargesToInsert = payload.surcharges.map(s => ({
      ...s,
      rate_card_id: card.id
    }));
    const { error: surchargesError } = await supabase
      .from("zen_rate_surcharges")
      .insert(surchargesToInsert);

    if (surchargesError) throw new Error(`Surcharges creation failed: ${surchargesError.message}`);
  }

  revalidatePath("/admin/rates");
  return card;
}

/**
 * 요율 카드 삭제 (Soft delete 대신 물리 삭제 적용, CASCADE 설정됨)
 */
export async function deleteRateCard(cardId: string) {
  const { supabase, profile } = await validateUserAction();
  
  if (!profile || profile.role !== USER_ROLES.ADMIN) {
    throw new Error("요율 삭제 권한은 관리자(ADMIN)만 가능합니다.");
  }

  const { error } = await supabase
    .from("zen_rate_cards")
    .delete()
    .eq("id", cardId);

  if (error) throw new Error(`Rate card deletion failed: ${error.message}`);

  revalidatePath("/admin/rates");
  return { success: true };
}

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
} = {}) {
  const { supabase, profile } = await validateUserAction();
  
  let query = supabase
    .from("zen_rate_cards")
    .select(`
      *,
      origin_port:origin_code,
      destination_port:dest_code,
      service_type:mode,
      carrier:zen_organizations!org_id(name, iata_code),
      tiers:zen_rate_tiers(*),
      surcharges:zen_rate_surcharges(*)
    `);

  // 권한별 필터링: CARRIER는 자사 요율만 조회
  if (profile?.role === USER_ROLES.CARRIER) {
    query = query.eq("org_id", profile.org_id);
  }

  // 필터 적용 (명칭 호환성 유지)
  const origin = filters.origin_code || filters.origin_port;
  const dest = filters.dest_code || filters.destination_port;
  const mode = filters.mode || filters.service_type;

  if (origin) query = query.eq("origin_code", origin);
  if (dest) query = query.eq("dest_code", dest);
  if (mode) query = query.eq("mode", mode);
  if (filters.status && filters.status !== 'ALL') query = query.eq("status", filters.status);

  // 최신순 및 버전순 정렬
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[ERROR] getRateCards failed:", error);
    throw new Error(`Rates query failed: ${error.message}`);
  }
  return data || [];
}
