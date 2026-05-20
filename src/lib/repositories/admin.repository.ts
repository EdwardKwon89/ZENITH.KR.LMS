import { BaseRepository } from './base.repository';
import type { SupabaseClient } from '@supabase/supabase-js';

export class AdminRepository extends BaseRepository {
  async findProfileById(id: string, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_profiles')
      .select('id, email, role, org_id, status, full_name')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Profile lookup failed: ${error.message}`);
    return data;
  }

  async findProfiles(orgId?: string, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    let query = client.from('zen_profiles').select('id, email, role, org_id, status, full_name');

    if (orgId) query = query.eq('org_id', orgId);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(`Profile list failed: ${error.message}`);
    return data || [];
  }

  async updateProfile(id: string, payload: Record<string, unknown>, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_profiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Profile update failed: ${error.message}`);
    return data;
  }

  async findOrganizations(supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_organizations')
      .select('id, name, code, status')
      .order('name');

    if (error) throw new Error(`Organization lookup failed: ${error.message}`);
    return data || [];
  }

  async findPorts(supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_ports')
      .select('id, code, name, port_type:type')
      .order('code', { ascending: true });

    if (error) throw new Error(`Port lookup failed: ${error.message}`);
    return data || [];
  }

  async upsertPort(payload: Record<string, unknown>, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    const { data, error } = await client
      .from('zen_ports')
      .upsert(payload)
      .select('id, code, name, port_type:type')
      .single();

    if (error) throw new Error(`Port upsert failed: ${error.message}`);
    return data;
  }

  async findCommonCodes(group?: string, supabase?: SupabaseClient) {
    const client = supabase || await this.createClient();
    let query = client.from('zen_common_codes').select('*');

    if (group) query = query.eq('group', group);

    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) throw new Error(`Common codes lookup failed: ${error.message}`);
    return data || [];
  }
}
