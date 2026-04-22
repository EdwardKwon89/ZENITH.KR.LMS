"use server";

import { validateUserAction, validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { TrackingStep, trackingManager } from "@/lib/logistics/tracking";

/**
 * 특정 오더의 트래킹 데이터 및 마일스톤 정보를 조회합니다.
 */
export async function getTrackingEvents(orderId: string) {
  const { supabase } = await validateUserAction();
  
  // 1. 트래킹 설정 확인
  const { data: config, error: configError } = await supabase
    .from("zen_tracking_configs")
    .select("*")
    .eq("order_id", orderId)
    .single();

  if (configError || !config) {
    console.warn(`[TRACKING] No config found for order: ${orderId}`);
    return [];
  }

  // 2. 만약 API 프로바이더인 경우, 최신 데이터를 가져오고 상태를 동기화합니다.
  if (config.provider_type === "API") {
    await trackingManager.getTrackingData(supabase, orderId);
  }

  // 3. 트래킹 이벤트 조회 (DB에서 최종 결과 반환)
  const { data: events, error } = await supabase
    .from("zen_tracking_events")
    .select("*")
    .eq("order_id", orderId)
    .order("event_time", { ascending: false });

  if (error) {
    console.error("Failed to fetch tracking events:", error);
    return [];
  }

  return events;
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
    console.error(`[REFRESH_TRACKING] Error:`, error.message);
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
      source_type: 'MANUAL'
    });

  if (error) throw new Error(`Failed to add tracking event: ${error.message}`);

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
