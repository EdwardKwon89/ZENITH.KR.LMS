'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import { trError } from '@/lib/i18n/action-error';

// [설계 확정] §3-1 — 표시 원천은 run 단일 원천(KRW 고정·환산 없음), 반환 DTO는 부가운임 항목만(원가 미반환).
// 소유·admin 검증 후 자기 tier 항목만 반환한다(최신 version run 기준).

export interface AdditionalChargeItem {
  lineNo: number;
  name: string;
  amount: number;
  currency: string;
  tier: string;
}

export interface AdditionalChargesResult {
  success: boolean;
  items: AdditionalChargeItem[];
  version?: number;
  error?: string;
}

const ADMIN_ROLES = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN];

/** 대리점의 소속 화주 연결 확인(zen_agency_shippers 활성 링크). */
async function hasActiveAgencyLink(
  supabase: SupabaseClient,
  agencyOrgId: string,
  shipperOrgId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('zen_agency_shippers')
    .select('id')
    .eq('agency_org_id', agencyOrgId)
    .eq('shipper_org_id', shipperOrgId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function getOrderAdditionalCharges(orderId: string): Promise<AdditionalChargesResult> {
  try {
    const { supabase, profile } = await validateUserAction();
    if (!profile) {
      logger.warn('[getOrderAdditionalCharges] profile not found');
      return { success: false, items: [], error: await trError('profile_not_found') };
    }

    const role = profile.role as string;
    const isAdmin = ADMIN_ROLES.some((r) => r === role);

    // 오더 조회 — 소유 검증 기준(shipping/agency 연결) 확보
    const { data: order, error: orderError } = await supabase
      .from('zen_orders')
      .select('id, shipper_id, agency_org_id')
      .eq('id', orderId)
      .maybeSingle();
    if (orderError) {
      logger.error('[getOrderAdditionalCharges] order lookup failed', orderError);
      return { success: false, items: [], error: await trError('generic', { code: 'ORDER_LOOKUP' }) };
    }
    if (!order) {
      return { success: false, items: [], error: await trError('order_not_found') };
    }

    // 자기 tier 결정: admin은 전체 tier, 화주 SHIPPER, 대리점 ADMIN_TO_AGENCY — 그 외 거부
    let tier: string | null = null;
    if (!isAdmin) {
      if (role === USER_ROLES.SHIPPER && profile.org_id && order.shipper_id === profile.org_id) {
        tier = 'SHIPPER';
      } else if (
        role === USER_ROLES.AGENCY &&
        profile.org_id &&
        (order.agency_org_id === profile.org_id ||
          (await hasActiveAgencyLink(supabase, profile.org_id, order.shipper_id)))
      ) {
        tier = 'ADMIN_TO_AGENCY';
      } else {
        logger.warn(`[getOrderAdditionalCharges] ownership denied (role=${role})`);
        return { success: false, items: [], error: await trError('permission_denied') };
      }
    }

    // 최신 version run (재마감은 새 version 생성, 동일 입력은 멱등) — 항상 최신 기준
    const { data: run, error: runError } = await supabase
      .from('zen_ups_settlement_runs')
      .select('id, version')
      .eq('order_id', orderId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (runError) {
      logger.error('[getOrderAdditionalCharges] settlement run lookup failed', runError);
      return { success: false, items: [], error: await trError('generic', { code: 'RUN_LOOKUP' }) };
    }
    if (!run) {
      // 정산 전 = 표시할 부가운임 없음(정상 케이스, 오류 아님)
      return { success: true, items: [] };
    }

    // DTO는 항목 컬럼만 select(원가 컬럼 미조회·미반환)
    let query = supabase
      .from('zen_ups_settlement_run_charges')
      .select('line_no, name, amount, currency, tier')
      .eq('run_id', run.id);
    if (tier) query = query.eq('tier', tier);
    const { data, error } = await query.order('line_no', { ascending: true });
    if (error) {
      logger.error('[getOrderAdditionalCharges] run charges lookup failed', error);
      return { success: false, items: [], error: await trError('generic', { code: 'CHARGES_LOOKUP' }) };
    }

    return {
      success: true,
      items: (data ?? []).map((c: Record<string, unknown>) => ({
        lineNo: Number(c.line_no),
        name: String(c.name),
        amount: Number(c.amount),
        currency: String(c.currency),
        tier: String(c.tier),
      })),
      version: Number(run.version),
    };
  } catch (err) {
    logger.error('[getOrderAdditionalCharges] unexpected error:', err);
    return { success: false, items: [], error: await trError('generic', { code: 'ADDITIONAL_CHARGES' }) };
  }
}
