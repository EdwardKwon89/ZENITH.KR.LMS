'use server';

import { SettlementEngine, InvoiceGenerator } from '@/lib/finance/settlement';
import { revalidatePath } from 'next/cache';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { getNumericParam } from "@/lib/params/service";
import { generateInvoicePdfBuffer } from '@/lib/finance/pdf';
import { Resend } from 'resend';
import { USER_ROLES } from '@/lib/auth/rbac';

const getResend = () => {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  return null;
};


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
  amount: number,
  paymentMethod: string = 'BANK_TRANSFER'
) {
  const { supabase } = await validateAdminAction();

  // 1. 인보이스 상태 업데이트
  const { data: invoice, error: invError } = await supabase
    .from('zen_invoices')
    .update({
      status,
      paid_amount: amount,
      payment_method: paymentMethod,
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
  console.log(`[Action] calculateSettlementAction started for order: ${orderId}`);
  const { supabase, profile } = await validateAdminAction();
  console.log(`[Action] User Profile: ${profile.email}, Role: ${profile.role}`);
  
  const engine = new SettlementEngine();
  const result = await engine.calculateOrderCosts(orderId);
  
  console.log(`[Action] Settlement calculation result for ${orderId}:`, result);
  
  if (result.success) {
    const { data: costs, error: costsError } = await supabase
      .from('zen_order_costs')
      .select('*')
      .eq('order_id', orderId);
    
    if (costsError) {
      console.error(`[Action] Error fetching costs for ${orderId}:`, costsError);
    }
    
    console.log(`[Action] Fetched ${costs?.length || 0} costs for ${orderId}`);
    
    revalidatePath(`/orders/${orderId}`);
    return { ...result, costs: costs || [] };
  }
  
  return result;
}

/**
 * 특정 오더의 인보이스를 생성합니다. (UI 수동 호출용)
 */
export async function generateInvoiceAction(orderId: string) {
  await validateAdminAction();
  const generator = new InvoiceGenerator();
  const result = await generator.generateInvoice(orderId);
  
  if (result.success) {
    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/finance/invoices');
    return { ...result, invoice: result.invoice };
  }
  
  return result;
}

/**
 * [WBS 3.2] 정산 대시보드 및 리스트용 요약 데이터를 조회합니다.
 */
export async function getSettlementOverview() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const isAdmin = profile.role === USER_ROLES.ZENITH_SUPER_ADMIN || profile.role === USER_ROLES.ADMIN;

  // 1. 전체 미결제 금액 합산 (UNPAID, PARTIAL)
  const unpaidQuery = supabase
    .from("zen_invoices")
    .select("total_amount")
    .in("status", ["UNPAID", "PARTIAL"]);
  if (!isAdmin && profile.org_id) unpaidQuery.eq("shipper_id", profile.org_id);
  const { data: unpaidSum, error: unpaidError } = await unpaidQuery;

  // 2. 최근 인보이스 5건
  const recentQuery = supabase
    .from("zen_invoices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  if (!isAdmin && profile.org_id) recentQuery.eq("shipper_id", profile.org_id);
  const { data: recentInvoices, error: recentError } = await recentQuery;

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

/**
 * [FIN-01] 인보이스 PDF를 발행하고 이력을 기록합니다.
 */
export async function issueInvoicePdf(invoiceId: string) {
  const { supabase, profile } = await validateAdminAction();

  // 1. 인보이스 및 관련 데이터 조회
  const { data: invoice, error: invError } = await supabase
    .from('zen_invoices')
    .select(`
      *,
      shipper:shipper_id(name, metadata),
      costs:zen_order_costs(*)
    `)
    .eq('id', invoiceId)
    .single();

  if (invError || !invoice) {
    throw new Error(`인보이스 정보를 찾을 수 없습니다: ${invError?.message}`);
  }

  // 2. PDF 생성 데이터 구성
  const shipperMeta = (invoice.shipper as any)?.metadata || {};
  const pdfData = {
    invoice_no: invoice.invoice_no,
    due_date: invoice.due_date,
    total_amount: invoice.total_amount,
    currency: invoice.currency,
    shipper: {
      name: (invoice.shipper as any)?.name || 'N/A',
      address: shipperMeta.address,
      business_number: shipperMeta.business_number
    },
    costs: (invoice.costs || []).map((c: any) => ({
      cost_type: c.cost_type,
      quantity: c.quantity,
      unit_price: c.unit_price,
      total_amount: c.total_amount,
      currency: c.currency
    }))
  };

  const buffer = await generateInvoicePdfBuffer(pdfData);

  // 3. 현재 버전 확인 및 경로 설정
  const { count } = await supabase
    .from('zen_invoice_pdf_history')
    .select('*', { count: 'exact', head: true })
    .eq('invoice_id', invoiceId);
  
  const nextVersion = (count || 0) + 1;
  const timestamp = Date.now();
  const filePath = `${invoice.invoice_no}/v${nextVersion}_${timestamp}.pdf`;

  // 4. Storage 업로드
  const { error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(filePath, buffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (uploadError) {
    throw new Error(`PDF 업로드 실패: ${uploadError.message}`);
  }

  // 5. 이력 저장
  const { error: histError } = await supabase
    .from('zen_invoice_pdf_history')
    .insert({
      invoice_id: invoiceId,
      file_path: filePath,
      version: nextVersion,
      created_by: profile.id,
      metadata: {
        total_amount: invoice.total_amount,
        currency: invoice.currency,
        issued_at: new Date().toISOString()
      }
    });

  if (histError) {
    throw new Error(`발행 이력 저장 실패: ${histError.message}`);
  }

  revalidatePath('/finance/invoices');
  return { success: true, filePath };
}

/**
 * [FIN-01] 인보이스의 PDF 발행 이력을 조회합니다.
 */
export async function getInvoicePdfHistory(invoiceId: string) {
  const { supabase } = await validateUserAction();

  const { data, error } = await supabase
    .from('zen_invoice_pdf_history')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('version', { ascending: false });

  if (error) {
    throw new Error(`이력 조회 실패: ${error.message}`);
  }

  // 각 파일에 대한 Signed URL 생성 (보안상 필요)
  const historyWithUrls = await Promise.all((data || []).map(async (item) => {
    const { data: urlData } = await supabase.storage
      .from('invoices')
      .createSignedUrl(item.file_path, 3600); // 1시간 유효

    return {
      ...item,
      download_url: urlData?.signedUrl
    };
  }));

  return historyWithUrls;
}

/**
 * [FIN-03] 특정 인보이스를 기반으로 세금계산서 데이터를 생성합니다.
 */
export async function issueTaxInvoice(invoiceId: string) {
  console.log(`[Action] issueTaxInvoice started for invoiceId: ${invoiceId}`);
  const { supabase, profile } = await validateAdminAction();
  console.log(`[Action] Admin authorized: ${profile.email}`);

  // 1. 인보이스 및 조직 정보 조회
  console.log(`[Action] Fetching invoice and costs...`);
  const { data: invoice, error: invError } = await supabase
    .from('zen_invoices')
    .select(`
      *,
      shipper:shipper_id(*),
      costs:zen_order_costs(*)
    `)
    .eq('id', invoiceId)
    .single();

  if (invError || !invoice) {
    console.error(`[Action] Invoice not found:`, invError);
    throw new Error(`인보이스 정보를 찾을 수 없습니다: ${invError?.message}`);
  }
  console.log(`[Action] Invoice fetched: ${invoice.invoice_no}, Costs count: ${invoice.costs?.length || 0}`);

  // 2. 세금계산서 데이터 구성
  const taxInvoiceNo = `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  console.log(`[Action] Generating tax invoice no: ${taxInvoiceNo}`);
  
  const vatRate = await getNumericParam('VAT_RATE', 0.1);
  const exchangeRate = invoice.applied_exchange_rate || await getNumericParam('EXCHANGE_RATE_USD_KRW', 1350);
  console.log(`[Action] Parameters: vatRate=${vatRate}, exchangeRate=${exchangeRate}`);
  
  const supplierInfo = {
    business_number: "123-45-67890", // 시스템 설정에서 가져와야 함 (Mock)
    name: "ZENITH LOGISTICS",
    ceo_name: "Aiden",
    address: "Seoul, South Korea",
    business_type: "Logistics",
    business_item: "Freight Forwarding"
  };

  const buyerInfo = {
    business_number: invoice.shipper?.business_number || 'N/A',
    name: invoice.shipper?.name || 'N/A',
    ceo_name: 'N/A',
    address: invoice.shipper?.address || 'N/A',
    business_type: 'N/A',
    business_item: 'N/A'
  };
  const items = (invoice.costs || []).map((c: any) => ({
    date: new Date().toISOString().slice(5, 10).replace('-', '/'),
    item_name: c.cost_type,
    spec: 'Standard',
    quantity: Number(c.quantity),
    unit_price: Number(c.unit_price),
    supply_amount: Number(c.total_amount),
    tax_amount: Number(c.total_amount) * vatRate,
    remarks: ''
  }));

  const supplyTotal = items.reduce((sum: number, item: any) => sum + item.supply_amount, 0);
  const vatTotal = items.reduce((sum: number, item: any) => sum + item.tax_amount, 0);
  console.log(`[Action] Calculated totals: supplyTotal=${supplyTotal}, vatTotal=${vatTotal}`);

  // 3. DB 저장
  console.log(`[Action] Inserting into zen_tax_invoices...`);
  const { data: taxInvoice, error: txError } = await supabase
    .from('zen_tax_invoices')
    .insert({
      invoice_id: invoiceId,
      tax_invoice_no: taxInvoiceNo,
      status: 'ISSUED',
      supplier_info: supplierInfo,
      buyer_info: buyerInfo,
      items: items,
      total_amount: supplyTotal + vatTotal,
      vat_amount: vatTotal,
      applied_exchange_rate: exchangeRate,
      recipient_email: invoice.shipper?.email || 'test@example.com',
      issued_by: profile.id,
      metadata: {
        ...invoice.metadata,
        snapshot: {
          applied_exchange_rate: exchangeRate,
          vat_rate: vatRate
        }
      }
    })
    .select()
    .single();

  if (txError) {
    console.error(`[Action] Tax invoice insertion failed:`, txError);
    throw new Error(`세금계산서 생성 실패: ${txError.message}`);
  }
  console.log(`[Action] Tax invoice inserted successfully: ${taxInvoice.id}`);

  revalidatePath('/finance/invoices');
  console.log(`[Action] issueTaxInvoice completed successfully`);
  return { success: true, taxInvoiceId: taxInvoice.id };
}

/**
 * [FIN-03] 생성된 세금계산서를 이메일로 발송합니다.
 */
export async function sendTaxInvoiceEmail(taxInvoiceId: string, recipientEmail: string) {
  const { supabase } = await validateAdminAction();

  // 1. 세금계산서 데이터 조회
  const { data: tx, error: txError } = await supabase
    .from('zen_tax_invoices')
    .select('*')
    .eq('id', taxInvoiceId)
    .single();

  if (txError || !tx) {
    throw new Error(`세금계산서 정보를 찾을 수 없습니다: ${txError?.message}`);
  }

  try {
    // 2. Resend 발송 (Inline HTML 사용)
    const resendInstance = getResend();
    if (!resendInstance) {
      throw new Error('이메일 발송 서비스(Resend)가 설정되지 않았습니다.');
    }
    const { data: emailData, error: emailError } = await resendInstance.emails.send({
      from: 'ZENITH LMS <notifications@zenith.kr>',
      to: [recipientEmail],
      subject: `[ZENITH] 세금계산서가 발행되었습니다 (No. ${tx.tax_invoice_no})`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2>세금계산서 발행 안내</h2>
          <p>안녕하세요, ZENITH LOGISTICS입니다.</p>
          <p>귀사의 인보이스에 대한 세금계산서가 다음과 같이 발행되었습니다.</p>
          <ul>
            <li>번호: ${tx.tax_invoice_no}</li>
            <li>금액: ${Number(tx.total_amount).toLocaleString()} ${tx.currency || 'KRW'}</li>
          </ul>
          <p>자세한 내용은 시스템에 접속하여 확인해 주시기 바랍니다.</p>
        </div>
      `
    });

    if (emailError) throw emailError;

    // 3. 상태 업데이트
    await supabase
      .from('zen_tax_invoices')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
        metadata: { ...tx.metadata, resend_id: emailData?.id }
      })
      .eq('id', taxInvoiceId);

    revalidatePath('/finance/invoices');
    return { success: true, messageId: emailData?.id };
  } catch (error: any) {
    // 실패 기록
    await supabase
      .from('zen_tax_invoices')
      .update({
        status: 'FAILED',
        metadata: { ...tx.metadata, error: error.message }
      })
      .eq('id', taxInvoiceId);

    throw new Error(`이메일 발송 실패: ${error.message}`);
  }
}

/**
 * [FIN-03] 인보이스와 연결된 세금계산서 발행 이력을 조회합니다.
 */
export async function getTaxInvoiceHistory(invoiceId: string) {
  const { supabase } = await validateUserAction();

  const { data, error } = await supabase
    .from('zen_tax_invoices')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`이력 조회 실패: ${error.message}`);
  }

  return data;
}



/**
 * [WBS 4.8.3.3] 최근 7일간의 요일별 매출 데이터를 조회하여 차트 형식으로 반환합니다.
 */
export async function getWeeklyRevenueChart() {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const isAdmin = profile.role === USER_ROLES.ZENITH_SUPER_ADMIN || profile.role === USER_ROLES.ADMIN;

  // 1. 최근 7일 날짜 범위 계산
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // 2. PAID 상태인 인보이스 조회
  const query = supabase
    .from('zen_invoices')
    .select('total_amount, created_at')
    .eq('status', 'PAID')
    .gte('created_at', sevenDaysAgo.toISOString())
    .lte('created_at', now.toISOString());

  if (!isAdmin && profile.org_id) {
    query.eq('shipper_id', profile.org_id);
  }

  const { data: invoices, error } = await query;
  if (error) throw new Error(`매출 통계 조회 실패: ${error.message}`);

  // 3. 요일별 집계 (Mon, Tue, Wed...)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartDataMap: Record<string, number> = {};

  // 최근 7일을 순서대로 초기화 (오늘이 마지막에 오도록)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    chartDataMap[dayNames[d.getDay()]] = 0;
  }

  invoices?.forEach(inv => {
    const day = dayNames[new Date(inv.created_at).getDay()];
    if (chartDataMap[day] !== undefined) {
      chartDataMap[day] += Number(inv.total_amount);
    }
  });

  // 4. 차트용 배열로 변환 (날짜 순서 유지)
  const result = Object.entries(chartDataMap).map(([name, revenue]) => ({
    name,
    revenue
  }));

  return result;
}

/**
 * [WBS 4.5.1] 필터용 조직 목록을 조회합니다.
 */
export async function getOrganizations() {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_organizations')
    .select('id, name')
    .order('name');
  
  if (error) throw new Error(`조직 조회 실패: ${error.message}`);
  return data || [];
}

/**
 * [WBS 4.5.1.1] 수입 현황 리포트 데이터를 조회합니다.
 */
export async function getRevenueReport(filters: {
  startDate: string;
  endDate: string;
  transMode?: string;
  shipperId?: string;
}) {
  const { supabase, profile } = await validateAdminAction();

  let query = supabase
    .from('zen_invoices')
    .select(`
      id,
      invoice_no,
      total_amount,
      currency,
      status,
      created_at,
      shipper:shipper_id(name),
      order:zen_orders!inner(id, trans_mode)
    `)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (filters.transMode && filters.transMode !== 'ALL') {
    query = query.eq('order.trans_mode', filters.transMode);
  }
  if (filters.shipperId) {
    query = query.eq('shipper_id', filters.shipperId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`수입 리포트 조회 실패: ${error.message}`);

  const totalRevenue = data?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
  const count = data?.length || 0;
  const avgRevenue = count > 0 ? totalRevenue / count : 0;

  return {
    items: data || [],
    summary: { totalRevenue, count, avgRevenue }
  };
}

/**
 * [WBS 4.5.1.2] 비용 현황 리포트 데이터를 조회합니다.
 */
export async function getCostReport(filters: {
  startDate: string;
  endDate: string;
  serviceType?: string;
}) {
  const { supabase } = await validateAdminAction();

  let query = supabase
    .from('zen_order_costs')
    .select(`
      *,
      order:order_id(order_no, trans_mode, shipper:shipper_id(name))
    `)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (filters.serviceType && filters.serviceType !== 'ALL') {
    query = query.eq('cost_type', filters.serviceType); // Simplified mapping
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`비용 리포트 조회 실패: ${error.message}`);

  const totalCost = data?.reduce((sum, cost) => sum + Number(cost.total_amount), 0) || 0;

  return {
    items: data || [],
    summary: { totalCost }
  };
}

/**
 * [WBS 4.5.2] 운송원가 마스터 정보를 조회합니다.
 */
export async function getTransportCosts() {
  const { supabase } = await validateAdminAction();
  const { data, error } = await supabase
    .from('zen_transport_costs')
    .select(`
      *,
      carrier:carrier_id(name),
      origin_port:origin_port_id(name, code),
      destination_port:destination_port_id(name, code)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`운송원가 조회 실패: ${error.message}`);
  return data;
}

/**
 * [WBS 4.5.2] 운송원가 정보를 저장하거나 수정합니다.
 */
export async function upsertTransportCost(payload: any) {
  const { supabase } = await validateAdminAction();
  const { data, error } = await supabase
    .from('zen_transport_costs')
    .upsert({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(`운송원가 저장 실패: ${error.message}`);
  revalidatePath('/admin/transport-costs');
  return { success: true, data };
}

/**
 * [WBS 4.5.2] 운송원가 정보를 삭제합니다.
 */
export async function deleteTransportCost(id: string) {
  const { supabase } = await validateAdminAction();
  const { error } = await supabase
    .from('zen_transport_costs')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`운송원가 삭제 실패: ${error.message}`);
  revalidatePath('/admin/transport-costs');
  return { success: true };
}

/**
 * [REWORK-SPR8-02] 무역서류(CI/PL) 생성을 위한 오더 상세 데이터를 조회합니다.
 */
export async function getOrderDocumentData(orderNo: string) {
  const { supabase } = await validateUserAction();

  // 1. 오더 기본 정보 조회 (송하인, 항구 정보 포함)
  const { data: order, error: orderError } = await supabase
    .from('zen_orders')
    .select(`
      *,
      shipper:zen_organizations!shipper_id(*),
      origin_port:zen_ports!origin_port_id(*),
      dest_port:zen_ports!dest_port_id(*)
    `)
    .eq('order_no', orderNo)
    .maybeSingle();

  if (orderError) throw new Error(`오더 조회 중 오류 발생: ${orderError.message}`);
  if (!order) throw new Error(`해당 번호(${orderNo})의 오더를 찾을 수 없습니다.`);

  // 2. 패킹 및 아이템 정보 조회
  const { data: packages, error: pkgError } = await supabase
    .from('zen_order_packages')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (pkgError) throw new Error(`패킹 정보 조회 실패: ${pkgError.message}`);

  const { data: items, error: itemsError } = await supabase
    .from('zen_order_items')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (itemsError) throw new Error(`아이템 정보 조회 실패: ${itemsError.message}`);

  // 3. 데이터 매핑 (PDF 컴포넌트 규격에 맞춤)
  const packagesWithItems = packages.map(pkg => ({
    ...pkg,
    items: items.filter(item => item.package_id === pkg.id)
  }));

  return {
    ...order,
    packages: packagesWithItems
  };
}
