import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { pollTracking, storeTrackingEvents, isDelivered } from '@/lib/shxk/tracking';
import { OrderStatus } from '@/types/orders';

/**
 * UPS 트래킹 폴링 배치 — 1시간 주기 실행
 * POST /api/cron/ups-tracking-poll
 *
 * IN_TRANSIT 상태 UPS 오더의 트래킹 정보를 조회하고,
 * 배송완료(DL) 시 DELIVERED 상태로 자동 전환합니다.
 *
 * Vercel Cron 인증: x-vercel-cron 헤더 검증
 * 수동 트리거: x-api-key 헤더로 CRON_SECRET 대체 가능
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-vercel-cron');
  const apiKey = req.headers.get('x-api-key');

  if (cronHeader !== '1' && apiKey !== process.env.CRON_SECRET) {
    logger.warn('[ups-tracking-poll] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createAdminClient();
    const results = { polled: 0, delivered: 0, errors: [] as string[] };

    // 1. IN_TRANSIT 상태 UPS 오더 조회
    const { data: orders, error: queryError } = await supabase
      .from('zen_orders')
      .select('id')
      .eq('status', OrderStatus.IN_TRANSIT)
      .eq('transport_mode', 'UPS');

    if (queryError) {
      logger.error('[ups-tracking-poll] Query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      logger.info('[ups-tracking-poll] No IN_TRANSIT UPS orders found');
      return NextResponse.json({ success: true, polled: 0, delivered: 0, errors: [] });
    }

    // 2. 각 오더의 활성 라벨에서 tracking_number 조회 후 폴링
    for (const order of orders) {
      try {
        const { data: label } = await supabase
          .from('zen_ups_labels')
          .select('id, tracking_number')
          .eq('order_id', order.id)
          .eq('is_voided', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!label?.tracking_number) continue;

        const trackData = await pollTracking(label.tracking_number);
        if (!trackData) continue;

        await storeTrackingEvents(
          label.tracking_number,
          order.id,
          label.id,
          trackData,
        );

        results.polled++;

        // 3. 배송완료 시 오더 상태 DELIVERED로 전환
        if (isDelivered(trackData.track_status)) {
          const { error: updateError } = await supabase
            .from('zen_orders')
            .update({ status: OrderStatus.DELIVERED })
            .eq('id', order.id)
            .eq('status', OrderStatus.IN_TRANSIT); // 조건부 업데이트

          if (updateError) {
            results.errors.push(`DELIVERED update failed for ${order.id}: ${updateError.message}`);
            logger.error(`[ups-tracking-poll] DELIVERED update failed for ${order.id}:`, updateError);
          } else {
            results.delivered++;
            logger.info(`[ups-tracking-poll] Order ${order.id} marked as DELIVERED`);
          }
        }
      } catch (err: any) {
        results.errors.push(`Poll failed for ${order.id}: ${err.message}`);
        logger.error(`[ups-tracking-poll] Poll failed for ${order.id}:`, err);
      }
    }

    logger.info(`[ups-tracking-poll] Batch complete:`, results);
    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    logger.error('[ups-tracking-poll] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET 핸들러 — 상태 확인용
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'UPS tracking poll cron endpoint is active',
    schedule: '0 * * * * (every hour)',
  });
}
