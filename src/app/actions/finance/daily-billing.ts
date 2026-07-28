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
  totalBillingAmountKrw: number;
  estimatedBillingAmountUsd: number;
  appliedExchangeRate: number;
  currency: string;
  invoiceIds: string[];
  periodType?: 'daily' | 'weekly' | 'monthly';
  hasUnsupportedCurrency: boolean;
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
  totalAmountKrw: number;
  invoiceId?: string;
  invoiceNo?: string;
  invoiceStatus?: string;
  hasUnsupportedCurrency: boolean;
}

function convertToKrw(amount: number, currency: string, exchangeRate: number): { amountKrw: number; unsupported: boolean } {
  if (currency === 'KRW') return { amountKrw: amount, unsupported: false };
  if (currency === 'USD') return { amountKrw: amount * exchangeRate, unsupported: false };
  return { amountKrw: 0, unsupported: true };
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
 * zen_invoices 기반 역할별 청구 집계 목록 조회
 * - ADMIN/MANAGER/ZENITH_SUPER_ADMIN: 본인 발행 인보이스 (invoice_tier IN ('ADMIN_TO_AGENCY','ADMIN_TO_SHIPPER'))
 * - AGENCY: 매입(본인 billed) + 매출(소속 화주 billed, AGENCY_TO_SHIPPER)
 * - SHIPPER: 본인 billed 인보이스만
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

    const invoiceSelect = `
      id, invoice_no, total_amount, currency, status, is_finalized,
      billed_org_id, invoice_tier, created_at,
      org:billed_org_id ( id, name )
    `;

    const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ZENITH_SUPER_ADMIN] as string[];
    let invoices: any[] = [];

    if (adminRoles.includes(profile.role)) {
      const query = supabase
        .from('zen_invoices')
        .select(invoiceSelect)
        .in('invoice_tier', ['ADMIN_TO_AGENCY', 'ADMIN_TO_SHIPPER'])
        .neq('status', 'CANCELED');

      if (params?.startDate) query.gte('created_at', `${params.startDate}T00:00:00Z`);
      if (params?.endDate) query.lte('created_at', `${params.endDate}T23:59:59Z`);

      const { data, error } = await query;
      if (error) throw new Error(`인보이스 조회 실패: ${error.message}`);
      invoices = data || [];
    } else if (profile.role === USER_ROLES.AGENCY) {
      const { data: links } = await supabase
        .from('zen_agency_shippers')
        .select('shipper_org_id')
        .eq('agency_org_id', profile.org_id)
        .eq('is_active', true);
      const shipperOrgIds = (links || []).map((l: any) => l.shipper_org_id);

      const purchasedQuery = supabase
        .from('zen_invoices')
        .select(invoiceSelect)
        .eq('billed_org_id', profile.org_id)
        .eq('invoice_tier', 'ADMIN_TO_AGENCY')
        .neq('status', 'CANCELED');
      if (params?.startDate) purchasedQuery.gte('created_at', `${params.startDate}T00:00:00Z`);
      if (params?.endDate) purchasedQuery.lte('created_at', `${params.endDate}T23:59:59Z`);
      const { data: purchased } = await purchasedQuery;
      invoices = purchased || [];

      if (shipperOrgIds.length > 0) {
        const soldQuery = supabase
          .from('zen_invoices')
          .select(invoiceSelect)
          .eq('invoice_tier', 'AGENCY_TO_SHIPPER')
          .in('billed_org_id', shipperOrgIds)
          .neq('status', 'CANCELED');
        if (params?.startDate) soldQuery.gte('created_at', `${params.startDate}T00:00:00Z`);
        if (params?.endDate) soldQuery.lte('created_at', `${params.endDate}T23:59:59Z`);
        const { data: sold } = await soldQuery;
        invoices = [...invoices, ...(sold || [])];
      }
    } else {
      const query = supabase
        .from('zen_invoices')
        .select(invoiceSelect)
        .eq('billed_org_id', profile.org_id)
        .neq('status', 'CANCELED');
      if (params?.startDate) query.gte('created_at', `${params.startDate}T00:00:00Z`);
      if (params?.endDate) query.lte('created_at', `${params.endDate}T23:59:59Z`);
      const { data, error } = await query;
      if (error) throw new Error(`인보이스 조회 실패: ${error.message}`);
      invoices = data || [];
    }

    if (invoices.length === 0) {
      return { success: true, groups: [], exchangeRate };
    }

    const groupsMap = new Map<string, ShipperDailyBillingGroup>();

    for (const inv of invoices) {
      const periodKey = formatPeriodKey(inv.created_at, periodType);
      const orgName = (inv.org as any)?.name || '알 수 없는 조직';
      const key = `${inv.billed_org_id}_${periodKey}`;

      let group = groupsMap.get(key);
      if (!group) {
        group = {
          date: periodKey,
          shipperId: inv.billed_org_id,
          shipperName: orgName,
          orderCount: 0,
          finalizedCount: 0,
          unfinalizedCount: 0,
          totalBaseFreight: 0,
          totalFuelSurcharge: 0,
          totalSurgeFee: 0,
          totalOtherCharge: 0,
          totalActualAdjustment: 0,
          totalBillingAmountKrw: 0,
          estimatedBillingAmountUsd: 0,
          appliedExchangeRate: exchangeRate,
          currency: inv.currency || 'USD',
          invoiceIds: [],
          periodType,
          hasUnsupportedCurrency: false,
        };
        groupsMap.set(key, group);
      }

      group.orderCount += 1;
      group.invoiceIds.push(inv.id);

      const { amountKrw, unsupported } = convertToKrw(
        Number(inv.total_amount || 0), inv.currency || 'USD', exchangeRate
      );
      if (unsupported) group.hasUnsupportedCurrency = true;
      group.totalBillingAmountKrw += amountKrw;

      if (inv.is_finalized) {
        group.finalizedCount += 1;
      } else {
        group.unfinalizedCount += 1;
      }
    }

    const groups = Array.from(groupsMap.values()).map((g) => {
      g.estimatedBillingAmountUsd = g.appliedExchangeRate > 0
        ? Math.round(g.totalBillingAmountKrw / g.appliedExchangeRate * 100) / 100
        : 0;
      return g;
    });

    groups.sort((a, b) => b.date.localeCompare(a.date) || a.shipperName.localeCompare(b.shipperName));

    return { success: true, groups, exchangeRate };
  } catch (err: any) {
    logger.error('getShipperDailyBillingSummary failed:', err);
    return { success: false, error: err.message || '일별/주별/월별 집계 조회 중 오류 발생', groups: [] };
  }
}

/**
 * 인보이스 기반 오더 세부 내역 조회
 * invoiceIds → metadata.source_order_id로 실제 오더를 역추적 (전 티어 공통)
 */
export async function getShipperDailyOrdersDetails(
  invoiceIds: string[],
  exchangeRate?: number
): Promise<{
  success: boolean;
  orders?: ShipperDailyOrderRow[];
  error?: string;
}> {
  try {
    const { supabase } = await validateUserAction();
    const rate = exchangeRate || await getNumericParam('EXCHANGE_RATE_USD_KRW', 1350);

    if (!invoiceIds || invoiceIds.length === 0) return { success: true, orders: [] };

    const { data: invoices, error: invErr } = await supabase
      .from('zen_invoices')
      .select('id, invoice_no, status, is_finalized, metadata')
      .in('id', invoiceIds)
      .neq('status', 'CANCELED');

    if (invErr) throw new Error(`인보이스 조회 실패: ${invErr.message}`);
    if (!invoices || invoices.length === 0) return { success: true, orders: [] };

    const orderIds = [...new Set(
      invoices.map((inv: any) => inv.metadata?.source_order_id).filter(Boolean)
    )] as string[];

    if (orderIds.length === 0) return { success: true, orders: [] };

    const { data: orders, error: ordersErr } = await supabase
      .from('zen_orders')
      .select(`
        id, order_no, status, transport_mode, recipient_country_code, created_at,
        shipper_id, shipper:shipper_id ( name )
      `)
      .in('id', orderIds);

    if (ordersErr) throw new Error(`오더 상세 목록 조회 실패: ${ordersErr.message}`);
    if (!orders || orders.length === 0) return { success: true, orders: [] };

    const { data: costs } = await supabase
      .from('zen_order_costs')
      .select('order_id, cost_type, unit_price, quantity, total_amount, currency')
      .in('order_id', orderIds);

    const resultRows: ShipperDailyOrderRow[] = orders.map((o: any) => {
      const oCosts = (costs || []).filter((c: any) => c.order_id === o.id);
      let baseFreight = 0;
      let fuelSurcharge = 0;
      let surgeFee = 0;
      let otherCharge = 0;
      let actualAdj = 0;
      let orderUnsupported = false;

      for (const c of oCosts) {
        const rawAmt = Number(c.total_amount || c.unit_price * (c.quantity || 1) || 0);
        const { amountKrw, unsupported } = convertToKrw(rawAmt, c.currency, rate);
        if (unsupported) orderUnsupported = true;
        if (c.cost_type === 'FREIGHT' || c.cost_type === 'BASE_FREIGHT') baseFreight += amountKrw;
        else if (c.cost_type === 'FUEL_SURCHARGE') fuelSurcharge += amountKrw;
        else if (c.cost_type === 'SURGE_EMERGENCY' || c.cost_type === 'SURGE_FEE') surgeFee += amountKrw;
        else if (c.cost_type === 'OTHER_CHARGE') otherCharge += amountKrw;
        else if (c.cost_type === 'UPS_ACTUAL_ADJUSTMENT') actualAdj += amountKrw;
      }

      const matchingInv = invoices.find((inv: any) => inv.metadata?.source_order_id === o.id);

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
        totalAmountKrw: baseFreight + fuelSurcharge + surgeFee + otherCharge + actualAdj,
        invoiceId: matchingInv?.id,
        invoiceNo: matchingInv?.invoice_no,
        invoiceStatus: matchingInv?.status,
        hasUnsupportedCurrency: orderUnsupported,
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
