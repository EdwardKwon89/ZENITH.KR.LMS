"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";

interface CreateRateCardData {
  carrier_id: string;
  transport_mode: string;
  currency: string;
  tiers: { weight_min: number; unit_price: number }[];
  valid_from: string;
  valid_until?: string | null;
  carrier_cost?: number | null;
  margin_rate?: number | null;
  platform_fee_rate?: number | null;
}

interface UpdateRateCardData extends Partial<CreateRateCardData> {}

function validateRateOverlap(existing: { valid_from: string; valid_until: string | null }[], newFrom: string, newUntil: string | null): string | null {
  const newStart = new Date(newFrom).getTime();
  const newEnd = newUntil ? new Date(newUntil).getTime() : Infinity;

  for (const e of existing) {
    const eStart = new Date(e.valid_from).getTime();
    const eEnd = e.valid_until ? new Date(e.valid_until).getTime() : Infinity;

    if (newStart < eEnd && newEnd > eStart) {
      return `${e.valid_from}~${e.valid_until || '∞'} 기간에 이미 등록된 요율이 있습니다`;
    }
  }
  return null;
}

export async function createRateCard(data: CreateRateCardData) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || profile.role !== USER_ROLES.ADMIN) {
    throw new Error("Rate card creation requires ADMIN role.");
  }

  const { data: overlapping } = await supabase
    .from('zen_rate_cards')
    .select('valid_from, valid_until')
    .eq('carrier_id', data.carrier_id)
    .eq('transport_mode', data.transport_mode)
    .eq('is_active', true);

  const conflict = validateRateOverlap(overlapping || [], data.valid_from, data.valid_until ?? null);
  if (conflict) throw new Error(conflict);

  const { data: card, error } = await supabase
    .from('zen_rate_cards')
    .insert({
      carrier_id: data.carrier_id,
      transport_mode: data.transport_mode,
      currency: data.currency || 'USD',
      tiers: data.tiers,
      valid_from: data.valid_from,
      valid_until: data.valid_until || null,
      is_active: true,
      carrier_cost: data.carrier_cost ?? null,
      margin_rate: data.margin_rate ?? 15.0,
      platform_fee_rate: data.platform_fee_rate ?? 5.0,
    })
    .select('id, carrier_id, transport_mode, currency, tiers, valid_from, valid_until, is_active, created_at, carrier_cost, margin_rate, platform_fee_rate')
    .single();

  if (error) throw new Error(`Rate card creation failed: ${error.message}`);

  revalidatePath('/admin/rate-cards');
  return { success: true, card };
}

export async function updateRateCard(id: string, data: UpdateRateCardData) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || profile.role !== USER_ROLES.ADMIN) {
    throw new Error("Rate card update requires ADMIN role.");
  }

  const { data: card, error } = await supabase
    .from('zen_rate_cards')
    .update(data)
    .eq('id', id)
    .select('id, carrier_id, transport_mode, currency, tiers, valid_from, valid_until, is_active, created_at, carrier_cost, margin_rate, platform_fee_rate')
    .single();

  if (error) throw new Error(`Rate card update failed: ${error.message}`);

  revalidatePath('/admin/rate-cards');
  return { success: true, card };
}

export async function deleteRateCard(id: string) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || profile.role !== USER_ROLES.ADMIN) {
    throw new Error("Rate card deletion requires ADMIN role.");
  }

  const { error } = await supabase
    .from('zen_rate_cards')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw new Error(`Rate card deletion failed: ${error.message}`);

  revalidatePath('/admin/rate-cards');
  return { success: true };
}

export async function getRateCards() {
  const { supabase, profile } = await validateUserAction();

  const { data, error } = await supabase
    .from('zen_rate_cards')
    .select(`
      id, carrier_id, transport_mode, currency, tiers, valid_from, valid_until, is_active, created_at,
      carrier_cost, margin_rate, platform_fee_rate,
      carrier:zen_carriers!carrier_id(code, name, transport_mode)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch rate cards: ${error.message}`);
  return data || [];
}
