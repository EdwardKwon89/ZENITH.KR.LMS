import { BaseRepository } from './base.repository';

/**
 * FinanceRepository: Finance 도메인 DB 접근 전담
 *
 * 담당 테이블: zen_invoices, zen_order_costs, zen_tax_invoices, zen_invoice_pdf_history
 */
export class FinanceRepository extends BaseRepository {

  // ─── zen_invoices ─────────────────────────────────────────────

  async findById(invoiceId: string) {
    return this.db
      .from('zen_invoices')
      .select(`
        *,
        shipper:shipper_id(*),
        costs:zen_order_costs(*)
      `)
      .eq('id', invoiceId)
      .single();
  }

  async findByIdBasic(invoiceId: string) {
    return this.db
      .from('zen_invoices')
      .select(`
        *,
        shipper:shipper_id(name, metadata),
        costs:zen_order_costs(*)
      `)
      .eq('id', invoiceId)
      .single();
  }

  async updatePaymentStatus(invoiceId: string, data: Record<string, unknown>) {
    return this.db
      .from('zen_invoices')
      .update(data)
      .eq('id', invoiceId)
      .select('metadata')
      .single();
  }

  async findUnpaidSum(shipperId?: string) {
    let query = this.db
      .from('zen_invoices')
      .select('total_amount')
      .in('status', ['UNPAID', 'PARTIAL']);

    if (shipperId) query = query.eq('shipper_id', shipperId);
    return query;
  }

  async findRecentInvoices(limit = 5, shipperId?: string) {
    let query = this.db
      .from('zen_invoices')
      .select('id, invoice_no, total_amount, currency, status, created_at, shipper_id')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (shipperId) query = query.eq('shipper_id', shipperId);
    return query;
  }

  async findPaidInvoicesByDateRange(startDate: string, endDate: string, shipperId?: string) {
    let query = this.db
      .from('zen_invoices')
      .select('total_amount, created_at')
      .eq('status', 'PAID')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (shipperId) query = query.eq('shipper_id', shipperId);
    return query;
  }

  async findRevenueReport(filters: {
    startDate: string;
    endDate: string;
    transMode?: string;
    shipperId?: string;
  }) {
    let query = this.db
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

    return query.order('created_at', { ascending: false });
  }

  // ─── zen_order_costs ──────────────────────────────────────────

  async findByOrderId(orderId: string) {
    return this.db
      .from('zen_order_costs')
      .select('id, invoice_id')
      .eq('order_id', orderId);
  }

  async findFullByOrderId(orderId: string) {
    return this.db
      .from('zen_order_costs')
      .select('id, order_id, cost_type, quantity, unit_price, total_amount, currency, invoice_id, is_revenue, created_at, route_option_id, carrier, segment_index')
      .eq('order_id', orderId);
  }

  async findCostReport(filters: {
    startDate: string;
    endDate: string;
    serviceType?: string;
  }) {
    let query = this.db
      .from('zen_order_costs')
      .select(`
        *,
        order:order_id(order_no, trans_mode, shipper:shipper_id(name))
      `)
      .gte('created_at', filters.startDate)
      .lte('created_at', filters.endDate);

    if (filters.serviceType && filters.serviceType !== 'ALL') {
      query = query.eq('cost_type', filters.serviceType);
    }

    return query.order('created_at', { ascending: false });
  }

  async updateBillingStatusByOrderId(orderId: string, billingStatus: string) {
    return this.db
      .from('zen_orders')
      .update({ billing_status: billingStatus })
      .eq('id', orderId);
  }

  // ─── zen_tax_invoices ─────────────────────────────────────────

  async insertTaxInvoice(data: Record<string, unknown>) {
    return this.db
      .from('zen_tax_invoices')
      .insert(data)
      .select()
      .single();
  }

  async findTaxInvoiceById(taxInvoiceId: string) {
    return this.db
      .from('zen_tax_invoices')
      .select('id, tax_invoice_no, total_amount, currency, status, metadata, created_at')
      .eq('id', taxInvoiceId)
      .single();
  }

  async updateTaxInvoiceStatus(taxInvoiceId: string, data: Record<string, unknown>) {
    return this.db
      .from('zen_tax_invoices')
      .update(data)
      .eq('id', taxInvoiceId);
  }

  async findTaxInvoicesByInvoiceId(invoiceId: string) {
    return this.db
      .from('zen_tax_invoices')
      .select('id, tax_invoice_no, total_amount, status, invoice_id, created_at')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });
  }

  // ─── zen_invoice_pdf_history ──────────────────────────────────

  async countPdfHistory(invoiceId: string) {
    return this.db
      .from('zen_invoice_pdf_history')
      .select('*', { count: 'exact', head: true })
      .eq('invoice_id', invoiceId);
  }

  async insertPdfHistory(data: Record<string, unknown>) {
    return this.db.from('zen_invoice_pdf_history').insert(data);
  }

  async findPdfHistory(invoiceId: string) {
    return this.db
      .from('zen_invoice_pdf_history')
      .select('id, invoice_id, file_path, version, created_by, metadata, created_at')
      .eq('invoice_id', invoiceId)
      .order('version', { ascending: false });
  }
}
