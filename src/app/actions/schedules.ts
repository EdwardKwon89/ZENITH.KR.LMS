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
}) {
  const supabase = await createClient();
  let query = supabase
    .from('zen_vessel_schedules')
    .select(`
      id,
      mode,
      carrier,
      vessel_no,
      flight_no,
      etd,
      eta,
      status,
      origin_port:origin_port_id(name, code),
      destination_port:destination_port_id(name, code)
    `);

  if (filters.originPortId) query = query.eq('origin_port_id', filters.originPortId);
  if (filters.destinationPortId) query = query.eq('destination_port_id', filters.destinationPortId);
  if (filters.startDate) query = query.gte('etd', filters.startDate);
  if (filters.endDate) query = query.lte('eta', filters.endDate);

  const { data, error } = await query.order('etd', { ascending: true });
  if (error) throw new Error(`스케줄 조회 실패: ${error.message}`);
  return data;
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
