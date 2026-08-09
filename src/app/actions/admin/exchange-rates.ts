'use server';

import { revalidatePath } from 'next/cache';
import { validateAdminAction } from '@/lib/auth/guards';
import { setManualExchangeRateSchema, validatePayload } from '@/lib/validation/schemas';
import { getKstToday } from '@/lib/utils/date-kst';

export interface ExchangeRateRow {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: number;
  rate_date: string;
  source: 'KOREAEXIM_API' | 'MANUAL';
  fetched_at: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

/** 일자별 환율 이력 조회 (최신순) */
export async function listExchangeRates(page = 1, pageSize = 50) {
  const { supabase } = await validateAdminAction();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('zen_exchange_rates')
    .select('*', { count: 'exact' })
    .order('rate_date', { ascending: false })
    .range(from, to);

  if (error) throw new Error(`환율 이력 조회 실패: ${error.message}`);
  return { rates: (data as ExchangeRateRow[] | null) || [], total: count || 0 };
}

/** 수동 보정 입력 — 특정 일자 환율을 MANUAL 소스로 upsert */
export async function setManualExchangeRate(payload: unknown) {
  const validated = validatePayload(setManualExchangeRateSchema, payload);
  if (!validated.success) {
    throw new Error(`입력 검증 실패: ${validated.error}`);
  }

  const { supabase, profile } = await validateAdminAction();
  const { base_currency, quote_currency, rate, rate_date } = validated.data;

  const { data, error } = await supabase
    .from('zen_exchange_rates')
    .upsert(
      {
        base_currency: base_currency.toUpperCase(),
        quote_currency: quote_currency.toUpperCase(),
        rate,
        rate_date,
        source: 'MANUAL',
        fetched_at: new Date().toISOString(),
        is_active: true,
        created_by: profile?.id || null,
      },
      { onConflict: 'base_currency,quote_currency,rate_date' }
    )
    .select()
    .single();

  if (error) throw new Error(`환율 보정 저장 실패: ${error.message}`);
  revalidatePath('/admin/exchange-rates');
  return { success: true, data };
}

/** 최근 자동 수집 상태 — 최신 KOREAEXIM_API 수집 시각 기준 */
export async function getExchangeRateSyncStatus() {
  const { supabase } = await validateAdminAction();

  const { data: latest } = await supabase
    .from('zen_exchange_rates')
    .select('rate_date, fetched_at, source, rate')
    .eq('source', 'KOREAEXIM_API')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const today = getKstToday();
  const lastFetchedAt = latest?.fetched_at || null;
  const lastRateDate = latest?.rate_date || null;

  // 오늘 KOREAEXIM_API 수집 행 존재 여부로 최근 수집 정상/지연 판정
  const syncedToday = lastRateDate === today;

  return {
    lastFetchedAt,
    lastRateDate,
    lastRate: latest?.rate ?? null,
    syncedToday,
  };
}
