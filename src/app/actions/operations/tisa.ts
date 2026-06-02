"use server";

import { logger } from "@/lib/logger";
import { validateUserAction, checkPermission } from "@/lib/auth/guards";

export interface TisaSnapshotResult {
  id: string;
  orderId: string;
  rateCardId: string;
  versionNo: number;
  status: 'AUTO' | 'MANUAL';
  priority: number;
  baseAmount: number;
  currency: string;
  appliedReason?: string;
  validFrom: string;
  validTo: string;
  carrierCostAmount?: number;
  platformFeeAmount?: number;
  totalWeight: number;
  totalFreight: number;
}

async function getTotalWeight(supabase: any, orderId: string): Promise<number> {
  const { data: packages } = await supabase
    .from("zen_order_packages")
    .select("gross_weight, packing_count")
    .eq("order_id", orderId);
  return (packages || []).reduce(
    (sum: number, p: any) => sum + (Number(p.gross_weight) || 0) * (Number(p.packing_count) || 1),
    0
  );
}

export async function getOrderRateSnapshot(orderId: string): Promise<TisaSnapshotResult | null> {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("Authentication required");

  const isAdmin = checkPermission(profile.role, "/admin");

  // 1. Query existing snapshot
  const { data: snapshot } = await supabase
    .from("zen_order_rate_snapshots")
    .select(`
      id, rate_card_id, applied_unit_price, applied_currency,
      applied_rule, snapshot_at, is_manual, override_reason,
      carrier_cost_amount, platform_fee_amount
    `)
    .eq("order_id", orderId)
    .maybeSingle();

  if (snapshot) {
    // 2. Resolve rate card metadata (version_no, priority, valid_from, valid_to)
    const { data: rateCard } = snapshot.rate_card_id
      ? await supabase
          .from("zen_rate_cards")
          .select("valid_from, valid_until")
          .eq("id", snapshot.rate_card_id)
          .maybeSingle()
      : { data: null };

    // 3. Resolve order metadata for fallback dates
    const { data: order } = !rateCard
      ? await supabase
          .from("zen_orders")
          .select("created_at")
          .eq("id", orderId)
          .maybeSingle()
      : { data: null };

    const totalWeight = await getTotalWeight(supabase, orderId);

    const result: TisaSnapshotResult = {
      id: snapshot.id,
      orderId,
      rateCardId: snapshot.rate_card_id || "N/A",
      versionNo: 1,
      status: snapshot.is_manual ? "MANUAL" : "AUTO",
      priority: 10,
      baseAmount: Number(snapshot.applied_unit_price),
      currency: snapshot.applied_currency || "USD",
      appliedReason: snapshot.override_reason || undefined,
      validFrom: rateCard?.valid_from || order?.created_at || new Date().toISOString(),
      validTo: rateCard?.valid_until || "9999-12-31T23:59:59Z",
      totalWeight,
      totalFreight: totalWeight * Number(snapshot.applied_unit_price || 0),
    };

    // 4. Role-based shape: only add admin fields for admin/manager users
    if (isAdmin) {
      result.carrierCostAmount = snapshot.carrier_cost_amount
        ? Number(snapshot.carrier_cost_amount)
        : undefined;
      result.platformFeeAmount = snapshot.platform_fee_amount
        ? Number(snapshot.platform_fee_amount)
        : undefined;
    }

    return result;
  }

  // 5. No snapshot yet — check if route is selected
  const { data: routeData } = await supabase
    .from("zen_order_routes")
    .select("selected_option_id")
    .eq("order_id", orderId)
    .maybeSingle();

  // 5a. Route selected but no snapshot — trigger auto-capture
  if (routeData?.selected_option_id) {
    let { data: orderData } = await supabase
      .from("zen_orders")
      .select("carrier_id, origin_port_id, dest_port_id, shipper_id, created_at, transport_mode")
      .eq("id", orderId)
      .maybeSingle();

    // Fallback: if carrier_id is NULL, read from route option segments
    if (orderData && !orderData.carrier_id) {
      const { data: option } = await supabase
        .from("zen_route_options")
        .select("segments")
        .eq("id", routeData.selected_option_id)
        .single();
      const segCarrierId = (option?.segments as any[])?.[0]?.carrier_id as string | undefined;
      if (segCarrierId) {
        const { data: carrier } = await supabase
          .from("zen_carriers")
          .select("org_id")
          .eq("id", segCarrierId)
          .single();
        orderData.carrier_id = carrier?.org_id || null;
      }
    }

    if (orderData) {
      // Call fn_get_best_matching_rate via rpc
      const { data: rateResult } = await supabase.rpc("fn_get_best_matching_rate", {
        p_carrier_id: orderData.carrier_id,
        p_origin_port: orderData.origin_port_id,
        p_dest_port: orderData.dest_port_id,
        p_service_type: orderData.transport_mode,
        p_customer_id: orderData.shipper_id,
        p_reference_date: orderData.created_at,
      });

      if (rateResult && rateResult.length > 0) {
        const match = rateResult[0] as any;

        // Insert snapshot
        const { data: inserted } = await supabase
          .from("zen_order_rate_snapshots")
          .insert({
            order_id: orderId,
            rate_card_id: match.id,
            applied_unit_price: match.unit_price,
            applied_currency: match.currency,
            applied_rule: "AUTO",
            snapshot_at: new Date().toISOString(),
            carrier_cost_amount: match.carrier_cost,
            platform_fee_amount: match.platform_fee_amount,
          })
          .select("id, applied_unit_price, applied_currency, carrier_cost_amount, platform_fee_amount, override_reason, is_manual")
          .single();

        if (inserted) {
          const totalWeight = await getTotalWeight(supabase, orderId);

          const result: TisaSnapshotResult = {
            id: inserted.id,
            orderId,
            rateCardId: match.id,
            versionNo: 1,
            status: "AUTO",
            priority: 10,
            baseAmount: Number(inserted.applied_unit_price),
            currency: inserted.applied_currency || "USD",
            validFrom: new Date().toISOString(),
            validTo: "9999-12-31T23:59:59Z",
            totalWeight,
            totalFreight: totalWeight * Number(inserted.applied_unit_price || 0),
          };
          if (isAdmin) {
            result.carrierCostAmount = inserted.carrier_cost_amount
              ? Number(inserted.carrier_cost_amount)
              : undefined;
            result.platformFeeAmount = inserted.platform_fee_amount
              ? Number(inserted.platform_fee_amount)
              : undefined;
          }
          return result;
        }
      }
    }
  }

  // 5b. No route selected or no matching rate — return null
  return null;
}
