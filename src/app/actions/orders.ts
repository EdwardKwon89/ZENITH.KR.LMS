"use server";

import { validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { generateOrderNo } from "./master";

import { OrderRegistrationInput, orderRegistrationSchema } from "@/lib/validation/order";

/**
 * 신규 하우스 오더를 생성합니다. (헤더 + 아이템)
 */
export async function createOrder(payload: OrderRegistrationInput) {
  const { supabase, user } = await validateAdminAction();
  
  // 1. 데이터 검증 (Server-side validation)
  const validated = orderRegistrationSchema.parse(payload);
  const order_no = await generateOrderNo(supabase);

  // 2. 주문 헤더 삽입
  const { data: order, error: orderError } = await supabase
    .from("zen_orders")
    .insert({
      order_no,
      order_type: validated.order_type,
      shipper_id: validated.shipper_id,
      origin_port_id: validated.origin_port_id,
      dest_port_id: validated.dest_port_id,
      description: validated.description,
      recipient_pccc: validated.recipient_pccc,
      recipient_contact: validated.recipient_contact,
      recipient_email: validated.recipient_email,
      delivery_notes: validated.delivery_notes,
      status: "REGISTERED",
      created_by: user.id
    })
    .select()
    .single();

  if (orderError) throw new Error(`Header insertion failed: ${orderError.message}`);

  // 3. 주문 아이템 삽입 (복수 아이템 대응)
  if (validated.items && validated.items.length > 0) {
    const itemsToInsert = validated.items.map(item => ({
      order_id: order.id,
      sku_code: item.sku_code,
      item_name: item.item_name,
      quantity: item.quantity,
      weight: item.weight,
      volume: item.volume,
      unit_price: item.unit_price,
      currency: item.currency || 'USD'
    }));

    const { error: itemsError } = await supabase
      .from("zen_order_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Items insertion failed:", itemsError);
      // 참고: 헤더는 생성되었으나 아이템이 실패한 사례 발생 시 로깅/알림 필요
    }
  }

  revalidatePath("/(dashboard)/orders", "page");
  return order;
}

/**
 * 주문 목록을 조회합니다. (페이지네이션 및 역할 기반 필터링 지원)
 */
export async function getOrders({
  page = 1,
  pageSize,
  status,
  order_type,
  search
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  order_type?: string;
  search?: string;
} = {}) {
  const { supabase, profile, user } = await validateAdminAction();

  // 1. 시스템 설정에서 페이지 사이즈 조회 (기본값 전략)
  let effectivePageSize = pageSize || 20;
  const { data: setting } = await supabase
    .from("zen_system_settings")
    .select("setting_value")
    .eq("setting_key", "default_page_size")
    .single();
  
  if (setting) effectivePageSize = parseInt(setting.setting_value, 10);

  // 2. 쿼리 빌더 시작
  let query = supabase
    .from("zen_orders")
    .select(`
      *,
      shipper:zen_organizations!shipper_id(name),
      origin_port:zen_ports!origin_port_id(name, code),
      dest_port:zen_ports!dest_port_id(name, code)
    `, { count: "exact" });

  // 3. 역할 기반 데이터 격리 (RBAC Scoping)
  if (profile.role === "CARRIER") {
    // 운송사는 본인에게 할당된 오더만 (할당 테이블이 따로 있다면 Join 필요, 현재는 단순 예시)
    // query = query.eq("carrier_id", profile.org_id); 
  } else if (profile.role === "CORPORATE") {
    // 법인 화주는 본인 조직의 오더만
    query = query.eq("shipper_id", profile.org_id);
  } else if (profile.role === "INDIVIDUAL") {
    // 개인 화주는 본인이 직접 등록한 오더만
    query = query.eq("created_by", user.id);
  }
  // ZENITH_SUPER_ADMIN, ADMIN, MANAGER, OPERATOR는 전역 조회 가능

  // 4. 필터링 로직
  if (status) query = query.eq("status", status);
  if (order_type) query = query.eq("order_type", order_type);
  if (search) query = query.or(`order_no.ilike.%${search}%,recipient_name.ilike.%${search}%`);

  // 5. 페이지네이션 계산
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
 * 주문 상세 정보를 조회합니다.
 */
export async function getOrderDetails(orderId: string) {
  const { supabase } = await validateAdminAction();
  
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

  const { data: items, error: itemsError } = await supabase
    .from("zen_order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  return { ...order, items };
}
