'use server';

import { SettlementEngine, InvoiceGenerator } from '@/lib/finance/settlement';
import { revalidatePath } from 'next/cache';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';

/**
 * [WBS 3.2] 오더 완료 시 정산서를 자동 생성합니다.
 */
export async function generateInvoicesForOrder(orderId: string) {
  await validateUserAction();

  const generator = new InvoiceGenerator();
  const result = await generator.generateInvoice(orderId);

  if (!result.success) {
    throw new Error(result.message || "정산서 생성 실패");
  }

  revalidatePath("/finance/invoices");
  revalidatePath(`/(dashboard)/orders/${orderId}`);
  
  return result;
}

/**
 * [WBS 3.2] 인보이스 결제 상태를 업데이트하고 오더 상태를 동기화합니다.
 */
export async function updatePaymentStatus(
  invoiceId: string, 
  status: string, 
  amount: number
) {
  const { supabase } = await validateAdminAction();

  // 1. 인보이스 상태 업데이트
  const { data: invoice, error: invError } = await supabase
    .from('zen_invoices')
    .update({
      status,
      paid_amount: amount,
      paid_at: status === 'PAID' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .select('metadata')
    .single();

  if (invError) throw new Error(`결제 상태 업데이트 실패: ${invError.message}`);

  // 2. 결제 완료 시 오더의 정산 상태 동기화 (Data Integrity)
  const orderId = (invoice?.metadata as any)?.source_order_id;
  if (status === 'PAID' && orderId) {
    await supabase
      .from('zen_orders')
      .update({ billing_status: 'PAID' })
      .eq('id', orderId);
    
    revalidatePath(`/orders/${orderId}`);
  }

  revalidatePath('/finance/invoices');
  return { success: true };
}

/**
 * 특정 오더의 비용을 계산합니다. (UI 수동 호출용)
 */
export async function calculateSettlementAction(orderId: string) {
  const engine = new SettlementEngine();
  const result = await engine.calculateOrderCosts(orderId);
  
  if (result.success) {
    revalidatePath(`/orders/${orderId}`);
  }
  
  return result;
}

/**
 * 특정 오더의 인보이스를 생성합니다. (UI 수동 호출용)
 */
export async function generateInvoiceAction(orderId: string) {
  const generator = new InvoiceGenerator();
  const result = await generator.generateInvoice(orderId);
  
  if (result.success) {
    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/finance/invoices');
  }
  
  return result;
}

/**
 * [WBS 3.2] 정산 대시보드 및 리스트용 요약 데이터를 조회합니다.
 */
export async function getSettlementOverview() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  // 1. 전체 미결제 금액 합산 (UNPAID, PARTIAL)
  const { data: unpaidSum, error: unpaidError } = await supabase
    .from("zen_invoices")
    .select("total_amount")
    .eq("shipper_id", profile.org_id)
    .in("status", ["UNPAID", "PARTIAL"]);

  // 2. 최근 인보이스 5건
  const { data: recentInvoices, error: recentError } = await supabase
    .from("zen_invoices")
    .select("*")
    .eq("shipper_id", profile.org_id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (unpaidError || recentError) {
    throw new Error("Failed to fetch settlement overview");
  }

  const totalUnpaid = unpaidSum?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

  return {
    totalUnpaid,
    recentInvoices: recentInvoices || [],
    currency: recentInvoices?.[0]?.currency || "USD"
  };
}
