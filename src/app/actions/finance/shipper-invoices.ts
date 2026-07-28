"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";

export async function getShipperInvoices(params?: { startDate?: string; endDate?: string }) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');

  const allowedRoles = [
    USER_ROLES.SHIPPER,
    USER_ROLES.CORPORATE,
    USER_ROLES.AGENCY_SHIPPER,
    USER_ROLES.INDIVIDUAL,
    USER_ROLES.ADMIN,
    USER_ROLES.ZENITH_SUPER_ADMIN,
    USER_ROLES.AGENCY,
  ];
  if (!allowedRoles.includes(profile.role as any)) {
    throw new Error('조회 권한이 없습니다.');
  }

  let query = supabase
    .from('zen_invoices')
    .select('id, invoice_no, total_amount, currency, status, is_finalized, created_at, metadata, shipper_id')
    .neq('status', 'CANCELED')
    .order('created_at', { ascending: false });

  // 4개 화주 계열 role은 본인 것만, ADMIN은 전체, AGENCY는 자소 화주 것만
  const shipperRoles = [USER_ROLES.SHIPPER, USER_ROLES.CORPORATE, USER_ROLES.AGENCY_SHIPPER, USER_ROLES.INDIVIDUAL];
  if (shipperRoles.includes(profile.role as any)) {
    query = query.eq('shipper_id', profile.org_id);
  } else if (profile.role === USER_ROLES.AGENCY) {
    const { data: agencyLinks } = await supabase
      .from('zen_agency_shippers')
      .select('shipper_org_id')
      .eq('agency_org_id', profile.org_id)
      .eq('is_active', true);

    const shipperIds = (agencyLinks || []).map((l: any) => l.shipper_org_id);
    if (shipperIds.length === 0) return [];
    query = query.in('shipper_id', shipperIds);
  }
  // ADMIN/ZENITH_SUPER_ADMIN은 필터 없이 전체 조회

  if (params?.startDate) query = query.gte('created_at', `${params.startDate}T00:00:00Z`);
  if (params?.endDate) query = query.lte('created_at', `${params.endDate}T23:59:59Z`);

  const { data, error } = await query;
  if (error) {
    logger.error('getShipperInvoices error:', error);
    throw new Error(`청구서 조회 실패: ${error.message}`);
  }

  return data || [];
}
