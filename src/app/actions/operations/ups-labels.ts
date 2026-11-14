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
import { validateShxkPayload, type ShxkPayloadShape } from '@/lib/shxk/validate-payload';
import { revalidatePath } from 'next/cache';
import type { GetNewLabelItem } from '@/lib/shxk/order';
import { actionLocale, trError } from '@/lib/i18n/action-error';
import { translateShxkMessage } from '@/lib/shxk/translate';

const DOC_TYPE_CONTENT_MAP = { WAYBILL: '1', CUSTOMS: '2', INVOICE: '3', COMBINED: '6' } as const;

const STORAGE_UPLOAD_RETRY_DELAY_MS = 500;

type ErrorKey = Parameters<typeof trError>[0];

/**
 * TASK-B-351 (Issue #1299): SHXK 응답 원문을 현재 로케일 문장으로 변환한다.
 * - 사전(translate.ts)에 매칭되면 해당 로케일 번역문 반환
 * - 미매칭이면 일반문구(`Errors.shxk_generic`, `{code}`)로 대체
 * - **원문은 반환하지 않는다** — 호출부에서 logger / zen_ups_label_errors 로만 보존.
 */
async function resolveShxkError(
  message: string | null | undefined,
  fallbackKey: ErrorKey,
  fallbackCode: string,
): Promise<string> {
  const localized = translateShxkMessage(message, await actionLocale());
  if (localized) return localized;
  return trError(fallbackKey, { code: fallbackCode });
}

type DocType = keyof typeof DOC_TYPE_CONTENT_MAP;

function resolveContentType(docType: DocType): string {
  return DOC_TYPE_CONTENT_MAP[docType];
}

function resolveDocTypeLabel(contentType: string): string {
  const reverseMap: Record<string, string> = { '1': 'WAYBILL', '2': 'CUSTOMS', '3': 'INVOICE', '4': 'COMBINED', '6': 'COMBINED' };
  return reverseMap[contentType] || 'COMBINED';
}

/**
 * StorageError는 실패 유형에 따라 `.message`가 비어올 수 있음(DEF-B-148).
 * 근본원인 진단을 위해 객체 전체의 own property를 구조화해 반환한다.
 */
function describeStorageError(uploadError: unknown): Record<string, unknown> {
  if (uploadError == null) return { raw: String(uploadError) };
  if (typeof uploadError !== 'object') return { value: String(uploadError) };

  const src = uploadError as Record<string, unknown>;
  const described: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(src)) {
    try {
      const value = (src as Record<string, unknown>)[key];
      described[key] = typeof value === 'function' ? '[function]' : value;
    } catch {
      described[key] = '[unreadable]';
    }
  }
  if (described.message === undefined) described.message = (src as { message?: unknown }).message;
  if (described.error === undefined) described.error = (src as { error?: unknown }).error;
  if (described.statusCode === undefined) {
    described.statusCode = (src as { statusCode?: unknown }).statusCode ?? (src as { status?: unknown }).status;
  }
  if (described.hint === undefined) described.hint = (src as { hint?: unknown }).hint;
  if (described.details === undefined) described.details = (src as { details?: unknown }).details;
  return described;
}

function resolveUploadErrorDetail(uploadError: unknown): string {
  const described = describeStorageError(uploadError);
  const directMessage = (uploadError as { message?: string } | null)?.message;
  // DEF-B-148: message가 비어있던 사례(`<none>`) 재발 방지 — 빈 값이면 객체 전체를 JSON으로 남긴다
  if (directMessage && String(directMessage).trim().length > 0) return String(directMessage);
  try {
    return JSON.stringify(described);
  } catch {
    const fallback =
      (uploadError as { error?: string } | null)?.error ||
      (uploadError as { hint?: string } | null)?.hint ||
      'unknown';
    return String(fallback);
  }
}

/**
 * SHXK 외부 URL에서 PDF를 다운로드하여 Supabase Storage에 업로드하고,
 * zen_ups_label_documents 테이블에 메타데이터를 기록한 뒤 signed URL을 반환한다.
 * invoice-files.ts의 generateInvoicePdf 패턴을 재사용.
 *
 * DEF-B-148 (TASK-B-328): 업로드 실패 시 1회 재시도 + uploadError 객체 전체를
 * 구조화 로깅해 근본원인(용량/네트워크/권한 등) 진단 가능하게 개선.
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
  const uploadOptions = {
    contentType: 'application/pdf',
    upsert: false,
    metadata: { order_id: orderId, reference_no: referenceNo, doc_type: docType },
  };

  let { error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(storagePath, buffer, uploadOptions);

  if (uploadError) {
    logger.error('[downloadAndStoreLabelDoc] Storage upload failed:', {
      orderId,
      referenceNo,
      storagePath,
      contentType,
      docType,
      attempt: 1,
      uploadError: describeStorageError(uploadError),
    });

    await new Promise((resolve) => setTimeout(resolve, STORAGE_UPLOAD_RETRY_DELAY_MS));
    const retry = await supabase.storage
      .from('invoices')
      .upload(storagePath, buffer, uploadOptions);
    uploadError = retry.error;

    if (uploadError) {
      logger.error('[downloadAndStoreLabelDoc] Storage upload retry failed:', {
        orderId,
        referenceNo,
        storagePath,
        contentType,
        docType,
        attempt: 2,
        uploadError: describeStorageError(uploadError),
      });
      throw new Error(`PDF 업로드 실패: ${resolveUploadErrorDetail(uploadError)}`);
    }
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
  if (!profile) {
    logger.warn('[checkLabelPermission] User profile not found');
    return trError('profile_not_found');
  }
  const allowed: string[] = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN, USER_ROLES.AGENCY];
  if (!allowed.includes(profile.role as string)) {
    logger.warn(`[checkLabelPermission] Denied for role: ${profile.role}`);
    return trError('permission_denied');
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
      name, address, address_detail, address_english, address_detail_english,
      country_code, state_province, city, zipcode
    )`)
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    if (orderError) logger.error('lookupOrderPackages: zen_orders select failed', orderError);
    else logger.warn(`lookupOrderPackages: order not found (${orderId})`);
    return { packages: [], order: null, error: await trError('order_not_found') };
  }

  const { data: pkgs, error: pkgError } = await supabase
    .from('zen_order_packages')
    .select('*, items:zen_order_items(*)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (pkgError) {
    logger.error('lookupOrderPackages: zen_order_packages select failed', pkgError);
    return { packages: [], order: null, error: await trError('packages_not_found') };
  }
  if (!pkgs || pkgs.length === 0) {
    logger.warn(`lookupOrderPackages: order has no packages (${orderId})`);
    return { packages: [], order: null, error: await trError('order_has_no_packages') };
  }

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
): Promise<{ orderId: string; trackingNo: string | null; refrenceNo: string; message: string } | { error: string; rawMessage?: string }> {
  const payload = buildCreateOrderPayload(shxkCode, order, countryCode, packages, {
    name: SHXK_SHIPPER_NAME,
    country: SHXK_SHIPPER_COUNTRY,
  });

  // TASK-B-277 (Issue #1052): SHXK 필수 필드 사전 검증 — 누락 시 API 호출 스킵하고 즉시 실패
  const payloadErrors = validateShxkPayload(payload as ShxkPayloadShape);
  if (payloadErrors.length > 0) {
    logger.warn(`placeShxkOrder: payload validation failed — ${payloadErrors.join(', ')}`); // TASK-B-344 (Issue #1270)
    // TASK-B-351 (Issue #1299): 사용자에게는 로케일 문장만 — 필드 원문은 로그에 이미 남겼다.
    return { error: await trError('shxk_validation_failed', { fields: payloadErrors.join(', ') }) };
  }

  const orderRes = await createorder(payload as unknown as Parameters<typeof createorder>[0]);

  if (orderRes.success === 0) {
    logger.error(`[SHXK] createorder failed — raw message: ${orderRes.message}`);
    return {
      error: await resolveShxkError(orderRes.message, 'shxk_generic', 'CREATEORDER'),
      rawMessage: orderRes.message,
    };
  }
  if (orderRes.success === 2 && !orderRes.data?.order_id) {
    logger.error(`[SHXK] createorder duplicate without order_id — raw message: ${orderRes.message}`);
    return {
      error: await trError('shxk_generic', { code: 'DUPLICATE_ORDER' }),
      rawMessage: orderRes.message,
    };
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

/**
 * DEF-B-148 (TASK-B-328): getnewlabel 자체 실패 vs Storage 저장 실패를 구분해
 * 호출부가 정확한 오류 메시지를 반환할 수 있도록 반환 타입을 확장.
 */
async function fetchAndSaveLabel(
  supabase: SupabaseClient,
  referenceNo: string,
  orderId: string,
  labelId: string | null,
): Promise<{ signedUrl: string | null; getNewLabelFailed: boolean; failureMessage?: string }> {
  const configInfo = {
    lable_file_type: '2',
    lable_paper_type: '1',
    lable_content_type: '4',
    additional_info: { lable_print_datetime: 'Y' },
  }
  const labelRes = await getnewlabel(configInfo, [{ reference_no: reference_no_clean(referenceNo) }]);

  if (labelRes.success !== 1 || !labelRes.data?.length) {
    logger.warn(`getnewlabel failed for ${referenceNo}: ${labelRes.message}`);
    return { signedUrl: null, getNewLabelFailed: true, failureMessage: labelRes.message };
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
  return { signedUrl: lastSignedUrl, getNewLabelFailed: false };
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
    if (!order) return { success: false, error: await trError('order_not_found') };

    const countryCode = (order.recipient_country_code as string)
      || await resolveCountryCode(supabase, order.dest_port_id as string)
      || '';
    if (!countryCode) {
      logger.warn(`registerUpsOrder: destination country code not found (order=${orderId})`);
      return { success: false, error: await trError('destination_country_not_found') };
    }

    const shxkCode = await resolveShxkCode(supabase, order.ups_product_code as string, 'KOR', order.incoterms as string);
    if (!shxkCode) {
      logger.warn(`registerUpsOrder: shipping method not found (product=${order.ups_product_code}, incoterms=${order.incoterms})`);
      return { success: false, error: await trError('shipping_method_not_found') };
    }

    const orderResult = await placeShxkOrder(shxkCode, order!, countryCode, packages);
    if ('error' in orderResult) {
      await supabase.from('zen_ups_label_errors').insert({
        order_id: order.id as string,
        shxk_code: shxkCode,
        // TASK-B-351: 사용자 반환값에는 원문을 넣지 않고, DB(zen_ups_label_errors)에만 원문 보존
        error_message: orderResult.rawMessage || orderResult.error,
        attempted_by: profile!.id,
      });
      return { success: false, error: orderResult.error };
    }

    const orderNo = order.order_no as string;
    const insertErr = await saveInitialLabel(supabase, order.id as string, orderNo, orderResult.trackingNo, profile!.id, orderResult.message);
    if (insertErr) {
      logger.error('registerUpsOrder: zen_ups_labels insert failed', insertErr);
      return { success: false, error: await trError('generic', { code: 'LABEL_RECORD_SAVE' }) };
    }

    // DEF-123: zen_tracking_configs.tracking_no를 실제 UPS 운송장번호로 갱신
    if (orderResult.trackingNo) {
      const { error: updateErr } = await supabase
        .from('zen_tracking_configs')
        .update({ tracking_no: orderResult.trackingNo, updated_at: new Date().toISOString() })
        .eq('order_id', order.id as string);
      if (updateErr) {
        logger.error('registerUpsOrder: tracking_configs update failed', updateErr);
      }
    }

    revalidatePath("/(dashboard)/warehouse/outbound", "page");
    revalidatePath('/(dashboard)/orders/[orderId]', 'page');

    return {
      success: true,
      data: {
        shxk_order_id: orderResult.orderId,
        tracking_number: orderResult.trackingNo,
        reference_no: orderNo,
      },
    };
  } catch (err) {
    logger.error('registerUpsOrder error:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
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
    if (!label) {
      logger.warn(`No active label (order=${orderId})`);
      return { success: false, error: await trError('label_not_found') };
    }

    if (docType) {
      const configInfo = {
        lable_file_type: '2',
        lable_paper_type: '1',
        lable_content_type: DOC_TYPE_CONTENT_MAP[docType],
        additional_info: { lable_print_datetime: 'Y' },
      };
      const res = await getnewlabel(configInfo, [{ reference_no: reference_no_clean(label.reference_no) }]);
      if (res.success !== 1 || !res.data?.length) {
        logger.error(`[SHXK] getnewlabel(docType=${docType}) failed — raw message: ${res.message}`);
        return {
          success: false,
          error: await resolveShxkError(res.message, 'document_fetch_failed', 'GETNEWLABEL_DOC'),
        };
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

      if (!storedUrls.length) {
        logger.error(`fetchAndIssueUpsLabel: document download/store failed (order=${orderId}, docType=${docType})`);
        return { success: false, error: await trError('document_save_failed') };
      }

      const pkgErr = await markAllPackagesIssued(supabase, orderId, label.tracking_number);
      if (pkgErr) {
        logger.error('fetchAndIssueUpsLabel: mark packages issued failed', pkgErr);
        return { success: false, error: await trError('generic', { code: 'PACKAGES_MARK' }) };
      }
      revalidatePath("/(dashboard)/warehouse/outbound", "page");
      revalidatePath('/(dashboard)/orders/[orderId]', 'page');

      if (docType === 'COMBINED') {
        return { success: true, urls: storedUrls };
      }
      return { success: true, url: storedUrls[0] };
    }

    // docType 없음 → 기본 라벨 발급 (fetchAndSaveLabel)
    // DEF-B-148 (TASK-B-328): getnewlabel 실패 vs Storage 저장 실패를 구분해
    // 오진단성 메시지 제거. SHXK 발급 성공 시 Storage 실패와 무관하게
    // markAllPackagesIssued를 수행해 패키지 마킹이 누락되지 않도록 함(③ 설계 변경).
    const labelResult = await fetchAndSaveLabel(supabase, label.reference_no, orderId, label.id);
    if (labelResult.getNewLabelFailed) {
      logger.error(`[SHXK] getnewlabel failed — raw message: ${labelResult.failureMessage ?? ''}`);
      return {
        success: false,
        error: await resolveShxkError(labelResult.failureMessage, 'label_issue_failed', 'GETNEWLABEL'),
      };
    }

    const pkgErr = await markAllPackagesIssued(supabase, orderId, label.tracking_number);
    if (pkgErr) {
      logger.error('fetchAndIssueUpsLabel: mark packages issued failed', pkgErr);
      return { success: false, error: await trError('generic', { code: 'PACKAGES_MARK' }) };
    }

    if (!labelResult.signedUrl) {
      logger.error(`fetchAndIssueUpsLabel: label document save failed (order=${orderId})`);
      return {
        success: false,
        error: await trError('document_save_failed_after_shipping'),
      };
    }

    revalidatePath("/(dashboard)/warehouse/outbound", "page");
    revalidatePath('/(dashboard)/orders/[orderId]', 'page');

    return { success: true, url: labelResult.signedUrl };
  } catch (err) {
    logger.error('fetchAndIssueUpsLabel error:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
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
      return { success: false, error: await trError('generic', { code: 'LABEL_LOOKUP' }) };
    }
    if (!labels || labels.length === 0) {
      logger.warn(`cancelUpsRegistration: no cancellable label (order=${orderId})`);
      return { success: false, error: await trError('label_not_found') };
    }

    const referenceNo = labels[0].reference_no;
    const removeRes = await removeorder(referenceNo.replace(/-/g, ''));
    if (removeRes.success === 0) {
      logger.error(`removeorder failed for order ${orderId}: ${removeRes.message}`);
      return {
        success: false,
        error: await resolveShxkError(removeRes.message, 'label_void_failed', 'REMOVEORDER'),
      };
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
      return { success: false, error: await trError('generic', { code: 'LABEL_RECORD_DELETE' }) };
    }

    const unlockErr = await unlockAllPackagesIntlRef(supabase, orderId);
    if (unlockErr) {
      logger.error('cancelUpsRegistration: intl_ref unlock failed', unlockErr);
      return { success: false, error: await trError('generic', { code: 'PACKAGES_UNLOCK' }) };
    }

    const { error: trackingResetErr } = await supabase
      .from('zen_tracking_configs')
      .update({ tracking_no: null })
      .eq('order_id', orderId);
    if (trackingResetErr) {
      logger.warn(`zen_tracking_configs tracking_no reset warning for order ${orderId}: ${trackingResetErr.message}`);
    }

    revalidatePath("/(dashboard)/warehouse/outbound", "page");
    revalidatePath('/(dashboard)/orders/[orderId]', 'page');

    return { success: true };
  } catch (err) {
    logger.error('cancelUpsRegistration error:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
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
    revalidatePath('/(dashboard)/orders/[orderId]', 'page');

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
    logger.error('issueUpsLabel error:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
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
    if (!label) {
      logger.warn(`voidUpsLabel: no active label (order=${orderId})`);
      return { success: false, error: await trError('label_not_found') };
    }

    const removeRes = await removeorder(label.reference_no.replace(/-/g, ''));
    if (removeRes.success === 0) {
      logger.error(`removeorder failed for order ${orderId}: ${removeRes.message}`);
      return {
        success: false,
        error: await resolveShxkError(removeRes.message, 'label_void_failed', 'REMOVEORDER'),
      };
    }

    const updateErr = await markLabelVoidedByOrder(supabase, orderId);
    if (updateErr) {
      logger.error('voidUpsLabel: label void update failed', updateErr);
      return { success: false, error: await trError('generic', { code: 'LABEL_VOID_RECORD' }) };
    }

    const unlockErr = await unlockAllPackagesIntlRef(supabase, orderId);
    if (unlockErr) {
      logger.error('voidUpsLabel: intl_ref unlock failed', unlockErr);
      return { success: false, error: await trError('generic', { code: 'PACKAGES_UNLOCK' }) };
    }

    const { error: trackingResetErr } = await supabase
      .from('zen_tracking_configs')
      .update({ tracking_no: null })
      .eq('order_id', orderId);
    if (trackingResetErr) {
      logger.warn(`zen_tracking_configs tracking_no reset warning for order ${orderId}: ${trackingResetErr.message}`);
    }

    revalidatePath("/(dashboard)/warehouse/outbound", "page");
    revalidatePath('/(dashboard)/orders/[orderId]', 'page');

    return { success: true };
  } catch (err) {
    logger.error('voidUpsLabel error:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
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
      if (!order) return { success: false, error: await trError('order_not_found') };

      const countryCode = (order.recipient_country_code as string)
        || await resolveCountryCode(supabase, order.dest_port_id as string)
        || '';
      if (!countryCode) return { success: false, error: await trError('destination_country_not_found') };

      const shxkCode = await resolveShxkCode(supabase, order.ups_product_code as string, 'KOR', order.incoterms as string);
      if (!shxkCode) return { success: false, error: await trError('shipping_method_not_found') };

      const payload = buildCreateOrderPayload(shxkCode, order, countryCode, packages, {
        name: SHXK_SHIPPER_NAME,
        country: SHXK_SHIPPER_COUNTRY,
      });
      return { success: true, payload: payload as Record<string, unknown> };
    }

    const label = await fetchActiveLabelByOrder(supabase, orderId);
    if (!label) {
      logger.warn(`No active label (order=${orderId})`);
      return { success: false, error: await trError('label_not_found') };
    }

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

    logger.warn(`previewShxkPayload: unsupported action (${action})`);
    return { success: false, error: await trError('unknown_action') };
  } catch (err) {
    logger.error('previewShxkPayload error:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
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
    if (!order) return { success: false, error: await trError('order_not_found') };

    const countryCode = (order.recipient_country_code as string)
      || await resolveCountryCode(supabase, order.dest_port_id as string)
      || '';
    if (!countryCode) return { success: false, error: await trError('destination_country_not_found') };

    const shxkCode = await resolveShxkCode(supabase, order.ups_product_code as string, 'KOR', order.incoterms as string);
    if (!shxkCode) return { success: false, error: await trError('shipping_method_not_found') };

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
    logger.error('triggerCreateOrderTest error:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
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
    if (!label) {
      logger.warn(`No active label (order=${orderId})`);
      return { success: false, error: await trError('label_not_found') };
    }

    const configInfo = {
      lable_file_type: '2',
      lable_paper_type: '1',
      lable_content_type: DOC_TYPE_CONTENT_MAP[docType],
      additional_info: { lable_print_datetime: 'Y' },
    };
    const res = await getnewlabel(configInfo, [{ reference_no: reference_no_clean(label.reference_no) }]);

    if (res.success !== 1 || !res.data?.length) {
      logger.error(`[SHXK] fetchShxkTradeDocument(${docType}) failed — raw message: ${res.message}`);
      return {
        success: false,
        error: await resolveShxkError(res.message, 'document_fetch_failed', 'GETNEWLABEL_DOC'),
      };
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
      logger.error(`fetchShxkTradeDocument: document download/store failed (order=${orderId}, docType=${docType})`);
      return { success: false, error: await trError('document_save_failed') };
    }
    // TASK-B-327 (DEF-B-147): 다른 라벨 액션(registerUpsOrder/voidUpsLabel 등)과 동일하게 문서 저장 후 화면 갱신
    revalidatePath('/(dashboard)/orders/[orderId]', 'page');
    return { success: true, url: storedUrls[0] };
  } catch (err) {
    logger.error('fetchShxkTradeDocument error:', err);
    return { success: false, error: await trError('generic', { code: 'UNEXPECTED' }) };
  }
}
