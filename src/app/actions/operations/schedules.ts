'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { upsertVesselScheduleSchema, validatePayload } from '@/lib/validation/schemas';

/**
 * [WBS 4.5.3.1] 운항 스케줄을 조회합니다.
 */
export async function getVesselSchedules(filters: {
  originPortId?: string;
  destinationPortId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('zen_vessel_schedules')
    .select(`
      id,
      service_type,
      carrier_id,
      vessel_name,
      voyage_no,
      etd,
      eta,
      status,
      carrier:carrier_id(name),
      origin_port:origin_port_id(name, code),
      destination_port:destination_port_id(name, code)
    `, { count: "exact" });

  if (filters.originPortId) query = query.eq('origin_port_id', filters.originPortId);
  if (filters.destinationPortId) query = query.eq('destination_port_id', filters.destinationPortId);
  if (filters.startDate) query = query.gte('etd', filters.startDate);
  if (filters.endDate) query = query.lte('eta', filters.endDate);

  const { data, error, count } = await query
    .order('etd', { ascending: true })
    .range(from, to);
  if (error) throw new Error(`스케줄 조회 실패: ${error.message}`);
  return { schedules: data, total: count || 0 };
}

/**
 * [WBS 4.5.3.2] 운항 스케줄을 저장/수정합니다. (Admin 전용)
 */
export async function upsertVesselSchedule(payload: unknown) {
  const validated = validatePayload(upsertVesselScheduleSchema, payload);
  if (!validated.success) {
    throw new Error(`입력 검증 실패: ${validated.error}`);
  }
  const { supabase } = await validateAdminAction();
  const { data, error } = await supabase
    .from('zen_vessel_schedules')
    .upsert({
      ...validated.data,
      updated_at: new Date().toISOString()
    })
    .select("id, vessel_name, voyage_no, origin_port_id, destination_port_id, etd, eta, status")
    .single();

  if (error) throw new Error(`스케줄 저장 실패: ${error.message}`);
  revalidatePath('/schedules');
  return { success: true, data };
}

/**
 * [WBS 4.5.3.2] 운항 스케줄을 삭제합니다. (Admin 전용)
 */
export async function deleteVesselSchedule(id: string) {
  const { supabase } = await validateAdminAction();
  const { error } = await supabase
    .from('zen_vessel_schedules')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`스케줄 삭제 실패: ${error.message}`);
  revalidatePath('/schedules');
  return { success: true };
}
