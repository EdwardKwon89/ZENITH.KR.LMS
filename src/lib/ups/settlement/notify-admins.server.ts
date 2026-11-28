import 'server-only';

import { logger } from '@/lib/logger';
import { createAdminClient } from '@/utils/supabase/server';
import { trNotification } from '@/lib/i18n/action-error';

const RECIPIENT_ROLES = ['ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'] as const;

/**
 * TASK-B-381 PR-4a — 정산마감 완료를 관리자 3역할 전원에게 알린다(best-effort).
 * 공개 서버 액션(`sendInAppNotification`)의 시그니처를 바꾸지 않기 위한 서버 내부 전용 경로.
 * 수신자 조회·문구·발송 실패는 모두 warn만 남기고 호출자(정산 결과)에 영향을 주지 않는다.
 */
export async function notifyUpsSettlementAdmins(params: {
  orderNo: string;
  orderId: string;
}): Promise<void> {
  try {
    // MANAGER는 zen_profiles 전체 SELECT 정책이 없어 세션 조회 시 수신자가 자기 자신으로 좁혀진다.
    const admin = await createAdminClient();
    const { data: recipients, error } = await admin
      .from('zen_profiles')
      .select('id')
      .in('role', RECIPIENT_ROLES);
    if (error) {
      logger.warn('ups-settlement: notification recipients lookup failed (best-effort)', error);
      return;
    }

    let title = 'UPS settlement finalized';
    let message = params.orderNo;
    try {
      title = await trNotification('title');
      message = await trNotification('body', { orderNo: params.orderNo });
    } catch (copyError) {
      logger.warn('ups-settlement: notification copy failed (best-effort)', copyError);
    }

    const recipientIds = [...new Set(((recipients ?? []) as Array<{ id: string }>).map((row) => row.id))];
    for (const recipientId of recipientIds) {
      try {
        const { error: insertError } = await admin.from('zen_notifications').insert({
          user_id: recipientId,
          order_id: params.orderId,
          type: 'SYSTEM',
          title,
          message,
          channel: 'IN_APP',
        });
        if (insertError) {
          logger.warn('ups-settlement: notification insert failed (best-effort)', insertError);
        }
      } catch (sendError) {
        logger.warn('ups-settlement: notification send failed (best-effort)', sendError);
      }
    }
  } catch (setupError) {
    logger.warn('ups-settlement: notification setup failed (best-effort)', setupError);
  }
}
