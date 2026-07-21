import 'server-only'
import { SHXK_ENDPOINT, SHXK_APP_KEY, SHXK_APP_TOKEN } from './config'
import { createAdminClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'
import type {
  ShxkBaseResponse,
  ShxkBaseRequest,
  ShxkServiceMethod,
} from '@/types/ups-api'

function isMock(): boolean {
  return process.env.SHXK_TEST_MOCK === 'true'
}

function buildMockResponse(
  method: ShxkServiceMethod,
  params?: Record<string, unknown>,
): ShxkBaseResponse {
  const refNo =
    (params?.reference_no as string) ||
    ((params?.listorder as Array<{ reference_no: string }>)?.[0]?.reference_no) ||
    'MOCK-REF'
  const mockTrackNo = `MOCK-${refNo.slice(-8).toUpperCase()}`

  switch (method) {
    case 'createorder':
      return {
        success: 1,
        cnmessage: '订单创建成功',
        enmessage: 'Order created successfully',
        data: {
          order_id: 99999,
          refrence_no: refNo,
          shipping_method_no: mockTrackNo,
        },
      }
    case 'getnewlabel':
      return {
        success: 1,
        cnmessage: '标签生成成功',
        enmessage: 'Label generated successfully',
        data: [{
          lable_file: `https://mock-shxk.test/labels/${refNo}.pdf`,
          lable_file_type: '2',
          lable_content_type: '4',
        }],
      }
    case 'gettrackingnumber':
      return {
        success: 1,
        cnmessage: '成功',
        enmessage: 'Success',
        data: { tracking_number: mockTrackNo },
      }
    case 'removeorder':
      return {
        success: 1,
        cnmessage: '删除成功',
        enmessage: 'Order removed successfully',
        data: undefined,
      }
    case 'gettrack':
      return {
        success: 1,
        cnmessage: '成功',
        enmessage: 'Success',
        data: {
          server_hawbcode: (params?.tracking_number as string) ?? mockTrackNo,
          track_status: 'NT',
          track_occur_date: new Date().toISOString().split('T')[0],
          track_location: 'ICN KR',
          track_description: '[MOCK] Package received at origin',
        },
      }
    default:
      return { success: 1, cnmessage: 'Mock OK', enmessage: 'Mock OK', data: {} }
  }
}

function buildShxkBody(
  method: ShxkServiceMethod,
  params?: Record<string, unknown>,
): string {
  const body: ShxkBaseRequest = {
    appKey: SHXK_APP_KEY,
    appToken: SHXK_APP_TOKEN,
    serviceMethod: method,
  }
  const entries = new URLSearchParams()
  entries.append('appKey', body.appKey)
  entries.append('appToken', body.appToken)
  entries.append('serviceMethod', body.serviceMethod)
  if (params) {
    entries.append('paramsJson', JSON.stringify(params))
  }
  return entries.toString()
}

function parseShxkResponse(raw: string): ShxkBaseResponse {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`shxk API 응답 파싱 실패: ${raw.slice(0, 200)}`)
  }
  return {
    success: parsed.success as number,
    cnmessage: (parsed.cnmessage as string) ?? '',
    enmessage: (parsed.enmessage as string) ?? '',
    data: parsed.data as Record<string, unknown> | undefined,
  }
}

function extractReferenceNo(params?: Record<string, unknown>): string | null {
  if (!params) return null
  if (typeof params.reference_no === 'string') return params.reference_no
  const listorder = params.listorder as Array<{ reference_no: string }> | undefined
  if (listorder?.[0]?.reference_no) return listorder[0].reference_no
  return null
}

async function logShxkCall(opts: {
  method: ShxkServiceMethod
  params?: Record<string, unknown>
  response?: ShxkBaseResponse
  httpStatus?: number
  error?: Error
  isMock: boolean
}): Promise<void> {
  try {
    const supabase = await createAdminClient()
    await supabase.from('zen_shxk_api_logs').insert({
      method: opts.method,
      reference_no: extractReferenceNo(opts.params),
      request_params: opts.params ?? null,
      response_body: opts.response
        ? (opts.response as unknown as Record<string, unknown>)
        : (opts.error ? { error: opts.error.message } : null),
      success: opts.response?.success === 1,
      http_status: opts.httpStatus ?? null,
      error_message: opts.error?.message ?? null,
      is_mock: opts.isMock,
    })
  } catch (logErr) {
    logger.error(`shxk_api_logs insert 실패 (${opts.method}):`, logErr)
  }
}

export async function callShxk(
  method: ShxkServiceMethod,
  params?: Record<string, unknown>,
): Promise<ShxkBaseResponse> {
  if (isMock()) {
    const mockResponse = buildMockResponse(method, params)
    await logShxkCall({ method, params, response: mockResponse, isMock: true })
    return mockResponse
  }

  const body = buildShxkBody(method, params)
  let res: Response
  let httpStatus: number | undefined

  try {
    res = await fetch(SHXK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    })
    httpStatus = res.status
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    await logShxkCall({ method, params, error, httpStatus, isMock: false })
    throw new Error(`shxk API 호출 실패 (${method}): ${error.message}`)
  }

  if (!res.ok) {
    const error = new Error(res.statusText)
    await logShxkCall({ method, params, error, httpStatus: res.status, isMock: false })
    throw new Error(`shxk API HTTP ${res.status} (${method}): ${res.statusText}`)
  }

  const text = await res.text()
  const parsed = parseShxkResponse(text)
  await logShxkCall({ method, params, response: parsed, httpStatus, isMock: false })
  return parsed
}
