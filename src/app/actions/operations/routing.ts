"use server";

import { logger } from '@/lib/logger';
import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { RoutingEngine, RouteOption, RouteSegment } from "@/lib/logistics/routing";
import { DatabaseRouteAdapter } from "@/lib/logistics/adapters/DatabaseRouteAdapter";
import { calculateCompositePricing, PricingBreakdown, SurchargeBreakdownItem } from "@/lib/logistics/composite-pricing";

/**
 * [ROU-01] 오더에 대한 경로 옵션을 생성하거나 갱신합니다. (UPSERT)
 */
export async function getRouteOptions(orderId: string) {
  const { supabase, user } = await validateUserAction();

  const { data: order, error: orderError } = await supabase
    .from("zen_orders")
    .select("origin_port_id, dest_port_id, transport_mode, cargo_details, origin_port:zen_ports!origin_port_id(code, name), dest_port:zen_ports!dest_port_id(code, name)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) throw new Error("Order not found for routing");

  const originCode = (order.origin_port as any)?.code || (order.origin_port as any)?.name || "";
  const destCode = (order.dest_port as any)?.code || (order.dest_port as any)?.name || "";

  const { data: packages } = await supabase
    .from('zen_order_packages')
    .select('gross_weight, volume, packing_count')
    .eq('order_id', orderId);

  const weight = (packages || []).reduce((s, p) =>
    s + (Number(p.gross_weight) || 0), 0);
  const volume = (packages || []).reduce((s, p) =>
    s + (Number(p.volume) || 0), 0);

  const engine = new RoutingEngine(new DatabaseRouteAdapter(supabase));
  const options = await engine.calculateOptions(originCode, destCode, order.transport_mode);

  // 3. Composite Pricing 계산 및 각 option별 segments.cost/total_cost 갱신 (IMP-086 통합 파이프라인 연동)
  for (const opt of options) {
    await calculateCompositePricing({
      weight,
      volume,
      supabase,
      routeOption: opt
    });
    
    if (opt.option_type === 'COST') {
      opt.score = opt.total_cost;
    }
  }

  for (const opt of options) {
    const { error: upsertError } = await supabase
      .from("zen_route_options")
      .upsert({
        order_id: orderId,
        option_type: opt.option_type,
        segments: opt.segments,
        total_cost: opt.total_cost,
        total_transit_days: opt.total_transit_days,
        score: opt.score,
        recommended_for: opt.recommended_for || []
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
    .select("id, order_id, option_type, segments, total_cost, total_transit_days, score, recommended_for, created_at", { count: "exact" })
    .eq("order_id", orderId);

  const optionsArray: any[] = [];
  if (savedOptions) {
    for (const opt of savedOptions) {
      const routeOptionObj = {
        option_type: opt.option_type as any,
        segments: opt.segments as any[],
        total_cost: Number(opt.total_cost || 0),
        total_transit_days: Number(opt.total_transit_days || 0),
        score: Number(opt.score || 0)
      };

      const pricing = await calculateCompositePricing({
        weight,
        volume,
        supabase,
        routeOption: routeOptionObj
      });

      opt.segments = routeOptionObj.segments;
      opt.total_cost = routeOptionObj.total_cost;
      (opt as any).pricing_breakdown = pricing;
      
      optionsArray.push(opt);
    }
  }

  return { success: true, options: optionsArray, total: count || 0 };
}

/**
 * [ROU-01] 특정 경로 옵션을 오더의 확정 경로로 선택합니다.
 */
export async function selectRoute(orderId: string, optionId: string) {
  const { supabase, user } = await validateUserAction();

  // 1. 확정 경로 저장 (zen_order_routes)
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

  // 2. Read selected option's carrier from segments → resolve org_id
  const { data: selectedOption } = await supabase
    .from("zen_route_options")
    .select("segments")
    .eq("id", optionId)
    .single();

  let resolvedOrgId: string | undefined;
  const segments = (selectedOption?.segments as any[]) || [];
  const carrierIdFromSegment = segments[0]?.carrier_id as string | undefined;
  if (carrierIdFromSegment) {
    const { data: carrier } = await supabase
      .from("zen_carriers")
      .select("org_id")
      .eq("id", carrierIdFromSegment)
      .single();
    if (carrier?.org_id) {
      resolvedOrgId = carrier.org_id;
    }
  }

  // ── DEF-043: zen_vessel_schedules 자동 매칭 ──
  if (segments.length > 0) {
    const portCodes = [...new Set(segments.flatMap((s: any) => [s.from_port_id, s.to_port_id]))] as string[];
    const { data: ports } = await supabase
      .from("zen_ports")
      .select("id, code")
      .in("code", portCodes);

    const portUuidMap = Object.fromEntries((ports || []).map((p: any) => [p.code, p.id]));

    let matchedAny = false;
    for (const segment of segments) {
      if (segment.transport_mode === 'LAND') continue;
      const originUuid = portUuidMap[segment.from_port_id];
      const destUuid = portUuidMap[segment.to_port_id];
      if (!originUuid || !destUuid || !segment.carrier_id) continue;

      const { data: schedule } = await supabase
        .from("zen_vessel_schedules")
        .select("id, vessel_name, voyage_no, etd, eta")
        .eq("carrier_id", segment.carrier_id)
        .eq("origin_port_id", originUuid)
        .eq("destination_port_id", destUuid)
        .eq("service_type", segment.transport_mode)
        .gte("etd", new Date().toISOString())
        .order("etd", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (schedule) {
        segment.schedule_id = schedule.id;
        segment.flight_no = schedule.vessel_name + (schedule.voyage_no ? ` / ${schedule.voyage_no}` : '');
        segment.etd = schedule.etd;
        segment.eta = schedule.eta;
        matchedAny = true;
      }
    }

    if (matchedAny) {
      await supabase
        .from("zen_route_options")
        .update({ segments })
        .eq("id", optionId);
    }
  }
  // ── END DEF-043 ──

  // 3. zen_orders.route_option_id + carrier_id 동기화
  const { error: updateError } = await supabase
    .from("zen_orders")
    .update({
      route_option_id: optionId,
      ...(resolvedOrgId ? { carrier_id: resolvedOrgId } : {}),
    })
    .eq("id", orderId);

  if (updateError) throw new Error(`Order route_option_id sync failed: ${updateError.message}`);

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

  // Mock 포트 좌표 (Ds-11 296-303) — Phase L에서 zen_ports.latitude/longitude로 전환 예정
  const MOCK_PORT_COORDS: Record<string, { lat: number; lng: number }> = {
    'ICN': { lat: 37.4602, lng: 126.4407 },
    'SIN': { lat: 1.3521, lng: 103.8198 },
    'HKG': { lat: 22.3080, lng: 113.9185 },
    'PUS': { lat: 35.1796, lng: 129.0756 },
    'Incheon Hub': { lat: 37.4602, lng: 126.4407 },
    'PVG': { lat: 31.1443, lng: 121.8083 },
    'LAX': { lat: 33.9416, lng: -118.4085 },
    'SHA': { lat: 31.1443, lng: 121.8083 },
    'SFO': { lat: 37.6213, lng: -122.3790 },
  };

  // 2. 트래킹 이벤트 조회 (실적 확인용 — 페이지네이션 적용 IMP-045)
  const { data: events } = await supabase
    .from("zen_tracking_events")
    .select("location, event_code")
    .eq("order_id", orderId)
    .limit(500);

  const eventLocations = new Set((events || []).map(e => e.location));

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
