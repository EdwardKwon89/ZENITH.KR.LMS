"use server";

import { logger } from '@/lib/logger';

import { validateUserAction } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";
import { revalidatePath } from "next/cache";
import { OrderRepository } from "@/lib/repositories";
import { OrderStatus } from "@/types/orders";
import { updateOrderStatus, attachOperatorNames } from "./orders";
import { registerUpsOrder, cancelUpsRegistration, fetchAndIssueUpsLabel, voidUpsLabel } from "./ups-labels";

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
  if (order.status !== OrderStatus.WAREHOUSED && order.status !== OrderStatus.PACKED) {
    throw new Error("WAREHOUSED 또는 PACKED 상태의 오더만 출고 확정할 수 있습니다.");
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

// ─────────────────────────────────────────────
// B-1: 오더픽업 (Pickup) — UPS REGISTERED + PICKUP → SCHEDULED
// ─────────────────────────────────────────────

export async function getPickupOrders() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) throw new Error("권한이 없습니다.");

  let query = supabase
    .from("zen_orders")
    .select(`
      id, order_no, status, created_at,
      recipient_name, recipient_contact, recipient_address,
      delivery_method, pickup_location, pickup_contact_name, pickup_contact_tel,
      transport_mode,
      shipper:zen_organizations!zen_orders_shipper_id_fkey(name),
      origin_port:zen_ports!zen_orders_origin_port_id_fkey(name, code),
      dest_port:zen_ports!zen_orders_dest_port_id_fkey(name, code),
      order_packages:zen_order_packages!zen_order_packages_order_id_fkey(id, intl_ref_no, packing_unit, packing_count, gross_weight)
    `)
    .eq("transport_mode", "UPS")
    .eq("status", OrderStatus.REGISTERED)
    .eq("delivery_method", "PICKUP");

  if (profile.role === USER_ROLES.AGENCY) {
    const shipperIds = await getAgencyShipperIds(supabase, profile.org_id);
    if (!shipperIds || shipperIds.length === 0) return { success: true, orders: [] };
    query = query.in("shipper_id", shipperIds);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    logger.error("getPickupOrders error:", error);
    throw new Error("Failed to fetch pickup orders");
  }
  return { success: true, orders: data || [] };
}

export async function confirmPickup(orderId: string) {
  const { profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) throw new Error("권한이 없습니다.");

  await updateOrderStatus(orderId, OrderStatus.SCHEDULED, "[픽업완료]");

  revalidatePath("/(dashboard)/warehouse/pickup", "page");
  revalidatePath("/(dashboard)/orders", "page");

  return { success: true };
}

export async function cancelPickup(orderId: string) {
  const { profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) throw new Error("권한이 없습니다.");

  await updateOrderStatus(orderId, OrderStatus.REGISTERED, "[픽업취소]");

  revalidatePath("/(dashboard)/warehouse/pickup", "page");
  revalidatePath("/(dashboard)/orders", "page");

  return { success: true };
}

export async function getTodayPickupHistory() {
  const { supabase } = await validateUserAction();

  const now = new Date();
  const todayKst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  todayKst.setUTCHours(0, 0, 0, 0);
  const startUtc = new Date(todayKst.getTime() - 9 * 60 * 60 * 1000).toISOString();
  todayKst.setUTCHours(23, 59, 59, 999);
  const endUtc = new Date(todayKst.getTime() - 9 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("order_status_history")
    .select(`
      id, order_id, prev_status, next_status, reason, created_at, changed_by,
      order:zen_orders!order_id(
        order_no,
        shipper:zen_organizations!shipper_id(name)
      )
    `)
    .eq("next_status", "SCHEDULED")
    .contains("reason", "[픽업완료]")
    .gte("created_at", startUtc)
    .lte("created_at", endUtc)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("getTodayPickupHistory error:", error);
    throw new Error("Failed to fetch today pickup history");
  }
  return attachOperatorNames(supabase, data || []);
}

// ─────────────────────────────────────────────
// 오늘의 UPS 접수 이력 조회 (Issue #704)
// ─────────────────────────────────────────────

export async function getTodayUpsHistory() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const now = new Date();
  const todayKst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  todayKst.setUTCHours(0, 0, 0, 0);
  const startUtc = new Date(todayKst.getTime() - 9 * 60 * 60 * 1000).toISOString();
  todayKst.setUTCHours(23, 59, 59, 999);
  const endUtc = new Date(todayKst.getTime() - 9 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("order_status_history")
    .select(`
      id, created_at, changed_by,
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
    .eq("next_status", OrderStatus.PACKED)
    .contains("reason", "[UPS등록]")
    .gte("created_at", startUtc)
    .lte("created_at", endUtc)
    .order("created_at", { ascending: false });

  const { data: historyData, error: historyError } = await query;

  if (historyError) {
    logger.error("getTodayUpsHistory error:", historyError);
    throw new Error("Failed to fetch today UPS history");
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

  return { success: true, items: await attachOperatorNames(supabase, items) };
}

// ─────────────────────────────────────────────
// B-2: 입고취소 (Cancel Inbound) — WAREHOUSED → 직전 상태 복구
// ─────────────────────────────────────────────

export async function cancelInbound(orderId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) throw new Error("권한이 없습니다.");

  const orderRepo = new OrderRepository(supabase);
  const { data: current } = await orderRepo.getStatus(orderId);
  if (!current || current.status !== OrderStatus.WAREHOUSED) {
    throw new Error("WAREHOUSED 상태의 오더만 입고취소할 수 있습니다.");
  }

  const { data: prevData } = await supabase
    .from("order_status_history")
    .select("prev_status")
    .eq("order_id", orderId)
    .eq("next_status", OrderStatus.WAREHOUSED)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevStatus = (prevData?.prev_status as OrderStatus) || OrderStatus.REGISTERED;

  await updateOrderStatus(orderId, prevStatus, "[입고취소]");

  revalidatePath("/(dashboard)/warehouse/inbound", "page");
  revalidatePath("/(dashboard)/orders", "page");

  return { success: true, restoredStatus: prevStatus };
}

// ─────────────────────────────────────────────
// C-1: UPS접수 — PACKED 대상 오더 조회
// ─────────────────────────────────────────────

export async function getPackedOrders() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) throw new Error("권한이 없습니다.");

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
    .eq("status", OrderStatus.PACKED);

  if (profile.role === USER_ROLES.AGENCY) {
    const shipperIds = await getAgencyShipperIds(supabase, profile.org_id);
    if (!shipperIds || shipperIds.length === 0) {
      return { success: true, orders: [] };
    }
    query = query.in("shipper_id", shipperIds);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    logger.error("getPackedOrders error:", error);
    throw new Error("Failed to fetch packed orders");
  }
  return { success: true, orders: data || [] };
}

// ─────────────────────────────────────────────
// C-2: UPS등록 확정 — WAREHOUSED → PACKED
// ─────────────────────────────────────────────

export async function confirmUpsRegistration(orderId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) throw new Error("권한이 없습니다.");

  const orderRepo = new OrderRepository(supabase);
  const { data: order } = await orderRepo.findById(orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== OrderStatus.WAREHOUSED) {
    throw new Error("WAREHOUSED 상태의 오더만 UPS 등록할 수 있습니다.");
  }

  if (profile.role === USER_ROLES.AGENCY) {
    const shipperIds = await getAgencyShipperIds(supabase, profile.org_id);
    if (!shipperIds || !shipperIds.includes((order as any).shipper_id)) {
      throw new Error("본인 소속 화주의 오더만 처리할 수 있습니다.");
    }
  }

  const result = await registerUpsOrder(orderId);
  if (!result.success) return { success: false, error: result.error };

  await updateOrderStatus(orderId, OrderStatus.PACKED, "[UPS등록]");

  revalidatePath("/(dashboard)/warehouse/ups-receive", "page");
  revalidatePath("/(dashboard)/warehouse/outbound", "page");
  revalidatePath("/(dashboard)/orders", "page");

  return {
    success: true,
    data: {
      shxk_order_id: result.data!.shxk_order_id,
      tracking_number: result.data!.tracking_number,
      reference_no: result.data!.reference_no,
    },
  };
}

// ─────────────────────────────────────────────
// C-3: UPS등록취소 — PACKED → WAREHOUSED
// ─────────────────────────────────────────────

export async function undoUpsRegistration(orderId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) throw new Error("권한이 없습니다.");

  const orderRepo = new OrderRepository(supabase);
  const { data: order } = await orderRepo.findById(orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== OrderStatus.PACKED) {
    throw new Error("PACKED 상태의 오더만 UPS등록취소할 수 있습니다.");
  }

  const result = await cancelUpsRegistration(orderId);
  if (!result.success) return { success: false, error: result.error };

  await updateOrderStatus(orderId, OrderStatus.WAREHOUSED, "[UPS등록취소]");

  revalidatePath("/(dashboard)/warehouse/ups-receive", "page");
  revalidatePath("/(dashboard)/warehouse/outbound", "page");
  revalidatePath("/(dashboard)/orders", "page");

  return { success: true };
}

// ─────────────────────────────────────────────
// D-1: 출고확정처리 — RELEASED → IN_TRANSIT
// ─────────────────────────────────────────────

export async function getReleasedOrders() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) throw new Error("권한이 없습니다.");

  let query = supabase
    .from("zen_orders")
    .select(`
      id, order_no, status, created_at,
      recipient_name, recipient_contact, recipient_address, recipient_phone,
      transport_mode,
      shipper:zen_organizations!zen_orders_shipper_id_fkey(name),
      origin_port:zen_ports!zen_orders_origin_port_id_fkey(name, code),
      dest_port:zen_ports!zen_orders_dest_port_id_fkey(name, code),
      order_packages:zen_order_packages!zen_order_packages_order_id_fkey(id, intl_ref_no, intl_ref_locked, packing_unit, packing_count, gross_weight)
    `)
    .eq("transport_mode", "UPS")
    .eq("status", OrderStatus.RELEASED);

  if (profile.role === USER_ROLES.AGENCY) {
    const shipperIds = await getAgencyShipperIds(supabase, profile.org_id);
    if (!shipperIds || shipperIds.length === 0) return { success: true, orders: [] };
    query = query.in("shipper_id", shipperIds);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    logger.error("getReleasedOrders error:", error);
    throw new Error("Failed to fetch released orders");
  }
  return { success: true, orders: data || [] };
}

export async function confirmDeparture(orderId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) throw new Error("권한이 없습니다.");

  const orderRepo = new OrderRepository(supabase);
  const { data: order } = await orderRepo.findById(orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== OrderStatus.RELEASED) {
    throw new Error("RELEASED 상태의 오더만 출고확정할 수 있습니다.");
  }

  if (profile.role === USER_ROLES.AGENCY) {
    const shipperIds = await getAgencyShipperIds(supabase, profile.org_id);
    if (!shipperIds || !shipperIds.includes((order as any).shipper_id)) {
      throw new Error("본인 소속 화주의 오더만 처리할 수 있습니다.");
    }
  }

  await updateOrderStatus(orderId, OrderStatus.IN_TRANSIT, "[출고확정처리]");

  revalidatePath("/(dashboard)/warehouse/departure", "page");
  revalidatePath("/(dashboard)/orders", "page");

  return { success: true };
}

// ─────────────────────────────────────────────
// C-4: 출고취소 — RELEASED → PACKED
// ─────────────────────────────────────────────

export async function undoOutbound(orderId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = WAREHOUSE_ROLES.includes(profile.role as any);
  if (!isAllowed) throw new Error("권한이 없습니다.");

  const orderRepo = new OrderRepository(supabase);
  const { data: order } = await orderRepo.findById(orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== OrderStatus.RELEASED) {
    throw new Error("RELEASED 상태의 오더만 출고취소할 수 있습니다.");
  }

  const result = await voidUpsLabel(orderId);
  if (!result.success) return { success: false, error: result.error };

  await updateOrderStatus(orderId, OrderStatus.PACKED, "[출고취소]");

  revalidatePath("/(dashboard)/warehouse/outbound", "page");
  revalidatePath("/(dashboard)/orders", "page");

  return { success: true };
}
