'use server';

import { logger } from '@/lib/logger';
import { validateUserAction, checkPermission } from '@/lib/auth/guards';
import { createAdminClient } from '@/utils/supabase/server';
import { getMaxAllowedZoneDiscount } from '@/lib/ups/discount-guard';
import { revalidatePath } from 'next/cache';

export async function getShipperZoneDiscounts(shipperOrgId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('접근 권한이 없습니다.');
  }

  const { data, error } = await supabase
    .from('zen_agency_shipper_zone_discounts')
    .select('zone_id, discount_rate')
    .eq('shipper_org_id', shipperOrgId);

  if (error) {
    logger.error('[zone-discounts] getShipperZoneDiscounts error:', error);
    throw new Error('할인율 정보를 불러오는데 실패했습니다.');
  }

  return data || [];
}

export async function upsertShipperZoneDiscounts(
  shipperOrgId: string,
  zoneRates: Record<string, number>,
  productIds?: string[],
) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    return { success: false, fieldErrors: { _form: '접근 권한이 없습니다.' } };
  }

  const admin = await createAdminClient();
  const { data: org } = await admin
    .from('zen_organizations')
    .select('type')
    .eq('id', shipperOrgId)
    .single();

  if (org?.type !== 'SHIPPER') {
    return { success: false, fieldErrors: { _form: '유효하지 않은 화주입니다.' } };
  }

  const { data: link } = await admin
    .from('zen_agency_shippers')
    .select('agency_org_id')
    .eq('shipper_org_id', shipperOrgId)
    .single();

  const agencyOrgId = link?.agency_org_id;
  if (!agencyOrgId) {
    return { success: false, fieldErrors: { _form: '대리점 연결 정보를 찾을 수 없습니다.' } };
  }
  if (agencyOrgId !== profile.org_id) {
    return { success: false, fieldErrors: { _form: '본인 소속 화주가 아닙니다.' } };
  }

  const errors: string[] = [];
  for (const [zoneId, rate] of Object.entries(zoneRates)) {
    const maxAllowed = await getMaxAllowedZoneDiscount(admin, zoneId, productIds);
    if (maxAllowed != null && rate > maxAllowed) {
      errors.push(`Zone ${zoneId}: 할인율(${(rate * 100).toFixed(1)}%)이(가) 원가 마진을 초과합니다. 최대 허용: ${(maxAllowed * 100).toFixed(1)}%`);
      continue;
    }

    const { error: upsertError } = await admin
      .from('zen_agency_shipper_zone_discounts')
      .upsert(
        {
          agency_org_id: agencyOrgId,
          shipper_org_id: shipperOrgId,
          zone_id: zoneId,
          discount_rate: rate,
          is_active: true,
        },
        { onConflict: 'agency_org_id,shipper_org_id,zone_id' },
      );
    if (upsertError) errors.push(`Zone ${zoneId}: ${upsertError.message}`);
  }

  if (errors.length > 0) {
    logger.error('[zone-discounts] upsert errors:', errors.join(', '));
    return { success: false, fieldErrors: { _form: errors.join('\n') } };
  }

  revalidatePath('/agency/shippers');
  return { success: true };
}
