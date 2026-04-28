"use server";

import { validateUserAction, validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

/**
 * [PH8-BE-01] 클레임 목록을 조회합니다.
 */
export async function getClaims({
  status,
  org_id,
}: {
  status?: string;
  org_id?: string;
} = {}) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  let query = supabase
    .from("zen_claims")
    .select(`
      *,
      order:zen_orders(order_no, status),
      shipper:zen_organizations(name)
    `)
    .order("created_at", { ascending: false });

  // 권한 필터링: 화주는 본인 조직만, 어드민은 전체
  if (profile.role !== 'ADMIN' && profile.role !== 'ZENITH_SUPER_ADMIN') {
    query = query.eq("org_id", profile.org_id);
  } else if (org_id) {
    query = query.eq("org_id", org_id);
  }

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data || [];
}

/**
 * [PH8-BE-01] 신규 클레임을 등록합니다.
 */
export async function createClaim(payload: {
  order_id: string;
  reason_code: 'DELAY' | 'DAMAGE' | 'MISDELIVERY';
  description: string;
}) {
  const { supabase, user, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  // 1. 오더 정보 및 권한 확인
  const { data: order, error: orderError } = await supabase
    .from("zen_orders")
    .select("org_id")
    .eq("id", payload.order_id)
    .single();

  if (orderError || !order) throw new Error("Order not found");
  if (profile.role !== 'ADMIN' && order.org_id !== profile.org_id) {
    throw new Error("You do not have permission to file a claim for this order.");
  }

  // 2. 클레임 삽입
  const { data: claim, error: claimError } = await supabase
    .from("zen_claims")
    .insert({
      order_id: payload.order_id,
      org_id: order.org_id,
      created_by: user.id,
      reason_code: payload.reason_code,
      description: payload.description,
      status: 'OPEN'
    })
    .select()
    .single();

  if (claimError) throw new Error(`Claim registration failed: ${claimError.message}`);

  // 3. 오더 상태 업데이트 ('CLAIMED')
  await supabase
    .from("zen_orders")
    .update({ status: 'CLAIMED' })
    .eq("id", payload.order_id);

  revalidatePath("/(dashboard)/orders");
  revalidatePath("/(dashboard)/claims");
  
  return claim;
}

/**
 * [PH8-BE-01] 클레임 상태를 업데이트합니다. (어드민 전용)
 */
export async function updateClaimStatus(
  claimId: string,
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED',
  resolution?: string
) {
  const { supabase } = await validateAdminAction();

  const updateData: any = { status, updated_at: new Date().toISOString() };
  if (status === 'RESOLVED') {
    updateData.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("zen_claims")
    .update(updateData)
    .eq("id", claimId);

  if (error) throw new Error(`Update failed: ${error.message}`);

  revalidatePath("/(dashboard)/admin/claims");
  return { success: true };
}

/**
 * [PH8-BE-01] 사고 비용을 등록하고 인보이스 금액을 차감합니다.
 */
export async function addIncidentFee(payload: {
  claim_id: string;
  invoice_id: string;
  fee_amount: number;
  currency: string;
  description?: string;
}) {
  const { supabase, user } = await validateAdminAction();

  // 1. 사고 비용 기록
  const { data: fee, error: feeError } = await supabase
    .from("zen_incident_fees")
    .insert({
      claim_id: payload.claim_id,
      invoice_id: payload.invoice_id,
      fee_amount: payload.fee_amount,
      currency: payload.currency,
      description: payload.description,
      created_by: user.id
    })
    .select()
    .single();

  if (feeError) throw new Error(`Incident fee registration failed: ${feeError.message}`);

  // 2. 인보이스 금액 차감 (Settlement Integrity)
  // IMPORTANT: 사고비는 인보이스 총액에서 차감되어야 함
  const { data: invoice, error: invError } = await supabase
    .from("zen_invoices")
    .select("total_amount")
    .eq("id", payload.invoice_id)
    .single();

  if (invError || !invoice) throw new Error("Invoice not found");

  const newTotal = Number(invoice.total_amount) - payload.fee_amount;

  const { error: updateError } = await supabase
    .from("zen_invoices")
    .update({ 
      total_amount: newTotal,
      updated_at: new Date().toISOString()
    })
    .eq("id", payload.invoice_id);

  if (updateError) throw new Error(`Invoice total update failed: ${updateError.message}`);

  revalidatePath("/finance/invoices");
  revalidatePath("/(dashboard)/admin/claims");

  return fee;
}
