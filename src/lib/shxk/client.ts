import 'server-only'
import { SHXK_ENDPOINT, SHXK_APP_KEY, SHXK_APP_TOKEN } from './config'
import type {
  ShxkBaseResponse,
  ShxkBaseRequest,
  ShxkServiceMethod,
} from '@/types/ups-api'

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
