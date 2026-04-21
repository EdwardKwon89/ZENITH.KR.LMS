"use server";

import { validateAdminAction, validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { generateOrderNo } from "./master";

import { OrderRegistrationInput, orderRegistrationSchema } from "@/lib/validation/order";

/**
 * 신규 하우스 오더를 생성합니다. (Header -> Packages -> Items 계층형 저장)
 */
export async function createOrder(payload: OrderRegistrationInput) {
  const { supabase, user, profile } = await validateUserAction();
  
  // 1. 데이터 검증 (Server-side validation)
  const validated = orderRegistrationSchema.parse(payload);
  const order_no = await generateOrderNo(supabase);

  // 2. 주문 헤더 삽입 (수취인 상세 정보 포함)
  const { data: order, error: orderError } = await supabase
    .from("zen_orders")
    .insert({
      order_no,
      order_type: validated.order_type,
      shipper_id: validated.shipper_id,
      origin_port_id: validated.origin_port_id,
      dest_port_id: validated.dest_port_id,
      description: validated.description,
      
      // 송하인(화주) 담당자/연락처 (v2)
      shipper_contact_name: validated.shipper_contact_name,
      shipper_contact_phone: validated.shipper_contact_phone,
      
      // 수취인 상세 (v2)
      recipient_name: validated.recipient_name,
      recipient_address: validated.recipient_address,
      recipient_phone: validated.recipient_phone,
      recipient_zipcode: validated.recipient_zipcode,
      
      recipient_pccc: validated.recipient_pccc,
      recipient_email: validated.recipient_email,
      delivery_notes: validated.delivery_notes,
      
      status: "REGISTERED",
      created_by: user.id,
      org_id: profile?.org_id
    })
    .select()
    .single();

  if (orderError) throw new Error(`Order header failed: ${orderError.message}`);

  // 3. 계층형 패킹 및 아이템 삽입
  if (validated.packages && validated.packages.length > 0) {
    for (const pkg of validated.packages) {
      // 3.1 패킹 단위 삽입
      const { data: packageData, error: pkgError } = await supabase
        .from("zen_order_packages")
        .insert({
          order_id: order.id,
          packing_unit: pkg.packing_unit,
          packing_count: pkg.packing_count,
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          gross_weight: pkg.gross_weight,
          volume: pkg.volume
        })
        .select()
        .single();

      if (pkgError) {
        console.error("Package insertion failed:", pkgError);
        continue;
      }

      // 3.2 해당 패킹에 속한 아이템들 삽입
      if (pkg.items && pkg.items.length > 0) {
        const itemsToInsert = pkg.items.map(item => ({
          order_id: order.id,
          package_id: packageData.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency: item.currency || 'USD',
          hs_code: item.hs_code,
          item_packing_unit: item.item_packing_unit
        }));

        const { error: itemsError } = await supabase
          .from("zen_order_items")
          .insert(itemsToInsert);

        if (itemsError) console.error("Items insertion failed for package:", packageData.id, itemsError);
      }
    }
  }

  revalidatePath("/(dashboard)/orders", "page");
  return order;
}

/**
 * 주문 목록을 조회합니다. (v2 수취인명 검색 지원)
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
  if (userProfile.role === "CORPORATE") {
    query = query.eq("shipper_id", userProfile.org_id);
  } else if (userProfile.role === "INDIVIDUAL") {
    query = query.eq("created_by", user.id);
  }

  if (status) query = query.eq("status", status);
  if (order_type) query = query.eq("order_type", order_type);
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
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (pkgError) throw new Error(pkgError.message);

  const { data: items, error: itemsError } = await supabase
    .from("zen_order_items")
    .select("*")
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
