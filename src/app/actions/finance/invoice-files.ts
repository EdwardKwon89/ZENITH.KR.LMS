'use server'

import { revalidatePath } from 'next/cache'
import { validateUserAction } from '@/lib/auth/guards'
import { generateInvoicePdfBuffer, type InvoicePdfData } from '@/lib/finance/pdf'
import { logger } from '@/lib/logger'

export async function generateInvoicePdf(orderId: string): Promise<{ fileUrl: string; fileName: string }> {
  const { supabase, profile } = await validateUserAction()
  if (!profile) throw new Error('인증 정보가 없습니다.')

  const { data: orderCost, error: costError } = await supabase
    .from('zen_order_costs')
    .select('invoice_id')
    .eq('order_id', orderId)
    .not('invoice_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (costError || !orderCost?.invoice_id) {
    throw new Error('이 오더에 연결된 인보이스를 찾을 수 없습니다.')
  }

  const invoiceId = orderCost.invoice_id

  const { data: existing } = await supabase
    .from('zen_invoice_files')
    .select('file_url, file_name')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { data: signed } = await supabase.storage
      .from('invoices')
      .createSignedUrl(existing.file_url, 3600)

    if (signed?.signedUrl) {
      return { fileUrl: signed.signedUrl, fileName: existing.file_name }
    }
  }

  const { data: invoice, error: invError } = await supabase
    .from('zen_invoices')
    .select('*, shipper:zen_organizations!shipper_id(*)')
    .eq('id', invoiceId)
    .single()

  if (invError || !invoice) {
    throw new Error(`인보이스 정보를 찾을 수 없습니다: ${invError?.message}`)
  }

  const shipperMeta = (invoice.shipper as any)?.metadata || {}
  const pdfData: InvoicePdfData = {
    invoice_no: invoice.invoice_no,
    due_date: invoice.due_date,
    total_amount: invoice.total_amount,
    currency: invoice.currency,
    shipper: {
      name: (invoice.shipper as any)?.name || 'N/A',
      address: shipperMeta.address,
      business_number: shipperMeta.business_number
    },
    costs: []
  }

  const { data: costs, error: costsError } = await supabase
    .from('zen_order_costs')
    .select('cost_type, quantity, unit_price, total_amount, currency')
    .eq('invoice_id', invoiceId)

  if (!costsError && costs) {
    pdfData.costs = costs.map(c => ({
      cost_type: c.cost_type,
      quantity: c.quantity,
      unit_price: c.unit_price,
      total_amount: c.total_amount,
      currency: c.currency
    }))
  }

  const buffer = await generateInvoicePdfBuffer(pdfData)

  const uuid = crypto.randomUUID()
  const fileName = `invoice-${invoice.invoice_no}-${uuid.slice(0, 8)}.pdf`
  const storagePath = `order-pdfs/${uuid}.pdf`

  const { error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
      metadata: { invoice_no: invoice.invoice_no, order_id: orderId }
    })

  if (uploadError) {
    logger.error('[InvoiceFiles] Storage upload failed:', uploadError)
    throw new Error(`PDF 업로드 실패: ${uploadError.message}`)
  }

  const { error: insertError } = await supabase
    .from('zen_invoice_files')
    .insert({
      invoice_id: invoiceId,
      file_name: fileName,
      file_url: storagePath,
      file_size: buffer.length,
      content_type: 'application/pdf'
    })

  if (insertError) {
    logger.error('[InvoiceFiles] DB insert failed:', insertError)
    throw new Error(`파일 메타데이터 저장 실패: ${insertError.message}`)
  }

  const { data: signed } = await supabase.storage
    .from('invoices')
    .createSignedUrl(storagePath, 3600)

  revalidatePath(`/orders/${orderId}`)
  return {
    fileUrl: signed?.signedUrl || '',
    fileName
  }
}
