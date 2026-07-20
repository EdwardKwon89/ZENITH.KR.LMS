'use server';

import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export interface OrderRevenueCostRow {
  orderId: string;
  orderNo: string;
  status: string;
  destCountryCode: string;
  createdAt: string;
  shipperId: string;
  shipperName: string;
  agencyOrgId?: string;
  agencyName?: string;
  revenue: number;
  cost: number;
  margin: number;
  marginRate: number;
  currency: string;
}

export interface SubAgencyProfitRow {
  agencyOrgId: string;
  agencyName: string;
  orderCount: number;
  totalRevenue: number; // Sub-Agency가 SNTL에 지불해야 하는 총액 (SNTL 매출)
  totalCost: number;    // SNTL이 UPS에 지불해야 하는 실제 원가 (SNTL 매입)
  totalMargin: number;  // SNTL 순수익 (Revenue - Cost)
  marginRate: number;   // 수익률 %
}

/**
 * 단건 오더의 매출, 매입, 마진 정보 조회 (기존 데이터 읽기 전용)
 */
export async function getOrderRevenueCost(orderId: string) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');

  const { data: order, error } = await supabase
    .from('zen_orders')
    .select(`
      id,
      order_no,
      status,
      dest_country_code,
      created_at,
      shipper_id,
      shipper:shipper_id ( name ),
      snapshot:zen_order_rate_snapshots (
        carrier_cost_amount,
        applied_unit_price,
        metadata
      ),
      costs:zen_order_costs (
        cost_type,
        unit_price,
        quantity,
        currency,
        is_revenue
      )
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) {
    throw new Error(`오더 정보를 찾을 수 없습니다: ${error?.message || ''}`);
  }

  // 1. 매출 (Revenue): zen_order_costs (is_revenue = true) 총합
  const revenueCosts = (order.costs || []).filter((c: any) => c.is_revenue);
  const currency = revenueCosts[0]?.currency || 'USD';
  let revenue = revenueCosts.reduce((sum: number, c: any) => {
    return sum + Number(c.unit_price || 0) * Number(c.quantity || 1);
  }, 0);

  // zen_order_costs가 아직 계산되지 않은 경우 스냅샷 판매가 활용
  const snapshotMeta = (order.snapshot as any)?.metadata as Record<string, any> | null;
  if (revenue === 0 && snapshotMeta) {
    revenue = Number(snapshotMeta.platform?.totalSellingPrice || snapshotMeta.agency?.agencySellingPrice || 0);
  }

  // 2. 매입 (Cost): 역할에 따라 SNTL 원가 vs Agency 원가 산정
  const isAdminOrManager = (
    [
      USER_ROLES.ADMIN,
      USER_ROLES.MANAGER,
      USER_ROLES.ZENITH_SUPER_ADMIN,
      USER_ROLES.SUB_ADMIN,
    ] as string[]
  ).includes(profile.role as any);

  let cost = 0;
  if (snapshotMeta) {
    if (isAdminOrManager) {
      // SNTL 관점: 플랫폼 실제 UPS 원가
      cost = Number(snapshotMeta.platform?.totalCostPrice || snapshotMeta.platform?.freightCostPrice || 0);
    } else {
      // Agency 관점: Agency 매입 원가
      cost = Number(snapshotMeta.agency?.agencyCostPrice || 0);
    }
  }

  if (cost === 0 && (order.snapshot as any)?.carrier_cost_amount) {
    cost = Number((order.snapshot as any).carrier_cost_amount);
  }

  const margin = revenue - cost;
  const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0;

  return {
    orderId: order.id,
    orderNo: order.order_no,
    status: order.status,
    destCountryCode: order.dest_country_code,
    createdAt: order.created_at,
    shipperName: (order.shipper as any)?.name || 'Unknown',
    revenue: Math.round(revenue * 100) / 100,
    cost: Math.round(cost * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    marginRate: Math.round(marginRate * 100) / 100,
    currency,
  };
}

/**
 * 오더별 매출/매입 리스트 및 합계 조회 (역할별 자동 스코핑)
 */
export async function getOrderRevenueCostList(filters?: {
  dateFrom?: string;
  dateTo?: string;
  agencyOrgId?: string;
  orderNo?: string;
}) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');

  const isAdminOrManager = (
    [
      USER_ROLES.ADMIN,
      USER_ROLES.MANAGER,
      USER_ROLES.ZENITH_SUPER_ADMIN,
    ] as string[]
  ).includes(profile.role as any);

  let query = supabase
    .from('zen_orders')
    .select(`
      id,
      order_no,
      status,
      dest_country_code,
      created_at,
      shipper_id,
      shipper:shipper_id ( name ),
      snapshot:zen_order_rate_snapshots (
        carrier_cost_amount,
        applied_unit_price,
        metadata
      ),
      costs:zen_order_costs (
        cost_type,
        unit_price,
        quantity,
        currency,
        is_revenue
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.dateFrom) {
    query = query.gte('created_at', `${filters.dateFrom}T00:00:00Z`);
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', `${filters.dateTo}T23:59:59Z`);
  }
  if (filters?.orderNo) {
    query = query.ilike('order_no', `%${filters.orderNo.trim()}%`);
  }

  // Scope filtering by role
  if (!isAdminOrManager) {
    if (profile.role === USER_ROLES.AGENCY && profile.org_id) {
      // Get shipper org IDs belonging to this agency
      const { data: links } = await supabase
        .from('zen_agency_shippers')
        .select('shipper_org_id')
        .eq('agency_org_id', profile.org_id)
        .eq('is_active', true);

      const shipperIds = (links || []).map((l: any) => l.shipper_org_id);
      if (shipperIds.length === 0) {
        return { items: [], totalRevenue: 0, totalCost: 0, totalMargin: 0, averageMarginRate: 0 };
      }
      query = query.in('shipper_id', shipperIds);
    } else if (profile.role === USER_ROLES.SUB_ADMIN && profile.org_id) {
      // Get sub-agencies or shippers
      const { data: links } = await supabase
        .from('zen_agency_shippers')
        .select('shipper_org_id')
        .eq('agency_org_id', profile.org_id)
        .eq('is_active', true);

      const shipperIds = (links || []).map((l: any) => l.shipper_org_id);
      if (shipperIds.length > 0) {
        query = query.in('shipper_id', shipperIds);
      }
    } else if (profile.org_id) {
      // General shipper
      query = query.eq('shipper_id', profile.org_id);
    }
  } else if (filters?.agencyOrgId) {
    // Admin selected a specific agency filter
    const { data: links } = await supabase
      .from('zen_agency_shippers')
      .select('shipper_org_id')
      .eq('agency_org_id', filters.agencyOrgId)
      .eq('is_active', true);

    const shipperIds = (links || []).map((l: any) => l.shipper_org_id);
    if (shipperIds.length === 0) {
      return { items: [], totalRevenue: 0, totalCost: 0, totalMargin: 0, averageMarginRate: 0 };
    }
    query = query.in('shipper_id', shipperIds);
  }

  const { data: orders, error } = await query;
  if (error) {
    throw new Error(`오더 매출/매입 목록 조회 실패: ${error.message}`);
  }

  let totalRevenue = 0;
  let totalCost = 0;

  const items: OrderRevenueCostRow[] = (orders || []).map((order: any) => {
    const revenueCosts = (order.costs || []).filter((c: any) => c.is_revenue);
    const currency = revenueCosts[0]?.currency || 'USD';

    let revenue = revenueCosts.reduce((sum: number, c: any) => {
      return sum + Number(c.unit_price || 0) * Number(c.quantity || 1);
    }, 0);

    const snapshotMeta = order.snapshot?.metadata as Record<string, any> | null;
    if (revenue === 0 && snapshotMeta) {
      revenue = Number(snapshotMeta.platform?.totalSellingPrice || snapshotMeta.agency?.agencySellingPrice || 0);
    }

    let cost = 0;
    if (snapshotMeta) {
      if (isAdminOrManager) {
        cost = Number(snapshotMeta.platform?.totalCostPrice || snapshotMeta.platform?.freightCostPrice || 0);
      } else {
        cost = Number(snapshotMeta.agency?.agencyCostPrice || 0);
      }
    }

    if (cost === 0 && order.snapshot?.carrier_cost_amount) {
      cost = Number(order.snapshot.carrier_cost_amount);
    }

    const margin = revenue - cost;
    const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0;

    totalRevenue += revenue;
    totalCost += cost;

    return {
      orderId: order.id,
      orderNo: order.order_no,
      status: order.status,
      destCountryCode: order.dest_country_code,
      createdAt: order.created_at,
      shipperId: order.shipper_id,
      shipperName: order.shipper?.name || 'Unknown',
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      marginRate: Math.round(marginRate * 100) / 100,
      currency,
    };
  });

  const totalMargin = totalRevenue - totalCost;
  const averageMarginRate = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  return {
    items,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalMargin: Math.round(totalMargin * 100) / 100,
    averageMarginRate: Math.round(averageMarginRate * 100) / 100,
  };
}

/**
 * Sub-Agency별 SNTL 수익금 집계 조회 (SUB_ADMIN / ADMIN / MANAGER 전용)
 */
export async function getSubAgencyProfitSummary(filters?: {
  dateFrom?: string;
  dateTo?: string;
  masterAgencyOrgId?: string;
}) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');

  const isAllowed = (
    [
      USER_ROLES.ADMIN,
      USER_ROLES.MANAGER,
      USER_ROLES.ZENITH_SUPER_ADMIN,
      USER_ROLES.SUB_ADMIN,
    ] as string[]
  ).includes(profile.role as any);

  if (!isAllowed) {
    throw new Error('SNTL 수익금 집계 조회 권한이 없습니다.');
  }

  // 1. 모든 Agency 조직 목록 조회
  const { data: agencies, error: orgErr } = await supabase
    .from('zen_organizations')
    .select('id, name')
    .eq('type', 'AGENCY');

  if (orgErr) throw new Error(`대리점 목록 조회 실패: ${orgErr.message}`);

  const rows: SubAgencyProfitRow[] = [];
  let grandTotalRevenue = 0;
  let grandTotalCost = 0;

  for (const agency of agencies || []) {
    // 대리점에 속한 화주 조회
    const { data: links } = await supabase
      .from('zen_agency_shippers')
      .select('shipper_org_id')
      .eq('agency_org_id', agency.id)
      .eq('is_active', true);

    const shipperIds = (links || []).map((l: any) => l.shipper_org_id);
    if (shipperIds.length === 0) continue;

    let query = supabase
      .from('zen_orders')
      .select(`
        id,
        snapshot:zen_order_rate_snapshots ( metadata, carrier_cost_amount ),
        costs:zen_order_costs ( unit_price, quantity, is_revenue )
      `)
      .in('shipper_id', shipperIds);

    if (filters?.dateFrom) {
      query = query.gte('created_at', `${filters.dateFrom}T00:00:00Z`);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59Z`);
    }

    const { data: orders } = await query;
    if (!orders || orders.length === 0) continue;

    let agencyTotalRevenue = 0; // Sub-Agency 납입액 = SNTL 매출
    let agencyTotalCost = 0;    // SNTL 실제 UPS 원가 = SNTL 매입

    orders.forEach((order: any) => {
      const snapshotMeta = order.snapshot?.metadata as Record<string, any> | null;

      // Sub-Agency가 SNTL에 납부하는 금액 = Sub-Agency costPrice 또는 sellingPrice
      let orderRevenue = Number(snapshotMeta?.agency?.agencyCostPrice || snapshotMeta?.agency?.agencySellingPrice || 0);
      if (orderRevenue === 0 && order.costs) {
        const revs = order.costs.filter((c: any) => c.is_revenue);
        orderRevenue = revs.reduce((sum: number, c: any) => sum + Number(c.unit_price || 0) * Number(c.quantity || 1), 0);
      }

      // SNTL이 UPS에 납부하는 실제 원가
      let orderCost = Number(snapshotMeta?.platform?.totalCostPrice || snapshotMeta?.platform?.freightCostPrice || 0);
      if (orderCost === 0 && order.snapshot?.carrier_cost_amount) {
        orderCost = Number(order.snapshot.carrier_cost_amount);
      }

      agencyTotalRevenue += orderRevenue;
      agencyTotalCost += orderCost;
    });

    const agencyMargin = agencyTotalRevenue - agencyTotalCost;
    const marginRate = agencyTotalRevenue > 0 ? (agencyMargin / agencyTotalRevenue) * 100 : 0;

    grandTotalRevenue += agencyTotalRevenue;
    grandTotalCost += agencyTotalCost;

    rows.push({
      agencyOrgId: agency.id,
      agencyName: agency.name,
      orderCount: orders.length,
      totalRevenue: Math.round(agencyTotalRevenue * 100) / 100,
      totalCost: Math.round(agencyTotalCost * 100) / 100,
      totalMargin: Math.round(agencyMargin * 100) / 100,
      marginRate: Math.round(marginRate * 100) / 100,
    });
  }

  const grandTotalMargin = grandTotalRevenue - grandTotalCost;
  const grandAverageMarginRate = grandTotalRevenue > 0 ? (grandTotalMargin / grandTotalRevenue) * 100 : 0;

  return {
    rows,
    totalRevenue: Math.round(grandTotalRevenue * 100) / 100,
    totalCost: Math.round(grandTotalCost * 100) / 100,
    totalMargin: Math.round(grandTotalMargin * 100) / 100,
    totalMarginRate: Math.round(grandAverageMarginRate * 100) / 100,
  };
}
