"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createorder, getnewlabel, removeorder } from '@/lib/shxk/order';
import {
  SHXK_SHIPPER_NAME, SHXK_SHIPPER_COUNTRY,
} from '@/lib/shxk/config';
import { buildCreateOrderPayload } from '@/lib/ups/label-mapping';
import { revalidatePath } from 'next/cache';
import type { GetNewLabelItem } from '@/lib/shxk/order';

const DOC_TYPE_CONTENT_MAP = { WAYBILL: '1', CUSTOMS: '2', INVOICE: '3', COMBINED: '6' } as const;

type DocType = keyof typeof DOC_TYPE_CONTENT_MAP;

function resolveContentType(docType: DocType): string {
  return DOC_TYPE_CONTENT_MAP[docType];
}

function resolveDocTypeLabel(contentType: string): string {
  const reverseMap: Record<string, string> = { '1': 'WAYBILL', '2': 'CUSTOMS', '3': 'INVOICE', '4': 'COMBINED', '6': 'COMBINED' };
  return reverseMap[contentType] || 'COMBINED';
}

/**
 * SHXK 외부 URL에서 PDF를 다운로드하여 Supabase Storage에 업로드하고,
 * zen_ups_label_documents 테이블에 메타데이터를 기록한 뒤 signed URL을 반환한다.
 * invoice-files.ts의 generateInvoicePdf 패턴을 재사용.
 */
export async function downloadAndStoreLabelDoc(
  supabase: SupabaseClient,
  orderId: string,
  referenceNo: string,
  labelId: string | null,
  contentType: string,
  originalUrl: string,
): Promise<{ signedUrl: string | null; storagePath: string; docType: string }> {
  const docType = resolveDocTypeLabel(contentType);

  const response = await fetch(originalUrl);
  if (!response.ok) {
    throw new Error(`PDF 다운로드 실패 (${response.status}): ${originalUrl}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const uuid = crypto.randomUUID();
  const storagePath = `ups-labels/${orderId}/${docType.toLowerCase()}-${uuid.slice(0, 8)}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
      metadata: { order_id: orderId, reference_no: referenceNo, doc_type: docType },
    });

  if (uploadError) {
    logger.error('[downloadAndStoreLabelDoc] Storage upload failed:', uploadError);
    throw new Error(`PDF 업로드 실패: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase
    .from('zen_ups_label_documents')
    .insert({
      order_id: orderId,
      label_id: labelId,
      reference_no: referenceNo,
      content_type: contentType,
      doc_type: docType,
      storage_path: storagePath,
      original_url: originalUrl,
      file_size_bytes: buffer.length,
    });

  if (insertError) {
    logger.error('[downloadAndStoreLabelDoc] DB insert failed:', insertError);
    throw new Error(`문서 메타데이터 저장 실패: ${insertError.message}`);
  }

  const { data: signed } = await supabase.storage
    .from('invoices')
    .createSignedUrl(storagePath, 3600);

  return { signedUrl: signed?.signedUrl ?? null, storagePath, docType };
}

export interface IssueUpsLabelResult {
  shxk_order_id: string;
  tracking_number: string | null;
  reference_no: string;
  label_url: string | null;
  issued_packages: number;
}

async function checkLabelPermission(profile: { role: string } | null): Promise<string | null> {
  if (!profile) return 'User profile not found';
  const allowed: string[] = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN, USER_ROLES.AGENCY];
  if (!allowed.includes(profile.role as string)) {
    logger.warn(`[checkLabelPermission] Denied for role: ${profile.role}`);
    return '권한이 없습니다. ADMIN, MANAGER, ZENITH_SUPER_ADMIN, AGENCY만 가능합니다.';
  }
  return null;
}

function reference_no_clean(refNo: string): string {
  return refNo.replace(/-/g, '');
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
  const payload = buildCreateOrderPayload(shxkCode, order, countryCode, packages, {
    name: SHXK_SHIPPER_NAME,
    country: SHXK_SHIPPER_COUNTRY,
  });

  const orderRes = await createorder(payload as unknown as Parameters<typeof createorder>[0]);

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
  orderId: string,
  labelId: string | null,
): Promise<string | null> {
  const configInfo = {
    lable_file_type: '2',
    lable_paper_type: '1',
    lable_content_type: '4',
    additional_info: { lable_print_datetime: 'Y' },
  }
  const labelRes = await getnewlabel(configInfo, [{ reference_no: reference_no_clean(referenceNo) }]);

  if (labelRes.success !== 1 || !labelRes.data?.length) {
    logger.warn(`getnewlabel failed for ${referenceNo}: ${labelRes.message}`);
    return null;
  }

  const items = labelRes.data;
  let lastSignedUrl: string | null = null;

  for (const item of items) {
    if (!item.lable_file) continue;
    try {
      const result = await downloadAndStoreLabelDoc(
        supabase, orderId, referenceNo, labelId,
        item.lable_content_type || '4', item.lable_file,
      );
      lastSignedUrl = result.signedUrl;
    } catch (err) {
      logger.error(`[fetchAndSaveLabel] document download/store failed for ${referenceNo}:`, err);
    }
  }

  const labelFormat = items[0]?.lable_file?.endsWith('.pdf') ? 'PDF' : 'PNG';
  const storagePath = lastSignedUrl || '';

  const { error } = await supabase
    .from('zen_ups_labels')
    .update({
      label_format: labelFormat,
      storage_path: storagePath,
    })
    .eq('reference_no', referenceNo);

  if (error) logger.error('zen_ups_labels label update error:', error);
  return lastSignedUrl;
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

/**
 * PACKED 단계용 — createorder SHXK 등록 + 초기 라벨 레코드 저장.
 * getnewlabel(운송장 발급)은 수행하지 않음.
 */
export async function registerUpsOrder(
  orderId: string,
): Promise<{ success: boolean; data?: { shxk_order_id: string; tracking_number: string | null; reference_no: string }; error?: string }> {
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

    revalidatePath("/(dashboard)/warehouse/outbound", "page");

    return {
      success: true,
      data: {
        shxk_order_id: orderResult.orderId,
        tracking_number: orderResult.trackingNo,
        reference_no: orderNo,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('registerUpsOrder error:', err);
    return { success: false, error: message };
  }
}

/**
 * RELEASED 단계용 — 저장된 SHXK 라벨 정보로 getnewlabel 호출 + 패키지 발급 처리.
 * docType 지정 시 해당 문서 유형(WAYBILL/INVOICE/CUSTOMS)으로 getnewlabel 호출.
 */
export interface FetchLabelResult {
  success: boolean
  url?: string
  urls?: string[]
  error?: string
}

export async function fetchAndIssueUpsLabel(
  orderId: string,
  docType?: 'WAYBILL' | 'INVOICE' | 'CUSTOMS' | 'COMBINED',
): Promise<FetchLabelResult> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await checkLabelPermission(profile);
    if (permErr) return { success: false, error: permErr };

    const label = await fetchActiveLabelByOrder(supabase, orderId);
    if (!label) return { success: false, error: '발급된 라벨이 없습니다.' };

    if (docType) {
      const configInfo = {
        lable_file_type: '2',
        lable_paper_type: '1',
        lable_content_type: DOC_TYPE_CONTENT_MAP[docType],
        additional_info: { lable_print_datetime: 'Y' },
      };
      const res = await getnewlabel(configInfo, [{ reference_no: reference_no_clean(label.reference_no) }]);
      if (res.success !== 1 || !res.data?.length) {
        return { success: false, error: res.message || '문서 조회 실패' };
      }

      const storedUrls: string[] = [];
      for (const item of res.data) {
        if (!item.lable_file) continue;
        try {
          const result = await downloadAndStoreLabelDoc(
            supabase, orderId, label.reference_no, label.id,
            item.lable_content_type || DOC_TYPE_CONTENT_MAP[docType], item.lable_file,
          );
          if (result.signedUrl) storedUrls.push(result.signedUrl);
        } catch (err) {
          logger.error(`[fetchAndIssueUpsLabel] document download/store failed for ${label.reference_no}:`, err);
        }
      }

      if (!storedUrls.length) return { success: false, error: '발급된 문서 저장 실패' };

      const pkgErr = await markAllPackagesIssued(supabase, orderId, label.tracking_number);
      if (pkgErr) return { success: false, error: `Failed to mark packages issued: ${pkgErr}` };
      revalidatePath("/(dashboard)/warehouse/outbound", "page");

      if (docType === 'COMBINED') {
        return { success: true, urls: storedUrls };
      }
      return { success: true, url: storedUrls[0] };
    }

    // docType 없음 → 기본 라벨 발급 (fetchAndSaveLabel)
    const labelUrl = await fetchAndSaveLabel(supabase, label.reference_no, orderId, label.id);
    if (!labelUrl) return { success: false, error: '라벨 발급 실패 (getnewlabel)' };

    const pkgErr = await markAllPackagesIssued(supabase, orderId, label.tracking_number);
    if (pkgErr) return { success: false, error: `Failed to mark packages issued: ${pkgErr}` };

    revalidatePath("/(dashboard)/warehouse/outbound", "page");

    return { success: true, url: labelUrl ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('fetchAndIssueUpsLabel error:', err);
    return { success: false, error: message };
  }
}

/**
 * UPS등록취소 — removeorder SHXK 호출 + 초기 라벨 레코드 정리.
 * voidUpsLabel()과 달리 getnewlabel(라벨 발급) 전 단계이므로
 * fetchActiveLabelByOrder 대신 직접 조회.
 */
export async function cancelUpsRegistration(
  orderId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await checkLabelPermission(profile);
    if (permErr) return { success: false, error: permErr };

    const { data: labels, error: labelsErr } = await supabase
      .from('zen_ups_labels')
      .select('id, reference_no, tracking_number')
      .eq('order_id', orderId)
      .is('is_voided', false)
      .order('created_at', { ascending: false });

    if (labelsErr) {
      logger.error('zen_ups_labels select error:', labelsErr);
      return { success: false, error: `라벨 조회 실패: ${labelsErr.message}` };
    }
    if (!labels || labels.length === 0) {
      return { success: false, error: '취소할 UPS 라벨 레코드가 없습니다.' };
    }

    const referenceNo = labels[0].reference_no;
    const removeRes = await removeorder(referenceNo.replace(/-/g, ''));
    if (removeRes.success === 0) {
      logger.warn(`removeorder API warning for order ${orderId}: ${removeRes.message}`);
    }

    const labelIds = labels.map((l) => l.id);

    const { data: docs } = await supabase
      .from('zen_ups_label_documents')
      .select('id, storage_path')
      .in('label_id', labelIds);

    if (docs && docs.length > 0) {
      const storagePaths = docs.map((d) => d.storage_path);
      const { error: storageErr } = await supabase.storage
        .from('invoices')
        .remove(storagePaths);
      if (storageErr) {
        logger.warn(`storage remove warning for order ${orderId}: ${storageErr.message}`);
      }

      const { error: docsDelErr } = await supabase
        .from('zen_ups_label_documents')
        .delete()
        .in('id', docs.map((d) => d.id));
      if (docsDelErr) {
        logger.warn(`zen_ups_label_documents delete warning for order ${orderId}: ${docsDelErr.message}`);
      }
    }

    const { error: deleteErr } = await supabase
      .from('zen_ups_labels')
      .delete()
      .eq('order_id', orderId)
      .eq('is_voided', false);

    if (deleteErr) {
      logger.error('zen_ups_labels delete error:', deleteErr);
      return { success: false, error: `라벨 레코드 삭제 실패: ${deleteErr.message}` };
    }

    revalidatePath("/(dashboard)/warehouse/outbound", "page");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('cancelUpsRegistration error:', err);
    return { success: false, error: message };
  }
}

/**
 * 하위호환 — 기존 호출부(OutboundProcessForm.tsx 등) 유지.
 * 내부적으로 registerUpsOrder + fetchAndIssueUpsLabel을 순차 호출.
 */
export async function issueUpsLabel(
  orderId: string,
): Promise<{ success: boolean; data?: IssueUpsLabelResult; error?: string }> {
  try {
    const regResult = await registerUpsOrder(orderId);
    if (!regResult.success) return { success: false, error: regResult.error };

    const issueResult = await fetchAndIssueUpsLabel(orderId);
    if (!issueResult.success) return { success: false, error: issueResult.error };

    const { supabase } = await validateUserAction();
    const { packages } = await lookupOrderPackages(supabase, orderId);

    revalidatePath("/(dashboard)/warehouse/outbound", "page");

    return {
      success: true,
      data: {
        shxk_order_id: regResult.data!.shxk_order_id,
        tracking_number: regResult.data!.tracking_number,
        reference_no: regResult.data!.reference_no,
        label_url: issueResult.url ?? null,
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

    const removeRes = await removeorder(label.reference_no.replace(/-/g, ''));
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

export async function previewShxkPayload(
  orderId: string,
  action: 'CREATEORDER' | 'WAYBILL' | 'INVOICE' | 'CUSTOMS' | 'VOID',
): Promise<{ success: boolean; payload?: Record<string, unknown>; error?: string }> {
  try {
    const { supabase, profile } = await validateUserAction();
    const permErr = await checkLabelPermission(profile);
    if (permErr) return { success: false, error: permErr };

    if (action === 'CREATEORDER') {
      const { packages, order, error: lookupErr } = await lookupOrderPackages(supabase, orderId);
      if (lookupErr) return { success: false, error: lookupErr };
      if (!order) return { success: false, error: 'Order not found' };

      const countryCode = (order.recipient_country_code as string)
        || await resolveCountryCode(supabase, order.dest_port_id as string)
        || '';
      if (!countryCode) return { success: false, error: 'Destination country code not found' };

      const shxkCode = await resolveShxkCode(supabase, order.ups_product_code as string, 'KOR', order.incoterms as string);
      if (!shxkCode) return { success: false, error: `shipping method not found for product=${order.ups_product_code}, country=KOR, incoterms=${order.incoterms}` };

      const payload = buildCreateOrderPayload(shxkCode, order, countryCode, packages, {
        name: SHXK_SHIPPER_NAME,
        country: SHXK_SHIPPER_COUNTRY,
      });
      return { success: true, payload: payload as Record<string, unknown> };
    }

    const label = await fetchActiveLabelByOrder(supabase, orderId);
    if (!label) return { success: false, error: '발급된 라벨이 없습니다.' };

    if (action === 'WAYBILL' || action === 'INVOICE' || action === 'CUSTOMS') {
      const docTypeMap: Record<string, string> = { WAYBILL: '1', CUSTOMS: '2', INVOICE: '3' };
      const configInfo = {
        lable_file_type: '2',
        lable_paper_type: '1',
        lable_content_type: docTypeMap[action],
        additional_info: { lable_print_datetime: 'Y' },
      };
      return { success: true, payload: { configInfo, listorder: [{ reference_no: label.reference_no.replace(/-/g, '') }] } as Record<string, unknown> };
    }

    if (action === 'VOID') {
      return { success: true, payload: { reference_no: label.reference_no.replace(/-/g, '') } as Record<string, unknown> };
    }

    return { success: false, error: 'Unknown action' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('previewShxkPayload error:', err);
    return { success: false, error: message };
  }
}

export async function triggerCreateOrderTest(
  orderId: string,
): Promise<{ success: boolean; data?: { orderId: string; trackingNo: string | null; refrenceNo: string }; error?: string }> {
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
      return { success: false, error: orderResult.error };
    }

    return {
      success: true,
      data: {
        orderId: orderResult.orderId,
        trackingNo: orderResult.trackingNo,
        refrenceNo: orderResult.refrenceNo,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('triggerCreateOrderTest error:', err);
    return { success: false, error: message };
  }
}

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
    const res = await getnewlabel(configInfo, [{ reference_no: reference_no_clean(label.reference_no) }]);

    if (res.success !== 1 || !res.data?.length) {
      return { success: false, error: res.message || '문서 조회 실패' };
    }

    const storedUrls: string[] = [];
    for (const item of res.data) {
      if (!item.lable_file) continue;
      try {
        const result = await downloadAndStoreLabelDoc(
          supabase, orderId, label.reference_no, label.id,
          item.lable_content_type || DOC_TYPE_CONTENT_MAP[docType], item.lable_file,
        );
        if (result.signedUrl) storedUrls.push(result.signedUrl);
      } catch (err) {
        logger.error(`[fetchShxkTradeDocument] document download/store failed for ${label.reference_no}:`, err);
      }
    }

    if (!storedUrls.length) {
      return { success: false, error: '문서 다운로드/저장 실패' };
    }
    return { success: true, url: storedUrls[0] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('fetchShxkTradeDocument error:', err);
    return { success: false, error: message };
  }
}
