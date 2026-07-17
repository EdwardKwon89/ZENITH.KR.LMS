"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createorder, getnewlabel, removeorder } from '@/lib/shxk/order';
import {
  SHXK_SHIPPER_NAME, SHXK_SHIPPER_COUNTRY,
} from '@/lib/shxk/config';
import { determineOrderCargotype, buildCargovolume, buildInvoiceFromItems, resolveProvinceEnglishName } from '@/lib/ups/label-mapping';
import { revalidatePath } from 'next/cache';

export interface IssueUpsLabelResult {
  shxk_order_id: string;
  tracking_number: string | null;
  reference_no: string;
  label_url: string | null;
  issued_packages: number;
}

async function checkLabelPermission(profile: { role: string } | null): Promise<string | null> {
  if (!profile) return 'User profile not found';
  const allowed: string[] = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN];
  if (!allowed.includes(profile.role as string)) {
    return '권한이 없습니다. ADMIN, MANAGER, ZENITH_SUPER_ADMIN만 가능합니다.';
  }
  return null;
}

async function lookupOrderPackages(
  supabase: SupabaseClient,
  orderId: string,
): Promise<{ packages: Record<string, unknown>[]; order: Record<string, unknown> | null; error: string | null }> {
  const { data: order, error: orderError } = await supabase
    .from('zen_orders')
    .select(`*, shipper_org:zen_organizations!shipper_id(
      address, address_detail, address_english, address_detail_english,
      country_code, state_province, city, zipcode
    )`)
    .eq('id', orderId)
    .single();

  if (orderError || !order) return { packages: [], order: null, error: 'Order not found' };

  const { data: pkgs, error: pkgError } = await supabase
    .from('zen_order_packages')
    .select('*, items:zen_order_items(*)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (pkgError) return { packages: [], order: null, error: 'Failed to fetch packages' };
  if (!pkgs || pkgs.length === 0) return { packages: [], order: null, error: 'Order has no packages' };

  return { packages: pkgs as Record<string, unknown>[], order: order as Record<string, unknown>, error: null };
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

export async function resolveShxkCode(
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
  shxkCode: string,
  order: Record<string, unknown>,
  countryCode: string,
  packages: Record<string, unknown>[],
): Promise<{ orderId: string; trackingNo: string | null; refrenceNo: string; message: string } | { error: string; message?: string }> {
  const { cargotype, mailCargoType } = determineOrderCargotype(packages);
  const cargovolume = buildCargovolume(packages);
  const invoice = buildInvoiceFromItems(packages);
  const totalPieces = packages.reduce((sum, p) => sum + Number(p.physical_box_count ?? p.packing_count ?? 1), 0);
  const totalWeight = packages.reduce((sum, p) => sum + Number(p.gross_weight ?? 0), 0);

  const shipperOrg = order.shipper_org as Record<string, unknown> | undefined;
  const shipperAddr = (shipperOrg?.address_english as string) || (shipperOrg?.address as string) || (order.shipper_address as string) || '';
  const shipperAddrDetail = (shipperOrg?.address_detail_english as string) || (shipperOrg?.address_detail as string) || (order.shipper_address_detail as string) || '';
  const shipperStreet = [shipperAddr, shipperAddrDetail].filter(Boolean).join(' ');
  const consigneeStreet = (order.recipient_address as string) || '';
  const localAddr = (order.recipient_address_local as string) || '';
  const fullConsigneeStreet = localAddr ? `${consigneeStreet} (${localAddr})` : consigneeStreet;

  const orderRes = await createorder({
    reference_no:    order.order_no as string,
    shipping_method: shxkCode,
    platform_id:     '',
    buyer_id:        '',
    order_status:    'P',
    order_weight:    totalWeight,
    order_pieces:    totalPieces,
    cargotype,
    mail_cargo_type: mailCargoType,
    cargovolume,
    shipper: {
      shipper_name:        (order.shipper_contact_name as string) || SHXK_SHIPPER_NAME,
      shipper_countrycode: (order.shipper_country_code as string) || SHXK_SHIPPER_COUNTRY,
      shipper_province:    (order.shipper_state_province as string) || '',
      shipper_city:        (order.shipper_city as string) || '',
      shipper_street:      shipperStreet,
      shipper_postcode:    (order.shipper_zipcode as string) || '',
      shipper_telephone:   (order.shipper_contact_phone as string) || '',
    },
    consignee: {
      consignee_name:        (order.recipient_name as string) || 'E2E Consignee',
      consignee_countrycode: (order.recipient_country_code as string) || countryCode,
      consignee_province:    resolveProvinceEnglishName((order.recipient_state_province as string) || '', (order.recipient_country_code as string) || countryCode),
      consignee_city:        (order.recipient_city as string) || '',
      consignee_street:      fullConsigneeStreet,
      consignee_postcode:    (order.recipient_zipcode as string) || '',
      consignee_telephone:   (order.recipient_phone as string) || '',
      consignee_email:       (order.recipient_email as string) || '',
      consignee_tariff:      (order.recipient_pccc as string) || '',
    },
    invoice,
  });

  if (orderRes.success === 0) return { error: `createorder failed: ${orderRes.message}`, message: orderRes.message };
  if (orderRes.success === 2 && !orderRes.data?.order_id) {
    return { error: 'duplicate order but no existing order_id returned', message: orderRes.message };
  }

  return {
    orderId: orderRes.data!.order_id,
    trackingNo: orderRes.data!.shipping_method_no ?? null,
    refrenceNo: orderRes.data!.refrence_no,
    message: orderRes.message,
  };
}

async function saveInitialLabel(
  supabase: SupabaseClient,
  orderId: string,
  referenceNo: string,
  trackingNumber: string | null,
  profileId: string,
  responseMessage?: string,
): Promise<string | null> {
  const { error } = await supabase.from('zen_ups_labels').insert({
    order_id: orderId,
    package_id: null,
    reference_no: referenceNo,
    tracking_number: trackingNumber ?? '',
    label_format: 'PDF',
    storage_path: '',
    generated_by: profileId,
    shxk_response_message: responseMessage || null,
  });
  return error?.message ?? null;
}

async function fetchAndSaveLabel(
  supabase: SupabaseClient,
  referenceNo: string,
): Promise<string | null> {
  const configInfo = {
    lable_file_type: '2',
    lable_paper_type: '1',
    lable_content_type: '4',
    additional_info: { lable_print_datetime: 'Y' },
  }
  const labelRes = await getnewlabel(configInfo, [{ reference_no: referenceNo }]);

  if (labelRes.success !== 1 || !labelRes.data) {
    logger.warn(`getnewlabel failed for ${referenceNo}: ${labelRes.message}`);
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
    .eq('reference_no', referenceNo);

  if (error) logger.error('zen_ups_labels label update error:', error);
  return labelUrl;
}

async function markAllPackagesIssued(
  supabase: SupabaseClient,
  orderId: string,
  trackingNumber: string | null,
): Promise<string | null> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('zen_order_packages')
    .update({
      intl_ref_no: trackingNumber,
      intl_ref_locked: true,
      intl_ref_issued_at: now,
    })
    .eq('order_id', orderId);

  if (error) {
    logger.error('zen_order_packages update error:', error);
    return error.message;
  }
  return null;
}

export async function issueUpsLabel(
  orderId: string,
): Promise<{ success: boolean; data?: IssueUpsLabelResult; error?: string }> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await checkLabelPermission(profile);
    if (permErr) return { success: false, error: permErr };

    const { packages, order, error: lookupErr } = await lookupOrderPackages(supabase, orderId);
    if (lookupErr) return { success: false, error: lookupErr };
    if (!order) return { success: false, error: 'Order not found' };

    const countryCode = (order.recipient_country_code as string)
      || await resolveCountryCode(supabase, order.dest_port_id as string)
      || '';
    if (!countryCode) return { success: false, error: 'Destination country code not found' };

    const shxkCode = await resolveShxkCode(supabase, order.ups_product_code as string, 'KOR', order.incoterms as string);
    if (!shxkCode) return { success: false, error: `shipping method not found for product=${order.ups_product_code}, country=KOR, incoterms=${order.incoterms}` };

    const orderResult = await placeShxkOrder(shxkCode, order!, countryCode, packages);
    if ('error' in orderResult) {
      await supabase.from('zen_ups_label_errors').insert({
        order_id: order.id as string,
        shxk_code: shxkCode,
        error_message: orderResult.message || orderResult.error,
        attempted_by: profile!.id,
      });
      return { success: false, error: orderResult.error };
    }

    const orderNo = order.order_no as string;
    const insertErr = await saveInitialLabel(supabase, order.id as string, orderNo, orderResult.trackingNo, profile!.id, orderResult.message);
    if (insertErr) return { success: false, error: `Failed to save label record: ${insertErr}` };

    const labelUrl = await fetchAndSaveLabel(supabase, orderNo);

    const pkgErr = await markAllPackagesIssued(supabase, order.id as string, orderResult.trackingNo);
    if (pkgErr) return { success: false, error: `Failed to mark packages issued: ${pkgErr}` };

    revalidatePath("/(dashboard)/warehouse/outbound", "page");

    return {
      success: true,
      data: {
        shxk_order_id: orderResult.orderId,
        tracking_number: orderResult.trackingNo,
        reference_no: orderNo,
        label_url: labelUrl,
        issued_packages: packages.length,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('issueUpsLabel error:', err);
    return { success: false, error: message };
  }
}

async function fetchActiveLabelByOrder(
  supabase: SupabaseClient,
  orderId: string,
): Promise<{ id: string; reference_no: string; tracking_number: string | null } | null> {
  const { data } = await supabase
    .from('zen_ups_labels')
    .select('id, reference_no, tracking_number')
    .eq('order_id', orderId)
    .eq('is_voided', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function markLabelVoidedByOrder(supabase: SupabaseClient, orderId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('zen_ups_labels')
    .update({ is_voided: true, voided_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('is_voided', false)
    .select('id, is_voided');
  if (error) {
    logger.error('zen_ups_labels void update error:', error);
    return error.message;
  }
  return null;
}

async function unlockAllPackagesIntlRef(supabase: SupabaseClient, orderId: string): Promise<string | null> {
  const { error } = await supabase
    .from('zen_order_packages')
    .update({ intl_ref_locked: false })
    .eq('order_id', orderId);
  if (error) {
    logger.error('zen_order_packages unlock error:', error);
    return error.message;
  }
  return null;
}

export async function voidUpsLabel(
  orderId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await checkLabelPermission(profile);
    if (permErr) return { success: false, error: permErr };

    const label = await fetchActiveLabelByOrder(supabase, orderId);
    if (!label) return { success: false, error: 'Void할 레이블이 없습니다.' };

    const removeRes = await removeorder(label.reference_no);
    if (removeRes.success === 0) {
      logger.warn(`removeorder API warning for order ${orderId}: ${removeRes.message}`);
    }

    const updateErr = await markLabelVoidedByOrder(supabase, orderId);
    if (updateErr) return { success: false, error: `레이블 폐기 기록 실패: ${updateErr}` };

    const unlockErr = await unlockAllPackagesIntlRef(supabase, orderId);
    if (unlockErr) return { success: false, error: `intl_ref 복원 실패: ${unlockErr}` };
    revalidatePath("/(dashboard)/warehouse/outbound", "page");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('voidUpsLabel error:', err);
    return { success: false, error: message };
  }
}

export async function getUpsLabelStatus(orderId: string): Promise<{ hasActiveLabel: boolean; trackingNumber: string | null }> {
  const { supabase } = await validateUserAction();
  const label = await fetchActiveLabelByOrder(supabase, orderId);
  return { hasActiveLabel: !!label, trackingNumber: label?.tracking_number ?? null };
}

const DOC_TYPE_CONTENT_MAP = { WAYBILL: '1', CUSTOMS: '2', INVOICE: '3' } as const;

export async function fetchShxkTradeDocument(
  orderId: string,
  docType: 'WAYBILL' | 'INVOICE' | 'CUSTOMS',
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await checkLabelPermission(profile);
    if (permErr) return { success: false, error: permErr };

    const label = await fetchActiveLabelByOrder(supabase, orderId);
    if (!label) return { success: false, error: '발급된 라벨이 없습니다.' };

    const configInfo = {
      lable_file_type: '2',
      lable_paper_type: '1',
      lable_content_type: DOC_TYPE_CONTENT_MAP[docType],
      additional_info: { lable_print_datetime: 'Y' },
    };
    const res = await getnewlabel(configInfo, [{ reference_no: label.reference_no }]);

    if (res.success !== 1 || !res.data?.label_url) {
      return { success: false, error: res.message || '문서 조회 실패' };
    }
    return { success: true, url: res.data.label_url };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('fetchShxkTradeDocument error:', err);
    return { success: false, error: message };
  }
}
