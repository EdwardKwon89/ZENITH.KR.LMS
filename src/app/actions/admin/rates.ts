"use server";

import { logger } from '@/lib/logger';
import { withAction } from '@/lib/actions/wrapper';
import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";
import { AdminRepository } from '@/lib/repositories';
import { SupabaseClient } from '@supabase/supabase-js';

const TRANSIT_DAYS_DEFAULT: Record<string, number> = {
  AIR: 1,
  EXP: 1,
  SEA: 7,
  LAND: 3,
};

async function autoCreateRouteNetwork(
  supabase: SupabaseClient,
  carrier_id: string,
  transport_mode: string,
  origin_port_id: string,
  dest_port_id: string,
  transit_days?: number | null,
) {
  const { data: ports } = await supabase
    .from('zen_ports')
    .select('id, code')
    .in('id', [origin_port_id, dest_port_id]);

  if (!ports || ports.length < 2) {
    logger.warn("[createRateCard] Route network auto-creation skipped: could not resolve port codes", { origin_port_id, dest_port_id });
    return;
  }

  const portByUUID = Object.fromEntries(ports.map((p: any) => [p.id, p.code]));
  const fromCode = portByUUID[origin_port_id];
  const toCode = portByUUID[dest_port_id];

  if (!fromCode || !toCode) {
    logger.warn("[createRateCard] Route network auto-creation skipped: port code lookup failed");
    return;
  }

  const transitDays = transit_days ?? TRANSIT_DAYS_DEFAULT[transport_mode] ?? 3;

  const { error } = await supabase
    .from('zen_route_network')
    .upsert({
      carrier_id,
      from_port_id: fromCode,
      to_port_id: toCode,
      transport_mode,
      transit_days: transitDays,
      is_active: true,
    }, {
      onConflict: 'carrier_id,from_port_id,to_port_id,transport_mode',
      ignoreDuplicates: false,
    });

  if (error) {
    logger.warn("[createRateCard] Route network upsert failed (non-fatal)", error);
  }
}

/**
 * 요율 카드 등록 (TISA 3계층 구조 통합 저장)
 * tiers는 JSONB로 zen_rate_cards 내재화, 동일 carrier+mode 기존 활성 카드는 비활성화
 * origin_port_id + dest_port_id가 모두 있으면 zen_route_network 자동 upsert
 */
export const createRateCard = withAction(async function (payload: {
  card: {
    carrier_id: string;
    transport_mode: string;
    currency?: string;
    origin_port_id?: string | null;
    dest_port_id?: string | null;
    transit_days?: number | null;
    tiers: {
      weight_slabs: { weight_min: number; unit_price: number; min_charge: number }[];
      cbm_slabs: { cbm_min: number; cbm_price: number; min_charge: number }[];
    };
    valid_from: string;
    valid_to?: string;
    carrier_cost?: number;
    margin_rate?: number;
    platform_fee_rate?: number;
  };
  surcharges?: any[];
}) {
  const { supabase, profile } = await validateUserAction();
  const adminRepo = new AdminRepository(supabase);

  if (!profile || (profile.role !== USER_ROLES.ADMIN && profile.role !== USER_ROLES.MANAGER && profile.role !== USER_ROLES.CARRIER)) {
    throw new Error("요율 등록 권한이 없습니다.");
  }

  if (!payload.card.carrier_id) throw new Error("운송사 정보(carrier_id)가 누락되었습니다.");

  if (!payload.card.tiers?.weight_slabs?.length || !payload.card.tiers?.cbm_slabs?.length) {
    throw new Error("무게 요율(weight_slabs)과 부피 요율(cbm_slabs)은 각각 최소 1개 이상 입력해야 합니다.");
  }

  if (profile.role === USER_ROLES.CARRIER) {
    const { data: carrier } = await supabase
      .from('zen_carriers')
      .select('id')
      .eq('org_id', profile.org_id)
      .single();
    if (!carrier || carrier.id !== payload.card.carrier_id) {
      throw new Error("본인 운송사 요율만 등록 가능합니다.");
    }
  }
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

  if (payload.card.origin_port_id && payload.card.dest_port_id) {
    await autoCreateRouteNetwork(
      supabase,
      payload.card.carrier_id,
      payload.card.transport_mode,
      payload.card.origin_port_id,
      payload.card.dest_port_id,
      payload.card.transit_days,
    );
  }

  revalidatePath("/admin/rates");
  return card;
});

export const updateRateCard = withAction(async function (cardId: string, data: {
  transport_mode?: string;
  currency?: string;
  origin_port_id?: string | null;
  dest_port_id?: string | null;
  transit_days?: number | null;
  tiers?: {
    weight_slabs: { weight_min: number; unit_price: number; min_charge: number }[];
    cbm_slabs: { cbm_min: number; cbm_price: number; min_charge: number }[];
  };
  valid_from?: string;
  valid_to?: string;
  carrier_cost?: number;
  margin_rate?: number;
  platform_fee_rate?: number;
  is_active?: boolean;
}) {
  const { supabase, profile } = await validateUserAction();

  if (!profile) throw new Error("인증이 필요합니다.");

  if (profile.role === USER_ROLES.CARRIER) {
    const { data: existing } = await supabase
      .from('zen_rate_cards')
      .select('carrier_id')
      .eq('id', cardId)
      .single();

    if (!existing) throw new Error("Rate card not found.");

    const { data: carrier } = await supabase
      .from('zen_carriers')
      .select('id')
      .eq('org_id', profile.org_id)
      .single();

    if (!carrier || existing.carrier_id !== carrier.id) {
      throw new Error("본인 운송사 요율만 수정 가능합니다.");
    }
  } else if (profile.role !== USER_ROLES.ADMIN && profile.role !== USER_ROLES.MANAGER) {
    throw new Error("요율 수정 권한이 없습니다.");
  }

  const { error } = await supabase
    .from('zen_rate_cards')
    .update(data)
    .eq('id', cardId);

  if (error) throw new Error(`Rate card update failed: ${error.message}`);

  revalidatePath("/admin/rates");
  return true;
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

  if (!profile || (profile.role !== USER_ROLES.ADMIN && profile.role !== USER_ROLES.MANAGER && profile.role !== USER_ROLES.CARRIER)) {
    throw new Error("요율 조회 권한이 없습니다.");
  }

  if (profile.role === USER_ROLES.CARRIER) {
    const { data: carrier } = await supabase
      .from('zen_carriers')
      .select('id')
      .eq('org_id', profile.org_id)
      .single();
    if (carrier) {
      filters.carrier_id = carrier.id;
    }
  }

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

  const rateCards = data || [];
  if (rateCards.length > 0) {
    const cardIds = rateCards.map(r => r.id);
    const { data: surcharges } = await supabase
      .from('zen_rate_surcharges')
      .select('id, rate_card_id, surcharge_type, calc_type, amount, currency, description')
      .in('rate_card_id', cardIds);
    if (surcharges) {
      const surchargesMap: Record<string, any[]> = {};
      for (const s of surcharges) {
        if (!surchargesMap[s.rate_card_id]) surchargesMap[s.rate_card_id] = [];
        surchargesMap[s.rate_card_id].push(s);
      }
      for (const card of rateCards) {
        (card as any).surcharges = surchargesMap[card.id] || [];
      }
    }
  }

  if (profile.role === USER_ROLES.CARRIER) {
    return {
      rateCards: rateCards.map(({ platform_fee_rate, ...rest }) => rest),
      total: count || 0,
    };
  }

  return { rateCards, total: count || 0 };
}
