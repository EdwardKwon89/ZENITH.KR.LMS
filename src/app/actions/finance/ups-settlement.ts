'use server';

import { revalidatePath } from 'next/cache';
import { validateUserAction } from '@/lib/auth/guards';
import { hasAdminOrManagerRole } from '@/lib/auth/ups-rate-permissions';
import { logger } from '@/lib/logger';
import { trError, trNotification } from '@/lib/i18n/action-error';
import { sendInAppNotification } from '@/app/actions/misc/notifications';
import { createAdminClient } from '@/utils/supabase/server';
import { computeSettlementCost, buildSettlementPreview } from '@/lib/ups/settlement/build';
import { SettlementCurrencyError, SettlementEstimateError, type UpsSettlementActionResult, type UpsSettlementInput } from '@/lib/ups/settlement/types';

const ORDER_SELECT = `
  id, order_no, status, cost_settlement_status, transport_mode,
  shipper_id, agency_org_id, recipient_country_code, ups_product_code, incoterms, created_at,
  snapshot:zen_order_rate_snapshots ( metadata )
`;

type OrderRow = {
  id: string;
  order_no: string;
  status: string;
  cost_settlement_status: string;
  transport_mode: string;
  shipper_id: string | null;
  agency_org_id: string | null;
  recipient_country_code: string | null;
  ups_product_code: string | null;
  incoterms: string | null;
  created_at: string | null;
  snapshot?: { metadata?: Record<string, any> } | null;
};

function normalizeOrder(raw: OrderRow): OrderRow {
  const snapshot = Array.isArray((raw as any).snapshot) ? (raw as any).snapshot[0] : raw.snapshot;
  return { ...raw, snapshot: snapshot ?? null };
}

async function loadOrder(supabase: any, orderId: string): Promise<OrderRow | null> {
  const { data, error } = await supabase.from('zen_orders').select(ORDER_SELECT).eq('id', orderId).single();
  if (error || !data) {
    if (error) logger.error('ups-settlement: order select failed', { orderId, error: error.message });
    return null;
  }
  return normalizeOrder(data as any);
}

function guardOrder(order: OrderRow, mode: 'draft' | 'finalize'): string | null {
  if (order.transport_mode !== 'UPS') return 'not_ups_order';
  if (order.status !== 'DELIVERED') return 'ups_actual_cost_status_invalid';
  // 정산마감(SETTLED)은 RPC가 같은 입력 재호출을 멱등 반환하므로 여기서 막지 않는다.
  // 다른 입력이면 RPC가 `already_settled`로 거부한다(§2-9). 미리보기·임시저장은 쓰기 금지.
  if (order.cost_settlement_status === 'SETTLED' && mode !== 'finalize') return 'already_settled';
  if (mode === 'finalize' && !order.recipient_country_code) return 'ups_actual_cost_status_invalid';
  return null;
}

async function hasBlockingInvoice(supabase: any, orderId: string): Promise<'paid_invoice_exists' | 'ups_invoice_exists' | 'rpc_failed' | null> {
  const { data, error } = await supabase
    .from('zen_invoices')
    .select('id, status')
    .filter('metadata->>source_order_id', 'eq', orderId);
  if (error) {
    // 조회 실패는 fail-closed — 원가를 먼저 저장한 뒤 RPC에서 거부되어 원가만 바뀌는 상태를 만들지 않는다.
    logger.error('ups-settlement: invoice lookup failed', { orderId, error: error.message });
    return 'rpc_failed';
  }
  const rows = (data ?? []) as Array<{ status: string }>;
  if (rows.some((r) => r.status === 'PAID')) return 'paid_invoice_exists';
  if (rows.some((r) => r.status !== 'CANCELED')) return 'ups_invoice_exists';
  return null;
}

async function saveCostDraft(
  supabase: any,
  order: OrderRow,
  input: UpsSettlementInput,
  userId: string,
  computed?: Awaited<ReturnType<typeof computeSettlementCost>>
) {
  const { summary, amounts } = computed ?? (await computeSettlementCost(supabase, order, input));
  // 원금액을 그대로 저장한다(환산·+7% 가산은 total_cost_krw·스냅샷에만). 초안 재오픈 시 이중 가산 방지.
  const rawAmount = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const rawOtherTotal = amounts.otherCharges.reduce((sum, charge) => sum + rawAmount(charge.amount), 0);
  const { error: upsertError } = await supabase.from('zen_ups_actual_cost').upsert(
    {
      order_id: order.id,
      ups_invoice_no: input.upsInvoiceNo || null,
      ups_invoice_date: input.upsInvoiceDate || null,
      actual_weight_kg: input.actualWeightKg ?? null,
      actual_length_cm: input.actualLengthCm ?? null,
      actual_width_cm: input.actualWidthCm ?? null,
      actual_height_cm: input.actualHeightCm ?? null,
      base_freight_hkd: rawAmount(input.baseFreight?.amount),
      base_freight_currency: summary.baseCurrency,
      fuel_surcharge_hkd: rawAmount(input.fuelSurcharge?.amount),
      fuel_surcharge_currency: (input.fuelSurcharge?.currency || 'KRW').toUpperCase(),
      surge_fee_hkd: rawAmount(input.surgeFee?.amount),
      surge_fee_currency: (input.surgeFee?.currency || 'KRW').toUpperCase(),
      other_charges_hkd: rawOtherTotal,
      entered_by: userId,
      notes: input.notes || null,
      applied_exchange_rate: summary.exchangeRates[summary.baseCurrency] ?? 1,
      total_cost_krw: summary.totalCostKrw,
      cost_surcharge_rate: summary.surchargeRate,
      cost_surcharge_amount_krw: summary.surchargeAmountKrw,
      applied_exchange_rates: summary.appliedExchangeRates,
      calc_version: 3,
    },
    { onConflict: 'order_id' }
  );
  if (upsertError) throw new Error(`ACTUAL_COST_SAVE:${upsertError.message}`);

  const { error: deleteError } = await supabase.from('zen_ups_actual_other_charges').delete().eq('order_id', order.id);
  if (deleteError) throw new Error(`OTHER_CHARGES_SAVE:${deleteError.message}`);
  if (amounts.otherCharges.length > 0) {
    const { error: insertError } = await supabase.from('zen_ups_actual_other_charges').insert(
      amounts.otherCharges.map((c) => ({ order_id: order.id, charge_name: c.name, amount: c.amount, currency: c.currency }))
    );
    if (insertError) throw new Error(`OTHER_CHARGES_SAVE:${insertError.message}`);
  }
  return summary;
}

function mapRpcError(message: string): string {
  const msg = String(message || '');
  for (const key of ['ups_invoice_exists', 'paid_invoice_exists', 'already_settled', 'not_ups_order', 'order_not_found', 'ups_actual_cost_status_invalid', 'settlement_run_missing', 'permission_denied']) {
    if (msg.includes(key)) return key;
  }
  return 'rpc_failed';
}

async function runAction(
  input: UpsSettlementInput,
  mode: 'preview' | 'draft' | 'finalize'
): Promise<UpsSettlementActionResult> {
  const { supabase, user, profile } = await validateUserAction();
  if (!profile || !hasAdminOrManagerRole(profile.role)) {
    logger.warn('ups-settlement: permission denied', { role: profile?.role, mode });
    return { success: false, error: await trError('permission_denied') };
  }
  if (!input?.orderId) return { success: false, error: await trError('order_not_found') };

  const order = await loadOrder(supabase, input.orderId);
  if (!order) return { success: false, error: await trError('order_not_found') };

  const guard = guardOrder(order, mode === 'preview' ? 'draft' : mode);
  if (guard) {
    logger.warn('ups-settlement: order guard', { orderId: input.orderId, reason: guard, mode });
    return { success: false, error: await trError(guard as any) };
  }

  try {
    if (mode === 'preview') {
      const { summary } = await computeSettlementCost(supabase, order, input);
      const preview = await buildSettlementPreview(supabase, order, input, summary);
      return { success: true, preview };
    }

    if (mode === 'draft') {
      await saveCostDraft(supabase, order, input, user.id);
      revalidatePath(`/(dashboard)/orders/${input.orderId}`, 'page');
      revalidatePath('/(dashboard)/finance/daily-billing', 'page');
      return { success: true };
    }

    // 이미 SETTLED: 원가를 덮어쓰지 않고 RPC에 위임한다(같은 입력 → 기존 run 멱등 반환, 다른 입력 → already_settled).
    const isAlreadySettled = order.cost_settlement_status === 'SETTLED';
    if (!isAlreadySettled) {
      const invoiceBlock = await hasBlockingInvoice(supabase, input.orderId);
      if (invoiceBlock === 'rpc_failed') {
        // hasBlockingInvoice가 원인을 logger.error로 이미 기록했다 — 여기서는 원가 저장 없이 반환만 한다.
        return { success: false, error: await trError('rpc_failed') };
      }
      if (invoiceBlock) {
        logger.warn('ups-settlement: invoice exists', { orderId: input.orderId, reason: invoiceBlock });
        return { success: false, error: await trError(invoiceBlock as any) };
      }
    }

    const computed = await computeSettlementCost(supabase, order, input);
    const preview = await buildSettlementPreview(supabase, order, input, computed.summary);
    if (!isAlreadySettled) await saveCostDraft(supabase, order, input, user.id, computed);

    const { data, error } = await supabase.rpc('finalize_ups_settlement_run', {
      p_order_id: input.orderId,
      p_charge_weight_kg: preview.chargeWeightKg,
      p_amounts: preview.amounts,
      p_charges: preview.charges,
    });
    if (error) {
      logger.error('ups-settlement: finalize RPC failed', {
        orderId: input.orderId, code: error.code, message: error.message,
        amountKrw: computed.summary.totalCostKrw, charges: preview.charges.length,
      });
      return { success: false, error: await trError(mapRpcError(error.message) as any) };
    }
    const row = Array.isArray(data) ? data[0] : data;

    // §2-1 7단계: 관리자 3역할 전원에게 알림(best-effort). 수신자 조회·발송 실패는 정산 결과를 되돌리지 않는다.
    try {
    const recipientRoles = ['ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'] as const;
      // MANAGER는 zen_profiles 전체 SELECT 정책이 없어 세션 조회 시 수신자가 자기 자신으로 좁혀진다.
      // 수신자 ID 조회만 관리자 클라이언트로 수행하고(권한은 이미 3역할로 제한), 알림 insert도 asAdmin으로 보낸다.
      const recipientClient = await createAdminClient();
      const { data: recipients, error: recipientError } = await recipientClient
        .from('zen_profiles')
        .select('id')
        .in('role', recipientRoles);
      if (recipientError) {
        logger.warn('ups-settlement: notification recipients lookup failed (best-effort)', recipientError);
      } else {
        const recipientIds = [...new Set(((recipients ?? []) as Array<{ id: string }>).map((r) => r.id))];
        let title = 'UPS settlement finalized';
        let message = order.order_no;
        try {
          title = await trNotification('title');
          message = await trNotification('body', { orderNo: order.order_no });
        } catch (copyError) {
          logger.warn('ups-settlement: notification copy failed (best-effort)', copyError);
        }
        for (const recipientId of recipientIds) {
          try {
            await sendInAppNotification({
              userId: recipientId,
              title,
              message,
              type: 'SYSTEM',
              orderId: input.orderId,
              asAdmin: true,
            });
          } catch (notifyError) {
            logger.warn('ups-settlement: notification send failed (best-effort)', notifyError);
          }
        }
      }
    } catch (notifySetupError) {
      logger.warn('ups-settlement: notification setup failed (best-effort)', notifySetupError);
    }
    revalidatePath(`/(dashboard)/orders/${input.orderId}`, 'page');
    revalidatePath('/(dashboard)/finance/daily-billing', 'page');
    revalidatePath('/(dashboard)/finance/statements', 'page');
    return { success: true, runId: row?.run_id, version: row?.version };
  } catch (err: any) {
    if (err instanceof SettlementCurrencyError) {
      logger.error('ups-settlement: currency conversion failed', { orderId: input.orderId, currency: err.message });
      return { success: false, error: await trError('currency_conversion_failed') };
    }
    if (err instanceof SettlementEstimateError) {
      logger.error('ups-settlement: estimate unavailable', { orderId: input.orderId, reason: err.reason });
      return { success: false, error: await trError('ups_estimate_unavailable') };
    }
    logger.error('ups-settlement: action failed', { orderId: input.orderId, mode, message: err?.message });
    return { success: false, error: await trError('rpc_failed') };
  }
}

export async function previewUpsSettlement(input: UpsSettlementInput): Promise<UpsSettlementActionResult> {
  return runAction(input, 'preview');
}

export async function saveUpsSettlementDraft(input: UpsSettlementInput): Promise<UpsSettlementActionResult> {
  return runAction(input, 'draft');
}

export async function finalizeUpsSettlement(input: UpsSettlementInput): Promise<UpsSettlementActionResult> {
  return runAction(input, 'finalize');
}
