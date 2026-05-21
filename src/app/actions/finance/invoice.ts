import { logger } from '@/lib/logger';
'use server';

import { InvoiceGenerator } from '@/lib/finance/settlement';
import { revalidatePath } from 'next/cache';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { FinanceRepository } from '@/lib/repositories';
import { escapeHtml } from '@/lib/utils/escape-html';
import { getNumericParam } from "@/lib/params/service";
import { generateInvoicePdfBuffer } from '@/lib/finance/pdf';
import { Resend } from 'resend';

const getResend = () => (
  process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
);

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

export async function issueInvoicePdf(invoiceId: string) {
  const { supabase, profile } = await validateAdminAction();
  const financeRepo = new FinanceRepository(supabase);

  const { data: invoice, error: invError } = await financeRepo.findByIdBasic(invoiceId);

  if (invError || !invoice) {
    throw new Error(`인보이스 정보를 찾을 수 없습니다: ${invError?.message}`);
  }

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

  const { count } = await financeRepo.countPdfHistory(invoiceId);

  const nextVersion = (count || 0) + 1;
  const uuid = crypto.randomUUID();
  const filePath = `${uuid}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(filePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
      metadata: { invoice_no: invoice.invoice_no }
    });

  if (uploadError) {
    throw new Error(`PDF 업로드 실패: ${uploadError.message}`);
  }

  const { error: histError } = await financeRepo.insertPdfHistory({
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

export async function getInvoicePdfHistory(invoiceId: string) {
  const { supabase } = await validateUserAction();
  const financeRepo = new FinanceRepository(supabase);

  const { data, error } = await financeRepo.findPdfHistory(invoiceId);

  if (error) {
    throw new Error(`이력 조회 실패: ${error.message}`);
  }

  const historyWithUrls = await Promise.all((data || []).map(async (item) => {
    const { data: urlData } = await supabase.storage
      .from('invoices')
      .createSignedUrl(item.file_path, 3600);

    return {
      ...item,
      download_url: urlData?.signedUrl
    };
  }));

  return historyWithUrls;
}

export async function issueTaxInvoice(invoiceId: string) {
  const { supabase, profile } = await validateAdminAction();
  const financeRepo = new FinanceRepository(supabase);

  const { data: invoice, error: invError } = await financeRepo.findById(invoiceId);

  if (invError || !invoice) {
    logger.error(`[Action] Invoice not found:`, invError);
    throw new Error(`인보이스 정보를 찾을 수 없습니다: ${invError?.message}`);
  }

  const taxInvoiceNo = `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const vatRate = await getNumericParam('VAT_RATE', 0.1);
  const exchangeRate = invoice.applied_exchange_rate || await getNumericParam('EXCHANGE_RATE_USD_KRW', 1350);

  const supplierInfo = {
    business_number: "123-45-67890",
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

  const { data: taxInvoice, error: txError } = await financeRepo.insertTaxInvoice({
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
  });

  if (txError) {
    logger.error(`[Action] Tax invoice insertion failed:`, txError);
    throw new Error(`세금계산서 생성 실패: ${txError.message}`);
  }

  // IMP-051: Audit history (best-effort)
  void (async () => {
    const { error } = await supabase.from('zen_invoice_history').insert({
      invoice_id: invoiceId,
      prev_status: invoice.status,
      next_status: 'TAX_INVOICE_ISSUED',
      changed_by: profile.id,
    });
    if (error) logger.error('[AUDIT] Invoice history insert failed:', error);
  })();

  revalidatePath('/finance/invoices');
  return { success: true, taxInvoiceId: taxInvoice.id };
}

export async function sendTaxInvoiceEmail(taxInvoiceId: string, recipientEmail: string) {
  const { supabase } = await validateAdminAction();
  const financeRepo = new FinanceRepository(supabase);

  const { data: tx, error: txError } = await financeRepo.findTaxInvoiceById(taxInvoiceId);

  if (txError || !tx) {
    throw new Error(`세금계산서 정보를 찾을 수 없습니다: ${txError?.message}`);
  }

  try {
    const resendInstance = getResend();
    if (!resendInstance) {
      throw new Error('이메일 발송 서비스(Resend)가 설정되지 않았습니다.');
    }
    const { data: emailData, error: emailError } = await resendInstance.emails.send({
      from: 'ZENITH LMS <notifications@zenith.kr>',
      to: [recipientEmail],
      subject: `[ZENITH] 세금계산서가 발행되었습니다 (No. ${escapeHtml(tx.tax_invoice_no)})`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2>세금계산서 발행 안내</h2>
          <p>안녕하세요, ZENITH LOGISTICS입니다.</p>
          <p>귀사의 인보이스에 대한 세금계산서가 다음과 같이 발행되었습니다.</p>
          <ul>
            <li>번호: ${escapeHtml(tx.tax_invoice_no)}</li>
            <li>금액: ${escapeHtml(Number(tx.total_amount).toLocaleString())} ${escapeHtml(tx.currency || 'KRW')}</li>
          </ul>
          <p>자세한 내용은 시스템에 접속하여 확인해 주시기 바랍니다.</p>
        </div>
      `
    });

    if (emailError) throw emailError;

    await financeRepo.updateTaxInvoiceStatus(taxInvoiceId, {
      status: 'SENT',
      sent_at: new Date().toISOString(),
      metadata: { ...tx.metadata, resend_id: emailData?.id }
    });

    revalidatePath('/finance/invoices');
    return { success: true, messageId: emailData?.id };
  } catch (error: any) {
    await financeRepo.updateTaxInvoiceStatus(taxInvoiceId, {
      status: 'FAILED',
      metadata: { ...tx.metadata, error: error.message }
    });

    throw new Error(`이메일 발송 실패: ${error.message}`);
  }
}

export async function getTaxInvoiceHistory(invoiceId: string) {
  const { supabase } = await validateUserAction();
  const financeRepo = new FinanceRepository(supabase);

  const { data, error } = await financeRepo.findTaxInvoicesByInvoiceId(invoiceId);

  if (error) {
    throw new Error(`이력 조회 실패: ${error.message}`);
  }

  return data;
}
