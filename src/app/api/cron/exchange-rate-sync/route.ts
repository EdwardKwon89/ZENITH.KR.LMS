import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { getKstToday } from '@/lib/utils/date-kst';

/**
 * 환율 자동 수집 배치 — 매일 KST 11:30 실행
 * POST /api/cron/exchange-rate-sync
 *
 * 소스: 한국수출입은행(Korea Eximbank) Open API 고시환율 (data=AP01)
 * - 매매기준율(`deal_bas_r`)을 USD/KRW + HKD/KRW로 zen_exchange_rates에 upsert
 *   (HKD/KRW는 Issue #1009 UPS 사후 원가 확정 시 사용)
 * - 키 미설정(KOREAEXIM_API_KEY) 시 스킵(200 + 로그)
 * - 당일 고시 없음(공휴일 등)·API 장애는 에러를 삼키지 않고 로깅(쿼리 시점 `rate_date <= date` fallback으로 공백 보완)
 *
 * Vercel Cron 인증: x-vercel-cron 헤더 검증 (수동 트리거: x-api-key = CRON_SECRET)
 */
export async function POST(req: Request) {
  const cronHeader = req.headers.get('x-vercel-cron');
  const apiKey = req.headers.get('x-api-key');

  if (cronHeader !== '1' && apiKey !== process.env.CRON_SECRET) {
    logger.warn('[exchange-rate-sync] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authKey = process.env.KOREAEXIM_API_KEY;
  if (!authKey) {
    logger.warn('[exchange-rate-sync] KOREAEXIM_API_KEY not configured — skip');
    return NextResponse.json({ success: false, skipped: 'KOREAEXIM_API_KEY not configured' });
  }

  try {
    const supabase = await createAdminClient();
    const today = getKstToday();
    const rates = await fetchKoreaEximRates(authKey, today);

    if (rates == null || (rates.USD == null && rates.HKD == null)) {
      logger.error(`[exchange-rate-sync] No rate for ${today} (holiday or API error)`);
      return NextResponse.json({ success: false, date: today, error: 'No rate published for today' });
    }

    const upserts = [] as { base_currency: string; rate: number }[];
    if (rates.USD != null) upserts.push({ base_currency: 'USD', rate: rates.USD });
    if (rates.HKD != null) upserts.push({ base_currency: 'HKD', rate: rates.HKD });

    for (const item of upserts) {
      const { error } = await supabase
        .from('zen_exchange_rates')
        .upsert(
          {
            base_currency: item.base_currency,
            quote_currency: 'KRW',
            rate: item.rate,
            rate_date: today,
            source: 'KOREAEXIM_API',
            fetched_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: 'base_currency,quote_currency,rate_date' }
        );

      if (error) throw new Error(error.message);
      logger.info(`[exchange-rate-sync] Upserted ${item.base_currency}/KRW ${item.rate} for ${today}`);
    }

    return NextResponse.json({ success: true, date: today, rates });
  } catch (err: any) {
    logger.error('[exchange-rate-sync] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 한국수출입은행 Open API 고시환율 조회 (USD 매매기준율, 실패 시 null) */
export async function fetchKoreaEximRate(authKey: string, searchDate: string): Promise<number | null> {
  const rates = await fetchKoreaEximRates(authKey, searchDate);
  return rates?.USD ?? null;
}

/**
 * 한국수출입은행 Open API 고시환율 조회 — USD/HKD 매매기준율 (Issue #1009)
 * 응답 배열 전체에서 해당 통화 행을 찾아 콤마 제거 후 수치화한다.
 * 공휴일 등 고시 없음(result=2) 또는 비배열 응답 시 null 반환.
 */
export async function fetchKoreaEximRates(
  authKey: string,
  searchDate: string
): Promise<{ USD: number | null; HKD: number | null } | null> {
  const url = new URL('https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON');
  url.searchParams.set('authkey', authKey);
  url.searchParams.set('searchdate', searchDate.replace(/-/g, ''));
  url.searchParams.set('data', 'AP01');

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`KoreaExim API HTTP ${res.status}`);

  const rows: any[] = await res.json();
  if (!Array.isArray(rows)) return null;

  const parse = (cur: string): number | null => {
    const row = rows.find((r) => r?.cur_unit === cur);
    if (!row || row.result === 2) return null;
    const rate = Number(String(row.deal_bas_r ?? '').replace(/,/g, ''));
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  };

  return { USD: parse('USD'), HKD: parse('HKD') };
}

// GET 핸들러 — 상태 확인용
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Exchange rate sync cron endpoint is active',
    schedule: '30 2 * * * (daily at KST 11:30 / UTC 02:30)',
  });
}
