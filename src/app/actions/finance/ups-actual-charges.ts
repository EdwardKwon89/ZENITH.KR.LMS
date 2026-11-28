'use server';

import { validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { trError } from '@/lib/i18n/action-error';
import { createAdminClient } from '@/utils/supabase/server';

const ADMIN_ROLES = ['ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const;

/** TASK-B-352: 권한 실패는 throw 대신 로케일 문장을 반환한다(사용자 도달 경로). */
async function assertAdminOnly(profile: { role: string; org_id?: string } | null): Promise<string | null> {
  if (profile && ADMIN_ROLES.includes(profile.role as any)) return null;
  logger.warn(`[assertAdminOnly] Denied for role: ${profile?.role}`);
  return trError('permission_denied');
}

export async function getUpsActualCharges(orderId: string) {
  const { profile } = await validateUserAction();
  const permErr = await assertAdminOnly(profile);
  if (permErr) throw new Error(permErr);
  const db = await createAdminClient();
  const { data, error } = await db
    .from('zen_ups_actual_charges')
    .select(`
      *,
      entered_by_profile:entered_by (
        full_name,
        email
      )
    `)
    .eq('order_id', orderId)
    .order('entered_at', { ascending: true });

  if (error) {
    logger.error('getUpsActualCharges: zen_ups_actual_charges select failed', error);
    throw new Error(await trError('generic', { code: 'ACTUAL_CHARGES_LOOKUP' }));
  }

  return data;
}

export async function getUpsChargeReconciliation(orderId: string) {
  const { profile } = await validateUserAction();
  const permErr = await assertAdminOnly(profile);
  if (permErr) throw new Error(permErr);
  const db = await createAdminClient();

  // 1. 예상비용 합산
  const { data: estimatedCosts, error: estError } = await db
    .from('zen_order_costs')
    .select('cost_type, unit_price, quantity, currency')
    .eq('order_id', orderId)
    .in('cost_type', ['BASE_FREIGHT', 'FUEL_SURCHARGE', 'SURGE_FEE', 'OTHER_CHARGE']);

  if (estError) {
    logger.error('getUpsChargeReconciliation: estimated cost lookup failed', estError);
    throw new Error(await trError('generic', { code: 'ESTIMATED_COST_LOOKUP' }));
  }

  const currency = estimatedCosts?.[0]?.currency || 'USD';
  const estimated = (estimatedCosts || []).reduce((sum, cost) => {
    return sum + (Number(cost.unit_price) * Number(cost.quantity || 1));
  }, 0);

  const estimatedBreakdown = (estimatedCosts || []).map((cost) => ({
    costType: cost.cost_type,
    amount: Number(cost.unit_price) * Number(cost.quantity || 1),
    currency: cost.currency,
  }));

  // 2. 실제청구 합산
  const { data: actualCharges, error: actError } = await db
    .from('zen_ups_actual_charges')
    .select('charge_amount')
    .eq('order_id', orderId);

  if (actError) {
    logger.error('getUpsChargeReconciliation: actual charge lookup failed', actError);
    throw new Error(await trError('generic', { code: 'ACTUAL_CHARGES_LOOKUP' }));
  }

  const additionalSum = (actualCharges || []).reduce((sum, charge) => {
    return sum + Number(charge.charge_amount);
  }, 0);

  const actual = estimated + additionalSum;

  const variance = actual - estimated;

  // 3. 정산 마감 여부 확인 + 청구서 정보 조회
  const { data: existingInvoice } = await db
    .from('zen_invoices')
    .select('id, invoice_no, created_at, is_finalized')
    .filter('metadata->>source_order_id', 'eq', orderId)
    .neq('status', 'CANCELED')
    .maybeSingle();

  return {
    estimated,
    estimatedBreakdown,
    actual,
    variance,
    currency,
    isFinalized: !!existingInvoice?.is_finalized,
    invoiceNo: existingInvoice?.invoice_no ?? null,
    invoiceDate: existingInvoice?.created_at ?? null,
  };
}

export async function searchDeliveredUpsOrders(query: string) {
  const { profile } = await validateUserAction();
  const permErr = await assertAdminOnly(profile);
  if (permErr) throw new Error(permErr);
  const db = await createAdminClient();

  const trimmed = query.trim();
  if (!trimmed) return [];

  // 1. zen_orders 에서 order_no 검색
  const { data: orders, error } = await db
    .from('zen_orders')
    .select(`
      id,
      order_no,
      status,
      transport_mode,
      shipper_id,
      dest_country_code:recipient_country_code,
      created_at,
      tracking_config:zen_tracking_configs(tracking_no)
    `)
    .eq('transport_mode', 'UPS')
    .in('status', ['IN_TRANSIT', 'DELIVERED'])
    .ilike('order_no', `%${trimmed}%`);

  if (error) {
    logger.error('searchDeliveredUpsOrders: zen_orders search failed', error);
    throw new Error(await trError('generic', { code: 'ORDER_SEARCH' }));
  }

  let resultList = orders || [];

  const orderIds = new Set<string>(resultList.map((o) => o.id));

  // 2. tracking_no 로 검색
  const { data: trackingMatches, error: trackErr } = await db
    .from('zen_tracking_configs')
    .select('order_id')
    .ilike('tracking_no', `%${trimmed}%`);

  if (trackErr) {
    logger.error('searchDeliveredUpsOrders: tracking number lookup failed', trackErr);
  }
  if (!trackErr && trackingMatches) {
    const matchedIds = trackingMatches.map((m) => m.order_id).filter(Boolean) as string[];
    const idsToFetch = matchedIds.filter(id => !orderIds.has(id));

    if (idsToFetch.length > 0) {
      let moreOrdersQuery = db
        .from('zen_orders')
        .select(`
          id,
          order_no,
          status,
          transport_mode,
          shipper_id,
          dest_country_code:recipient_country_code,
          created_at,
          tracking_config:zen_tracking_configs(tracking_no)
        `)
        .eq('transport_mode', 'UPS')
        .in('status', ['IN_TRANSIT', 'DELIVERED'])
        .in('id', idsToFetch);

      const { data: moreOrders } = await moreOrdersQuery;

      if (moreOrders) {
        moreOrders.forEach((o) => {
          if (!orderIds.has(o.id)) {
            resultList.push(o);
            orderIds.add(o.id);
          }
        });
      }
    }
  }

  return resultList;
}
