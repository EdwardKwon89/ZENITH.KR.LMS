"use server";

import { validateUserAction, validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

/**
 * [WBS 3.2] 특정 오더에 대한 정산 비용을 계산하고 자동 청구서(Invoice)를 생성합니다.
 * 주로 오더가 RELEASED(출고) 상태가 될 때 호출됩니다.
 */
export async function generateInvoicesForOrder(orderId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  // 1. RPC 호출을 통한 비용 계산 및 기록
  const { data: costResult, error: costError } = await supabase
    .rpc('calculate_order_costs', { p_order_id: orderId });

  if (costError) throw new Error(`Cost calculation failed: ${costError.message}`);
  if (!costResult.success) throw new Error(costResult.message);

  // 2. 오더 기본 정보 조회 (화주 ID 및 금액 확인용)
  const { data: order, error: orderError } = await supabase
    .from("zen_orders")
    .select("shipper_id, order_no")
    .eq("id", orderId)
    .single();

  if (orderError || !order) throw new Error("Order not found");

  // 3. 인보이스 본체 생성
  const invoiceNo = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${order.order_no.split('-').pop()}`;
  const { data: invoice, error: invError } = await supabase
    .from("zen_invoices")
    .insert({
      invoice_no: invoiceNo,
      shipper_id: order.shipper_id,
      total_amount: costResult.total_freight,
      currency: costResult.currency || 'USD',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 기본 14일 이내
      status: 'UNPAID',
      metadata: { source_order_id: orderId }
    })
    .select()
    .single();

  if (invError) throw new Error(`Invoice creation failed: ${invError.message}`);

  // 4. 생성된 비용 항목에 인보이스 ID 연결
  const { error: linkError } = await supabase
    .from("zen_order_costs")
    .update({ invoice_id: invoice.id })
    .eq("order_id", orderId);

  if (linkError) console.error("Failed to link costs to invoice:", linkError);

  // 5. 오더의 빌링 상태 업데이트
  await supabase
    .from("zen_orders")
    .update({ billing_status: 'INVOICED' })
    .eq("id", orderId);

  revalidatePath("/(dashboard)/settlement", "page");
  revalidatePath(`/(dashboard)/orders/${orderId}`, "page");

  return { success: true, invoice_no: invoiceNo };
}

/**
 * 인보이스 상태를 PAID(결제 완료)로 업데이트하고 오더 상태를 동기화합니다.
 */
export async function updatePaymentStatus(invoiceId: string, status: 'PAID' | 'CANCELED', paidAmount?: number) {
  const { supabase } = await validateAdminAction();

  // 1. 인보이스 상태 업데이트
  const updateData: any = { status };
  if (status === 'PAID') updateData.paid_amount = paidAmount || 0;

  const { data: invoice, error: invError } = await supabase
    .from("zen_invoices")
    .update(updateData)
    .eq("id", invoiceId)
    .select("metadata")
    .single();

  if (invError) throw new Error(`Status update failed: ${invError.message}`);

  // 2. 연결된 오더가 있을 경우 오더의 빌링 상태도 PAID로 변경
  const sourceOrderId = invoice.metadata?.source_order_id;
  if (sourceOrderId && status === 'PAID') {
    await supabase
      .from("zen_orders")
      .update({ billing_status: 'PAID' })
      .eq("id", sourceOrderId);
  }

  revalidatePath("/(dashboard)/settlement", "page");
  return { success: true };
}

/**
 * 화주 대시보드용 정산 리스트 조회
 */
export async function getSettlementOverview() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("Authentication required");

  let query = supabase
    .from("zen_invoices")
    .select(`
      *,
      shipper:zen_organizations!shipper_id(name)
    `)
    .order("created_at", { ascending: false });

  // 일반 사용자는 본인 조직 데이터만 확인
  if (profile.role !== 'ADMIN') {
    query = query.eq("shipper_id", profile.org_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data || [];
}
