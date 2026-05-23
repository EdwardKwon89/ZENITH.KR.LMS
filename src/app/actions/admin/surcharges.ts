"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";

interface CreateSurchargeData {
  carrier_id: string;
  surcharge_type: string;
  transport_mode: string;
  rate_type: string;
  amount: number;
  currency: string;
  valid_from: string;
  valid_until?: string | null;
}

interface UpdateSurchargeData extends Partial<CreateSurchargeData> {}

export async function createSurcharge(data: CreateSurchargeData) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || profile.role !== USER_ROLES.ADMIN) {
    throw new Error("Surcharge creation requires ADMIN role.");
  }

  const { data: surcharge, error } = await supabase
    .from('zen_surcharges')
    .insert({
      carrier_id: data.carrier_id,
      surcharge_type: data.surcharge_type,
      transport_mode: data.transport_mode,
      rate_type: data.rate_type,
      amount: data.amount,
      currency: data.currency || 'USD',
      valid_from: data.valid_from,
      valid_until: data.valid_until || null,
      is_active: true,
    })
    .select('id, carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from, valid_until, is_active, created_at')
    .single();

  if (error) throw new Error(`Surcharge creation failed: ${error.message}`);

  revalidatePath('/admin/rate-cards');
  return { success: true, surcharge };
}

export async function updateSurcharge(id: string, data: UpdateSurchargeData) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || profile.role !== USER_ROLES.ADMIN) {
    throw new Error("Surcharge update requires ADMIN role.");
  }

  const { data: surcharge, error } = await supabase
    .from('zen_surcharges')
    .update(data)
    .eq('id', id)
    .select('id, carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from, valid_until, is_active, created_at')
    .single();

  if (error) throw new Error(`Surcharge update failed: ${error.message}`);

  revalidatePath('/admin/rate-cards');
  return { success: true, surcharge };
}

export async function deleteSurcharge(id: string) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || profile.role !== USER_ROLES.ADMIN) {
    throw new Error("Surcharge deletion requires ADMIN role.");
  }

  const { error } = await supabase
    .from('zen_surcharges')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw new Error(`Surcharge deletion failed: ${error.message}`);

  revalidatePath('/admin/rate-cards');
  return { success: true };
}

export async function getSurcharges() {
  const { supabase, profile } = await validateUserAction();

  const { data, error } = await supabase
    .from('zen_surcharges')
    .select(`
      id, carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from, valid_until, is_active, created_at,
      carrier:zen_carriers!carrier_id(code, name, transport_mode)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch surcharges: ${error.message}`);
  return data || [];
}
