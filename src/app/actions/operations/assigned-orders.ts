"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";

const SERVICE_TYPE_MAP: Record<string, string> = {
  TRANSPORT_AIR: 'AIR',
  TRANSPORT_SEA: 'SEA',
  TRANSPORT_LAND: 'LAND',
  TRANSPORT_EXP: 'EXP',
  CUSTOMS: 'CUSTOMS',
  DELIVERY_LOCAL: 'DELIVERY_LOCAL',
  DELIVERY_TOTAL: 'DELIVERY_TOTAL',
};

const SERVICE_CATEGORY: Record<string, string> = {
  TRANSPORT_AIR: 'TRANSPORT',
  TRANSPORT_SEA: 'TRANSPORT',
  TRANSPORT_LAND: 'TRANSPORT',
  TRANSPORT_EXP: 'TRANSPORT',
  CUSTOMS: 'CUSTOMS',
  DELIVERY_LOCAL: 'DELIVERY',
  DELIVERY_TOTAL: 'DELIVERY',
};

export interface AssignedOrder {
  id: string;
  order_no: string;
  service_type: string;
  service_category: string;
  provider_id: string;
  status: string;
  assigned_at: string;
  shipper_name: string | null;
}

export async function getAssignedOrders(category?: 'TRANSPORT' | 'CUSTOMS' | 'DELIVERY') {
  const { supabase, profile } = await validateUserAction();

  if (!profile) throw new Error("인증되지 않은 사용자입니다.");

  const providerRoles: string[] = [USER_ROLES.CARRIER, USER_ROLES.CUSTOMS_BROKER, USER_ROLES.DELIVERY_AGENT];
  if (!providerRoles.includes(profile.role)) {
    throw new Error("할당된 오더 조회 권한이 없습니다.");
  }

  let query = supabase
    .from('zen_order_services')
    .select(`
      id,
      service_type,
      provider_id,
      status,
      assigned_at,
      order_id,
      zen_orders!inner(order_no, shipper_id, zen_organizations!shipper_id!inner(name))
    `)
    .eq('provider_id', profile.org_id);

  if (category) {
    const types = Object.entries(SERVICE_CATEGORY)
      .filter(([, cat]) => cat === category)
      .map(([type]) => type);
    query = query.in('service_type', types);
  }

  query = query.order('assigned_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    logger.error("[ERROR] getAssignedOrders failed:", error);
    throw new Error(`할당 오더 조회 실패: ${error.message}`);
  }

  const orders: AssignedOrder[] = (data || []).map((item: any) => ({
    id: item.order_id,
    order_no: item.zen_orders?.order_no || '',
    service_type: item.service_type,
    service_category: SERVICE_CATEGORY[item.service_type] || item.service_type,
    provider_id: item.provider_id,
    status: item.status,
    assigned_at: item.assigned_at,
    shipper_name: item.zen_orders?.zen_organizations?.name || null,
  }));

  return orders;
}
