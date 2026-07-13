'use server';

import { createClient } from '@/utils/supabase/server';
import { validateUserAction } from '@/lib/auth/guards';

export async function getAgencyOrgIdByShipper(shipperOrgId: string): Promise<string | null> {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_agency_shippers')
    .select('agency_org_id')
    .eq('shipper_org_id', shipperOrgId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(`대리점 조회 실패: ${error.message}`);
  return data?.agency_org_id ?? null;
}
