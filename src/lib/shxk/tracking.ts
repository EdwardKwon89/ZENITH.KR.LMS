import 'server-only'
import { callShxk } from './client'
import { createAdminClient } from '@/utils/supabase/server'

export interface GetTrackDetail {
  track_occur_date: string
  track_location: string
  track_description: string
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

  const { data: existing } = await supabase
    .from('zen_ups_tracking_events')
    .select('event_time')
    .eq('tracking_number', trackingNumber)

  const existingTimes = new Set(existing?.map((e) => e.event_time) ?? [])

  const events = data.details
    .filter((d) => !existingTimes.has(d.track_occur_date))
    .map((d) => ({
      tracking_number: trackingNumber,
      order_id: orderId,
      label_id: labelId,
      event_date: d.track_occur_date.split(' ')[0],
      event_time: d.track_occur_date,
      event_code: data.track_status,
      event_desc: d.track_description,
      location_city: d.track_location || null,
      location_country: data.destination_country || null,
      raw_response: d as unknown as Record<string, unknown>,
    }))

  if (events.length > 0) {
    await supabase.from('zen_ups_tracking_events').insert(events)
  }

  if (isDelivered(data.track_status)) {
    await supabase
      .from('zen_tracking_configs')
      .update({ is_active: false })
      .eq('tracking_no', trackingNumber)
  }
}
