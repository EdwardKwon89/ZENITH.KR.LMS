import { BaseRepository } from './base.repository';
import type { SupabaseClient } from '@supabase/supabase-js';

interface OrderFilters {
  status?: string;
  org_id?: string;
  shipper_id?: string;
  limit?: number;
  offset?: number;
}

export class OrderRepository extends BaseRepository {
  async findById(id: string, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Order lookup failed: ${error.message}`);
    return data;
  }

  async findMany(filters: OrderFilters = {}, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    let query = client.from('zen_orders').select('*');

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.org_id) query = query.eq('org_id', filters.org_id);
    if (filters.shipper_id) query = query.eq('shipper_id', filters.shipper_id);

    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(`Order list failed: ${error.message}`);
    return data || [];
  }

  async create(payload: Record<string, unknown>, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_orders')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(`Order creation failed: ${error.message}`);
    return data;
  }

  async update(id: string, payload: Record<string, unknown>, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_orders')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Order update failed: ${error.message}`);
    return data;
  }

  async getPackages(orderId: string, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_order_packages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Packages lookup failed: ${error.message}`);
    return data || [];
  }

  async getItems(orderId: string, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Items lookup failed: ${error.message}`);
    return data || [];
  }

  async createPackages(orderId: string, packages: Record<string, unknown>[], supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const items = packages.map(p => ({ ...p, order_id: orderId }));
    const { data, error } = await client
      .from('zen_order_packages')
      .insert(items)
      .select();

    if (error) throw new Error(`Package creation failed: ${error.message}`);
    return data || [];
  }

  async createItems(items: Record<string, unknown>[], supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_order_items')
      .insert(items)
      .select();

    if (error) throw new Error(`Item creation failed: ${error.message}`);
    return data || [];
  }

  async deletePackages(orderId: string, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { error } = await client
      .from('zen_order_packages')
      .delete()
      .eq('order_id', orderId);

    if (error) throw new Error(`Package deletion failed: ${error.message}`);
  }

  async deleteItems(orderId: string, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { error } = await client
      .from('zen_order_items')
      .delete()
      .eq('order_id', orderId);

    if (error) throw new Error(`Item deletion failed: ${error.message}`);
  }
}
