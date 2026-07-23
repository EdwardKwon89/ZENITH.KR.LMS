'use server';

import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';
import { getNumericParam } from '@/lib/params/service';
import { generateInvoicesForOrder, finalizeInvoice } from './settlement';
import { revalidatePath } from 'next/cache';

export interface ShipperDailyBillingGroup {
  date: string; // Period Key (YYYY-MM-DD | YYYY년 WNN주 | YYYY-MM)
  shipperId: string;
  shipperName: string;
  agencyOrgId?: string;
  agencyName?: string;
  orderCount: number;
  finalizedCount: number;
  unfinalizedCount: number;
  totalBaseFreight: number;
  totalFuelSurcharge: number;
  totalSurgeFee: number;
  totalOtherCharge: number;
  totalActualAdjustment: number;
  totalBillingAmountUsd: number;
  estimatedBillingAmountKrw: number;
  appliedExchangeRate: number;
  currency: string;
  invoiceIds: string[];
  orderIds: string[];
  periodType?: 'daily' | 'weekly' | 'monthly';
}

export interface ShipperDailyOrderRow {
  orderId: string;
  orderNo: string;
  status: string;
  shippingDate: string;
  shipperId: string;
  shipperName: string;
  destCountryCode: string;
  transportMode: string;
  isFinalized: boolean;
  baseFreight: number;
  fuelSurcharge: number;
  surgeFee: number;
  otherCharge: number;
  actualAdjustment: number;
  totalAmountUsd: number;
  invoiceId?: string;
  invoiceNo?: string;
  invoiceStatus?: string;
}

function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function formatPeriodKey(createdAtStr: string, periodType: 'daily' | 'weekly' | 'monthly' = 'daily'): string {
  const d = new Date(createdAtStr);
  if (isNaN(d.getTime())) return createdAtStr.split('T')[0];

  if (periodType === 'monthly') {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  if (periodType === 'weekly') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const year = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const date = String(monday.getDate()).padStart(2, '0');
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sm = String(sunday.getMonth() + 1).padStart(2, '0');
    const sdate = String(sunday.getDate()).padStart(2, '0');

    return `${year}년 W${getWeekNumber(monday)}주 (${m}.${date}~${sm}.${sdate})`;
  }

  return createdAtStr.split('T')[0];
}

/**
 * 화주별 일별/주별/월별 청구 집계 목록 조회
 */
export async function getShipperDailyBillingSummary(params?: {
  startDate?: string;
  endDate?: string;
  shipperId?: string;
  periodType?: 'daily' | 'weekly' | 'monthly';
}) {
  try {
    const { supabase, profile } = await validateUserAction();
    if (!profile) throw new Error('User profile not found');

    const periodType = params?.periodType || 'daily';
    const exchangeRate = await getNumericParam('EXCHANGE_RATE_USD_KRW', 1350);

    // Build base orders query
    let ordersQuery = supabase
      .from('zen_orders')
      .select(`
        id,
        order_no,
        status,
        transport_mode,
        created_at,
        shipper_id,
        shipper:shipper_id ( id, name )
      `)
      .eq('transport_mode', 'UPS');

    if (params?.shipperId) {
      ordersQuery = ordersQuery.eq('shipper_id', params.shipperId);
    }
    if (params?.startDate) {
      ordersQuery = ordersQuery.gte('created_at', `${params.startDate}T00:00:00Z`);
    }
    if (params?.endDate) {
      ordersQuery = ordersQuery.lte('created_at', `${params.endDate}T23:59:59Z`);
    }

    const { data: orders, error: ordersErr } = await ordersQuery;
    if (ordersErr) {
      logger.error('Error fetching orders for daily billing summary:', ordersErr);
      throw new Error(`오더 목록 조회 실패: ${ordersErr.message}`);
    }

    if (!orders || orders.length === 0) {
      return { success: true, groups: [], exchangeRate };
    }

    const orderIds = orders.map((o) => o.id);

    // Fetch order costs
    const { data: orderCosts, error: costsErr } = await supabase
      .from('zen_order_costs')
      .select('order_id, cost_type, unit_price, quantity, total_amount, currency, invoice_id')
      .in('order_id', orderIds);

    if (costsErr) {
      logger.error('Error fetching order costs for daily billing:', costsErr);
      throw new Error(`비용 정보 조회 실패: ${costsErr.message}`);
    }

    // Fetch invoices for these orders
    const { data: invoices, error: invErr } = await supabase
      .from('zen_invoices')
      .select('id, invoice_no, total_amount, currency, status, is_finalized, metadata')
      .neq('status', 'CANCELED');

    if (invErr) {
      logger.error('Error fetching invoices for daily billing:', invErr);
    }

    // Group by Shipper + Period Key
    const groupsMap = new Map<string, ShipperDailyBillingGroup>();

    for (const order of orders) {
      const periodKey = formatPeriodKey(order.created_at, periodType);
      const shipperName = (order.shipper as any)?.name || '기본 화주';
      const key = `${order.shipper_id}_${periodKey}`;

      let group = groupsMap.get(key);
      if (!group) {
        group = {
          date: periodKey,
          shipperId: order.shipper_id,
          shipperName,
          orderCount: 0,
          finalizedCount: 0,
          unfinalizedCount: 0,
          totalBaseFreight: 0,
          totalFuelSurcharge: 0,
          totalSurgeFee: 0,
          totalOtherCharge: 0,
          totalActualAdjustment: 0,
          totalBillingAmountUsd: 0,
          estimatedBillingAmountKrw: 0,
          appliedExchangeRate: exchangeRate,
          currency: 'USD',
          invoiceIds: [],
          orderIds: [],
          periodType,
        };
        groupsMap.set(key, group);
      }

      group.orderCount += 1;
      group.orderIds.push(order.id);

      // Find costs for this order
      const costs = (orderCosts || []).filter((c) => c.order_id === order.id);
      let baseFreight = 0;
      let fuelSurcharge = 0;
      let surgeFee = 0;
      let otherCharge = 0;
      let actualAdj = 0;

      for (const c of costs) {
        const amt = Number(c.total_amount || c.unit_price * (c.quantity || 1) || 0);
        if (c.cost_type === 'FREIGHT' || c.cost_type === 'BASE_FREIGHT') baseFreight += amt;
        else if (c.cost_type === 'FUEL_SURCHARGE') fuelSurcharge += amt;
        else if (c.cost_type === 'SURGE_EMERGENCY' || c.cost_type === 'SURGE_FEE') surgeFee += amt;
        else if (c.cost_type === 'OTHER_CHARGE') otherCharge += amt;
        else if (c.cost_type === 'UPS_ACTUAL_ADJUSTMENT') actualAdj += amt;
      }

      group.totalBaseFreight += baseFreight;
      group.totalFuelSurcharge += fuelSurcharge;
      group.totalSurgeFee += surgeFee;
      group.totalOtherCharge += otherCharge;
      group.totalActualAdjustment += actualAdj;

      // Find matching invoice
      const matchingInv = (invoices || []).find(
        (inv) => inv.metadata?.source_order_id === order.id
      );

      if (matchingInv) {
        if (!group.invoiceIds.includes(matchingInv.id)) {
          group.invoiceIds.push(matchingInv.id);
        }
        if (matchingInv.is_finalized) {
          group.finalizedCount += 1;
        } else {
          group.unfinalizedCount += 1;
        }
      } else {
        group.unfinalizedCount += 1;
      }

      const orderTotalUsd = baseFreight + fuelSurcharge + surgeFee + otherCharge + actualAdj;
      group.totalBillingAmountUsd += orderTotalUsd;
    }

    // Compute KRW totals
    const groups = Array.from(groupsMap.values()).map((g) => {
      g.estimatedBillingAmountKrw = Math.round(g.totalBillingAmountUsd * g.appliedExchangeRate);
      return g;
    });

    // Sort by date DESC, shipperName ASC
    groups.sort((a, b) => b.date.localeCompare(a.date) || a.shipperName.localeCompare(b.shipperName));

    return { success: true, groups, exchangeRate };
  } catch (err: any) {
    logger.error('getShipperDailyBillingSummary failed:', err);
    return { success: false, error: err.message || '일별/주별/월별 집계 조회 중 오류 발생', groups: [] };
  }
}

/**
 * 특정 화주 및 일자/주/월 소속 오더 세부 내역 조회
 */
export async function getShipperDailyOrdersDetails(
  shipperId: string,
  dateOrPeriod: string,
  periodType: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<{
  success: boolean;
  orders?: ShipperDailyOrderRow[];
  error?: string;
}> {
  try {
    const { supabase } = await validateUserAction();

    let ordersQuery = supabase
      .from('zen_orders')
      .select(`
        id,
        order_no,
        status,
        transport_mode,
        recipient_country_code,
        created_at,
        shipper_id,
        shipper:shipper_id ( name )
      `)
      .eq('shipper_id', shipperId)
      .eq('transport_mode', 'UPS');

    if (periodType === 'daily') {
      ordersQuery = ordersQuery.gte('created_at', `${dateOrPeriod}T00:00:00Z`).lte('created_at', `${dateOrPeriod}T23:59:59Z`);
    } else if (periodType === 'monthly') {
      const [y, m] = dateOrPeriod.split('-');
      const start = `${dateOrPeriod}-01T00:00:00Z`;
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const end = `${dateOrPeriod}-${String(lastDay).padStart(2, '0')}T23:59:59Z`;
      ordersQuery = ordersQuery.gte('created_at', start).lte('created_at', end);
    }

    const { data: orders, error: ordersErr } = await ordersQuery;

    if (ordersErr) throw new Error(`오더 상세 목록 조회 실패: ${ordersErr.message}`);
    if (!orders || orders.length === 0) return { success: true, orders: [] };

    // Filter by periodType if weekly
    const filteredOrders = orders.filter((o) => {
      if (periodType === 'weekly') {
        return formatPeriodKey(o.created_at, 'weekly') === dateOrPeriod;
      }
      return true;
    });

    if (filteredOrders.length === 0) return { success: true, orders: [] };

    const orderIds = filteredOrders.map((o) => o.id);

    const { data: costs } = await supabase
      .from('zen_order_costs')
      .select('order_id, cost_type, unit_price, quantity, total_amount')
      .in('order_id', orderIds);

    const { data: invoices } = await supabase
      .from('zen_invoices')
      .select('id, invoice_no, status, is_finalized, metadata')
      .neq('status', 'CANCELED');

    const resultRows: ShipperDailyOrderRow[] = filteredOrders.map((o) => {
      const oCosts = (costs || []).filter((c) => c.order_id === o.id);
      let baseFreight = 0;
      let fuelSurcharge = 0;
      let surgeFee = 0;
      let otherCharge = 0;
      let actualAdj = 0;

      for (const c of oCosts) {
        const amt = Number(c.total_amount || c.unit_price * (c.quantity || 1) || 0);
        if (c.cost_type === 'FREIGHT' || c.cost_type === 'BASE_FREIGHT') baseFreight += amt;
        else if (c.cost_type === 'FUEL_SURCHARGE') fuelSurcharge += amt;
        else if (c.cost_type === 'SURGE_EMERGENCY' || c.cost_type === 'SURGE_FEE') surgeFee += amt;
        else if (c.cost_type === 'OTHER_CHARGE') otherCharge += amt;
        else if (c.cost_type === 'UPS_ACTUAL_ADJUSTMENT') actualAdj += amt;
      }

      const matchingInv = (invoices || []).find((inv) => inv.metadata?.source_order_id === o.id);

      return {
        orderId: o.id,
        orderNo: o.order_no,
        status: o.status,
        shippingDate: new Date(o.created_at).toISOString().split('T')[0],
        shipperId: o.shipper_id,
        shipperName: (o.shipper as any)?.name || '화주',
        destCountryCode: o.recipient_country_code || 'US',
        transportMode: o.transport_mode,
        isFinalized: !!matchingInv?.is_finalized,
        baseFreight,
        fuelSurcharge,
        surgeFee,
        otherCharge,
        actualAdjustment: actualAdj,
        totalAmountUsd: baseFreight + fuelSurcharge + surgeFee + otherCharge + actualAdj,
        invoiceId: matchingInv?.id,
        invoiceNo: matchingInv?.invoice_no,
        invoiceStatus: matchingInv?.status,
      };
    });

    return { success: true, orders: resultRows };
  } catch (err: any) {
    logger.error('getShipperDailyOrdersDetails failed:', err);
    return { success: false, error: err.message || '상세 내역 조회 실패' };
  }
}

/**
 * 일별/주별/월별 집계 단위 인보이스 일괄 마감 처리
 */
export async function finalizeDailyShipperInvoices(
  invoiceIds: string[],
  reason?: string
): Promise<{ success: boolean; finalizedCount: number; failedCount: number; errors?: string[] }> {
  try {
    const { profile } = await validateUserAction();
    if (!profile) throw new Error('User profile not found');

    const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
    const isAdmin = adminRoles.includes(profile.role);
    if (!isAdmin && profile.role !== USER_ROLES.AGENCY) {
      throw new Error('인보이스 일괄 마감 권한이 없습니다.');
    }

    let finalizedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const invId of invoiceIds) {
      const res = await finalizeInvoice(invId, reason || '집계 단위 일괄 마감');
      if (res.success) {
        finalizedCount += 1;
      } else {
        failedCount += 1;
        if (res.error) errors.push(`[${invId}] ${res.error}`);
      }
    }

    revalidatePath('/finance/daily-billing');
    revalidatePath('/admin/ups-actual-charges');

    return { success: true, finalizedCount, failedCount, errors };
  } catch (err: any) {
    logger.error('finalizeDailyShipperInvoices failed:', err);
    return { success: false, finalizedCount: 0, failedCount: invoiceIds.length, errors: [err.message] };
  }
}
