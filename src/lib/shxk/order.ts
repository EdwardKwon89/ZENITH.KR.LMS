import 'server-only'
import { logger } from '@/lib/logger'
import { callShxk } from './client'

export interface CreateOrderRequest {
  reference_no: string
  shipping_method: string
  platform_id?: string
  buyer_id?: string
  order_status?: string
  order_weight?: number
  order_pieces?: number
  cargotype?: string
  mail_cargo_type?: string
  cargovolume?: Record<string, unknown>[]
  shipper?: Record<string, unknown>
  consignee?: Record<string, unknown>
  invoice?: Record<string, unknown>[]
}

export interface CreateOrderResponse {
  order_id: string
  refrence_no: string
  shipping_method_no?: string
}

export interface GetTrackingNumberResponse {
  tracking_number: string
}

export interface GetNewLabelItem {
  lable_file: string
  lable_file_type?: string
  lable_content_type?: string
}

function assertData<T>(raw: unknown): T {
  if (!raw || typeof raw !== 'object') {
    // TASK-B-357 (Issue #1351): 원문 보존 — throw는 그대로(동작 불변), 로그에만 기록
    const err = new Error('shxk API returned empty data')
    logger.error('[SHXK] 응답 data 형식 오류', err)
    throw err
  }
  return raw as T
}

export async function createorder(
  params: CreateOrderRequest,
): Promise<{ success: number; data: CreateOrderResponse | null; message: string }> {
  const res = await callShxk('createorder', params as unknown as Record<string, unknown>)
  const message = res.enmessage || res.cnmessage || ''
  // TASK-B-357 (Issue #1351): 실패 분기 로그 — 반환 형태/throw는 불변
  if (res.success !== 1) {
    logger.warn('[SHXK] createorder 업무 실패', { method: 'createorder', success: res.success, message, reference_no: params.reference_no })
  } else if (!res.data) {
    logger.error('[SHXK] createorder 성공 응답인데 data 없음', { method: 'createorder', message, reference_no: params.reference_no })
  }
  return {
    success: res.success,
    data: res.data ? assertData<CreateOrderResponse>(res.data) : null,
    message,
  }
}

export async function gettrackingnumber(
  orderId: string,
): Promise<{ success: number; data: GetTrackingNumberResponse | null; message: string }> {
  const res = await callShxk('gettrackingnumber', { order_id: orderId })
  const message = res.enmessage || res.cnmessage || ''
  // TASK-B-357 (Issue #1351): 실패 분기 로그 — 반환 형태/throw는 불변
  if (res.success !== 1) {
    logger.warn('[SHXK] gettrackingnumber 업무 실패', { method: 'gettrackingnumber', success: res.success, message, order_id: orderId })
  } else if (!res.data) {
    logger.error('[SHXK] gettrackingnumber 성공 응답인데 data 없음', { method: 'gettrackingnumber', message, order_id: orderId })
  }
  return {
    success: res.success,
    data: res.data ? assertData<GetTrackingNumberResponse>(res.data) : null,
    message,
  }
}

export interface GetNewLabelParams {
  reference_no: string
}

export async function getnewlabel(
  configInfo: Record<string, unknown>,
  listorder: GetNewLabelParams[],
): Promise<{ success: number; data: GetNewLabelItem[] | null; message: string }> {
  const res = await callShxk('getnewlabel', { configInfo, listorder })
  let items: GetNewLabelItem[] | null = null
  if (res.data) {
    const rawItems = Array.isArray(res.data) ? res.data : [res.data]
    items = rawItems.map((item: any) => ({
      lable_file: String(item.lable_file ?? ''),
      lable_file_type: item.lable_file_type ? String(item.lable_file_type) : undefined,
      lable_content_type: item.lable_content_type ? String(item.lable_content_type) : undefined,
    }))
  }
  const message = res.enmessage || res.cnmessage || ''
  // TASK-B-357 (Issue #1351): 실패 분기 로그 — 반환 형태/throw는 불변
  if (res.success !== 1) {
    logger.warn('[SHXK] getnewlabel 업무 실패', { method: 'getnewlabel', success: res.success, message, reference_nos: listorder.map((o) => o.reference_no) })
  } else if (!items) {
    logger.error('[SHXK] getnewlabel 성공 응답인데 라벨 data 없음', { method: 'getnewlabel', message, reference_nos: listorder.map((o) => o.reference_no) })
  }
  return {
    success: res.success,
    data: items,
    message,
  }
}

export async function removeorder(
  referenceNo: string,
): Promise<{ success: number; message: string }> {
  const res = await callShxk('removeorder', { reference_no: referenceNo })
  const message = res.enmessage || res.cnmessage || ''
  // TASK-B-357 (Issue #1351): 실패 분기 로그 — 반환 형태는 불변
  if (res.success !== 1) {
    logger.warn('[SHXK] removeorder 업무 실패', { method: 'removeorder', success: res.success, message, reference_no: referenceNo })
  }
  return {
    success: res.success,
    message,
  }
}
