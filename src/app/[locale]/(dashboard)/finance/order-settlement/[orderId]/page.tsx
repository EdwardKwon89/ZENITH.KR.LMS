// TASK-B-369 (Issue #1425) — S2 오더정산 상세 /finance/order-settlement/[orderId] (Admin).
import { notFound, redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { getUpsActualCost } from '@/app/actions/finance/ups-actual-cost';
import { getOrderReleasedDate } from '@/lib/orders/order-released-date';
import { getExchangeRate } from '@/lib/finance/exchange-rate';
import { logger } from '@/lib/logger';
import { OrderSettlementDetail } from '@/components/finance/order-settlement';
import type {
  CostSettlementStatus,
  OrderSettlementDetailData,
  SavedActualCost,
  SystemValues,
} from '@/components/finance/order-settlement';

const ADMIN_ROLES = ['ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'];

function toNum(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Supabase embedded relation은 1:1에서도 배열로 올 수 있어 양쪽을 정규화한다. */
function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function FinanceOrderSettlementDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  const { profile, supabase } = await requireAuth();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    redirect(`/${locale}/dashboard`);
  }

  const { data: order, error: orderError } = await supabase
    .from('zen_orders')
    .select(`
      id,
      order_no,
      status,
      cost_settlement_status,
      cost_settled_at,
      transport_mode,
      recipient_country_code,
      ups_product_code,
      created_at,
      shipper:zen_organizations!shipper_id(name),
      agency:zen_organizations!agency_org_id(name),
      snapshot:zen_order_rate_snapshots(metadata)
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    logger.error('FinanceOrderSettlementDetailPage: order lookup failed', orderError);
    notFound();
  }
  if (!order || order.transport_mode !== 'UPS') notFound();

  const [{ data: deliveredRow }, releasedAt, savedRow] = await Promise.all([
    supabase
      .from('order_status_history')
      .select('created_at')
      .eq('order_id', orderId)
      .eq('next_status', 'DELIVERED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getOrderReleasedDate(supabase, orderId, order.created_at),
    getUpsActualCost(orderId),
  ]);

  let exchangeRate: number | null = null;
  try {
    exchangeRate = await getExchangeRate('HKD', 'KRW', releasedAt, supabase);
  } catch (err) {
    logger.error('FinanceOrderSettlementDetailPage: exchange rate lookup failed', err);
  }

  // 레거시 오더별 인보이스 — 조회 실패는 로그로 남기고, 최종 차단은 markOrderCostSettled가 재검증한다.
  const { data: legacyRows, error: legacyError } = await supabase
    .from('zen_invoices')
    .select('id')
    .filter('metadata->>source_order_id', 'eq', orderId)
    .neq('status', 'CANCELED')
    .limit(1);
  if (legacyError) {
    logger.error('FinanceOrderSettlementDetailPage: legacy invoice lookup failed', legacyError);
  }

  const snapshot = firstRelation(order.snapshot as any);
  const metadata = (snapshot?.metadata ?? {}) as Record<string, any>;
  const platform = metadata.platform as Record<string, any> | undefined;
  const agency = metadata.agency as Record<string, any> | undefined;
  const shipper = metadata.shipper as Record<string, any> | undefined;

  const system: SystemValues | null = platform
    ? {
      actualWeightKg: toNum(platform.actualWeightKg),
      volumetricWeightKg: toNum(platform.volumetricWeightKg),
      chargeableWeightKg: toNum(platform.chargeableWeightKg),
      billingWeightKg: toNum(platform.billingWeightKg),
      totalSellingPrice: toNum(platform.totalSellingPrice),
    }
    : null;

  const platformTotal = toNum(platform?.totalSellingPrice) ?? 0;
  const agencyCostPrice = toNum(agency?.agencyCostPrice) ?? 0;
  const revenueBaseline = {
    agencyTotal: agencyCostPrice > 0 ? agencyCostPrice : platformTotal,
    shipperTotal: toNum(shipper?.finalFreight) ?? platformTotal,
  };

  const { data: savedCharges } = savedRow
    ? await supabase
      .from('zen_ups_actual_other_charges')
      .select('charge_name, amount, currency')
      .eq('order_id', orderId)
    : { data: [] };

  const savedCost: SavedActualCost | null = savedRow
    ? (() => {
      const krwBased = savedRow.base_freight_currency === 'KRW';
      return {
        upsInvoiceNo: savedRow.ups_invoice_no ?? null,
        upsInvoiceDate: savedRow.ups_invoice_date ?? null,
        actualWeightKg: toNum(savedRow.actual_weight_kg),
        actualLengthCm: toNum(savedRow.actual_length_cm),
        actualWidthCm: toNum(savedRow.actual_width_cm),
        actualHeightCm: toNum(savedRow.actual_height_cm),
        baseFreightHkd: toNum(savedRow.base_freight_hkd),
        baseFreightCurrency: savedRow.base_freight_currency ?? 'KRW',
        fuelSurchargeHkd: toNum(savedRow.fuel_surcharge_hkd),
        fuelSurchargeCurrency: savedRow.fuel_surcharge_currency ?? 'KRW',
        surgeFeeHkd: toNum(savedRow.surge_fee_hkd),
        surgeFeeCurrency: savedRow.surge_fee_currency ?? 'KRW',
        otherChargesHkd: toNum(savedRow.other_charges_hkd),
        otherCharges: (savedCharges ?? []).map((charge: any) => ({
          name: charge.charge_name,
          amount: Number(charge.amount) || 0,
          currency: charge.currency || 'KRW',
        })),
        calcVersion: Number(savedRow.calc_version) || 0,
        notes: savedRow.notes ?? null,
        totalCostKrw: Number(savedRow.total_cost_krw ?? 0),
        krwBased,
      };
    })()
    : null;

  const detail: OrderSettlementDetailData = {
    orderId: order.id,
    orderNo: order.order_no,
    settlementStatus: (order.cost_settlement_status ?? 'NOT_SETTLED') as CostSettlementStatus,
    costSettledAt: order.cost_settled_at ?? null,
    deliveredAt: deliveredRow?.created_at ?? null,
    releasedAt: releasedAt ?? null,
    shipperName: firstRelation(order.shipper as any)?.name ?? null,
    agencyName: firstRelation(order.agency as any)?.name ?? null,
    upsProductCode: order.ups_product_code ?? null,
    recipientCountryCode: order.recipient_country_code ?? null,
    exchangeRate,
    legacyInvoiced: !legacyError && (legacyRows?.length ?? 0) > 0,
    system,
    revenueBaseline,
    savedCost,
  };

  return <OrderSettlementDetail detail={detail} locale={locale} />;
}
