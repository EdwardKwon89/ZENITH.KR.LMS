"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createorder, getnewlabel, removeorder } from '@/lib/shxk/order';
import {
  SHXK_SHIPPER_NAME, SHXK_SHIPPER_COUNTRY,
} from '@/lib/shxk/config';
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

function toIso3(code2: string): string {
  const map: Record<string, string> = {
    KR: 'KOR', US: 'USA', CN: 'CHN', JP: 'JPN',
  };
  return map[code2] ?? code2;
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
  order: Record<string, unknown>,
  countryCode: string,
  pkg: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<{ orderId: string; trackingNo: string | null; refrenceNo: string } | { error: string }> {
  // 결함 5: zen_order_items 실제 조회 (cargo_details 대체)
  const { data: orderItems } = await supabase
    .from('zen_order_items')
    .select('item_name, quantity, unit_price, sku_code, hs_code')
    .eq('package_id', packageId);

  const invoice = (orderItems && orderItems.length > 0)
    ? orderItems.map(item => ({
        invoice_enname:    item.item_name || 'General Merchandise',
        invoice_quantity:  String(item.quantity ?? 1),
        invoice_unitcharge: String(item.unit_price ?? '1.00'),
        ...(item.sku_code ? { sku: item.sku_code } : {}),
        ...(item.hs_code ? { hs_code: item.hs_code } : {}),
      }))
    : [{ invoice_enname: 'General Merchandise', invoice_quantity: '1', invoice_unitcharge: '1.00' }]

  // 결함 4: 패키지 레벨 필드
  const content_type = (pkg.content_type as string) || 'GENERAL';
  const cargotype = content_type === 'DOC' ? 'D' : 'W';

  const orderRes = await createorder({
    reference_no:    packageId,
    shipping_method: shxkCode,
    platform_id:     '',
    buyer_id:        '',
    order_status:    'P',
    order_weight:    Number(pkg.gross_weight ?? 0),
    order_pieces:    Number(pkg.physical_box_count ?? pkg.packing_count ?? 1),
    cargotype,
    shipper: {
      shipper_name:        (order.shipper_contact_name as string) || SHXK_SHIPPER_NAME,
      shipper_countrycode: (order.shipper_country_code as string) || SHXK_SHIPPER_COUNTRY,
      shipper_province:    (order.shipper_state_province as string) || '',
      shipper_city:        (order.shipper_city as string) || '',
      shipper_street:      (order.shipper_address as string) || '',
      shipper_postcode:    (order.shipper_zipcode as string) || '',
      shipper_telephone:   (order.shipper_contact_phone as string) || '',
    },
    consignee: {
      consignee_name:        (order.recipient_name as string) || 'E2E Consignee',
      consignee_countrycode: (order.recipient_country_code as string) || countryCode,
      consignee_province:    (order.recipient_state_province as string) || '',
      consignee_city:        (order.recipient_city as string) || '',
      consignee_street:      (order.recipient_address as string) || 'Unknown Street',
      consignee_postcode:    (order.recipient_zipcode as string) || '',
      consignee_telephone:   (order.recipient_phone as string) || '',
      consignee_email:       (order.recipient_email as string) || '',
    },
    invoice,
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
    tracking_number: trackingNumber ?? '',
    label_format: 'PDF',
    storage_path: '',
    generated_by: profileId,
  });
  return error?.message ?? null;
}

async function fetchAndSaveLabel(
  supabase: SupabaseClient,
  packageId: string,
): Promise<string | null> {
  const configInfo = {
    lable_file_type: '2',
    lable_paper_type: '1',
    lable_content_type: '4',
    additional_info: { lable_print_datetime: 'Y' },
  }
  const labelRes = await getnewlabel(configInfo, [{ reference_no: packageId }]);

  if (labelRes.success !== 1 || !labelRes.data) {
    logger.warn(`getnewlabel failed for package ${packageId}: ${labelRes.message}`);
    return null;
  }

  const labelUrl = labelRes.data.label_url ?? null;
  const labelFormat = labelRes.data.label_type === 'PDF' ? 'PDF' : 'PNG';

  const { error } = await supabase
    .from('zen_ups_labels')
    .update({
      label_format: labelFormat,
      storage_path: labelUrl ?? '',
    })
    .eq('package_id', packageId);

  if (error) logger.error('zen_ups_labels label update error:', error);
  return labelUrl;
}

async function markPackageIssued(
  supabase: SupabaseClient,
  packageId: string,
  trackingNumber: string | null,
): Promise<string | null> {
  const { error } = await supabase
    .from('zen_order_packages')
    .update({
      intl_ref_no: trackingNumber,
      intl_ref_locked: true,
      intl_ref_issued_at: new Date().toISOString(),
    })
    .eq('id', packageId);

  if (error) {
    logger.error('zen_order_packages update error:', error);
    return error.message;
  }
  return null;
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

    const countryCode = (order!.recipient_country_code as string)
      || await resolveCountryCode(supabase, order!.dest_port_id as string)
      || '';
    if (!countryCode) return { success: false, error: 'Destination country code not found' };

    const iso3Code = toIso3(countryCode);
    const shxkCode = await resolveShxkCode(supabase, order!.ups_product_code as string, iso3Code, order!.incoterms as string);
    if (!shxkCode) return { success: false, error: `shipping method not found for product=${order!.ups_product_code}, country=${iso3Code}, incoterms=${order!.incoterms}` };

    const orderResult = await placeShxkOrder(packageId, shxkCode, order!, countryCode, pkg!, supabase);
    if ('error' in orderResult) return { success: false, error: orderResult.error };

    const insertErr = await saveInitialLabel(supabase, order!.id as string, packageId, packageId, orderResult.trackingNo, profile!.id);
    if (insertErr) return { success: false, error: `Failed to save label record: ${insertErr}` };

    const labelUrl = await fetchAndSaveLabel(supabase, packageId);

    const pkgErr = await markPackageIssued(supabase, packageId, orderResult.trackingNo);
    if (pkgErr) return { success: false, error: `Failed to mark package issued: ${pkgErr}` };

    revalidatePath("/(dashboard)/warehouse/outbound", "page");

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

async function fetchActiveLabel(
  supabase: SupabaseClient,
  packageId: string,
): Promise<{ id: string; reference_no: string; tracking_number: string | null } | null> {
  const { data } = await supabase
    .from('zen_ups_labels')
    .select('id, reference_no, tracking_number')
    .eq('package_id', packageId)
    .eq('is_voided', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

async function markLabelVoided(supabase: SupabaseClient, packageId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('zen_ups_labels')
    .update({ is_voided: true, voided_at: new Date().toISOString() })
    .eq('package_id', packageId)
    .eq('is_voided', false)
    .select('id, is_voided');
  if (error) {
    logger.error('zen_ups_labels void update error:', error);
    return error.message;
  }
  return null;
}

async function unlockPackageIntlRef(supabase: SupabaseClient, packageId: string): Promise<string | null> {
  const { error } = await supabase
    .from('zen_order_packages')
    .update({ intl_ref_locked: false })
    .eq('id', packageId);
  if (error) {
    logger.error('zen_order_packages unlock error:', error);
    return error.message;
  }
  return null;
}

export async function voidUpsLabel(
  packageId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await checkLabelPermission(profile);
    if (permErr) return { success: false, error: permErr };

    const label = await fetchActiveLabel(supabase, packageId);
    if (!label) return { success: false, error: 'Void할 레이블이 없습니다.' };

    const removeRes = await removeorder(label.reference_no);
    if (removeRes.success === 0) {
      logger.warn(`removeorder API warning for package ${packageId}: ${removeRes.message}`);
    }

    const updateErr = await markLabelVoided(supabase, packageId);
    if (updateErr) return { success: false, error: `레이블 폐기 기록 실패: ${updateErr}` };

    const unlockErr = await unlockPackageIntlRef(supabase, packageId);
    if (unlockErr) return { success: false, error: `intl_ref 복원 실패: ${unlockErr}` };
    revalidatePath("/(dashboard)/warehouse/outbound", "page");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('voidUpsLabel error:', err);
    return { success: false, error: message };
  }
}
