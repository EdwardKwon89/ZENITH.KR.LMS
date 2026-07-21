"use server";

import { logger } from '@/lib/logger';

import { validateUserAction, validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { trackingManager, EVENT_TO_ORDER_STATUS } from "@/lib/logistics/tracking";
import { updateOrderStatus } from './orders';

/**
 * 특정 오더의 트래킹 데이터 및 마일스톤 정보를 조회합니다.
 */
export async function getTrackingEvents(orderId: string, page = 1, pageSize = 50) {
  const { supabase } = await validateUserAction();

  // 1. 트래킹 설정 확인
  const { data: config, error: configError } = await supabase
    .from("zen_tracking_configs")
    .select("provider_type")
    .eq("order_id", orderId)
    .single();

  if (configError || !config) {
    logger.warn(`[TRACKING] No config found for order: ${orderId}`);
    return { events: [], total: 0 };
  }

  // 2. 만약 API 프로바이더인 경우, 최신 데이터를 가져오고 상태를 동기화합니다.
  if (config.provider_type === "API") {
    await trackingManager.getTrackingData(supabase, orderId);
  }

  // 3. 트래킹 이벤트 조회 (페이지네이션 적용 — IMP-045)
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: events, error, count } = await supabase
    .from("zen_tracking_events")
    .select("id, order_id, event_code, event_time, location, description, source_type, segment_index, hub_port_code", { count: "exact" })
    .eq("order_id", orderId)
    .order("event_time", { ascending: false })
    .range(from, to);

  if (error) {
    logger.error("Failed to fetch tracking events:", error);
    return { events: [], total: 0 };
  }

  return { events, total: count || 0 };
}

/**
 * 트래킹 데이터를 강제로 새로고침합니다. (API 연동 호출)
 */
export async function refreshTrackingData(orderId: string) {
  const { supabase } = await validateUserAction();

  try {
    const steps = await trackingManager.getTrackingData(supabase, orderId);

    revalidatePath(`/(dashboard)/orders/${orderId}`, "page");
    return { success: true, count: steps.length };
  } catch (error: any) {
    logger.error(`[REFRESH_TRACKING] Error:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * [Admin] 트래킹 이벤트를 수동으로 추가합니다.
 */
export async function addTrackingEvent(
  orderId: string,
  payload: {
    event_code: string;
    location: string;
    description: string;
    event_time?: string;
    segment_index?: number;
    hub_port_code?: string;
  }
) {
  const { supabase, user } = await validateAdminAction();

  const { error } = await supabase
    .from("zen_tracking_events")
    .insert({
      order_id: orderId,
      event_code: payload.event_code,
      location: payload.location,
      description: payload.description,
      event_time: payload.event_time || new Date().toISOString(),
      source_type: 'MANUAL',
      segment_index: payload.segment_index ?? null,
      hub_port_code: payload.hub_port_code ?? null,
    });

  if (error) throw new Error(`Failed to add tracking event: ${error.message}`);

  const nextStatus = EVENT_TO_ORDER_STATUS[payload.event_code as keyof typeof EVENT_TO_ORDER_STATUS];
  if (nextStatus) {
    await updateOrderStatus(orderId, nextStatus, `수동 트래킹 이벤트(${payload.event_code})에 의한 상태 전환`);
  }

  revalidatePath(`/(dashboard)/orders/${orderId}`, "page");
  return { success: true };
}

/**
 * [Admin] 오더의 트래킹 Provider 설정을 변경합니다.
 */
export async function updateTrackingConfig(
  orderId: string,
  providerType: 'VIRTUAL' | 'MANUAL' | 'API',
  providerName?: string
) {
  const { supabase } = await validateAdminAction();

  const { error } = await supabase
    .from("zen_tracking_configs")
    .update({
      provider_type: providerType,
      provider_name: providerName,
      updated_at: new Date().toISOString()
    })
    .eq("order_id", orderId);

  if (error) throw new Error(`Failed to update tracking config: ${error.message}`);

  revalidatePath(`/(dashboard)/orders/${orderId}`, "page");
  return { success: true };
}

/**
 * [Phase 3.1] 주기적 폴링 또는 수동 호출을 통해 외부 API 데이터를 동기화합니다.
 */
export async function syncExternalTracking() {
  const { supabase } = await validateAdminAction();

  // 1. API 공급자가 설정된 활성 트래킹 설정 조회
  const { data: configs, error } = await supabase
    .from("zen_tracking_configs")
    .select("order_id, provider_type")
    .eq("provider_type", "API");

  if (error) throw new Error(`Failed to fetch tracking configs: ${error.message}`);

  let processed = 0;
  let errors = 0;

  for (const config of configs) {
    try {
      // 2. TrackingManager를 통해 데이터 수집 및 오더 상태 동기화
      await trackingManager.getTrackingData(supabase, config.order_id);
      processed++;
    } catch (e) {
      logger.error(`[SYNC_TRACKING] Error processing order ${config.order_id}:`, e);
      errors++;
    }
  }

  return { success: true, processed, errors };
}

/**
 * [Phase 3.1] 문제 발생 시 디버깅을 위한 원본(Raw JSON) 응답 내역 조회
 */
export async function getTrackingRawLogs(orderId: string, page = 1, pageSize = 50) {
  const { supabase } = await validateAdminAction();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: logs, error, count } = await supabase
    .from("zen_tracking_raw_logs")
    .select("id, order_id, raw_data, created_at, provider_name", { count: "exact" })
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to fetch raw logs: ${error.message}`);

  return { logs, total: count || 0 };
}

/**
 * [Phase 3.1] 모든 활성 트래킹 현황을 요약 조회합니다. (대시보드용)
 * shipper_id 또는 recipient_name이 없는 오더는 'Unassigned'로 분류하여 통계 누락을 방지합니다.
 */
export async function getGlobalTrackingOverview(page = 1, pageSize = 50) {
  const { supabase } = await validateUserAction();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from("zen_tracking_configs")
    .select(`
      id,
      order_id,
      provider_type,
      provider_name,
      tracking_no,
      updated_at,
      order:zen_orders(
        id,
        order_no,
        shipper_id,
        recipient_name
      )
    `, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to fetch tracking overview: ${error.message}`);

  const orderIds = (data ?? []).map(c => c.order_id).filter(Boolean);
  const { data: allEvents } = orderIds.length > 0 ? await supabase
    .from("zen_tracking_events")
    .select("order_id, event_time, location, description")
    .in("order_id", orderIds)
    .order("event_time", { ascending: false }) : { data: [] };

  const latestEventMap = new Map<string, any>();
  for (const evt of allEvents ?? []) {
    if (!latestEventMap.has(evt.order_id)) {
      latestEventMap.set(evt.order_id, evt);
    }
  }

  const configsWithEvents = (data ?? []).map((config) => {
    const latestEvent = latestEventMap.get(config.order_id) ?? null;
    const isUnassigned = !config.order?.[0]?.shipper_id && !config.order?.[0]?.recipient_name;
    return { ...config, latest_event: latestEvent, is_unassigned: isUnassigned };
  });

  return { configs: configsWithEvents, total: count || 0 };
}

/**
 * UPS 트래킹 이벤트 조회 (zen_ups_tracking_events 테이블)
 */
export async function getUpsTrackingEvents(orderId: string) {
  const { supabase } = await validateUserAction();

  const { data, error } = await supabase
    .from("zen_ups_tracking_events")
    .select("id, tracking_number, order_id, event_date, event_time, event_code, event_desc, location_city, location_country")
    .eq("order_id", orderId)
    .order("event_date", { ascending: false })
    .order("event_time", { ascending: false });

  if (error) {
    logger.error("getUpsTrackingEvents error:", error);
    return { events: [] };
  }

  return { events: data || [] };
}
