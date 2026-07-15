"use server";

import { logger } from '@/lib/logger';

import { validateUserAction } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";
import { revalidatePath } from "next/cache";
import { OrderRepository } from "@/lib/repositories";
import { OrderStatus } from "@/types/orders";
import { updateOrderStatus } from "./orders";

const WAREHOUSE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.ZENITH_SUPER_ADMIN,
  USER_ROLES.AGENCY,
];

async function getAgencyShipperIds(supabase: any, orgId: string): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("zen_agency_shippers")
    .select("shipper_org_id")
    .eq("agency_org_id", orgId)
    .eq("is_active", true);

  if (error) {
    logger.error("getAgencyShipperIds error:", error);
    return null;
  }
  return (data || []).map((r: any) => r.shipper_org_id);
}

export async function getWarehousedOrders() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) {
    throw new Error("권한이 없습니다.");
  }

  let query = supabase
    .from("zen_orders")
    .select(`
      id, order_no, status, created_at,
      recipient_name, recipient_contact, recipient_address, recipient_phone,
      shipper:zen_organizations!zen_orders_shipper_id_fkey(name),
      origin_port:zen_ports!zen_orders_origin_port_id_fkey(name, code),
      dest_port:zen_ports!zen_orders_dest_port_id_fkey(name, code),
      order_packages:zen_order_packages!zen_order_packages_order_id_fkey(id, intl_ref_no, intl_ref_locked, packing_unit, packing_count, gross_weight)
    `)
    .eq("status", OrderStatus.WAREHOUSED);

  if (profile.role === USER_ROLES.AGENCY) {
    const shipperIds = await getAgencyShipperIds(supabase, profile.org_id);
    if (!shipperIds || shipperIds.length === 0) {
      return { success: true, orders: [] };
    }
    query = query.in("shipper_id", shipperIds);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    logger.error("getWarehousedOrders error:", error);
    throw new Error("Failed to fetch warehoused orders");
  }

  return { success: true, orders: data || [] };
}

export async function getTodayReleasedOrders() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) {
    throw new Error("권한이 없습니다.");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let query = supabase
    .from("order_status_history")
    .select(`
      id, created_at,
      order:zen_orders!order_status_history_order_id_fkey(
        id, order_no, status, recipient_name, shipper_id,
        order_packages:zen_order_packages!zen_order_packages_order_id_fkey(
          id, intl_ref_no, intl_ref_locked, packing_count,
          ups_labels:zen_ups_labels!zen_ups_labels_package_id_fkey(
            id, tracking_number, label_format, storage_path, is_voided, voided_at, reference_no
          )
        )
      )
    `)
    .eq("next_status", OrderStatus.RELEASED)
    .gte("created_at", todayStart.toISOString());

  const { data: historyData, error: historyError } = await query.order("created_at", { ascending: false });

  if (historyError) {
    logger.error("getTodayReleasedOrders error:", historyError);
    throw new Error("Failed to fetch today released orders");
  }

  let items = historyData || [];

  if (profile.role === USER_ROLES.AGENCY) {
    const shipperIds = await getAgencyShipperIds(supabase, profile.org_id);
    if (!shipperIds || shipperIds.length === 0) {
      return { success: true, items: [] };
    }
    items = items.filter((item: any) => {
      const shipperId = item.order?.shipper_id;
      return shipperId && shipperIds.includes(shipperId);
    });
  }

  return { success: true, items };
}

export async function confirmOutbound(orderId: string) {
  const { supabase, user, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) {
    throw new Error("권한이 없습니다.");
  }

  const orderRepo = new OrderRepository(supabase);

  const { data: order } = await orderRepo.findById(orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== OrderStatus.WAREHOUSED) {
    throw new Error("WAREHOUSED 상태의 오더만 출고 확정할 수 있습니다.");
  }

  if (profile.role === USER_ROLES.AGENCY) {
    const shipperIds = await getAgencyShipperIds(supabase, profile.org_id);
    if (!shipperIds || !shipperIds.includes((order as any).shipper_id)) {
      throw new Error("본인 소속 화주의 오더만 출고 처리할 수 있습니다.");
    }
  }

  const packages = (order as any).packages || [];
  const totalQty = packages.reduce((sum: number, p: any) => {
    return sum + (p.packing_count || p.items?.length || 0);
  }, 0);
  const orgId = (order as any).org_id || profile.org_id;

  const { data: pkgs } = await supabase
    .from("zen_order_packages")
    .select("id, intl_ref_no, packing_count")
    .eq("order_id", orderId);
  const pkgsWithoutIntlRef = (pkgs || []).filter((p) => !p.intl_ref_no).length;

  await updateOrderStatus(orderId, OrderStatus.RELEASED, "[출고확정]");

  const { error: historyError } = await supabase
    .from("zen_inventory_history")
    .insert({
      org_id: orgId,
      transaction_type: "OUTBOUND" as any,
      change_qty: -totalQty,
      result_qty: 0,
      reference_id: orderId,
      remarks: `출고확정: ${order.order_no}`,
      created_by: user.id,
    });

  if (historyError) {
    logger.error("confirmOutbound history insert error:", historyError);
  }

  revalidatePath("/(dashboard)/warehouse/outbound", "page");
  revalidatePath("/(dashboard)/orders", "page");

  return { success: true, pkgsWithoutIntlRef };
}
