"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createorder, getnewlabel } from '@/lib/shxk/order';
import { revalidatePath } from 'next/cache';

export interface IssueUpsLabelResult {
  shxk_order_id: string;
  tracking_number: string | null;
  reference_no: string;
  label_url: string | null;
}

async function checkLabelPermission(profile: { role: string } | null): Promise<string | null> {
  if (!profile) return 'User profile not found';
  const allowed: string[] = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN];
  if (!allowed.includes(profile.role as string)) {
    return '권한이 없습니다. ADMIN, MANAGER, ZENITH_SUPER_ADMIN만 가능합니다.';
  }
  return null;
}

async function lookupPackage(
  supabase: SupabaseClient,
  packageId: string,
): Promise<{ pkg: Record<string, unknown> | null; order: Record<string, unknown> | null; error: string | null }> {
  const { data, error } = await supabase
    .from('zen_order_packages')
    .select('*, order:zen_orders(*)')
    .eq('id', packageId)
    .single();

  if (error || !data) return { pkg: null, order: null, error: 'Package not found' };
  if (data.intl_ref_locked) return { pkg: null, order: null, error: '이미 레이블이 발급된 패키지입니다.' };

  const order = data.order as Record<string, unknown> | undefined;
  if (!order) return { pkg: null, order: null, error: 'Order not found for package' };

  return { pkg: data as Record<string, unknown>, order, error: null };
}

async function resolveCountryCode(supabase: SupabaseClient, destPortId: string): Promise<string | null> {
  const { data } = await supabase
    .from('zen_ports')
    .select('country_code')
    .eq('id', destPortId)
    .single();
  return data?.country_code ?? null;
}

async function resolveShxkCode(
  supabase: SupabaseClient,
  productCode: string,
  countryCode: string,
  incoterms: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('zen_ups_shxk_country_map')
    .select('shxk_code')
    .eq('product_code', productCode)
    .eq('country_code', countryCode)
    .eq('incoterms', incoterms)
    .single();
  return data?.shxk_code ?? null;
}

async function placeShxkOrder(
  packageId: string,
  shxkCode: string,
): Promise<{ orderId: string; trackingNo: string | null; refrenceNo: string } | { error: string }> {
  const orderRes = await createorder({
    reference_no: packageId,
    shipping_method: shxkCode,
    platform_id: '',
    buyer_id: '',
    order_status: 'P',
  });

  if (orderRes.success === 0) return { error: `createorder failed: ${orderRes.message}` };
  if (orderRes.success === 2 && !orderRes.data?.order_id) {
    return { error: 'duplicate order but no existing order_id returned' };
  }

  return {
    orderId: orderRes.data!.order_id,
    trackingNo: orderRes.data!.shipping_method_no ?? null,
    refrenceNo: orderRes.data!.refrence_no,
  };
}

async function saveInitialLabel(
  supabase: SupabaseClient,
  orderId: string,
  packageId: string,
  referenceNo: string,
  trackingNumber: string | null,
  profileId: string,
): Promise<string | null> {
  const { error } = await supabase.from('zen_ups_labels').insert({
    order_id: orderId,
    package_id: packageId,
    reference_no: referenceNo,
    tracking_number: trackingNumber,
    generated_by: profileId,
  });
  return error?.message ?? null;
}

async function fetchAndSaveLabel(
  supabase: SupabaseClient,
  shxkOrderId: string,
  packageId: string,
): Promise<string | null> {
  const labelRes = await getnewlabel(shxkOrderId);

  if (labelRes.success !== 1 || !labelRes.data) {
    logger.warn(`getnewlabel failed for order ${shxkOrderId}: ${labelRes.message}`);
    return null;
  }

  const labelData = labelRes.data.label_data ?? null;
  const labelUrl = labelRes.data.label_url ?? null;
  const labelFormat = labelRes.data.label_type === 'PDF' ? 'PDF' : 'PNG';

  const { error } = await supabase
    .from('zen_ups_labels')
    .update({
      label_data: labelData,
      label_format: labelFormat,
      storage_path: labelUrl,
    })
    .eq('package_id', packageId);

  if (error) logger.error('zen_ups_labels label update error:', error);
  return labelUrl;
}

async function markPackageIssued(
  supabase: SupabaseClient,
  packageId: string,
  trackingNumber: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('zen_order_packages')
    .update({
      intl_ref_no: trackingNumber,
      intl_ref_locked: true,
      intl_ref_issued_at: new Date().toISOString(),
    })
    .eq('id', packageId);

  if (error) logger.error('zen_order_packages update error:', error);
}

export async function issueUpsLabel(
  packageId: string,
): Promise<{ success: boolean; data?: IssueUpsLabelResult; error?: string }> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await checkLabelPermission(profile);
    if (permErr) return { success: false, error: permErr };

    const { pkg, order, error: lookupErr } = await lookupPackage(supabase, packageId);
    if (lookupErr) return { success: false, error: lookupErr };

    const countryCode = await resolveCountryCode(supabase, order!.dest_port_id as string);
    if (!countryCode) return { success: false, error: 'Destination country code not found' };

    const shxkCode = await resolveShxkCode(supabase, order!.ups_product_code as string, countryCode, order!.incoterms as string);
    if (!shxkCode) return { success: false, error: `shipping method not found for product=${order!.ups_product_code}, country=${countryCode}, incoterms=${order!.incoterms}` };

    const orderResult = await placeShxkOrder(packageId, shxkCode);
    if ('error' in orderResult) return { success: false, error: orderResult.error };

    const insertErr = await saveInitialLabel(supabase, order!.id as string, packageId, packageId, orderResult.trackingNo, profile!.id);
    if (insertErr) return { success: false, error: `Failed to save label record: ${insertErr}` };

    const labelUrl = await fetchAndSaveLabel(supabase, orderResult.orderId, packageId);

    await markPackageIssued(supabase, packageId, orderResult.trackingNo);

    revalidatePath('/operations/warehouse');

    return {
      success: true,
      data: {
        shxk_order_id: orderResult.orderId,
        tracking_number: orderResult.trackingNo,
        reference_no: packageId,
        label_url: labelUrl,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('issueUpsLabel error:', err);
    return { success: false, error: message };
  }
}
