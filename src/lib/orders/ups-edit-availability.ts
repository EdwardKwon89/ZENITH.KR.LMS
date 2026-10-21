import { OrderStatus } from '@/types/orders';
import { getOrderEditScope } from '@/lib/logistics/status-machine';

/**
 * TASK-B-339 (Issue #1254): UPS 오더 수정 가능 판정 (단일 정본).
 *
 * `getOrderEditScope`는 상태만으로 판정하므로 "UPS 등록 전"을 보장하지 못한다
 * (HELD/RETURNED/CLAIMED는 PACKED 이후에도 전이 가능 — 결함 ①).
 * 따라서 등록 사실(활성 라벨)을 **상태보다 우선**해 판정한다.
 *
 * 서버(updateOrder)와 화면(edit/page.tsx, ups-detail/page.tsx)이 모두 이 함수를 사용하므로
 * UI 우회·구버전 화면에서도 동일한 거부 메시지가 나온다.
 */

export type UpsEditBlockReason = 'STATUS' | 'UPS_REGISTERED';

export interface UpsEditAvailability {
  editable: boolean;
  reason?: UpsEditBlockReason;
  message?: string;
}

export const UPS_REGISTERED_EDIT_BLOCK_MESSAGE =
  'UPS에 등록된 오더는 수정할 수 없습니다. 수정이 필요하면 창고에서 "UPS 등록취소" 후 진행하세요.';

export const UPS_STATUS_EDIT_BLOCK_MESSAGE = '현재 상태에서는 수정할 수 없습니다.';

export const UPS_WAREHOUSED_EDIT_NOTICE =
  '입고된 오더입니다. 수정 내용은 변경 이력에 기록되며, 실측값을 변경하면 창고 재실측이 필요합니다.';

/**
 * UPS 오더가 수정 가능한지 판정한다.
 *
 * @param status 오더 상태
 * @param hasActiveUpsLabel 활성 `zen_ups_labels` 행 존재 여부 (`hasActiveUpsLabel()` 조회 결과)
 */
export function getUpsEditAvailability(
  status: OrderStatus,
  hasActiveUpsLabel: boolean
): UpsEditAvailability {
  // 1) UPS 등록 사실 — 상태와 무관하게 최우선 차단
  if (hasActiveUpsLabel) {
    return {
      editable: false,
      reason: 'UPS_REGISTERED',
      message: UPS_REGISTERED_EDIT_BLOCK_MESSAGE,
    };
  }

  // 2) 상태 판정 — UPS 전용 스코프로 조회
  const scope = getOrderEditScope(status, 'UPS');
  if (!scope.editable) {
    return {
      editable: false,
      reason: 'STATUS',
      message: UPS_STATUS_EDIT_BLOCK_MESSAGE,
    };
  }

  // 3) 입고(WAREHOUSED) 단계 — 수정은 가능하나 재실측 안내
  if (status === OrderStatus.WAREHOUSED) {
    return { editable: true, message: UPS_WAREHOUSED_EDIT_NOTICE };
  }

  return { editable: true };
}
