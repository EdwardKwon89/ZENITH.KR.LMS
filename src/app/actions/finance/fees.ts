'use server';

import { revalidatePath } from 'next/cache';
import { validateAdminAction } from '@/lib/auth/guards';
import { upsertTransportCostSchema, validatePayload } from '@/lib/validation/schemas';

export async function getTransportCosts(page = 1, pageSize = 50) {
  const { supabase } = await validateAdminAction();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('zen_transport_costs')
    .select(`
      *,
      carrier:carrier_id(name),
      origin_port:origin_port_id(name, code),
      destination_port:destination_port_id(name, code)
    `, { count: "exact" })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`운송원가 조회 실패: ${error.message}`);
  return { costs: data, total: count || 0 };
}

export async function upsertTransportCost(payload: unknown) {
  const validated = validatePayload(upsertTransportCostSchema, payload);
  if (!validated.success) {
    throw new Error(`입력 검증 실패: ${validated.error}`);
  }
  const { supabase } = await validateAdminAction();
  const { data, error } = await supabase
    .from('zen_transport_costs')
    .upsert({
      ...validated.data,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(`운송원가 저장 실패: ${error.message}`);
  revalidatePath('/admin/transport-costs');
  return { success: true, data };
}

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
