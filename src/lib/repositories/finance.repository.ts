import { BaseRepository } from './base.repository';
import type { SupabaseClient } from '@supabase/supabase-js';

interface InvoiceFilters {
  status?: string;
  order_id?: string;
  org_id?: string;
}

export class FinanceRepository extends BaseRepository {
  async findInvoiceById(id: string, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Invoice lookup failed: ${error.message}`);
    return data;
  }

  async findInvoices(filters: InvoiceFilters = {}, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    let query = client.from('zen_invoices').select('*');

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.order_id) query = query.eq('order_id', filters.order_id);
    if (filters.org_id) query = query.eq('org_id', filters.org_id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(`Invoice list failed: ${error.message}`);
    return data || [];
  }

  async updateInvoice(id: string, payload: Record<string, unknown>, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_invoices')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Invoice update failed: ${error.message}`);
    return data;
  }

  async findSettlements(orderId?: string, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    let query = client.from('zen_settlements').select('*');

    if (orderId) query = query.eq('order_id', orderId);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(`Settlement lookup failed: ${error.message}`);
    return data || [];
  }

  async upsertSettlement(payload: Record<string, unknown>, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_settlements')
      .upsert(payload)
      .select()
      .single();

    if (error) throw new Error(`Settlement upsert failed: ${error.message}`);
    return data;
  }

  async findOrderCosts(orderId: string, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_order_costs')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Order costs lookup failed: ${error.message}`);
    return data || [];
  }

  async createOrderCost(payload: Record<string, unknown>, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_order_costs')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Order cost creation failed: ${error.message}`);
    return data;
  }
}
