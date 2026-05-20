import { logger } from '@/lib/logger';
"use server";

import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { routingEngine, RouteOption } from "@/lib/logistics/routing";

/**
 * [ROU-01] 오더에 대한 경로 옵션을 생성하거나 갱신합니다. (UPSERT)
 */
export async function getRouteOptions(orderId: string) {
  const { supabase, user } = await validateUserAction();

  // 1. 오더 정보 조회 (출발/도착지 파악)
  const { data: order, error: orderError } = await supabase
    .from("zen_orders")
    .select("origin_port_id, dest_port_id, origin_port:zen_ports!origin_port_id(name), dest_port:zen_ports!dest_port_id(name)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) throw new Error("Order not found for routing");

  const originName = (order.origin_port as any)?.name || "Unknown Origin";
  const destName = (order.dest_port as any)?.name || "Unknown Destination";

  // 2. 엔진을 통한 경로 계산
  const options = await routingEngine.calculateOptions(originName, destName);

  // 3. DB 저장 (BUG-07-A: UPSERT 정책 적용)
  // ON CONFLICT (order_id, option_type) DO UPDATE
  for (const opt of options) {
    const { error: upsertError } = await supabase
      .from("zen_route_options")
      .upsert({
        order_id: orderId,
        option_type: opt.option_type,
        segments: opt.segments,
        total_cost: opt.total_cost,
        total_transit_days: opt.total_transit_days,
        score: opt.score
      }, {
        onConflict: 'order_id, option_type'
      });

    if (upsertError) {
      logger.error(`[ROU-01] Upsert failed for ${opt.option_type}:`, upsertError.message);
    }
  }

  revalidatePath(`/(dashboard)/orders/${orderId}`, "page");

  const { data: savedOptions, count } = await supabase
    .from("zen_route_options")
    .select("id, order_id, option_type, segments, total_cost, total_transit_days, score, created_at", { count: "exact" })
    .eq("order_id", orderId);

  const optionsMap: Record<string, any> = {};
  (savedOptions || []).forEach((opt: any) => { optionsMap[opt.option_type] = opt; });
  return { success: true, options: optionsMap, total: count || 0 };
}

/**
 * [ROU-01] 특정 경로 옵션을 오더의 확정 경로로 선택합니다.
 */
export async function selectRoute(orderId: string, optionId: string) {
  const { supabase, user } = await validateUserAction();

  // 1. 확정 경로 저장 (zen_order_routes)
  // order_id가 UNIQUE이므로 자동으로 UPSERT 처럼 동작 (이미 존재하면 Update 처리 필요할 수도 있음)
  const { error: upsertError } = await supabase
    .from("zen_order_routes")
    .upsert({
      order_id: orderId,
      selected_option_id: optionId,
      applied_by: user.id,
      applied_at: new Date().toISOString()
    }, {
      onConflict: 'order_id'
    });

  if (upsertError) throw new Error(`Route selection failed: ${upsertError.message}`);

  const { data: routeRecord } = await supabase
    .from("zen_order_routes")
    .select("id")
    .eq("order_id", orderId)
    .single();

  revalidatePath(`/(dashboard)/orders/${orderId}`, "page");
  return { success: true, appliedRouteId: routeRecord?.id ?? orderId };
}

/**
 * [ROU-04] 오더에 적용된 경로의 시각화 데이터(마일스톤, 좌표)를 반환합니다.
 */
export async function getRouteVisualization(orderId: string) {
  const { supabase } = await validateUserAction();

  // 1. 적용된 경로 및 옵션 조회
  const { data: route, error: routeError } = await supabase
    .from("zen_order_routes")
    .select("id, order_id, selected_option_id, applied_by, applied_at, selected_option:zen_route_options(id, option_type, order_id, score, segments, total_cost, total_transit_days, created_at)")
    .eq("order_id", orderId)
    .maybeSingle();

  if (routeError || !route || !route.selected_option) {
    return { success: false, milestones: [], polyline: "" };
  }

  const segments = (route.selected_option as any).segments;
  const milestones: any[] = [];

  // Mock 포트 좌표 (Ds-11 296-303)
  const MOCK_PORT_COORDS: Record<string, { lat: number; lng: number }> = {
    'ICN': { lat: 37.4602, lng: 126.4407 },
    'SIN': { lat: 1.3521, lng: 103.8198 },
    'HKG': { lat: 22.3080, lng: 113.9185 },
    'PUS': { lat: 35.1796, lng: 129.0756 },
    'Incheon Hub': { lat: 37.4602, lng: 126.4407 },
  };

  // 2. 트래킹 이벤트 조회 (실적 확인용 — 페이지네이션 적용 IMP-045)
  const { data: events } = await supabase
    .from("zen_tracking_events")
    .select("location_name, event_type")
    .eq("order_id", orderId)
    .limit(500);

  const eventLocations = new Set((events || []).map(e => e.location_name));

  // 3. 세그먼트를 마일스톤으로 변환
  if (segments && segments.length > 0) {
    const firstSegment = segments[0];
    const firstPortName = firstSegment.from_port_id;
    milestones.push({
      name: firstPortName,
      location: MOCK_PORT_COORDS[firstPortName] || { lat: 0, lng: 0 },
      mode: firstSegment.transport_mode,
      status: eventLocations.has(firstPortName) ? 'COMPLETED' : 'PENDING'
    });

    // 각 세그먼트의 도착지를 마일스톤으로 추가
    for (const seg of segments) {
      milestones.push({
        name: seg.to_port_id,
        location: MOCK_PORT_COORDS[seg.to_port_id] || { lat: 0, lng: 0 },
        mode: seg.transport_mode,
        status: eventLocations.has(seg.to_port_id) ? 'COMPLETED' : 'PENDING'
      });
    }
  }

  return {
    success: true,
    milestones,
    polyline: "mock_polyline_data_for_phase_3"
  };
}

/**
 * [ROU-05] 계획 경로와 실제 트래킹 실적 간의 정합성을 확인합니다.
 */
export async function getRouteConsistencyStatus(orderId: string) {
  const { supabase } = await validateUserAction();

  // Phase 3 Sprint B: Mock 단계에서는 항상 Consistent 반환
  return {
    success: true,
    isConsistent: true,
    discrepancies: []
  };
}
