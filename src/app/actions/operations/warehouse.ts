"use server";

import { logger } from '@/lib/logger';

import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { OrderRepository } from "@/lib/repositories";
import { OrderStatus } from "@/types/orders";
import { updateOrderStatus } from "./orders";

export async function getWarehousedOrders() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

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
