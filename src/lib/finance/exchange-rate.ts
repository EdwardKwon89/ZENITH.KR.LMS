import { logger } from '@/lib/logger';
import { createAdminClient } from '@/utils/supabase/server';
import { getNumericParam } from '@/lib/params/service';
import { getKstToday } from '@/lib/utils/date-kst';

const isTest = process.env.NODE_ENV === 'test';

/** 신규 테이블에도 값이 없는 극단적 케이스(신규 배포 직후 등)의 최후 fallback 환율 */
export const EXCHANGE_RATE_FALLBACK = 1350;

export type ExchangeRateSource = 'KOREAEXIM_API' | 'MANUAL';

export interface ExchangeRateRow {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: number;
  rate_date: string;
  source: ExchangeRateSource;
  fetched_at: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

/**
 * 통화쌍별 특정 일자의 환율을 조회합니다.
 *
 * - `rate_date <= :date` 중 **가장 최근 값**을 조회 — 주말/공휴일(환율 미고시일)에 직전 영업일 값을 자동 fallback.
 * - 신규 테이블(`zen_exchange_rates`)에 값이 하나도 없는 극단적 상황에서만
 *   기존 `zen_system_params.EXCHANGE_RATE_USD_KRW` → 최후 1350 fallback(완전 장애 방지 방어선).
 *
 * @param base    기준 통화 (예: 'USD')
 * @param quote   표시 통화 (예: 'KRW')
 * @param date    기준 일자 (YYYY-MM-DD, 미지정 시 KST 오늘)
 * @param supabase 테스트 주입용 클라이언트 (미전달 시 admin client / test 환경은 global.mockSupabase)
 */
export async function getExchangeRate(
  base: string,
  quote: string,
  date?: string,
  supabase?: any
): Promise<number> {
  const baseCurrency = String(base ?? '').toUpperCase();
  const quoteCurrency = String(quote ?? '').toUpperCase();
  const rateDate = date || getKstToday();

  try {
    const client = supabase ?? (isTest ? (global as any).mockSupabase : await createAdminClient());
    if (!client) return await getNumericParam('EXCHANGE_RATE_USD_KRW', EXCHANGE_RATE_FALLBACK);

    const { data, error } = await client
      .from('zen_exchange_rates')
      .select('rate')
      .eq('base_currency', baseCurrency)
      .eq('quote_currency', quoteCurrency)
      .eq('is_active', true)
      .lte('rate_date', rateDate)
      .order('rate_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.warn(`[EXCHANGE_RATE] Query error (${baseCurrency}/${quoteCurrency} @${rateDate}):`, error.message);
      return await getNumericParam('EXCHANGE_RATE_USD_KRW', EXCHANGE_RATE_FALLBACK);
    }

    if (data && data.rate != null) {
      return Number(data.rate);
    }

    // 테이블에 해당 일자 이전 값이 없음 → 레거시 파라미터 → 최후 fallback
    return await getNumericParam('EXCHANGE_RATE_USD_KRW', EXCHANGE_RATE_FALLBACK);
  } catch (e: any) {
    logger.error(`[EXCHANGE_RATE] getExchangeRate failed (${baseCurrency}/${quoteCurrency} @${rateDate}):`, e);
    return await getNumericParam('EXCHANGE_RATE_USD_KRW', EXCHANGE_RATE_FALLBACK);
  }
}
