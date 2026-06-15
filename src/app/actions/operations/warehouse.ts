"use server";

import { logger } from '@/lib/logger';

import { validateUserAction } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";
import { revalidatePath } from "next/cache";
import { OrderRepository } from "@/lib/repositories";
import { OrderStatus } from "@/types/orders";
import { updateOrderStatus } from "./orders";

import { z } from "zod";

export async function updatePackageRefs(
  raw: { packageId: string; domesticRefNo: string | null; intlRefNo: string | null }
): Promise<{ success: boolean; error?: string }> {
  const { supabase, profile } = await validateUserAction();
  if (!profile) return { success: false, error: "User profile not found" };
  const isAllowed =
    profile.role === USER_ROLES.ADMIN ||
    profile.role === USER_ROLES.MANAGER ||
    profile.role === USER_ROLES.ZENITH_SUPER_ADMIN;
  if (!isAllowed) return { success: false, error: "권한이 없습니다." };

  const parsed = z.object({
    packageId: z.string().uuid("Invalid package ID"),
    domesticRefNo: z.string().max(100).nullable(),
    intlRefNo: z.string().max(100).nullable(),
  }).safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues?.[0]?.message || "Validation failed" };

  const { packageId, domesticRefNo, intlRefNo } = parsed.data;

  const { data: existing, error: fetchError } = await supabase
    .from("zen_order_packages")
    .select("id, intl_ref_locked, intl_ref_no")
    .eq("id", packageId)
    .maybeSingle();
  if (fetchError || !existing) return { success: false, error: "패키지를 찾을 수 없습니다." };
  if (existing.intl_ref_locked && intlRefNo !== existing.intl_ref_no) {
    return { success: false, error: "UPS 국제번호는 잠금 상태이며 수정할 수 없습니다." };
  }

  const { error: updateError } = await supabase
    .from("zen_order_packages")
    .update({ domestic_ref_no: domesticRefNo, intl_ref_no: intlRefNo, updated_at: new Date().toISOString() })
    .eq("id", packageId);
  if (updateError) { logger.error("updatePackageRefs error:", updateError); return { success: false, error: `패키지 REF_NO 업데이트 실패: ${updateError.message}` }; }

  revalidatePath("/(dashboard)/warehouse/inbound", "page");
  return { success: true };
}

export async function getWarehousedOrders() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = profile.role === USER_ROLES.ADMIN ||
    profile.role === USER_ROLES.MANAGER ||
    profile.role === USER_ROLES.ZENITH_SUPER_ADMIN;
  if (!isAllowed) {
    throw new Error("권한이 없습니다. ADMIN, MANAGER, ZENITH_SUPER_ADMIN만 접근 가능합니다.");
  }

  const { data, error } = await supabase
    .from("zen_orders")
    .select(`
      id, order_no, status, created_at,
      recipient_name, recipient_contact, recipient_address, recipient_phone,
      packages,
      shipper:profiles!zen_orders_shipper_id_fkey(name),
      origin_port:zen_ports!zen_orders_origin_port_id_fkey(name, code),
      dest_port:zen_ports!zen_orders_dest_port_id_fkey(name, code)
    `)
    .eq("status", OrderStatus.WAREHOUSED)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("getWarehousedOrders error:", error);
    throw new Error("Failed to fetch warehoused orders");
  }

  return { success: true, orders: data || [] };
}

export async function getTodayReleasedOrders() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = profile.role === USER_ROLES.ADMIN ||
    profile.role === USER_ROLES.MANAGER ||
    profile.role === USER_ROLES.ZENITH_SUPER_ADMIN;
  if (!isAllowed) {
    throw new Error("권한이 없습니다. ADMIN, MANAGER, ZENITH_SUPER_ADMIN만 접근 가능합니다.");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("order_status_history")
    .select(`
      id, created_at,
      order:zen_orders!order_status_history_order_id_fkey(
        id, order_no, status, recipient_name, packages
      )
    `)
    .eq("next_status", OrderStatus.RELEASED)
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("getTodayReleasedOrders error:", error);
    throw new Error("Failed to fetch today released orders");
  }

  return { success: true, items: data || [] };
}

export async function confirmOutbound(orderId: string) {
  const { supabase, user, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  const isAllowed = profile.role === USER_ROLES.ADMIN ||
    profile.role === USER_ROLES.MANAGER ||
    profile.role === USER_ROLES.ZENITH_SUPER_ADMIN;
  if (!isAllowed) {
    throw new Error("권한이 없습니다. ADMIN, MANAGER, ZENITH_SUPER_ADMIN만 접근 가능합니다.");
  }

  const orderRepo = new OrderRepository(supabase);

  const { data: order } = await orderRepo.findById(orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== OrderStatus.WAREHOUSED) {
    throw new Error("WAREHOUSED 상태의 오더만 출고 확정할 수 있습니다.");
  }

  const packages = (order as any).packages || [];
  const totalQty = packages.reduce((sum: number, p: any) => {
    return sum + (p.packing_count || p.items?.length || 0);
  }, 0);
  const orgId = (order as any).org_id || profile.org_id;

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

  return { success: true };
}
