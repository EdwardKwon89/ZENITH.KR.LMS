// TASK-B-367 (Issue #1377): 정산 완료(SETTLED) 오더의 중량·치수 수정만 차단하는 소형 가드.
//   updateOrder는 이미 getOrderEditScope로 상태를 제한하지만, DELIVERED에서 도달 가능한
//   RETURNED/CLAIMED/HELD/REGISTERED/SCHEDULED/WAREHOUSED(UPS)는 editable=true 이므로
//   SETTLED 오더가 그 상태로 전이되면 중량·치수를 바꿀 수 있다. 이 가드가 그 틈을 막는다.
import { logger } from '@/lib/logger';
import { trError } from '@/lib/i18n/action-error';

const CARGO_DIM_FIELDS = ['length', 'width', 'height', 'gross_weight'] as const;
const num = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };

/**
 * SETTLED 오더에서 패키지별 중량·치수(길이·너비·높이) 또는 패키지 수가 바뀌면
 * cost_settled_locked 로 거부한다. 비중량 필드(화주·수하인·배송정보 등)만 바뀌면 통과한다.
 * 스냅샷의 volume(numeric(10,2)) 대신 원본 값을 직접 비교해 DB 반올림으로 인한 오판을 피한다.
 */
export async function assertSettledCargoEditAllowed(
  isSettled: boolean,
  existingPackages: Record<string, unknown>[] | undefined,
  payloadPackages: Record<string, unknown>[] | undefined,
): Promise<void> {
  if (!isSettled) return;
  const before = existingPackages ?? [];
  const after = payloadPackages ?? [];
  const changed = before.length !== after.length || after.some((pkg, i) =>
    CARGO_DIM_FIELDS.some((f) => num((before[i] as any)?.[f]) !== num((pkg as any)?.[f])),
  );
  if (!changed) return;
  logger.warn('[ORDER_UPDATE] SETTLED 오더의 중량·치수 수정 거부');
  throw new Error(await trError('cost_settled_locked'));
}
