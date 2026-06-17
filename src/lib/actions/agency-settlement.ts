"use server";

import { z } from 'zod';
import { logger } from '@/lib/logger';
import { validateUserAction, checkPermission } from '@/lib/auth/guards';
import { createAdminClient } from '@/utils/supabase/server';
import { AgencySettlementQuerySchema } from '@/lib/validations/agency';
import { withAction } from '@/lib/actions/wrapper';

async function _getAgencyShipperIds(supabase: any, agencyOrgId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('zen_agency_shippers')
    .select('shipper_org_id')
    .eq('agency_org_id', agencyOrgId)
    .eq('is_active', true);
  if (error) throw error;
  return data?.map((s: any) => s.shipper_org_id) || [];
}

async function _fetchBaseData(supabase: any, agencyOrgId: string) {
  const [ratesRes, overridesRes] = await Promise.all([
    supabase.from('zen_ups_base_rates').select('id, selling_price, cost_price'),
    supabase.from('zen_agency_rate_overrides').select('base_rate_id, selling_price, cost_price').eq('agency_org_id', agencyOrgId).eq('is_active', true)
  ]);
  if (ratesRes.error) throw ratesRes.error;
  if (overridesRes.error) throw overridesRes.error;
  return { baseRates: ratesRes.data || [], overrides: overridesRes.data || [] };
}

function _calculateOrderSettle(
  order: any,
  baseRates: any[],
  overrides: any[]
): { revenue: number; cost: number; margin: number } {
  const snapshot = order.snapshot;
  if (!snapshot || !snapshot.rate_card_id) {
    return { revenue: 0, cost: 0, margin: 0 };
  }
  const rateId = snapshot.rate_card_id;
  const override = overrides.find((o: any) => o.base_rate_id === rateId);
  const baseRate = baseRates.find((r: any) => r.id === rateId);

  let revenue = 0;
  let cost = 0;

  if (override) {
    revenue = Number(override.selling_price || 0);
    cost = Number(override.cost_price || 0);
  } else if (baseRate) {
    revenue = Number(baseRate.selling_price || 0);
    cost = Number(baseRate.cost_price || 0);
  } else {
    revenue = Number(snapshot.applied_unit_price || 0);
    cost = Number(snapshot.carrier_cost_amount || 0);
  }

  return { revenue, cost, margin: revenue - cost };
}

function pkgWeight(pkg: any): number {
  return pkg.gross_weight || 0;
}

export const getAgencySettlementSummary = withAction(async function (
  agencyOrgId: string,
  from: string,
  to: string
) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }
  const targetAgencyId = profile.role === 'AGENCY' ? profile.org_id : agencyOrgId;
  AgencySettlementQuerySchema.parse({ agency_org_id: targetAgencyId, from, to });

  const supabase = await createAdminClient();
  const shipperIds = await _getAgencyShipperIds(supabase, targetAgencyId);
  if (shipperIds.length === 0) {
    return { orderCount: 0, totalRevenue: 0, totalCost: 0, totalMargin: 0, marginRate: 0 };
  }

  const { data: orders, error } = await supabase
    .from('zen_orders')
    .select('id, snapshot:zen_order_rate_snapshots(rate_card_id, applied_unit_price, carrier_cost_amount)')
    .in('shipper_id', shipperIds)
    .gte('created_at', `${from}T00:00:00Z`)
    .lte('created_at', `${to}T23:59:59Z`);

  if (error) throw error;

  const { baseRates, overrides } = await _fetchBaseData(supabase, targetAgencyId);

  let totalRevenue = 0;
  let totalCost = 0;

  for (const order of (orders || [])) {
    const { revenue, cost } = _calculateOrderSettle(order, baseRates, overrides);
    totalRevenue += revenue;
    totalCost += cost;
  }

  const totalMargin = totalRevenue - totalCost;
  const marginRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  return {
    orderCount: orders?.length || 0,
    totalRevenue,
    totalCost,
    totalMargin,
    marginRate
  };
});

export const getAgencyShipperSettlements = withAction(async function (
  agencyOrgId: string,
  from: string,
  to: string
) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }
  const targetAgencyId = profile.role === 'AGENCY' ? profile.org_id : agencyOrgId;
  AgencySettlementQuerySchema.parse({ agency_org_id: targetAgencyId, from, to });

  const supabase = await createAdminClient();
  const shipperIds = await _getAgencyShipperIds(supabase, targetAgencyId);
  if (shipperIds.length === 0) return [];

  const [ordersRes, baseData] = await Promise.all([
    supabase
      .from('zen_orders')
      .select('id, shipper_id, shipper:shipper_id(name), snapshot:zen_order_rate_snapshots(rate_card_id, applied_unit_price, carrier_cost_amount)')
      .in('shipper_id', shipperIds)
      .gte('created_at', `${from}T00:00:00Z`)
      .lte('created_at', `${to}T23:59:59Z`),
    _fetchBaseData(supabase, targetAgencyId)
  ]);

  if (ordersRes.error) throw ordersRes.error;

  const shipperMap: Record<string, { shipperName: string; orderCount: number; revenue: number; cost: number }> = {};

  for (const order of (ordersRes.data || [])) {
    const shipperId = order.shipper_id;
    const shipperName = order.shipper?.name || 'Unknown';
    if (!shipperMap[shipperId]) {
      shipperMap[shipperId] = { shipperName, orderCount: 0, revenue: 0, cost: 0 };
    }
    const { revenue, cost } = _calculateOrderSettle(order, baseData.baseRates, baseData.overrides);
    shipperMap[shipperId].orderCount += 1;
    shipperMap[shipperId].revenue += revenue;
    shipperMap[shipperId].cost += cost;
  }

  return Object.entries(shipperMap).map(([shipperId, val]) => {
    const margin = val.revenue - val.cost;
    return {
      shipperId,
      shipperName: val.shipperName,
      orderCount: val.orderCount,
      revenue: val.revenue,
      cost: val.cost,
      margin,
      marginRate: val.revenue > 0 ? (margin / val.revenue) * 100 : 0
    };
  });
});

export const getAgencyOrderSettlements = withAction(async function (
  agencyOrgId: string,
  shipperId: string | undefined,
  from: string,
  to: string
) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }
  const targetAgencyId = profile.role === 'AGENCY' ? profile.org_id : agencyOrgId;
  
  const queryParams = { agency_org_id: targetAgencyId, shipper_org_id: shipperId || undefined, from, to };
  AgencySettlementQuerySchema.parse(queryParams);

  const supabase = await createAdminClient();
  let shipperIds = [];
  if (shipperId) {
    shipperIds = [shipperId];
  } else {
    shipperIds = await _getAgencyShipperIds(supabase, targetAgencyId);
  }
  if (shipperIds.length === 0) return [];

  const [ordersRes, baseData] = await Promise.all([
    supabase
      .from('zen_orders')
      .select(`
        id,
        order_no,
        shipper_id,
        created_at,
        shipper:shipper_id(name),
        packages:zen_order_packages(gross_weight, packing_count),
        snapshot:zen_order_rate_snapshots(rate_card_id, applied_unit_price, carrier_cost_amount)
      `)
      .in('shipper_id', shipperIds)
      .gte('created_at', `${from}T00:00:00Z`)
      .lte('created_at', `${to}T23:59:59Z`),
    _fetchBaseData(supabase, targetAgencyId)
  ]);

  if (ordersRes.error) throw ordersRes.error;

  return (ordersRes.data || []).map((order: any) => {
    const { revenue, cost, margin } = _calculateOrderSettle(order, baseData.baseRates, baseData.overrides);
    const totalWeight = order.packages?.reduce((sum: number, p: any) => sum + Number(pkgWeight(p)), 0) || 0;
    const packagesCount = order.packages?.reduce((sum: number, p: any) => sum + (p.packing_count || 1), 0) || 0;

    return {
      orderId: order.id,
      orderNo: order.order_no,
      shipperId: order.shipper_id,
      shipperName: order.shipper?.name || 'Unknown',
      createdAt: order.created_at,
      packagesCount,
      totalWeight,
      revenue,
      cost,
      margin,
      marginRate: revenue > 0 ? (margin / revenue) * 100 : 0
    };
  });
});
