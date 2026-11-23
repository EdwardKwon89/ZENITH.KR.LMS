'use server';

import { logger } from '@/lib/logger';
import { validateUserAction, checkPermission } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import { trError } from '@/lib/i18n/action-error';
import { createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export interface AgencyOtherChargeRow {
  id: string;
  agency_org_id: string;
  other_charge_id: string;
  selling_price: number;
  cost_price: number;
  is_active: boolean;
  created_at: string;
  other_charge: { charge_code: string; charge_name: string; unit: string } | null;
}

/**
 * TASK-B-373 PR-1 (Issue #1362 / Aiden 2026-11-23) — 대리점 소유권 검증.
 *
 * 이 파일의 3개 액션은 `createAdminClient()`(service_role)로 쿼리해 RLS를 우회하므로,
 * 인자/대상 행의 `agency_org_id`가 **호출자 대리점 소속인지**를 쿼리 전에 확인해야 한다.
 * #1469(`agency/shippers.ts`)와 동일 로직을 이 파일 **지역 헬퍼**로 둔다(최소 diff·이식성).
 * - `ZENITH_SUPER_ADMIN`은 `checkPermission()` 전역 바이패스와 정합하도록 예외.
 * - 거부 시 `logger.warn`(관측성) + `Errors.own_agency_only`(4로케일 기존 키).
 * - 새 오류 키·공유 파일을 만들지 않는다(main 이식 최소 diff).
 */
async function ownAgencyError(
  profile: { role: string | null; org_id: string | null },
  targetAgencyOrgId: string | null | undefined,
  where: string,
): Promise<string | null> {
  if (profile.role === USER_ROLES.ZENITH_SUPER_ADMIN) return null;
  if (!profile.org_id || !targetAgencyOrgId || targetAgencyOrgId !== profile.org_id) {
    logger.warn(
      `[${where}] ownership denied: caller=${profile.org_id ?? '(none)'} target=${targetAgencyOrgId ?? '(none)'}`,
    );
    return await trError('own_agency_only');
  }
  return null;
}

export async function getAgencyOtherCharges(agencyOrgId: string) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }
  const ownErr = await ownAgencyError(profile, agencyOrgId, 'getAgencyOtherCharges');
  if (ownErr) throw new Error(ownErr);

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('zen_agency_other_charges')
    .select('*, other_charge:other_charge_id(charge_code, charge_name, unit)')
    .eq('agency_org_id', agencyOrgId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[getAgencyOtherCharges] Failed:', error.message);
    throw new Error(`Failed to fetch agency other charges: ${error.message}`);
  }

  return (data ?? []) as AgencyOtherChargeRow[];
}

export async function upsertAgencyOtherCharge(
  agencyOrgId: string,
  data: {
    other_charge_id: string;
    selling_price: number;
    cost_price: number;
  }
) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }
  // DEF-149 §1.1 계열 — 쓰기 **전에** 타 대리점 명의 변경을 차단한다(사후 재확인 없음).
  const ownErr = await ownAgencyError(profile, agencyOrgId, 'upsertAgencyOtherCharge');
  if (ownErr) throw new Error(ownErr);

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('zen_agency_other_charges')
    .upsert({
      agency_org_id: agencyOrgId,
      other_charge_id: data.other_charge_id,
      selling_price: data.selling_price,
      cost_price: data.cost_price,
      is_active: true,
      created_by: profile.id,
    }, { onConflict: 'agency_org_id,other_charge_id' });

  if (error) {
    logger.error('[upsertAgencyOtherCharge] Failed:', error.message);
    throw new Error(`Failed to upsert agency other charge: ${error.message}`);
  }

  logger.info(`[upsertAgencyOtherCharge] ${data.other_charge_id} upserted by ${profile.id}`);
  revalidatePath('/agency/other-charges');
  return { success: true };
}

export async function deactivateAgencyOtherCharge(id: string) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const supabase = await createAdminClient();
  // 대상 행의 소속을 먼저 확인한다(타 대리점 행 변경 차단).
  const { data: row, error: rowError } = await supabase
    .from('zen_agency_other_charges')
    .select('id, agency_org_id')
    .eq('id', id)
    .maybeSingle();
  if (rowError) {
    logger.error('[deactivateAgencyOtherCharge] lookup failed:', rowError.message);
    throw new Error(`Failed to load agency other charge: ${rowError.message}`);
  }
  if (!row) throw new Error(await trError('not_found'));

  const ownErr = await ownAgencyError(profile, row.agency_org_id, 'deactivateAgencyOtherCharge');
  if (ownErr) throw new Error(ownErr);

  // 조건부 UPDATE — 조회와 변경 사이 소속이 바뀌어도 타 대리점 행을 건드리지 않는다.
  const { data: updated, error } = await supabase
    .from('zen_agency_other_charges')
    .update({ is_active: false })
    .eq('id', id)
    .eq('agency_org_id', row.agency_org_id)
    .select('id');

  if (error) {
    logger.error('[deactivateAgencyOtherCharge] Failed:', error.message);
    throw new Error(`Failed to deactivate agency other charge: ${error.message}`);
  }
  if (!updated || updated.length === 0) {
    logger.warn(`[deactivateAgencyOtherCharge] no row updated (${id})`);
    throw new Error(await trError('not_found'));
  }

  revalidatePath('/agency/other-charges');
  return { success: true };
}
