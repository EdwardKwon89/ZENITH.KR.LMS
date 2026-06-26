import 'server-only'
import { callShxk } from './client'

export interface CreateOrderRequest {
  reference_no: string
  shipping_method: string
  platform_id?: string
  buyer_id?: string
  order_status?: string
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
  label_url?: string
  label_data?: string
  label_type?: string
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

export async function getnewlabel(
  orderId: string,
): Promise<{ success: number; data: GetNewLabelResponse | null; message: string }> {
  const res = await callShxk('getnewlabel', { order_id: orderId })
  return {
    success: res.success,
    data: res.data ? assertData<GetNewLabelResponse>(res.data) : null,
    message: res.enmessage || res.cnmessage || '',
  }
}
