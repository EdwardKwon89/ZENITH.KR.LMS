"use server";

import { logger } from '@/lib/logger';

import { validateAdminAction, validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { OrderRepository, AdminRepository } from "@/lib/repositories";
import { generateOrderNo, generateMasterOrderNo } from "../master";
import { OrderStatus } from "@/types/orders";
import { canChangeStatus, isOrderEditable } from "@/lib/logistics/status-machine";
import { UserRole, USER_ROLES } from "@/lib/auth/rbac";
import { generateInvoicesForOrder } from "../finance";

import { OrderRegistrationInput, orderRegistrationSchema } from "@/lib/validation/order";
import { generateTrackingHistory } from "@/lib/logistics/tracking";
import { syncInventoryFromOrder } from "./inventory";

/**
 * 신규 하우스 오더를 생성합니다. (Header -> Packages -> Items 계층형 저장)
 */
export async function createOrder(payload: OrderRegistrationInput) {
  const { supabase, user, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const validated = orderRegistrationSchema.parse(payload);

  const orderRepo = new OrderRepository(supabase);
  const { data: order, error: rpcError } = await orderRepo.createOrderViaRpc(validated, user.id, profile.org_id as string);

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

  const orderRepo = new OrderRepository(supabase);

  const { data: order, error: fetchError } = await orderRepo.findById(orderId);
  if (fetchError || !order) throw new Error("Order not found");
  if (!isOrderEditable(order.status as OrderStatus)) {
    throw new Error(`Order ${orderId} cannot be edited in status: ${order.status}`);
  }

  const { data: oldItems } = await orderRepo.getItemsByOrderId(orderId);

  const validated = orderRegistrationSchema.parse(payload);

  await orderRepo.updateHeader(orderId, {
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
  });

  await orderRepo.deleteItemsByOrderId(orderId);
  await orderRepo.deletePackagesByOrderId(orderId);

  if (validated.packages && validated.packages.length > 0) {
    for (const pkg of validated.packages) {
      const { data: packageData, error: pkgError } = await orderRepo.insertPackage({
        order_id: orderId,
        packing_unit: pkg.packing_unit,
        packing_count: pkg.packing_count,
        length: pkg.length,
        width: pkg.width,
        height: pkg.height,
        gross_weight: pkg.gross_weight,
        volume: pkg.volume,
        special_cargo_type: pkg.special_cargo_type ?? 'NONE',
      });

      if (pkgError || !packageData) continue;

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
          item_packing_unit: item.item_packing_unit,
        }));

        await orderRepo.insertItems(itemsToInsert);
      }
    }
  }

  const itemDiffs: { sku: string; diff: number }[] = [];
  const newItems: any[] = [];
  validated.packages.forEach(p => newItems.push(...p.items));

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

  const orderRepo = new OrderRepository(supabase);
  const adminRepo = new AdminRepository(supabase);

  let effectivePageSize = pageSize || 20;
  const { data: setting } = await adminRepo.findSettingByKey("default_page_size");
  if (setting) effectivePageSize = parseInt(setting.setting_value, 10);

  if (!profile) throw new Error("User profile not found");

  const userProfile = profile as any;
  const shipperId = userProfile.role === USER_ROLES.CORPORATE ? userProfile.org_id : undefined;
  const createdBy = userProfile.role === USER_ROLES.INDIVIDUAL ? user.id : undefined;

  const { data, error, count } = await orderRepo.findList({
    page,
    pageSize: effectivePageSize,
    status,
    order_type,
    transport_mode,
    search,
    shipperId,
    createdBy,
  });

  if (error) throw new Error(error.message);

  return {
    orders: data || [],
    totalCount: count || 0,
    page,
    pageSize: effectivePageSize,
  };
}

/**
 * 주문 상세 정보를 조회합니다. (계층형 데이터 포함)
 */
export async function getOrderDetails(orderId: string) {
  const { supabase } = await validateUserAction();

  const orderRepo = new OrderRepository(supabase);

  const { data: order, error: orderError } = await orderRepo.findByIdWithRelations(orderId);
  if (orderError) throw new Error(orderError.message);

  const { data: packages, error: pkgError } = await orderRepo.getPackagesByOrderId(orderId);
  if (pkgError) throw new Error(pkgError.message);

  const { data: items, error: itemsError } = await orderRepo.getItemsFullByOrderId(orderId);
  if (itemsError) throw new Error(itemsError.message);

  const packagesWithItems = packages.map(pkg => ({
    ...pkg,
    items: items.filter(item => item.package_id === pkg.id),
  }));

  const totalGrossWeight = packagesWithItems.reduce((sum, pkg) => {
    const cnt = pkg.packing_count || 1;
    return sum + (pkg.gross_weight || 0) * cnt;
  }, 0);
  const totalVolume = packagesWithItems.reduce((sum, pkg) => {
    const cnt = pkg.packing_count || 1;
    const vol = pkg.volume ?? (pkg.length && pkg.width && pkg.height
      ? (pkg.length * pkg.width * pkg.height) / 1000000
      : 0);
    return sum + vol * cnt;
  }, 0);

  return { ...order, packages: packagesWithItems, total_gross_weight: totalGrossWeight, total_volume: totalVolume };
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

  const orderRepo = new OrderRepository(supabase);

  const { data: orderData } = await orderRepo.getMasterOrderId(orderId);
  if (orderData?.master_order_id) {
    throw new Error("⚠️ 마스터 오더에 결합된 상태입니다. 수정을 위해 먼저 마스터를 해체(Dissolve)하십시오.");
  }

  const { data: currentOrder, error: fetchError } = await orderRepo.getStatus(orderId);
  if (fetchError || !currentOrder) throw new Error("Order not found");

  if (currentOrder.status === OrderStatus.REGISTERED && nextStatus === OrderStatus.SCHEDULED) {
    const orderCheck = await supabase
      .from('zen_orders')
      .select('route_option_id')
      .eq('id', orderId)
      .maybeSingle();
    const routeOptionId = orderCheck?.data?.route_option_id;
    if (!routeOptionId) {
      throw new Error('경로를 먼저 선택해야 일정 확정(SCHEDULED)이 가능합니다.');
    }
  }

  const validation = canChangeStatus(
    currentOrder.status as OrderStatus,
    nextStatus,
    profile.role as UserRole,
  );

  if (!validation.allowed) {
    throw new Error(validation.message || "상태 변경 권한이 없거나 유효하지 않은 전이입니다.");
  }

  // 3. 트랜잭션 처리 (RPC 호출)
  const { error: rpcError } = await supabase.rpc("update_order_status_atomic", {
    p_order_id: orderId,
    p_prev_status: currentOrder.status,
    p_next_status: nextStatus,
    p_reason: reason || null,
    p_user_id: user.id,
  });

  if (rpcError) throw new Error(`Update failed: ${rpcError.message}`);

  await Promise.all([
    nextStatus === OrderStatus.RELEASED
      ? generateInvoicesForOrder(orderId).catch(financeError => {
          logger.error("[CRITICAL] Finance automation failed during release:", financeError);
        })
      : Promise.resolve(),
    import("@/app/actions/notifications").then(async ({ triggerStatusChangeNotification }) => {
      await triggerStatusChangeNotification(orderId, nextStatus);
    }).catch(notifError => {
      logger.error("[ERROR] Notification trigger failed:", notifError);
    }),
    currentOrder?.transport_mode
      ? generateTrackingHistory(supabase, orderId, nextStatus, currentOrder.transport_mode).catch(trackError => {
          logger.error("[ERROR] Tracking simulation failed:", trackError);
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

  const orderRepo = new OrderRepository(supabase);

  const master_no = await generateMasterOrderNo(supabase);

  const { data: stats, error: statsError } = await orderRepo.getOrdersAggregation(payload.houseOrderIds);
  if (statsError) throw new Error(`Aggregation failed: ${statsError.message}`);

  const { data: master, error: masterError } = await orderRepo.insertMasterOrder({
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
    created_by: user.id,
  });

  if (masterError) throw new Error(`Master creation failed: ${masterError.message}`);

  const { error: bindingError } = await orderRepo.bindHouseOrders(master.id, payload.houseOrderIds, OrderStatus.MASTERED);
  if (bindingError) throw new Error(`Binding failed: ${bindingError.message}`);

  revalidatePath("/(dashboard)/logistics/master", "page");
  return master;
}

/**
 * [WBS 2.2] 마스터 오더를 해체(Dissolve)합니다.
 */
export async function dissolveMasterOrder(masterId: string) {
  const { supabase, user } = await validateUserAction();

  const orderRepo = new OrderRepository(supabase);

  const { error } = await orderRepo.dissolveMasterOrderAtomic(masterId, user.id);
  if (error) throw new Error(`Master dissolution failed: ${error.message}`);

  revalidatePath("/(dashboard)/logistics/master", "page");
  return { success: true };
}

/**
 * [WBS 2.2] 마스터 오더 목록을 조회합니다.
 */
export async function getMasterOrders(page = 1, pageSize = 50) {
  const { supabase } = await validateUserAction();

  const orderRepo = new OrderRepository(supabase);
  const { data, error, count } = await orderRepo.findMastersList(page, pageSize);

  if (error) throw new Error(error.message);
  return { masterOrders: data || [], total: count || 0 };
}

/**
 * [WBS 2.2] 마스터에 바인딩 가능한 하우스 오더 목록을 조회합니다.
 */
export async function getPendingHouseOrders(page = 1, pageSize = 50) {
  const { supabase } = await validateUserAction();

  const orderRepo = new OrderRepository(supabase);
  const { data, error, count } = await orderRepo.findPendingHouseOrders(page, pageSize);

  if (error) throw new Error(error.message);
  return { orders: data || [], total: count || 0 };
}

/**
 * [WBS 2.2] 마스터 오더의 상태를 업데이트합니다.
 */
export async function updateMasterOrderStatus(
  masterId: string,
  nextStatus: string,
  reason?: string
) {
  const { supabase, user } = await validateUserAction();

  const orderRepo = new OrderRepository(supabase);

  const { data: master } = await orderRepo.findMasterById(masterId);
  const prevStatus = master?.status ?? null;

  const { error: updateError } = await orderRepo.updateMasterStatus(masterId, nextStatus, reason);
  if (updateError) throw new Error(`Master status update failed: ${updateError.message}`);

  // IMP-051: Audit history (best-effort)
  void (async () => {
    const { error } = await supabase.from('zen_master_order_history').insert({
      master_order_id: masterId,
      prev_status: prevStatus,
      next_status: nextStatus,
      reason,
      changed_by: user.id,
    });
    if (error) logger.error('[AUDIT] Master order history insert failed:', error);
  })();

  if (nextStatus === 'CANCELED') {
    const { error: dissolveError } = await orderRepo.unbindHouseOrders(masterId, OrderStatus.REGISTERED);
    if (dissolveError) {
      logger.error("[ERROR] Auto-dissolve failed for master:", masterId, dissolveError);
    }
  }

  revalidatePath("/(dashboard)/logistics/master", "page");
  return { success: true };
}

/**
 * [WBS 2.2] 특정 마스터 오더 상세 정보와 소속된 하우스 오더 목록을 조회합니다.
 */
export async function getMasterOrderWithHouses(masterId: string, page = 1, pageSize = 50) {
  const { supabase } = await validateUserAction();

  const orderRepo = new OrderRepository(supabase);

  const { data: master, error: masterError } = await orderRepo.findMasterById(masterId);
  if (masterError || !master) {
    throw new Error(`Master order not found: ${masterError?.message}`);
  }

  const { data: houses, error: housesError, count } = await orderRepo.findHousesByMasterId(masterId, page, pageSize);
  if (housesError) throw new Error(`Failed to fetch linked houses: ${housesError.message}`);

  return {
    ...master,
    houses: houses || [],
    totalHouses: count || 0,
  };
}

/**
 * [WBS 2.1 / IMP-050] HELD 상태의 오더가 HELD로 전이되기 직전의 상태를 조회합니다.
 */
export async function getHeldPreviousStatus(orderId: string) {
  const { supabase } = await validateUserAction();
  const orderRepo = new OrderRepository(supabase);
  const { data, error } = await orderRepo.getHeldPreviousStatus(orderId);
  if (error) {
    logger.error('Failed to get HELD previous status:', error);
    return null;
  }
  return data?.prev_status || null;
}

/**
 * 바코드(오더 번호) 또는 ID로 오더를 검색하고 상세 품목 정보를 함께 조회합니다.
 */
export async function getOrderByBarcodeOrNo(barcodeOrNo: string) {
  const { supabase } = await validateUserAction();
  const orderRepo = new OrderRepository(supabase);

  // 1. UUID 형식인지 검사하여 ID 또는 order_no로 조회
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barcodeOrNo);

  let query = supabase
    .from('zen_orders')
    .select(`
      *,
      shipper:zen_organizations!shipper_id(name),
      origin_port:zen_ports!origin_port_id(name, code),
      dest_port:zen_ports!dest_port_id(name, code)
    `);

  if (isUuid) {
    query = query.eq('id', barcodeOrNo);
  } else {
    query = query.eq('order_no', barcodeOrNo);
  }

  const { data: order, error } = await query.maybeSingle();

  if (error) {
    logger.error('Failed to fetch order by barcode:', error);
    throw new Error(`오더 조회 실패: ${error.message}`);
  }

  if (!order) {
    return null;
  }

  // 2. 관련 패키지 및 품목(items) 정보 조회
  const { data: items, error: itemsError } = await orderRepo.getItemsFullByOrderId(order.id);
  if (itemsError) {
    logger.error('Failed to fetch order items:', itemsError);
    throw new Error(`오더 품목 조회 실패: ${itemsError.message}`);
  }

  const { data: packages, error: packagesError } = await supabase
    .from("zen_order_packages")
    .select("id, packing_unit, packing_count, domestic_ref_no, intl_ref_no, intl_ref_locked")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });
  if (packagesError) logger.error("Failed to fetch order packages:", packagesError);

  return {
    ...order,
    items: items || [],
    packages: packages || [],
  };
}

/**
 * 오더를 입고 확정 처리(WAREHOUSED 상태로 변경)하고 검수 결과를 기록합니다.
 */
export async function confirmInbound(
  orderId: string,
  inspectStatus: 'NORMAL' | 'DAMAGED',
  note?: string
) {
  const statusLabel = inspectStatus === 'NORMAL' ? '정상' : '손상';
  const formattedReason = `[검수: ${statusLabel}]${note ? ` ${note}` : ''}`;
  
  return updateOrderStatus(orderId, OrderStatus.WAREHOUSED, formattedReason);
}

/**
 * 오늘 하루 동안의 입고(WAREHOUSED) 처리 이력을 조회합니다. (KST 기준)
 */
export async function getTodayInboundHistory() {
  const { supabase } = await validateUserAction();

  // KST(GMT+9) 기준 오늘 00:00:00 ~ 23:59:59 계산 후 UTC 변환
  const now = new Date();
  const todayKst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  todayKst.setUTCHours(0, 0, 0, 0);
  const startUtc = new Date(todayKst.getTime() - 9 * 60 * 60 * 1000).toISOString();
  todayKst.setUTCHours(23, 59, 59, 999);
  const endUtc = new Date(todayKst.getTime() - 9 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('order_status_history')
    .select(`
      id,
      order_id,
      prev_status,
      next_status,
      reason,
      created_at,
      changed_by,
      order:zen_orders!order_id(
        order_no,
        shipper:zen_organizations!shipper_id(name)
      ),
      operator:zen_profiles!changed_by(full_name)
    `)
    .eq('next_status', 'WAREHOUSED')
    .gte('created_at', startUtc)
    .lte('created_at', endUtc)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch today inbound history:', error);
    throw new Error(`오늘의 입고 이력 조회 실패: ${error.message}`);
  }

  return data || [];
}
