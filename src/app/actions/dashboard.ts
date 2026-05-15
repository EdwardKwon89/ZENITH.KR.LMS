"use server";

import { validateUserAction } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";

export interface DashboardOrder {
  id: string;
  order_no: string;
  shipper_name: string;
  origin: string;
  dest: string;
  status: string;
  transport_mode: string;
  created_at: string;
}

export interface DashboardStats {
  totalOrders: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  carrierReliability: number;
}

export async function getDashboardStats() {
  const { supabase, profile, user } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const userProfile = profile as any;

  let query = supabase
    .from("zen_orders")
    .select(`
      id, order_no, status, transport_mode, created_at,
      shipper:zen_organizations!shipper_id(name),
      origin_port:zen_ports!origin_port_id(code, name),
      dest_port:zen_ports!dest_port_id(code, name)
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  if (userProfile.role === USER_ROLES.CORPORATE) {
    query = query.eq("shipper_id", userProfile.org_id);
  } else if (userProfile.role === USER_ROLES.INDIVIDUAL) {
    query = query.eq("created_by", user.id);
  }

  const { data: orders, error } = await query;
  if (error) throw new Error(error.message);

  let statsQuery = supabase.from("zen_orders").select("status", { count: "exact", head: true });
  if (userProfile.role === USER_ROLES.CORPORATE) {
    statsQuery = statsQuery.eq("shipper_id", userProfile.org_id);
  } else if (userProfile.role === USER_ROLES.INDIVIDUAL) {
    statsQuery = statsQuery.eq("created_by", user.id);
  }
  const { count: totalOrders } = await statsQuery;

  const { count: inTransit } = await supabase
    .from("zen_orders")
    .select("status", { count: "exact", head: true })
    .eq("status", "IN_TRANSIT");

  const { count: delivered } = await supabase
    .from("zen_orders")
    .select("status", { count: "exact", head: true })
    .eq("status", "DELIVERED");

  const { count: cancelled } = await supabase
    .from("zen_orders")
    .select("status", { count: "exact", head: true })
    .eq("status", "CANCELED");

  const mapped = (orders || []).map((o: any) => ({
    id: o.id,
    order_no: o.order_no,
    shipper_name: o.shipper?.name || "",
    origin: o.origin_port?.code || "",
    dest: o.dest_port?.code || "",
    status: o.status || "",
    transport_mode: o.transport_mode || "",
    created_at: o.created_at || "",
  }));

  const total = totalOrders || 0;
  const cancelledCount = cancelled || 0;

  return {
    orders: mapped as DashboardOrder[],
    stats: {
      totalOrders: total,
      inTransit: inTransit || 0,
      delivered: delivered || 0,
      cancelled: cancelledCount,
      carrierReliability: total > 0
        ? Math.round(((total - cancelledCount) / total) * 1000) / 10
        : 99.4,
    } as DashboardStats,
  };
}
