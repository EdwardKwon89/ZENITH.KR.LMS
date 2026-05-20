"use server";

import { validateAdminAction, validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { generateOrderNo, generateMasterOrderNo } from "./master";
import { OrderStatus } from "@/types/orders";
import { canChangeStatus, isOrderEditable } from "@/lib/logistics/status-machine";
import { UserRole, USER_ROLES } from "@/lib/auth/rbac";
import { generateInvoicesForOrder } from "./finance";

import { OrderRegistrationInput, orderRegistrationSchema } from "@/lib/validation/order";
import { generateTrackingHistory } from "@/lib/logistics/tracking";
import { syncInventoryFromOrder } from "./inventory";

/**
 * 신규 하우스 오더를 생성합니다. (Header -> Packages -> Items 계층형 저장)
 */
export async function createOrder(payload: OrderRegistrationInput) {
  const { supabase, user, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  
  // 1. 데이터 검증 (Server-side validation)
  const validated = orderRegistrationSchema.parse(payload);

  // 2. 단일 Supabase RPC 호출로 원자적 트랜잭션 실행
  const { data: order, error: rpcError } = await supabase
    .rpc("create_order_atomic", {
      p_payload: validated,
      p_user_id: user.id,
      p_org_id: profile.org_id
    });

  if (rpcError) {
    throw new Error(`Order creation failed: ${rpcError.message}`);
  }

  revalidatePath("/(dashboard)/orders", "page");
  revalidatePath("/(dashboard)/inventory", "page");
  return order;
}

/**
 * [WBS 2.1 / Ds-11 3.7] 기존 오더를 수정하고 인벤토리를 재조정합니다.
 */
export async function updateOrder(orderId: string, payload: OrderRegistrationInput) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const { data: order } = await supabase
    .from("zen_orders")
    .select("status")
    .eq("id", orderId)
    .single();
  if (!order) throw new Error("Order not found");
  if (!isOrderEditable(order.status as OrderStatus)) {
    throw new Error(`Order ${orderId} cannot be edited in status: ${order.status}`);
  }

  // 1. 기존 오더 아이템 데이터 조회 (재고 차이 계산용)
  const { data: oldItems } = await supabase
    .from("zen_order_items")
    .select("sku_code, quantity")
    .eq("order_id", orderId);

  // 2. 검증 및 헤더 업데이트
  const validated = orderRegistrationSchema.parse(payload);
  const { error: orderError } = await supabase
    .from("zen_orders")
    .update({
      order_type: validated.order_type,
      shipper_id: validated.shipper_id,
      origin_port_id: validated.origin_port_id,
      dest_port_id: validated.dest_port_id,
      description: validated.description,
      shipper_contact_name: validated.shipper_contact_name,
      shipper_contact_phone: validated.shipper_contact_phone,
      recipient_name: validated.recipient_name,
      recipient_address: validated.recipient_address,
      recipient_phone: validated.recipient_phone,
      recipient_zipcode: validated.recipient_zipcode,
      recipient_pccc: validated.recipient_pccc,
      recipient_email: validated.recipient_email,
      delivery_notes: validated.delivery_notes,
      transport_mode: validated.transport_mode,
      estimated_cost: validated.estimated_cost,
      updated_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (orderError) throw new Error(`Order update failed: ${orderError.message}`);

  // 3. 기존 패키지 및 아이템 삭제 (단순화를 위한 Re-insert 방식, 실제 운영시에는 ID 기반 Update 권장)
  await supabase.from("zen_order_items").delete().eq("order_id", orderId);
  await supabase.from("zen_order_packages").delete().eq("order_id", orderId);

  // 4. 새로운 패키지 및 아이템 삽입
  if (validated.packages && validated.packages.length > 0) {
    for (const pkg of validated.packages) {
      const { data: packageData, error: pkgError } = await supabase
        .from("zen_order_packages")
        .insert({
          order_id: orderId,
          packing_unit: pkg.packing_unit,
          packing_count: pkg.packing_count,
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          gross_weight: pkg.gross_weight,
          volume: pkg.volume
        })
        .select('id, order_id, packing_unit, packing_count, length, width, height, gross_weight, volume')
        .single();

      if (pkgError) continue;

      if (pkg.items && pkg.items.length > 0) {
        const itemsToInsert = pkg.items.map(item => ({
          order_id: orderId,
          package_id: packageData.id,
          sku_code: item.sku_code,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency: item.currency || 'USD',
          hs_code: item.hs_code,
          item_packing_unit: item.item_packing_unit
        }));

        await supabase.from("zen_order_items").insert(itemsToInsert);
      }
    }
  }

  // 5. [Critical] 인벤토리 예약 수량 재조정 (Diff 계산)
  const itemDiffs: { sku: string; diff: number }[] = [];
  const newItems: any[] = [];
  validated.packages.forEach(p => newItems.push(...p.items));

  // 모든 SKU 후보군 추출
  const allSkus = Array.from(new Set([
    ...(oldItems?.map(i => i.sku_code) || []),
    ...newItems.map(i => i.sku_code)
  ])).filter(Boolean) as string[];

  for (const sku of allSkus) {
    const oldQty = oldItems?.filter(i => i.sku_code === sku).reduce((sum, i) => sum + i.quantity, 0) || 0;
    const newQty = newItems.filter(i => i.sku_code === sku).reduce((sum, i) => sum + i.quantity, 0) || 0;
    const diff = newQty - oldQty;
    if (diff !== 0) {
      itemDiffs.push({ sku, diff });
    }
  }

  if (itemDiffs.length > 0) {
    await syncInventoryFromOrder(orderId, 'UPDATED', itemDiffs);
  }

  revalidatePath("/(dashboard)/orders", "page");
  revalidatePath(`/(dashboard)/orders/${orderId}`, "page");
  return { success: true };
}

/**
 * 주문 목록을 조회합니다. (v2 수취인명 검색 지원)
 */
export async function getOrders({
  page = 1,
  pageSize,
  status,
  order_type,
  transport_mode,
  search
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  order_type?: string;
  transport_mode?: string;
  search?: string;
} = {}) {
  const { supabase, profile, user } = await validateUserAction();

  let effectivePageSize = pageSize || 20;
  const { data: setting } = await supabase
    .from("zen_system_settings")
    .select("setting_value")
    .eq("setting_key", "default_page_size")
    .single();
  
  if (setting) effectivePageSize = parseInt(setting.setting_value, 10);

  let query = supabase
    .from("zen_orders")
    .select(`
      *,
      shipper:zen_organizations!shipper_id(name),
      origin_port:zen_ports!origin_port_id(name, code),
      dest_port:zen_ports!dest_port_id(name, code)
    `, { count: "exact" });

  // 3. 권한별 필터링 (Role-based Filtering)
  if (!profile) throw new Error("User profile not found");

  const userProfile = profile as any; // 타입 캐스팅을 통한 속성 접근 허용 (v2)
  if (userProfile.role === USER_ROLES.CORPORATE) {
    query = query.eq("shipper_id", userProfile.org_id);
  } else if (userProfile.role === USER_ROLES.INDIVIDUAL) {
    query = query.eq("created_by", user.id);
  }

  if (status) query = query.eq("status", status);
  if (order_type) query = query.eq("order_type", order_type);

  // [v2.1] transport_mode 필터링 지원
  if (transport_mode) {
    query = query.eq("transport_mode", transport_mode);
  }

  if (search) query = query.or(`order_no.ilike.%${search}%,recipient_name.ilike.%${search}%`);

  const from = (page - 1) * effectivePageSize;
  const to = from + effectivePageSize - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    orders: data || [],
    totalCount: count || 0,
    page,
    pageSize: effectivePageSize
  };
}

/**
 * 주문 상세 정보를 조회합니다. (계층형 데이터 포함)
 */
export async function getOrderDetails(orderId: string) {
  const { supabase } = await validateUserAction();
  
  const { data: order, error: orderError } = await supabase
    .from("zen_orders")
    .select(`
      *,
      shipper:zen_organizations!shipper_id(*),
      origin_port:zen_ports!origin_port_id(*),
      dest_port:zen_ports!dest_port_id(*)
    `)
    .eq("id", orderId)
    .single();

  if (orderError) throw new Error(orderError.message);

  // 계층형 데이터 로드: Packages -> Items
  const { data: packages, error: pkgError } = await supabase
    .from("zen_order_packages")
    .select('id, order_id, packing_unit, packing_count, length, width, height, gross_weight, volume, remarks, created_at')
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (pkgError) throw new Error(pkgError.message);

  const { data: items, error: itemsError } = await supabase
    .from("zen_order_items")
    .select('id, order_id, package_id, sku_code, item_name, quantity, unit_price, currency, hs_code, item_packing_unit, volume, weight')
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  // 데이터 가공: 각 패키지에 소속 아이템 매핑
  const packagesWithItems = packages.map(pkg => ({
    ...pkg,
    items: items.filter(item => item.package_id === pkg.id)
  }));

  return { ...order, packages: packagesWithItems };
}

/**
 * 오더의 상태를 업데이트하고 히스토리를 기록합니다.
 */
export async function updateOrderStatus(
  orderId: string, 
  nextStatus: OrderStatus, 
  reason?: string
) {
  const { supabase, user, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  // [WBS 2.2] Immutable Guard: 마스터 결합 상태 확인 (최우선 순위)
  // 304_GS1_128 설계 규정: 마스터에 결합된 오더는 개별 상태 변경을 금지함
  const { data: orderData, error: masterCheckError } = await supabase
    .from("zen_orders")
    .select("master_order_id")
    .eq("id", orderId)
    .maybeSingle(); // single() 대신 maybeSingle()을 사용하여 데이터 부재 시 null 반환 처리

  if (masterCheckError) {
    console.error("[ERROR] Failed to check master connection:", masterCheckError);
  }

  if (orderData?.master_order_id) {
    throw new Error("⚠️ 마스터 오더에 결합된 상태입니다. 수정을 위해 먼저 마스터를 해체(Dissolve)하십시오.");
  }

  // 1. 현재 상태 조회
  const { data: currentOrder, error: fetchError } = await supabase
    .from("zen_orders")
    .select("status, transport_mode")
    .eq("id", orderId)
    .single();

  if (fetchError || !currentOrder) throw new Error("Order not found");

  // 2. 상태 전이 검증 (Status Machine)
  const validation = canChangeStatus(
    currentOrder.status as OrderStatus, 
    nextStatus, 
    profile.role as UserRole
  );

  if (!validation.allowed) {
    throw new Error(validation.message || "상태 변경 권한이 없거나 유효하지 않은 전이입니다.");
  }

  // 3. 트랜잭션 처리 (RPC 또는 개별 호출)
  // 3.1 오더 상태 업데이트
  const { error: updateError } = await supabase
    .from("zen_orders")
    .update({ status: nextStatus })
    .eq("id", orderId);

  if (updateError) throw new Error(`Update failed: ${updateError.message}`);

  // 3.2 히스토리 기록
  const { error: historyError } = await supabase
    .from("order_status_history")
    .insert({
      order_id: orderId,
      prev_status: currentOrder.status,
      next_status: nextStatus,
      reason: reason,
      changed_by: user.id
    });

  if (historyError) {
    console.error("[ERROR] History recording failed:", historyError);
  }

  // [WBS 2.4~6] 독립 후속 작업 병렬 실행 (IMP-054 N+1 최적화: 순차→Promise.all)
  await Promise.all([
    syncInventoryFromOrder(orderId, nextStatus, undefined, currentOrder.status).catch(invError => {
      console.error("[ERROR] Inventory sync failed:", invError);
    }),
    nextStatus === OrderStatus.RELEASED
      ? generateInvoicesForOrder(orderId).catch(financeError => {
          console.error("[CRITICAL] Finance automation failed during release:", financeError);
        })
      : Promise.resolve(),
    import("@/app/actions/notifications").then(async ({ triggerStatusChangeNotification }) => {
      await triggerStatusChangeNotification(orderId, nextStatus);
    }).catch(notifError => {
      console.error("[ERROR] Notification trigger failed:", notifError);
    }),
    currentOrder?.transport_mode
      ? generateTrackingHistory(supabase, orderId, nextStatus, currentOrder.transport_mode).catch(trackError => {
          console.error("[ERROR] Tracking simulation failed:", trackError);
        })
      : Promise.resolve(),
  ]);

  revalidatePath("/(dashboard)/orders", "page");
  revalidatePath(`/(dashboard)/orders/${orderId}`, "page");

  return { success: true };
}

/**
 * [WBS 2.2] 마스터 오더를 생성하고 하우스 오더들을 바인딩합니다.
 */
export async function createMasterOrder(payload: {
  houseOrderIds: string[];
  carrier_id?: string;
  vessel_flight_no?: string;
  origin_port_id?: string;
  dest_port_id?: string;
  remarks?: string;
}) {
  const { supabase, user } = await validateUserAction();

  // 1. 마스터 번호 생성
  const master_no = await generateMasterOrderNo(supabase);

  // 2. 하부 오더들의 합산 중량/량 계산
  const { data: stats, error: statsError } = await supabase
    .rpc('get_orders_aggregation', { order_ids: payload.houseOrderIds });

  if (statsError) throw new Error(`Aggregation failed: ${statsError.message}`);

  // 3. 마스터 오더 삽입
  const { data: master, error: masterError } = await supabase
    .from("zen_master_orders")
    .insert({
      master_no,
      status: 'CREATED',
      total_house_count: payload.houseOrderIds.length,
      total_gross_weight: stats?.[0]?.total_weight || 0,
      total_volume: stats?.[0]?.total_volume || 0,
      carrier_id: payload.carrier_id,
      vessel_flight_no: payload.vessel_flight_no,
      origin_port_id: payload.origin_port_id,
      dest_port_id: payload.dest_port_id,
      remarks: payload.remarks,
      created_by: user.id
    })
    .select('id, master_no, status, total_house_count, total_gross_weight, total_volume, carrier_id, vessel_flight_no, origin_port_id, dest_port_id, remarks, created_by')
    .single();

  if (masterError) throw new Error(`Master creation failed: ${masterError.message}`);

  // 4. 하우스 오더들에 마스터 ID 바인딩 및 상태 변경 (MASTERED)
  const { error: bindingError } = await supabase
    .from("zen_orders")
    .update({ 
      master_order_id: master.id,
      status: OrderStatus.MASTERED 
    })
    .in("id", payload.houseOrderIds);

  if (bindingError) throw new Error(`Binding failed: ${bindingError.message}`);

  revalidatePath("/(dashboard)/logistics/master", "page");
  return master;
}

/**
 * [WBS 2.2] 마스터 오더를 해체(Dissolve)합니다.
 * 하위 하우스 오더들을 다시 수정 가능 상태(PACKED)로 복구합니다.
 */
export async function dissolveMasterOrder(masterId: string) {
  const { supabase } = await validateUserAction();

  // 1. 바인딩된 하우스 오더 복구 (수정 가능하게 NULL 처리 및 상태 원복)
  const { error: unbindingError } = await supabase
    .from("zen_orders")
    .update({ 
      master_order_id: null,
      status: OrderStatus.REGISTERED // 해체 시 초기 등록 상태로 복구 (재스케줄링 유도)
    })
    .eq("master_order_id", masterId);

  if (unbindingError) throw new Error(`Unbinding failed: ${unbindingError.message}`);

  // 2. 마스터 오더 삭제
  const { error: deleteError } = await supabase
    .from("zen_master_orders")
    .delete()
    .eq("id", masterId);

  if (deleteError) throw new Error(`Master deletion failed: ${deleteError.message}`);

  revalidatePath("/(dashboard)/logistics/master", "page");
  return { success: true };
}

/**
 * [WBS 2.2] 마스터 오더 목록을 조회합니다.
 */
export async function getMasterOrders() {
  const { supabase } = await validateUserAction();
  
  const { data, error } = await supabase
    .from("zen_master_orders")
    .select(`
      *,
      origin_port:zen_ports!origin_port_id(code, name),
      dest_port:zen_ports!dest_port_id(code, name),
      carrier:zen_organizations!carrier_id(name, iata_code)
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * [WBS 2.2] 마스터에 바인딩 가능한 하우스 오더 목록을 조회합니다.
 * (PACKED 상태이며 master_order_id가 없는 오더 대상)
 */
export async function getPendingHouseOrders() {
  const { supabase } = await validateUserAction();

  const { data, error } = await supabase
    .from("zen_orders")
    .select(`
      *,
      shipper:zen_organizations!shipper_id(name),
      origin_port:zen_ports!origin_port_id(code, name),
      dest_port:zen_ports!dest_port_id(code, name)
    `)
    .eq("status", OrderStatus.PACKED)
    .is("master_order_id", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * [WBS 2.2] 마스터 오더의 상태를 업데이트합니다.
 * 'CANCELED' 상태로 변경 시, 하위 하우스 오더들을 자동으로 해체(Dissolve)합니다.
 */
export async function updateMasterOrderStatus(
  masterId: string,
  nextStatus: string,
  reason?: string
) {
  const { supabase } = await validateUserAction();

  // 1. 상태 업데이트
  const { error: updateError } = await supabase
    .from("zen_master_orders")
    .update({ 
      status: nextStatus,
      remarks: reason ? `[Status Change: ${nextStatus}] ${reason}` : undefined 
    })
    .eq("id", masterId);

  if (updateError) throw new Error(`Master status update failed: ${updateError.message}`);

  // 2. [Auto-Dissolve Policy] 취소 시 자동 해체
  if (nextStatus === 'CANCELED') {
    const { error: dissolveError } = await supabase
      .from("zen_orders")
      .update({ 
        master_order_id: null,
        status: OrderStatus.REGISTERED // 취소 시 초기 상태로 복구하여 재작업 가능케 함
      })
      .eq("master_order_id", masterId);

    if (dissolveError) {
      console.error("[ERROR] Auto-dissolve failed for master:", masterId, dissolveError);
    }
  }

  revalidatePath("/(dashboard)/logistics/master", "page");
  return { success: true };
}

/**
 * [WBS 2.2] 특정 마스터 오더 상세 정보와 소속된 하우스 오더 목록을 조회합니다.
 * 감사 및 출력(Label/Manifest)을 위해 사용됩니다.
 */
export async function getMasterOrderWithHouses(masterId: string) {
  const { supabase } = await validateUserAction();

  // 1. 마스터 본체 조회
  const { data: master, error: masterError } = await supabase
    .from("zen_master_orders")
    .select(`
      *,
      origin_port:zen_ports!origin_port_id(code, name),
      dest_port:zen_ports!dest_port_id(code, name),
      carrier:zen_organizations!carrier_id(name, iata_code)
    `)
    .eq("id", masterId)
    .single();

  if (masterError || !master) {
    throw new Error(`Master order not found: ${masterError?.message}`);
  }

  // 2. 소속된 하우스 오더 목록 조회
  const { data: houses, error: housesError } = await supabase
    .from("zen_orders")
    .select(`
      *,
      shipper:zen_organizations!shipper_id(name),
      origin_port:zen_ports!origin_port_id(code, name),
      dest_port:zen_ports!dest_port_id(code, name)
    `)
    .eq("master_order_id", masterId);

  if (housesError) throw new Error(`Failed to fetch linked houses: ${housesError.message}`);

  return {
    ...master,
    houses: houses || []
  };
}
