'use server';

import { revalidatePath } from 'next/cache';
import { validateAdminAction, validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';

export interface UpsActualChargeInput {
  chargeType: string;
  amount: number;
  currency: string;
  upsInvoiceNo?: string;
  upsInvoiceDate?: string;
  notes?: string;
}

export async function recordUpsActualCharges(
  orderId: string,
  charges: UpsActualChargeInput[]
): Promise<{ success: boolean; adjustmentAmount?: number; error?: string }> {
  try {
    const { supabase, user } = await validateAdminAction();

    const { data: order, error: orderError } = await supabase
      .from('zen_orders')
      .select('status, transport_mode')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: '오더를 찾을 수 없습니다.' };
    }

    if (order.transport_mode !== 'UPS') {
      return { success: false, error: 'UPS 오더가 아닙니다.' };
    }

    if (order.status !== 'DELIVERED') {
      return { success: false, error: '오더가 배송 완료(DELIVERED) 상태일 때만 실제 청구 요금을 입력할 수 있습니다.' };
    }

    const { data: existingInvoice } = await supabase
      .from('zen_invoices')
      .select('id, is_finalized')
      .filter('metadata->>source_order_id', 'eq', orderId)
      .neq('status', 'CANCELED')
      .maybeSingle();

    const { error: deleteError } = await supabase
      .from('zen_ups_actual_charges')
      .delete()
      .eq('order_id', orderId);

    if (deleteError) {
      return { success: false, error: `기존 실제 요금 삭제 실패: ${deleteError.message}` };
    }

    let actualSum = 0;
    const actualChargesToInsert = charges.map((c) => {
      actualSum += c.amount;
      return {
        order_id: orderId,
        charge_type: c.chargeType,
        charge_amount: c.amount,
        currency: c.currency,
        ups_invoice_no: c.upsInvoiceNo || null,
        ups_invoice_date: c.upsInvoiceDate || null,
        notes: c.notes || null,
        entered_by: user.id,
      };
    });

    if (actualChargesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('zen_ups_actual_charges')
        .insert(actualChargesToInsert);

      if (insertError) {
        return { success: false, error: `실제 요금 등록 실패: ${insertError.message}` };
      }
    }

    const { data: estimatedCosts, error: estError } = await supabase
      .from('zen_order_costs')
      .select('cost_type, unit_price, quantity')
      .eq('order_id', orderId)
      .in('cost_type', ['BASE_FREIGHT', 'FUEL_SURCHARGE', 'SURGE_FEE', 'OTHER_CHARGE']);

    if (estError) {
      return { success: false, error: `예상 비용 조회 실패: ${estError.message}` };
    }

    const estimatedSum = (estimatedCosts || []).reduce((sum, cost) => {
      return sum + (Number(cost.unit_price) * Number(cost.quantity || 1));
    }, 0);

    const adjustmentAmount = actualSum - estimatedSum;

    // 마감 후 조정: 신규 추가 인보이스 발행 경로 (TASK-194-C)
    if (existingInvoice?.is_finalized) {
      const { createPostFinalizationAdjustment } = await import('@/app/actions/finance/settlement');
      return createPostFinalizationAdjustment(orderId, adjustmentAmount, charges[0]?.currency || 'USD', user.id, existingInvoice.id);
    }

    // zen_order_costs에 UPS_ACTUAL_ADJUSTMENT upsert
    if (adjustmentAmount === 0) {
      const { error: deleteCostError } = await supabase
        .from('zen_order_costs')
        .delete()
        .eq('order_id', orderId)
        .eq('cost_type', 'UPS_ACTUAL_ADJUSTMENT');

      if (deleteCostError) {
        return { success: false, error: `조정 비용 삭제 실패: ${deleteCostError.message}` };
      }
    } else {
      const { data: existingAdjustId, error: checkCostError } = await supabase
        .from('zen_order_costs')
        .select('id')
        .eq('order_id', orderId)
        .eq('cost_type', 'UPS_ACTUAL_ADJUSTMENT')
        .maybeSingle();

      if (checkCostError) {
        return { success: false, error: `조정 비용 확인 실패: ${checkCostError.message}` };
      }

      const defaultCurrency = charges[0]?.currency || 'USD';

      if (existingAdjustId) {
        const { error: updateCostError } = await supabase
          .from('zen_order_costs')
          .update({ unit_price: adjustmentAmount, currency: defaultCurrency })
          .eq('id', existingAdjustId.id);

        if (updateCostError) {
          return { success: false, error: `조정 비용 갱신 실패: ${updateCostError.message}` };
        }
      } else {
        const { error: insertCostError } = await supabase
          .from('zen_order_costs')
          .insert({
            order_id: orderId,
            cost_type: 'UPS_ACTUAL_ADJUSTMENT',
            unit_price: adjustmentAmount,
            quantity: 1,
            currency: defaultCurrency,
            is_revenue: true,
          });

        if (insertCostError) {
          return { success: false, error: `조정 비용 생성 실패: ${insertCostError.message}` };
        }
      }
    }

    // 마감 전 갱신: 연결된 인보이스 total_amount 재계산
    if (existingInvoice) {
      if (adjustmentAmount !== 0) {
        const { error: linkError } = await supabase
          .from('zen_order_costs')
          .update({ invoice_id: existingInvoice.id })
          .eq('order_id', orderId)
          .eq('cost_type', 'UPS_ACTUAL_ADJUSTMENT')
          .is('invoice_id', null);

        if (linkError) {
          return { success: false, error: `조정 비용 인보이스 연결 실패: ${linkError.message}` };
        }
      }

      const { data: linkedCosts, error: costsError } = await supabase
        .from('zen_order_costs')
        .select('unit_price, quantity')
        .eq('invoice_id', existingInvoice.id);

      if (costsError) {
        return { success: false, error: `연결 비용 조회 실패: ${costsError.message}` };
      }

      const newTotal = (linkedCosts || []).reduce((sum, c) => {
        return sum + (Number(c.unit_price) * Number(c.quantity || 1));
      }, 0);

      const { error: updateInvError } = await supabase
        .from('zen_invoices')
        .update({ total_amount: newTotal })
        .eq('id', existingInvoice.id);

      if (updateInvError) {
        return { success: false, error: `인보이스 금액 갱신 실패: ${updateInvError.message}` };
      }
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/(dashboard)/orders/${orderId}`);
    revalidatePath(`/admin/ups-actual-charges`);

    return { success: true, adjustmentAmount };
  } catch (err: any) {
    logger.error('Error recording UPS actual charges:', err);
    return { success: false, error: err.message || '알 수 없는 서버 오류' };
  }
}

export async function getUpsActualCharges(orderId: string) {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
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
    throw new Error(`실제 청구 목록 조회 실패: ${error.message}`);
  }

  return data;
}

export async function getUpsChargeReconciliation(orderId: string) {
  const { supabase } = await validateUserAction();

  // 1. 예상비용 합산
  const { data: estimatedCosts, error: estError } = await supabase
    .from('zen_order_costs')
    .select('cost_type, unit_price, quantity, currency')
    .eq('order_id', orderId)
    .in('cost_type', ['BASE_FREIGHT', 'FUEL_SURCHARGE', 'SURGE_FEE', 'OTHER_CHARGE']);

  if (estError) throw new Error(`예상 운임 조회 실패: ${estError.message}`);

  const currency = estimatedCosts?.[0]?.currency || 'USD';
  const estimated = (estimatedCosts || []).reduce((sum, cost) => {
    return sum + (Number(cost.unit_price) * Number(cost.quantity || 1));
  }, 0);

  // 2. 실제청구 합산
  const { data: actualCharges, error: actError } = await supabase
    .from('zen_ups_actual_charges')
    .select('charge_amount')
    .eq('order_id', orderId);

  if (actError) throw new Error(`실제 청구 조회 실패: ${actError.message}`);

  const actual = (actualCharges || []).reduce((sum, charge) => {
    return sum + Number(charge.charge_amount);
  }, 0);

  const variance = actual - estimated;

  return {
    estimated,
    actual,
    variance,
    currency,
  };
}

export async function searchDeliveredUpsOrders(query: string) {
  const { supabase } = await validateAdminAction();

  const trimmed = query.trim();
  if (!trimmed) return [];

  // 1. zen_orders 에서 order_no 검색
  const { data: orders, error } = await supabase
    .from('zen_orders')
    .select(`
      id,
      order_no,
      status,
      transport_mode,
      shipper_id,
      dest_country_code,
      created_at,
      tracking_config:zen_tracking_configs(tracking_no)
    `)
    .eq('transport_mode', 'UPS')
    .eq('status', 'DELIVERED')
    .ilike('order_no', `%${trimmed}%`);

  if (error) {
    throw new Error(`오더 검색 실패: ${error.message}`);
  }

  const resultList = orders || [];
  const orderIds = new Set<string>(resultList.map((o) => o.id));

  // 2. tracking_no 로 검색
  const { data: trackingMatches, error: trackErr } = await supabase
    .from('zen_tracking_configs')
    .select('order_id')
    .ilike('tracking_no', `%${trimmed}%`);

  if (!trackErr && trackingMatches) {
    const matchedIds = trackingMatches.map((m) => m.order_id).filter(Boolean) as string[];
    const idsToFetch = matchedIds.filter(id => !orderIds.has(id));

    if (idsToFetch.length > 0) {
      const { data: moreOrders } = await supabase
        .from('zen_orders')
        .select(`
          id,
          order_no,
          status,
          transport_mode,
          shipper_id,
          dest_country_code,
          created_at,
          tracking_config:zen_tracking_configs(tracking_no)
        `)
        .eq('transport_mode', 'UPS')
        .eq('status', 'DELIVERED')
        .in('id', idsToFetch);

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
