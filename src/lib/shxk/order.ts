import 'server-only'
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

export interface GetNewLabelResponse {
  lable_file: string
  lable_file_type?: string
  lable_content_type?: string
}

function assertData<T>(raw: unknown): T {
  if (!raw || typeof raw !== 'object') {
    throw new Error('shxk API returned empty data')
  }
  return raw as T
}

export async function createorder(
  params: CreateOrderRequest,
): Promise<{ success: number; data: CreateOrderResponse | null; message: string }> {
  const res = await callShxk('createorder', params as unknown as Record<string, unknown>)
  return {
    success: res.success,
    data: res.data ? assertData<CreateOrderResponse>(res.data) : null,
    message: res.enmessage || res.cnmessage || '',
  }
}

export async function gettrackingnumber(
  orderId: string,
): Promise<{ success: number; data: GetTrackingNumberResponse | null; message: string }> {
  const res = await callShxk('gettrackingnumber', { order_id: orderId })
  return {
    success: res.success,
    data: res.data ? assertData<GetTrackingNumberResponse>(res.data) : null,
    message: res.enmessage || res.cnmessage || '',
  }
}

export interface GetNewLabelParams {
  reference_no: string
}

export async function getnewlabel(
  configInfo: Record<string, unknown>,
  listorder: GetNewLabelParams[],
): Promise<{ success: number; data: GetNewLabelResponse | null; message: string }> {
  const res = await callShxk('getnewlabel', { configInfo, listorder })
  let labelData: GetNewLabelResponse | null = null
  if (res.data) {
    const items = Array.isArray(res.data) ? res.data : [res.data]
    const first = items[0] as Record<string, unknown> | undefined
    if (first) {
      labelData = {
        lable_file: String(first.lable_file ?? ''),
        lable_file_type: first.lable_file_type ? String(first.lable_file_type) : undefined,
        lable_content_type: first.lable_content_type ? String(first.lable_content_type) : undefined,
      }
    }
  }
  return {
    success: res.success,
    data: labelData,
    message: res.enmessage || res.cnmessage || '',
  }
}

export async function removeorder(
  referenceNo: string,
): Promise<{ success: number; message: string }> {
  const res = await callShxk('removeorder', { reference_no: referenceNo })
  return {
    success: res.success,
    message: res.enmessage || res.cnmessage || '',
  }
}
