import 'server-only'
import { callShxk } from './client'
import { createAdminClient } from '@/utils/supabase/server'
import { translateShxkText } from './translate'

export interface GetTrackDetail {
  track_occur_date: string
  track_location: string
  track_description: string
  track_code?: string
  track_status?: string
}

export interface GetTrackData {
  server_hawbcode: string
  destination_country: string
  track_status: string
  track_status_name: string
  signatory_name: string
  details: GetTrackDetail[]
}

export function isDelivered(trackStatus: string): boolean {
  return trackStatus === 'DL'
}

/**
 * TASK-B-290 (Issue #1085 / DEF-B-060): 이벤트별 location 텍스트에서 국가코드를 파싱한다.
 * 콤마로 구분된 마지막 토큰이 정확히 2자리 대문자일 때만 채택 — "SEOUL KOREA"처럼
 * 콤마 없는 표기는 파싱 실패 시 null(잘못된 국가코드보다 안전).
 */
export function extractCountryCode(location?: string | null): string | null {
  if (!location) return null
  const last = location.split(',').pop()?.trim() ?? ''
  return /^[A-Z]{2}$/.test(last) ? last : null
}

export async function pollTracking(
  trackingNumber: string,
): Promise<GetTrackData | null> {
  const res = await callShxk('gettrack', { tracking_number: trackingNumber })
  if (res.success !== 1) return null
  const list = res.data as GetTrackData[] | undefined
  if (!list || list.length === 0) return null
  return list[0]
}

export async function storeTrackingEvents(
  trackingNumber: string,
  orderId: string,
  labelId: string | null,
  data: GetTrackData,
): Promise<void> {
  const supabase = await createAdminClient()

  // TASK-B-290 (① dedup): event_time은 TIME 컬럼이라 재조회 시 "HH:MM:SS"(날짜 없음) —
  // event_date와 재조합해 원본 track_occur_date("YYYY-MM-DD HH:MM:SS")와 비교해야
  // 중복 방지 필터가 동작한다.
  const { data: existing } = await supabase
    .from('zen_ups_tracking_events')
    .select('event_date, event_time')
    .eq('tracking_number', trackingNumber)

  const existingKeys = new Set(
    (existing ?? []).map((e: any) => `${e.event_date} ${e.event_time}`),
  )

  const events = data.details
    .filter((d) => !existingKeys.has(d.track_occur_date))
    .map((d) => {
      const translated = translateShxkText(d.track_description)
      return {
        tracking_number: trackingNumber,
        order_id: orderId,
        label_id: labelId,
        event_date: d.track_occur_date.split(' ')[0],
        event_time: d.track_occur_date,
        // TASK-B-290 (②): 이벤트별 실제 값 사용 — 헤더 track_status/destination_country
        // 를 전 행에 복사하지 않는다 (존재하지 않는 이력/잘못된 국가 기록 방지)
        event_code: d.track_code || d.track_status || '',
        event_desc: d.track_description,
        event_desc_ko: translated?.ko ?? null,
        event_desc_en: translated?.en ?? null,
        location_city: d.track_location || null,
        location_country: extractCountryCode(d.track_location),
        raw_response: d as unknown as Record<string, unknown>,
      }
    })

  if (events.length > 0) {
    await supabase.from('zen_ups_tracking_events').insert(events)
  }

  // TASK-B-290 (③): 폴링 시점의 전체 현재 상태를 매 폴링마다 갱신
  // (배송완료 여부와 무관하게 항상 — is_active 업데이트와 별개)
  await supabase
    .from('zen_tracking_configs')
    .update({
      last_track_status: data.track_status,
      last_track_status_name: data.track_status_name,
      last_tracked_at: new Date().toISOString(),
    })
    .eq('tracking_no', trackingNumber)

  if (isDelivered(data.track_status)) {
    await supabase
      .from('zen_tracking_configs')
      .update({ is_active: false })
      .eq('tracking_no', trackingNumber)
  }
}

