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
import { createAdminClient } from '@/utils/supabase/server';
import { syncInventoryFromOrder } from "./inventory";
import { estimateUpsFreight as estimateUpsFreightFn } from "@/app/actions/ups/freight";

interface SaveOrderRateSnapshotParams {
  supabase: any;
  orderId: string;
  validated: OrderRegistrationInput;
  profile: { org_id: string | null; role: string };
  agencyOrgId?: string | null;
  estimateFn: typeof estimateUpsFreightFn;
}

export async function saveOrderRateSnapshot({
  supabase, orderId, validated, profile, agencyOrgId, estimateFn,
}: SaveOrderRateSnapshotParams) {
  try {
    const { data: product } = await supabase
      .from('zen_ups_products')
      .select('id')
      .eq('product_code', validated.ups_product_code)
      .maybeSingle();

    if (!product) return;

    const totalWeight = validated.packages.reduce(
      (sum, pkg) => sum + (pkg.gross_weight || 0), 0
    );

    const { data: port } = await supabase
      .from('zen_ports')
      .select('country_code')
      .eq('id', validated.dest_port_id)
      .maybeSingle();

    const destCountryCode = validated.recipient_country_code || port?.country_code;

    if (!(totalWeight > 0 && destCountryCode)) return;

    const estimate = await estimateFn({
      productId: product.id,
      destCountryCode,
      actualWeightKg: totalWeight,
      dimL: validated.packages[0]?.length,
      dimW: validated.packages[0]?.width,
      dimH: validated.packages[0]?.height,
      incoterms: validated.incoterms,
      agencyOrgId: agencyOrgId ?? undefined,
      shipperOrgId: profile.org_id,
    });

    const { error: snapError } = await supabase
      .from('zen_order_rate_snapshots')
      .insert({
        order_id: orderId,
        applied_unit_price: estimate.platform.totalSellingPrice,
        applied_currency: estimate.platform.currency ?? 'USD',
        applied_rule: 'UPS_3TIER',
        metadata: estimate as unknown as Record<string, unknown>,
      });
    if (snapError) {
      logger.error('[SNAPSHOT] Failed to insert rate snapshot:', snapError);
    }
  } catch (err) {
    logger.error('[SNAPSHOT] Failed to save rate snapshot:', err);
  }
}

/**
 * 신규 하우스 오더를 생성합니다. (Header -> Packages -> Items 계층형 저장)
 */
export async function createOrder(payload: OrderRegistrationInput) {
  const { supabase, user, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const validated = orderRegistrationSchema.parse(payload);
  if (validated.delivery_method === 'DIRECT') {
    delete (validated as any).pickup_location;
    delete (validated as any).pickup_contact_name;
    delete (validated as any).pickup_contact_tel;
  }

  const orderRepo = new OrderRepository(supabase);
  const { data: order, error: rpcError } = await orderRepo.createOrderViaRpc(validated, user.id, profile.org_id as string);

  if (rpcError) {
    throw new Error(`Order creation failed: ${rpcError.message}`);
  }

  const orderId = (order as any)?.id;
  if (!orderId) throw new Error("Order creation returned no ID");

  if (validated.transport_mode === 'UPS') {
    const adminClient = await createAdminClient();
    const { error: trackingConfigError } = await adminClient
      .from('zen_tracking_configs')
      .update({ provider_type: 'MANUAL', provider_name: 'MANUAL', tracking_no: null })
      .eq('order_id', orderId);
    if (trackingConfigError) {
      logger.error('[TRACKING_CONFIG] Failed to set UPS provider_type:', trackingConfigError);
    }
  }

  const updates: Record<string, unknown> = {};

  let resolvedAgencyOrgId: string | null = null;
  if (profile.role === USER_ROLES.AGENCY_SHIPPER) {
    const { data: agencyLink } = await supabase
      .from('zen_agency_shippers')
      .select('agency_org_id')
      .eq('shipper_org_id', profile.org_id as string)
      .eq('is_active', true)
      .maybeSingle();
    resolvedAgencyOrgId = agencyLink?.agency_org_id ?? null;
    if (resolvedAgencyOrgId) {
      updates.agency_org_id = resolvedAgencyOrgId;
    }
  }

  // ups_product_code/incoterms는 RPC v5 INSERT에서 직접 저장 — 조건부 UPDATE 제거 (Issue #489)
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('zen_orders')
      .update(updates)
      .eq('id', orderId);
    if (updateError) {
      logger.error('[ORDER] Failed to update supplemental fields:', updateError);
    }
  }

  if (profile.role === USER_ROLES.AGENCY_SHIPPER && validated.ups_product_code) {
    await saveOrderRateSnapshot({ supabase, orderId, validated, profile, agencyOrgId: resolvedAgencyOrgId, estimateFn: estimateUpsFreightFn });
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
    delivery_method: validated.delivery_method ?? 'DIRECT',
    pickup_location: validated.delivery_method === 'PICKUP' ? (validated.pickup_location ?? null) : null,
    pickup_contact_name: validated.delivery_method === 'PICKUP' ? (validated.pickup_contact_name ?? null) : null,
    pickup_contact_tel: validated.delivery_method === 'PICKUP' ? (validated.pickup_contact_tel ?? null) : null,
    pickup_country_code: validated.delivery_method === 'PICKUP' ? (validated.pickup_country_code ?? null) : null,
    pickup_state_province: validated.delivery_method === 'PICKUP' ? (validated.pickup_state_province ?? null) : null,
    pickup_city: validated.delivery_method === 'PICKUP' ? (validated.pickup_city ?? null) : null,
    pickup_address: validated.delivery_method === 'PICKUP' ? (validated.pickup_address ?? null) : null,
    pickup_address_detail: validated.delivery_method === 'PICKUP' ? (validated.pickup_address_detail ?? null) : null,
    pickup_zipcode: validated.delivery_method === 'PICKUP' ? (validated.pickup_zipcode ?? null) : null,
    shipper_address: validated.shipper_address,
    shipper_country_code: validated.shipper_country_code,
    shipper_state_province: validated.shipper_state_province,
    shipper_city: validated.shipper_city,
    shipper_address_detail: validated.shipper_address_detail,
    shipper_zipcode: validated.shipper_zipcode,
    shipper_biz_no: validated.shipper_biz_no,
    recipient_country_code: validated.recipient_country_code,
    recipient_state_province: validated.recipient_state_province,
    recipient_city: validated.recipient_city,
    recipient_address_local: validated.recipient_address_local,
    ups_product_code: validated.ups_product_code,
    incoterms: validated.incoterms,
    ups_service_family: validated.ups_service_family,
  });

  await orderRepo.deleteItemsByOrderId(orderId);
  await orderRepo.deletePackagesByOrderId(orderId);

  if (validated.packages && validated.packages.length > 0) {
    for (const pkg of validated.packages) {
      const { data: packageData, error: pkgError } = await orderRepo.insertPackage({
        order_id: orderId,
        packing_unit: pkg.packing_unit,
        packing_count: pkg.packing_count,
        physical_box_count: pkg.physical_box_count ?? 1,
        length: pkg.length,
        width: pkg.width,
        height: pkg.height,
        gross_weight: pkg.gross_weight,
        volume: pkg.volume,
        special_cargo_type: pkg.special_cargo_type ?? 'NONE',
        content_type: pkg.content_type ?? 'GENERAL',
        domestic_ref_no: pkg.domestic_ref_no ?? null,
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
    return sum + (pkg.gross_weight || 0);
  }, 0);
  const totalVolume = packagesWithItems.reduce((sum, pkg) => {
    const vol = pkg.volume ?? (pkg.length && pkg.width && pkg.height
      ? (pkg.length * pkg.width * pkg.height) / 1000000
      : 0);
    return sum + vol;
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

  if (currentOrder.status === OrderStatus.REGISTERED && nextStatus === OrderStatus.SCHEDULED && currentOrder.transport_mode !== 'UPS') {
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
 * 바코드(오더 번호) 또는 ID, 또는 Local Tracking No(패키지 domestic_ref_no)로 오더를 검색하고
 * 상세 품목 정보를 함께 조회합니다.
 */
export async function getOrderByBarcodeOrNo(barcodeOrNo: string) {
  const { supabase } = await validateUserAction();
  const orderRepo = new OrderRepository(supabase);

  // 1. UUID 형식인지 검사
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barcodeOrNo);

  let orderId: string | null = null;

  if (isUuid) {
    orderId = barcodeOrNo;
  } else {
    const { data: byOrderNo } = await supabase
      .from('zen_orders')
      .select('id')
      .eq('order_no', barcodeOrNo)
      .maybeSingle();

    if (byOrderNo) {
      orderId = byOrderNo.id;
    } else {
      // 2차: Local Tracking No(domestic_ref_no)로 조회 — 패키지 단위 필드라 zen_order_packages에서 조회
      const { data: byLocalTracking } = await supabase
        .from('zen_order_packages')
        .select('order_id')
        .eq('domestic_ref_no', barcodeOrNo)
        .maybeSingle();

      if (byLocalTracking) {
        orderId = byLocalTracking.order_id;
      }
    }
  }

  if (!orderId) {
    return null;
  }

  const { data: order, error } = await supabase
    .from('zen_orders')
    .select(`
      *,
      shipper:zen_organizations!shipper_id(name),
      origin_port:zen_ports!origin_port_id(name, code),
      dest_port:zen_ports!dest_port_id(name, code),
      order_packages:zen_order_packages(id, order_id, packing_unit, packing_count, length, width, height, gross_weight, volume)
    `)
    .eq('id', orderId)
    .maybeSingle();

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

  // 3. 현재 운임 스냅샷 조회 (예상운임 상시 표시용)
  const { data: rateSnapshot } = await supabase
    .from('zen_order_rate_snapshots')
    .select('applied_unit_price, applied_currency')
    .eq('order_id', order.id)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ...order,
    items: items || [],
    packages: (order as any).order_packages || [],
    currentFreight: rateSnapshot
      ? { amount: rateSnapshot.applied_unit_price, currency: rateSnapshot.applied_currency }
      : null,
  };
}

export interface PackageMeasurementUpdate {
  packageId: string;
  gross_weight?: number;
  length?: number;
  width?: number;
  height?: number;
}

export interface FreightEstimateResult {
  changed: boolean;
  oldFreight?: number;
  newFreight?: number;
  currency?: string;
}

async function applyPackageMeasurements(
  supabase: any,
  profile: { id: string; email?: string | null },
  orderId: string,
  packageUpdates: PackageMeasurementUpdate[],
): Promise<FreightEstimateResult> {
  let weightVolumeChanged = false;
  let oldFreight: number | undefined;
  let newFreight: number | undefined;
  let currency: string | undefined;

  const { data: existingSnapshot } = await supabase
    .from('zen_order_rate_snapshots')
    .select('metadata, applied_unit_price')
    .eq('order_id', orderId)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const previousSnapshot = existingSnapshot;

  const { data: orderMeta } = await supabase
    .from('zen_orders')
    .select('status, transport_mode, ups_product_code, dest_port_id, recipient_country_code, incoterms, shipper_id, order_no, agency_org_id')
    .eq('id', orderId)
    .maybeSingle();

  for (const pkg of packageUpdates) {
    const { data: currentPkg } = await supabase
      .from('zen_order_packages')
      .select('gross_weight, length, width, height')
      .eq('id', pkg.packageId)
      .maybeSingle();

    if (!currentPkg) continue;

    const changed =
      (pkg.gross_weight !== undefined && pkg.gross_weight !== currentPkg.gross_weight) ||
      (pkg.length !== undefined && pkg.length !== currentPkg.length) ||
      (pkg.width !== undefined && pkg.width !== currentPkg.width) ||
      (pkg.height !== undefined && pkg.height !== currentPkg.height);

    if (changed) {
      weightVolumeChanged = true;

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (pkg.gross_weight !== undefined) updateData.gross_weight = pkg.gross_weight;
      if (pkg.length !== undefined) updateData.length = pkg.length;
      if (pkg.width !== undefined) updateData.width = pkg.width;
      if (pkg.height !== undefined) updateData.height = pkg.height;

      await supabase.from('zen_order_packages').update(updateData).eq('id', pkg.packageId);

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        new_status: orderMeta?.status ?? null,
        changed_by: profile.id,
        reason: `[입고 측정 변경] ${pkg.packageId.substring(0, 8)}: 중량 ${currentPkg.gross_weight}kg→${pkg.gross_weight ?? currentPkg.gross_weight}kg, 크기 ${currentPkg.length}x${currentPkg.width}x${currentPkg.height}cm→${pkg.length ?? currentPkg.length}x${pkg.width ?? currentPkg.width}x${pkg.height ?? currentPkg.height}cm`,
      });
    }
  }

  if (weightVolumeChanged && orderMeta?.transport_mode === 'UPS' && orderMeta.ups_product_code) {
    try {
      const { data: packages } = await supabase
        .from('zen_order_packages')
        .select('gross_weight, length, width, height')
        .eq('order_id', orderId);

      if (packages && packages.length > 0) {
        const totalWeight = packages.reduce((sum: number, p: any) => sum + (p.gross_weight || 0), 0);

        const { data: product } = await supabase
          .from('zen_ups_products')
          .select('id')
          .eq('product_code', orderMeta.ups_product_code)
          .maybeSingle();

        let destCountryCode = orderMeta.recipient_country_code;
        if (!destCountryCode && orderMeta.dest_port_id) {
          const { data: port } = await supabase
            .from('zen_ports')
            .select('country_code')
            .eq('id', orderMeta.dest_port_id)
            .maybeSingle();
          destCountryCode = port?.country_code;
        }

        if (product && destCountryCode && totalWeight > 0) {
          const newEstimate = await estimateUpsFreightFn({
            productId: product.id,
            destCountryCode,
            actualWeightKg: totalWeight,
            dimL: packages[0]?.length,
            dimW: packages[0]?.width,
            dimH: packages[0]?.height,
            incoterms: orderMeta.incoterms,
            agencyOrgId: orderMeta.agency_org_id,
            shipperOrgId: orderMeta.shipper_id,
          });

          if (previousSnapshot) {
            await supabase
              .from('zen_order_rate_snapshots')
              .update({
                applied_unit_price: newEstimate.platform.totalSellingPrice,
                metadata: newEstimate as unknown as Record<string, unknown>,
              })
              .eq('order_id', orderId);
          } else {
            await supabase
              .from('zen_order_rate_snapshots')
              .insert({
                order_id: orderId,
                applied_unit_price: newEstimate.platform.totalSellingPrice,
                applied_currency: newEstimate.platform.currency ?? 'USD',
                applied_rule: 'UPS_3TIER',
                metadata: newEstimate as unknown as Record<string, unknown>,
              });
          }

          oldFreight = previousSnapshot?.metadata?.platform?.totalSellingPrice || 0;
          newFreight = newEstimate.platform.totalSellingPrice;
          currency = newEstimate.platform.currency ?? 'USD';

          if (oldFreight !== newFreight) {
            try {
              const { data: shipper } = await supabase
                .from('zen_organizations')
                .select('name')
                .eq('id', orderMeta.shipper_id)
                .maybeSingle();

              if (shipper) {
                await import('@/lib/notifications/email').then(mod =>
                  mod.sendFreightChangeEmail({
                    email: profile.email || '',
                    shipperName: shipper.name || '화주',
                    orderNo: orderMeta.order_no || orderId.substring(0, 8),
                    oldFreight: oldFreight!,
                    newFreight: newFreight!,
                    currency: currency ?? 'USD',
                    reason: `입고 시 부피/중량 재측정 (중량: ${totalWeight}kg)`,
                  })
                );
              }
            } catch (emailErr) {
              logger.warn('[INBOUND] Failed to send freight change email:', emailErr);
            }
          }
        }
      }
    } catch (snapErr) {
      logger.error('[INBOUND] Failed to recalculate rate snapshot:', snapErr);
    }
  }

  return { changed: weightVolumeChanged, oldFreight, newFreight, currency };
}

/**
 * 오더를 입고 확정 처리(WAREHOUSED 상태로 변경)하고 검수 결과를 기록합니다.
 * 입고 시 부피/중량을 수정할 수 있으며, 변경 시 운임 스냅샷이 재계산됩니다.
 */
export async function confirmInbound(
  orderId: string,
  inspectStatus: 'NORMAL' | 'DAMAGED',
  note?: string,
  packageUpdates?: PackageMeasurementUpdate[]
) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const statusLabel = inspectStatus === 'NORMAL' ? '정상' : '손상';
  const formattedReason = `[검수: ${statusLabel}]${note ? ` ${note}` : ''}`;

  let freightEstimate: FreightEstimateResult | undefined;
  if (packageUpdates && packageUpdates.length > 0) {
    freightEstimate = await applyPackageMeasurements(supabase, profile, orderId, packageUpdates);
  }

  const result = await updateOrderStatus(orderId, OrderStatus.WAREHOUSED, formattedReason);
  return { ...result, freightEstimate };
}

/**
 * 입고 시 부피/중량 실측값만 별도로 저장합니다(상태 전이 없음).
 * UPS 오더의 경우 운임 스냅샷이 재계산됩니다.
 */
export async function saveInboundMeasurements(
  orderId: string,
  packageUpdates: PackageMeasurementUpdate[]
) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  if (!packageUpdates || packageUpdates.length === 0) {
    return { success: false, error: '변경된 측정값이 없습니다.' };
  }

  const freightEstimate = await applyPackageMeasurements(supabase, profile, orderId, packageUpdates);
  revalidatePath("/(dashboard)/warehouse/inbound", "page");
  return { success: true, freightEstimate };
}

/**
 * order_status_history.changed_by는 auth.users FK라 PostgREST가 zen_profiles를
 * 자동으로 embed하지 못한다(PGRST200) — 별도 조회 후 병합.
 */
export async function attachOperatorNames<T extends { changed_by: string | null }>(
  supabase: any,
  rows: T[]
): Promise<(T & { operator: { full_name: string } | null })[]> {
  const ids = [...new Set(rows.map((r) => r.changed_by).filter(Boolean))];
  if (ids.length === 0) {
    return rows.map((r) => ({ ...r, operator: null }));
  }

  const { data: profiles } = await supabase
    .from('zen_profiles')
    .select('id, full_name')
    .in('id', ids);

  const nameById = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

  return rows.map((r) => ({
    ...r,
    operator: r.changed_by && nameById.has(r.changed_by)
      ? { full_name: nameById.get(r.changed_by) as string }
      : null,
  }));
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
      )
    `)
    .eq('next_status', 'WAREHOUSED')
    .gte('created_at', startUtc)
    .lte('created_at', endUtc)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch today inbound history:', error);
    throw new Error(`오늘의 입고 이력 조회 실패: ${error.message}`);
  }

  return attachOperatorNames(supabase, data || []);
}
