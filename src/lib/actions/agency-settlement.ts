"use server";

import { z } from 'zod';
import * as XLSX from 'xlsx';
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
  const [policiesRes, zonesRes] = await Promise.all([
    supabase
      .from('zen_agency_pricing_policies')
      .select('zone_id, discount_rate')
      .eq('agency_org_id', agencyOrgId)
      .eq('is_active', true),
    supabase
      .from('zen_ups_zone_countries')
      .select('country_code, zone_id'),
  ]);
  if (policiesRes.error) throw policiesRes.error;
  if (zonesRes.error) throw zonesRes.error;
  const policies: Record<string, number> = {};
  for (const p of (policiesRes.data || [])) {
    policies[p.zone_id] = Number(p.discount_rate);
  }
  const zoneMap: Record<string, string> = {};
  for (const z of (zonesRes.data || [])) {
    zoneMap[z.country_code] = z.zone_id;
  }
  return { policies, zoneMap };
}

function _calculateOrderSettle(
  order: any,
  policies: Record<string, number>,
  zoneMap: Record<string, string>
): { revenue: number; cost: number; margin: number } {
  const snapshot = order.snapshot;
  if (!snapshot) {
    return { revenue: 0, cost: 0, margin: 0 };
  }

  const revenue = Number(snapshot.applied_unit_price || 0);
  const meta = snapshot.metadata as Record<string, any> | null;
  const breakdown = meta?.platform?.breakdown;
  const destCode = order.dest_country_code as string | undefined;

  let cost: number;
  if (breakdown && destCode) {
    const platformSellingTotal =
      Number(breakdown.baseSellingPrice || 0) +
      Number(breakdown.fuelSurchargeSellingAmount || 0) +
      Number(breakdown.otherChargesSellingTotal || 0) +
      Number(breakdown.surgeFeeSellingAmount || 0);
    const zoneId = zoneMap[destCode];
    const discountRate = zoneId ? policies[zoneId] : undefined;
    if (discountRate !== undefined) {
      cost = Math.round(platformSellingTotal * (1 - discountRate) * 100) / 100;
    } else {
      cost = Number(snapshot.carrier_cost_amount || 0);
    }
  } else {
    cost = Number(snapshot.carrier_cost_amount || 0);
  }
  return { revenue, cost, margin: Math.round((revenue - cost) * 100) / 100 };
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

  const [ordersRes, { policies, zoneMap }] = await Promise.all([
    supabase
      .from('zen_orders')
      .select('id, dest_country_code, snapshot:zen_order_rate_snapshots(rate_card_id, applied_unit_price, carrier_cost_amount, metadata)')
      .in('shipper_id', shipperIds)
      .gte('created_at', `${from}T00:00:00Z`)
      .lte('created_at', `${to}T23:59:59Z`),
    _fetchBaseData(supabase, targetAgencyId),
  ]);

  if (ordersRes.error) throw ordersRes.error;

  let totalRevenue = 0;
  let totalCost = 0;

  for (const order of (ordersRes.data || [])) {
    const { revenue, cost } = _calculateOrderSettle(order, policies, zoneMap);
    totalRevenue += revenue;
    totalCost += cost;
  }

  const totalMargin = totalRevenue - totalCost;
  const marginRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  return {
    orderCount: ordersRes.data?.length || 0,
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

  const [ordersRes, { policies, zoneMap }] = await Promise.all([
    supabase
      .from('zen_orders')
      .select('id, shipper_id, dest_country_code, shipper:shipper_id(name), snapshot:zen_order_rate_snapshots(rate_card_id, applied_unit_price, carrier_cost_amount, metadata)')
      .in('shipper_id', shipperIds)
      .gte('created_at', `${from}T00:00:00Z`)
      .lte('created_at', `${to}T23:59:59Z`),
    _fetchBaseData(supabase, targetAgencyId),
  ]);

  if (ordersRes.error) throw ordersRes.error;

  const shipperMap: Record<string, { shipperName: string; orderCount: number; revenue: number; cost: number }> = {};

  for (const order of (ordersRes.data || [])) {
    const shipperId = order.shipper_id;
    const shipperObj = Array.isArray(order.shipper) ? order.shipper[0] : order.shipper;
    const shipperName = shipperObj?.name || 'Unknown';
    if (!shipperMap[shipperId]) {
      shipperMap[shipperId] = { shipperName, orderCount: 0, revenue: 0, cost: 0 };
    }
    const { revenue, cost } = _calculateOrderSettle(order, policies, zoneMap);
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

export const getAgencyUnpricedOrders = withAction(async function (
  agencyOrgId: string,
  from: string,
  to: string
) {
  const result = await getAgencyOrderSettlements(agencyOrgId, undefined, from, to);
  if (result.error) throw new Error(result.error);
  return (result.data || [])
    .filter(o => o.revenue === 0)
    .map(o => ({
      orderId: o.orderId,
      orderNo: o.orderNo,
      shipperId: o.shipperId,
      shipperName: o.shipperName,
      createdAt: o.createdAt,
    }));
});

export const getAgencyOrderSettlements = withAction(async function (
  agencyOrgId: string,
  shipperId: string | undefined,
  from: string,
  to: string,
  orderNoSearch?: string
) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }
  const targetAgencyId = profile.role === 'AGENCY' ? profile.org_id : agencyOrgId;

  const queryParams = { agency_org_id: targetAgencyId, shipper_org_id: shipperId || undefined, from, to, order_no_search: orderNoSearch };
  AgencySettlementQuerySchema.parse(queryParams);

  const supabase = await createAdminClient();
  const shipperIds = shipperId
    ? [shipperId]
    : await _getAgencyShipperIds(supabase, targetAgencyId);
  if (shipperIds.length === 0) return [];

  let query = supabase
    .from('zen_orders')
    .select(`
      id, order_no, shipper_id, dest_country_code, created_at,
      shipper:shipper_id(name),
      packages:zen_order_packages(gross_weight, packing_count),
      snapshot:zen_order_rate_snapshots(rate_card_id, applied_unit_price, carrier_cost_amount, metadata)
    `)
    .in('shipper_id', shipperIds)
    .gte('created_at', `${from}T00:00:00Z`)
    .lte('created_at', `${to}T23:59:59Z`);

  if (orderNoSearch) {
    query = query.ilike('order_no', `%${orderNoSearch}%`);
  }

  const [ordersRes, { policies, zoneMap }] = await Promise.all([
    query,
    _fetchBaseData(supabase, targetAgencyId)
  ]);

  if (ordersRes.error) throw ordersRes.error;

  return (ordersRes.data || []).map((order: any) => {
    const { revenue, cost, margin } = _calculateOrderSettle(order, policies, zoneMap);
    const totalWeight = order.packages?.reduce((sum: number, p: any) => sum + Number(pkgWeight(p)), 0) || 0;
    const packagesCount = order.packages?.reduce((sum: number, p: any) => sum + (p.packing_count || 1), 0) || 0;

    const meta = order.snapshot?.metadata as Record<string, any> | null;
    const bd = meta?.platform?.breakdown ?? null;

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
      marginRate: revenue > 0 ? (margin / revenue) * 100 : 0,
      breakdown: bd ? {
        baseSellingPrice: Number(bd.baseSellingPrice ?? 0),
        fuelSurchargeSellingAmount: Number(bd.fuelSurchargeSellingAmount ?? 0),
        otherChargesSellingTotal: Number(bd.otherChargesSellingTotal ?? 0),
        surgeFeeSellingAmount: Number(bd.surgeFeeSellingAmount ?? 0),
      } : null,
    };
  });
});

type _ExcelRow = {
  orderNo: string;
  shipperName: string;
  createdAt: string;
  packagesCount: number;
  totalWeight: number;
  revenue: number;
  cost: number;
  margin: number;
  marginRate: number;
};

function _generateXlsxBase64(rows: _ExcelRow[]): string {
  const worksheetData = rows.map(r => ({
    '오더번호': r.orderNo,
    '화주명': r.shipperName,
    '생성일': r.createdAt.slice(0, 10),
    '패키지수': r.packagesCount,
    '중량(kg)': Number(r.totalWeight.toFixed(1)),
    '매출(USD)': r.revenue,
    '원가(USD)': r.cost,
    '마진(USD)': r.margin,
    '마진율(%)': Number(r.marginRate.toFixed(2)),
  }));

  const ws = XLSX.utils.json_to_sheet(worksheetData);
  ws['!cols'] = [
    { wch: 22 }, { wch: 16 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '정산내역');
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

function _todayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function _fetchOrders(supabase: any, shipperIds: string[], from: string, to: string, orderNoSearch?: string) {
  let query = supabase
    .from('zen_orders')
    .select(`
      id, order_no, shipper_id, dest_country_code, created_at,
      shipper:shipper_id(name),
      packages:zen_order_packages(gross_weight, packing_count),
      snapshot:zen_order_rate_snapshots(rate_card_id, applied_unit_price, carrier_cost_amount, metadata)
    `)
    .in('shipper_id', shipperIds)
    .gte('created_at', `${from}T00:00:00Z`)
    .lte('created_at', `${to}T23:59:59Z`);
  if (orderNoSearch) {
    query = query.ilike('order_no', `%${orderNoSearch}%`);
  }
  return query;
}

function _mapToExcelRow(order: any, policies: Record<string, number>, zoneMap: Record<string, string>): _ExcelRow {
  const { revenue, cost, margin } = _calculateOrderSettle(order, policies, zoneMap);
  const totalWeight = order.packages?.reduce((sum: number, p: any) => sum + Number(pkgWeight(p)), 0) || 0;
  const packagesCount = order.packages?.reduce((sum: number, p: any) => sum + (p.packing_count || 1), 0) || 0;
  return {
    orderNo: order.order_no,
    shipperName: order.shipper?.name || 'Unknown',
    createdAt: order.created_at,
    packagesCount,
    totalWeight,
    revenue,
    cost,
    margin,
    marginRate: revenue > 0 ? (margin / revenue) * 100 : 0,
  };
}

export const exportAgencySettlementExcel = withAction(async function (
  agencyOrgId: string,
  shipperId: string | undefined,
  from: string,
  to: string,
  orderNoSearch?: string
) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }
  const targetAgencyId = profile.role === 'AGENCY' ? profile.org_id : agencyOrgId;
  AgencySettlementQuerySchema.parse({
    agency_org_id: targetAgencyId,
    shipper_org_id: shipperId || undefined,
    from,
    to,
    order_no_search: orderNoSearch,
  });

  const supabase = await createAdminClient();
  const shipperIds = shipperId
    ? [shipperId]
    : await _getAgencyShipperIds(supabase, targetAgencyId);

  if (shipperIds.length === 0) {
    return { base64: _generateXlsxBase64([]), filename: `agency_settlement_${_todayStr()}.xlsx` };
  }

  const [ordersRes, { policies, zoneMap }] = await Promise.all([
    _fetchOrders(supabase, shipperIds, from, to, orderNoSearch),
    _fetchBaseData(supabase, targetAgencyId),
  ]);

  if (ordersRes.error) throw ordersRes.error;

  const rows = (ordersRes.data || []).map((order: any) =>
    _mapToExcelRow(order, policies, zoneMap)
  );

  return {
    base64: _generateXlsxBase64(rows),
    filename: `agency_settlement_${_todayStr()}.xlsx`,
  };
});
