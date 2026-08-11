import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { getKstToday } from '@/lib/utils/date-kst';
import { applySchedule, expireSchedule } from '@/lib/ups/pricing-schedule-apply';

/**
 * UPS 요금 스케줄링 배치 — 매일 자정 실행
 * POST /api/cron/pricing-schedule-apply
 *
 * Vercel Cron 인증: x-vercel-cron 헤더 검증
 * 수동 트리거: x-api-key 헤더로 CRON_SECRET 대체 가능
 */
export async function POST(req: Request) {
  // Vercel Cron 인증 검증
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-vercel-cron');
  const apiKey = req.headers.get('x-api-key');

  if (cronHeader !== '1' && apiKey !== process.env.CRON_SECRET) {
    logger.warn('[pricing-schedule-cron] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createAdminClient();
    const today = getKstToday();
    const results = { applied: 0, expired: 0, errors: [] as string[] };

    // ─── 1. 적용 (valid_from <= 오늘 AND status='SCHEDULED') ───
    const { data: toApply, error: applyQueryError } = await supabase
      .from('zen_ups_pricing_schedule')
      .select('*')
      .eq('status', 'SCHEDULED')
      .lte('valid_from', today);

    if (applyQueryError) {
      logger.error('[pricing-schedule-cron] Apply query error:', applyQueryError);
      return NextResponse.json({ error: applyQueryError.message }, { status: 500 });
    }

    for (const schedule of toApply || []) {
      try {
        await applySchedule(supabase, schedule);
        results.applied++;
      } catch (err: any) {
        results.errors.push(`Apply ${schedule.id}: ${err.message}`);
        logger.error(`[pricing-schedule-cron] Apply failed for ${schedule.id}:`, err);
      }
    }

    // ─── 2. 만료 (valid_until < 오늘 AND 후속 예약 없음) ───
    const { data: toExpire, error: expireQueryError } = await supabase
      .from('zen_ups_pricing_schedule')
      .select('*')
      .eq('status', 'APPLIED')
      .not('valid_until', 'is', null)
      .lt('valid_until', today);

    if (expireQueryError) {
      logger.error('[pricing-schedule-cron] Expire query error:', expireQueryError);
    }

    for (const schedule of toExpire || []) {
      try {
        await expireSchedule(supabase, schedule);
        results.expired++;
      } catch (err: any) {
        results.errors.push(`Expire ${schedule.id}: ${err.message}`);
        logger.error(`[pricing-schedule-cron] Expire failed for ${schedule.id}:`, err);
      }
    }

    logger.info(`[pricing-schedule-cron] Batch complete:`, results);
    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    logger.error('[pricing-schedule-cron] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET 핸들러 — 상태 확인용
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Pricing schedule cron endpoint is active',
    schedule: '0 15 * * * (daily at KST 00:00 / UTC 15:00)',
  });
}
