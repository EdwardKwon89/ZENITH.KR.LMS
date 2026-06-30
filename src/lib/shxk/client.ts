import 'server-only'
import { SHXK_ENDPOINT, SHXK_APP_KEY, SHXK_APP_TOKEN } from './config'
import type {
  ShxkBaseResponse,
  ShxkBaseRequest,
  ShxkServiceMethod,
  GetCountryItem,
} from '@/types/ups-api'

const IS_MOCK = process.env.SHXK_TEST_MOCK === 'true'

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
        data: {
          label_url: `https://mock-shxk.test/labels/${refNo}.pdf`,
          label_type: 'PDF',
        },
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
    case 'getcountry':
      return {
        success: 1,
        cnmessage: null,
        enmessage: null,
        data: [
          { code: 'KR', cnname: '韩国', enname: 'Korea (South)', note: '' },
          { code: 'US', cnname: '美国', enname: 'United States', note: '' },
          { code: 'CN', cnname: '中国', enname: 'China', note: '' },
          { code: 'JP', cnname: '日本', enname: 'Japan', note: '' },
          { code: 'DE', cnname: '德国', enname: 'Germany', note: '' },
          { code: 'GB', cnname: '英国', enname: 'United Kingdom', note: '' },
          { code: 'FR', cnname: '法国', enname: 'France', note: '' },
          { code: 'SG', cnname: '新加坡', enname: 'Singapore', note: '' },
          { code: 'VN', cnname: '越南', enname: 'Vietnam', note: '' },
          { code: 'TH', cnname: '泰国', enname: 'Thailand', note: '' },
          { code: 'TW', cnname: '台湾', enname: 'Taiwan', note: '' },
          { code: 'HK', cnname: '香港', enname: 'Hong Kong', note: '' },
          { code: 'AU', cnname: '澳大利亚', enname: 'Australia', note: '' },
          { code: 'CA', cnname: '加拿大', enname: 'Canada', note: '' },
          { code: 'NL', cnname: '荷兰', enname: 'Netherlands', note: '' },
        ],
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

export async function callShxk(
  method: ShxkServiceMethod,
  params?: Record<string, unknown>,
): Promise<ShxkBaseResponse> {
  if (IS_MOCK) {
    return buildMockResponse(method, params)
  }
  const body = buildShxkBody(method, params)
  let res: Response
  try {
    res = await fetch(SHXK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    })
  } catch (err) {
    throw new Error(
      `shxk API 호출 실패 (${method}): ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  if (!res.ok) {
    throw new Error(
      `shxk API HTTP ${res.status} (${method}): ${res.statusText}`,
    )
  }
  const text = await res.text()
  return parseShxkResponse(text)
}
