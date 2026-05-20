"use server";

import { validateAdminAction, validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { 
  inventoryAdjustmentSchema, 
  InventoryAdjustmentInput, 
  InventoryFilterInput,
  inventoryFilterSchema
} from "@/lib/validation/inventory";
import { OrderStatus } from "@/types/orders";
import { USER_ROLES } from "@/lib/auth/rbac";

/**
 * 조직별 SKU 기반 재고 현황 목록을 조회합니다.
 */
export async function getInventoryList(payload: InventoryFilterInput) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const validated = inventoryFilterSchema.parse(payload);
  const { page, pageSize, search, lowStockOnly } = validated;

  const isAdmin = profile.role === USER_ROLES.ZENITH_SUPER_ADMIN || profile.role === USER_ROLES.ADMIN;

  let query = supabase
    .from("zen_inventory")
    .select("*", { count: "exact" });

  if (!isAdmin && profile.org_id) {
    query = query.eq("org_id", profile.org_id);
  }

  if (search) {
    query = query.or(`sku_code.ilike.%${search}%,item_name.ilike.%${search}%`);
  }

  if (lowStockOnly) {
    // available_qty < min_stock_level
    // Note: available_qty is a generated column (on_hand_qty - reserved_qty)
    query = query.lt("available_qty", "min_stock_level");
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("sku_code", { ascending: true })
    .range(from, to);

  if (error) throw new Error(`Failed to fetch inventory: ${error.message}`);

  return {
    items: data || [],
    totalCount: count || 0,
  };
}

/**
 * 특정 재고 품목의 상세 변동 이력(원장)을 조회합니다.
 */
export async function getInventoryHistory(inventoryId: string) {
  const { supabase } = await validateUserAction();

  const { data, error } = await supabase
    .from("zen_inventory_history")
    .select('id, inventory_id, org_id, transaction_type, change_qty, result_qty, reference_id, remarks, created_by, created_at')
    .eq("inventory_id", inventoryId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch inventory history: ${error.message}`);
  
  return {
    success: true,
    data: data || []
  };
}

/**
 * 관리자에 의한 수동 재고 조정을 처리합니다.
 */
export async function adjustInventory(payload: InventoryAdjustmentInput) {
  try {
    const { supabase, user, profile } = await validateAdminAction();
    if (!profile) throw new Error("User profile not found");

    const validated = inventoryAdjustmentSchema.parse(payload);
    const { inventoryId, adjustmentQty, reason } = validated;

    // 1. 현재 재고 조회
    const { data: inventory, error: fetchError } = await supabase
      .from("zen_inventory")
      .select("on_hand_qty, org_id")
      .eq("id", inventoryId)
      .single();

    if (fetchError || !inventory) throw new Error("Inventory item not found");

    const newQty = inventory.on_hand_qty + adjustmentQty;
    if (newQty < 0) throw new Error("재고 수량은 0 미만이 될 수 없습니다.");

    // 2. 재고 수량 업데이트
    const { error: updateError } = await supabase
      .from("zen_inventory")
      .update({ 
        on_hand_qty: newQty,
        updated_at: new Date().toISOString()
      })
      .eq("id", inventoryId);

    if (updateError) throw new Error(`Update failed: ${updateError.message}`);

    // 3. 이력 기록
    const { error: historyError } = await supabase
      .from("zen_inventory_history")
      .insert({
        inventory_id: inventoryId,
        org_id: inventory.org_id,
        transaction_type: 'ADJUSTMENT',
        change_qty: adjustmentQty,
        result_qty: newQty,
        remarks: reason,
        created_by: user.id
      });

    if (historyError) {
      console.error("Failed to record inventory history:", historyError.message);
    }

    revalidatePath("/(dashboard)/inventory", "page");
    return { success: true, finalQty: newQty };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to adjust inventory" };
  }
}

/**
 * [Internal] 오더 상태 변경에 따른 재고 자동 처리
 * 이 함수는 orders.ts의 updateOrderStatus 등에서 호출됩니다.
 */
export async function syncInventoryFromOrder(
  orderId: string, 
  nextStatus: string, 
  itemDiff?: { sku: string; diff: number }[],
  prevStatus?: string
) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) return;

  // CANCELED 상태 전환 시, 이전 상태 파악이 필요하나 prevStatus가 생략된 경우 fallback 조회
  let resolvedPrevStatus = prevStatus;
  if (!resolvedPrevStatus && nextStatus === OrderStatus.CANCELED) {
    const { data: history } = await supabase
      .from("order_status_history")
      .select("prev_status")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (history) {
      resolvedPrevStatus = history.prev_status;
    }
  }

  // 1. 오더 아이템 조회
  const { data: items, error: itemsError } = await supabase
    .from("zen_order_items")
    .select("sku_code, quantity")
    .eq("order_id", orderId);

  if (itemsError || !items || items.length === 0) return;

  const skuCodes = items.filter(i => i.sku_code).map(i => i.sku_code);
  const { data: inventoryList } = skuCodes.length > 0 ? await supabase
    .from("zen_inventory")
    .select('id, sku_code, on_hand_qty, reserved_qty')
    .eq("org_id", profile.org_id)
    .in("sku_code", skuCodes) : { data: [] };
  const inventoryBySku = new Map(inventoryList?.map(i => [i.sku_code, i]) ?? []);

  for (const item of items) {
    if (!item.sku_code) continue;

    const inventory = inventoryBySku.get(item.sku_code);

    let updatePayload: any = {};
    let historyPayload: any = {
      inventory_id: inventory.id,
      org_id: profile.org_id,
      reference_id: orderId,
    };

    switch (nextStatus) {
      case OrderStatus.WAREHOUSED:
        // 입고 처리 (on_hand_qty 증가)
        updatePayload = { on_hand_qty: inventory.on_hand_qty + item.quantity };
        historyPayload = {
          ...historyPayload,
          transaction_type: 'INBOUND',
          change_qty: item.quantity,
          result_qty: inventory.on_hand_qty + item.quantity,
          remarks: `Order Warehoused: ${orderId}`
        };
        break;

      case OrderStatus.REGISTERED:
        // 재고 예약 (reserved_qty 증가)
        updatePayload = { reserved_qty: inventory.reserved_qty + item.quantity };
        historyPayload = {
          ...historyPayload,
          transaction_type: 'RESERVATION',
          change_qty: item.quantity,
          result_qty: inventory.on_hand_qty, // on_hand는 변하지 않음
          remarks: `Order Registered: ${orderId}`
        };
        break;

      case OrderStatus.RELEASED:
      case OrderStatus.IN_TRANSIT:
        // 출고 처리 (on_hand 차감 및 reserved 차감)
        updatePayload = { 
          on_hand_qty: inventory.on_hand_qty - item.quantity,
          reserved_qty: Math.max(0, inventory.reserved_qty - item.quantity)
        };
        historyPayload = {
          ...historyPayload,
          transaction_type: 'OUTBOUND',
          change_qty: -item.quantity,
          result_qty: inventory.on_hand_qty - item.quantity,
          remarks: `Order ${nextStatus}: ${orderId}`
        };
        break;

      case OrderStatus.CANCELED:
        // WAREHOUSED or PACKED 상태에서 취소 시: 입고/예약 동시 복구 (on_hand 차감, reserved 차감)
        if (resolvedPrevStatus === OrderStatus.WAREHOUSED || resolvedPrevStatus === OrderStatus.PACKED) {
          updatePayload = { 
            on_hand_qty: Math.max(0, inventory.on_hand_qty - item.quantity),
            reserved_qty: Math.max(0, inventory.reserved_qty - item.quantity) 
          };
          historyPayload = {
            ...historyPayload,
            transaction_type: 'ADJUSTMENT',
            change_qty: -item.quantity,
            result_qty: Math.max(0, inventory.on_hand_qty - item.quantity),
            remarks: `Order Cancelled (Warehoused/Packed Revert) from ${resolvedPrevStatus}: ${orderId}`
          };
        }
        // RELEASED, IN_TRANSIT, DELIVERED, CLAIMED 상태에서 취소 시: 출고 복구 (on_hand 가산, reserved 변동 없음)
        else if (
          resolvedPrevStatus === OrderStatus.RELEASED ||
          resolvedPrevStatus === OrderStatus.IN_TRANSIT ||
          resolvedPrevStatus === OrderStatus.DELIVERED ||
          resolvedPrevStatus === OrderStatus.CLAIMED
        ) {
          updatePayload = {
            on_hand_qty: inventory.on_hand_qty + item.quantity
          };
          historyPayload = {
            ...historyPayload,
            transaction_type: 'INBOUND',
            change_qty: item.quantity,
            result_qty: inventory.on_hand_qty + item.quantity,
            remarks: `Order Cancelled (Released/InTransit Revert) from ${resolvedPrevStatus}: ${orderId}`
          };
        }
        // 그 외 상태 (REGISTERED, SCHEDULED 등)에서 취소 시: 예약 취소 (reserved 감산)
        else {
          updatePayload = { 
            reserved_qty: Math.max(0, inventory.reserved_qty - item.quantity) 
          };
          historyPayload = {
            ...historyPayload,
            transaction_type: 'RESERVATION_CANCEL',
            change_qty: -item.quantity,
            result_qty: inventory.on_hand_qty,
            remarks: `Order Cancelled: ${orderId}`
          };
        }
        break;
      
      case 'UPDATED':
        // [WBS 2.4 보강] 수정 시 차이만큼 조정
        if (!itemDiff) continue;
        const diffItem = itemDiff.find(d => d.sku === item.sku_code);
        if (!diffItem || diffItem.diff === 0) continue;

        updatePayload = { 
          reserved_qty: inventory.reserved_qty + diffItem.diff 
        };
        historyPayload = {
          ...historyPayload,
          transaction_type: 'ADJUSTMENT',
          change_qty: diffItem.diff,
          result_qty: inventory.on_hand_qty,
          remarks: `Order Item Updated: ${orderId} (Diff: ${diffItem.diff})`
        };
        break;
      
      default:
        // 다른 상태는 재고 변동 없음
        continue;
    }

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from("zen_inventory").update(updatePayload).eq("id", inventory.id);
      await supabase.from("zen_inventory_history").insert(historyPayload);
    }
  }
}
