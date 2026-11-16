'use server';

import { logger } from '@/lib/logger';

import { InvoiceGenerator } from '@/lib/finance/settlement';
import { revalidatePath } from 'next/cache';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { FinanceRepository } from '@/lib/repositories';
import { escapeHtml } from '@/lib/utils/escape-html';
import { getNumericParam } from "@/lib/params/service";
import { getExchangeRate } from '@/lib/finance/exchange-rate';
import { getKstToday } from '@/lib/utils/date-kst';
import { trError } from '@/lib/i18n/action-error';
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
  if (!profile) throw new Error(await trError('profile_not_found'));
  const financeRepo = new FinanceRepository(supabase);

  const { data: invoice, error: invError } = await financeRepo.findByIdBasic(invoiceId);

  if (invError || !invoice) {
    if (invError) logger.error('invoice: lookup failed', invError);
    throw new Error(await trError('invoice_not_found'));
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
    logger.error('invoice: PDF upload failed', uploadError);
    throw new Error(await trError('generic', { code: 'INVOICE_PDF_UPLOAD' }));
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
    logger.error('invoice: issue history insert failed', histError);
    throw new Error(await trError('generic', { code: 'INVOICE_HISTORY_SAVE' }));
  }

  revalidatePath('/finance/invoices');
  return { success: true, filePath };
}

export async function getInvoicePdfHistory(invoiceId: string) {
  const { supabase } = await validateUserAction();
  const financeRepo = new FinanceRepository(supabase);

  const { data, error } = await financeRepo.findPdfHistory(invoiceId);

  if (error) {
    logger.error('invoice: history lookup failed', error);
    throw new Error(await trError('generic', { code: 'INVOICE_HISTORY_LOOKUP' }));
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
  if (!profile) throw new Error(await trError('profile_not_found'));
  const financeRepo = new FinanceRepository(supabase);

  const { data: invoice, error: invError } = await financeRepo.findById(invoiceId);

  if (invError || !invoice) {
    logger.error(`[Action] Invoice not found:`, invError);
    if (invError) logger.error('invoice: lookup failed', invError);
    throw new Error(await trError('invoice_not_found'));
  }

  const taxInvoiceNo = `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const vatRate = await getNumericParam('VAT_RATE', 0.1);
  const exchangeRate = invoice.applied_exchange_rate || await getExchangeRate('USD', 'KRW', getKstToday(), supabase);

  const supplierInfo = {
    business_number: "123-45-67890",
    name: "ZENITH LOGISTICS",
    ceo_name: "Aiden",
    address: "Seoul, South Korea",
    business_type: "Logistics",
    business_item: "Freight Forwarding"
  };

  const shipper = invoice.shipper as any || {};
  const buyerInfo = {
    business_number: shipper.business_number || 'N/A',
    name: shipper.name || 'N/A',
    ceo_name: 'N/A',
    address: shipper.address || 'N/A',
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
    recipient_email: (invoice.shipper as any)?.email || 'test@example.com',
    issued_by: profile.id,
    metadata: {
      ...(invoice.metadata as Record<string, unknown> | undefined) ?? {},
      snapshot: {
        applied_exchange_rate: exchangeRate,
        vat_rate: vatRate
      }
    }
  });

  if (txError) {
    logger.error(`[Action] Tax invoice insertion failed:`, txError);
    logger.error('invoice: tax invoice create failed', txError);
    throw new Error(await trError('generic', { code: 'TAX_INVOICE_CREATE' }));
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
    if (txError) logger.error('invoice: tax invoice lookup failed', txError);
    throw new Error(await trError('invoice_not_found'));
  }

  try {
    const resendInstance = getResend();
    if (!resendInstance) {
      logger.error('invoice: email service is not configured');
      throw new Error(await trError('generic', { code: 'EMAIL_NOT_CONFIGURED' }));
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
            <li>금액: ${escapeHtml(Number(tx.total_amount).toLocaleString())} KRW</li>
          </ul>
          <p>자세한 내용은 시스템에 접속하여 확인해 주시기 바랍니다.</p>
        </div>
      `
    });

    if (emailError) throw emailError;

    await financeRepo.updateTaxInvoiceStatus(taxInvoiceId, {
      status: 'SENT',
      sent_at: new Date().toISOString(),
      metadata: { ...(tx.metadata as Record<string, unknown> | undefined) ?? {}, resend_id: emailData?.id }
    });

    revalidatePath('/finance/invoices');
    return { success: true, messageId: emailData?.id };
  } catch (error: any) {
    await financeRepo.updateTaxInvoiceStatus(taxInvoiceId, {
      status: 'FAILED',
      metadata: { ...(tx.metadata as Record<string, unknown> | undefined) ?? {}, error: error.message }
    });

    logger.error('sendTaxInvoiceEmail failed:', error);
    throw new Error(await trError('generic', { code: 'EMAIL_SEND' }));
  }
}

export async function getTaxInvoiceHistory(invoiceId: string) {
  const { supabase } = await validateUserAction();
  const financeRepo = new FinanceRepository(supabase);

  const { data, error } = await financeRepo.findTaxInvoicesByInvoiceId(invoiceId);

  if (error) {
    logger.error('invoice: history lookup failed', error);
    throw new Error(await trError('generic', { code: 'INVOICE_HISTORY_LOOKUP' }));
  }

  return data;
}

export async function getOrderDocumentData(orderNo: string) {
  const { supabase } = await validateUserAction();

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

  if (orderError) {
    logger.error('invoice: order lookup failed', orderError);
    throw new Error(await trError('generic', { code: 'ORDER_LOOKUP' }));
  }
  if (!order) {
    logger.warn(`invoice: order not found (${orderNo})`);
    throw new Error(await trError('order_not_found'));
  }

  const { data: packages, error: pkgError } = await supabase
    .from('zen_order_packages')
    .select('id, order_id, packing_unit, packing_count, physical_box_count, gross_weight, volume, length, width, height, remarks, created_at, updated_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (pkgError) {
    logger.error('invoice: package lookup failed', pkgError);
    throw new Error(await trError('generic', { code: 'PACKAGE_LOOKUP' }));
  }

  const { data: items, error: itemsError } = await supabase
    .from('zen_order_items')
    .select('id, order_id, package_id, item_name, quantity, unit_price, currency, hs_code, sku_code, weight, volume, item_packing_unit, created_at, updated_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (itemsError) {
    logger.error('invoice: item lookup failed', itemsError);
    throw new Error(await trError('generic', { code: 'ITEM_LOOKUP' }));
  }

  const packagesWithItems = packages.map(pkg => ({
    ...pkg,
    items: items.filter(item => item.package_id === pkg.id)
  }));

  return {
    ...order,
    packages: packagesWithItems
  };
}
