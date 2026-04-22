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

/**
 * 조직별 SKU 기반 재고 현황 목록을 조회합니다.
 */
export async function getInventoryList(payload: InventoryFilterInput) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const validated = inventoryFilterSchema.parse(payload);
  const { page, pageSize, search, lowStockOnly } = validated;

  let query = supabase
    .from("zen_inventory")
    .select("*", { count: "exact" })
    .eq("org_id", profile.org_id);

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
    .select(`
      *,
      created_by_profile:profiles!created_by(full_name)
    `)
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
  const { supabase, user, profile } = await validateAdminAction();
  if (!profile) throw new Error("User profile not found");

  const validated = inventoryAdjustmentSchema.parse(payload);
  const { inventoryId, adjustmentQty, reason } = validated;

  // 1. 현재 재고 조회
  const { data: inventory, error: fetchError } = await supabase
    .from("zen_inventory")
    .select("on_hand_qty")
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
      org_id: profile.org_id,
      transaction_type: 'ADJUSTMENT',
      change_qty: adjustmentQty,
      result_qty: newQty,
      remarks: reason,
      created_by: user.id
    });

  if (historyError) {
    console.error("Failed to record inventory history:", historyError);
  }

  revalidatePath("/(dashboard)/inventory", "page");
  return { success: true, finalQty: newQty };
}

/**
 * [Internal] 오더 상태 변경에 따른 재고 자동 처리
 * 이 함수는 orders.ts의 updateOrderStatus 등에서 호출됩니다.
 */
export async function syncInventoryFromOrder(
  orderId: string, 
  nextStatus: string, 
  itemDiff?: { sku: string; diff: number }[]
) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) return;

  // 1. 오더 아이템 조회
  const { data: items, error: itemsError } = await supabase
    .from("zen_order_items")
    .select("sku_code, quantity")
    .eq("order_id", orderId);

  if (itemsError || !items || items.length === 0) return;

  for (const item of items) {
    if (!item.sku_code) continue;

    // 2. SKU에 해당하는 인벤토리 조회
    const { data: inventory, error: invError } = await supabase
      .from("zen_inventory")
      .select("*")
      .eq("org_id", profile.org_id)
      .eq("sku_code", item.sku_code)
      .single();

    if (invError || !inventory) {
      console.warn(`Inventory not found for SKU: ${item.sku_code}`);
      continue;
    }

    let updatePayload: any = {};
    let historyPayload: any = {
      inventory_id: inventory.id,
      org_id: profile.org_id,
      reference_id: orderId,
    };

    switch (nextStatus) {
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
          remarks: `Order Released: ${orderId}`
        };
        break;

      case OrderStatus.CANCELLED:
        // 예약 취소 (reserved_qty 차감)
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
