import { OrderStatus } from "../../types/orders";
import { UserRole, USER_ROLES } from "../auth/rbac";

/**
 * 🛰️ ZENITH Status Machine Engine
 * 오더 상태 관리에 대한 비즈니스 규칙을 강제합니다.
 */

// 상태 전이 규칙 정의 (Current -> Allowed Next States)
const TRANSITION_RULES: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.REGISTERED]: [OrderStatus.SCHEDULED, OrderStatus.WAREHOUSED, OrderStatus.CANCELED, OrderStatus.HELD],
  [OrderStatus.SCHEDULED]: [OrderStatus.REGISTERED, OrderStatus.WAREHOUSED, OrderStatus.CANCELED, OrderStatus.HELD],
  [OrderStatus.WAREHOUSED]: [OrderStatus.REGISTERED, OrderStatus.SCHEDULED, OrderStatus.PACKED, OrderStatus.RELEASED, OrderStatus.HELD, OrderStatus.RETURNED], // 입고취소(→REGISTERED/SCHEDULED) 허용
  [OrderStatus.PACKED]: [OrderStatus.WAREHOUSED, OrderStatus.RELEASED, OrderStatus.HELD], // WAREHOUSED: UPS등록취소, RELEASED: 출고처리
  [OrderStatus.RELEASED]: [OrderStatus.PACKED, OrderStatus.IN_TRANSIT, OrderStatus.HELD], // PACKED: 출고취소
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.HELD, OrderStatus.RETURNED, OrderStatus.CLAIMED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED, OrderStatus.CLAIMED], // 배송 완료 후 반송 또는 클레임 접수 가능
  [OrderStatus.CLAIMED]: [OrderStatus.DELIVERED, OrderStatus.HELD, OrderStatus.CANCELED],
  [OrderStatus.HELD]: [
    OrderStatus.REGISTERED, 
    OrderStatus.SCHEDULED, 
    OrderStatus.WAREHOUSED, 
    OrderStatus.PACKED, 
    OrderStatus.RELEASED, 
    OrderStatus.IN_TRANSIT,
    OrderStatus.CANCELED
  ], // 보류 해제 시 이전 단계 또는 취소로 복구
  [OrderStatus.CANCELED]: [], // 취소 시 종료
  [OrderStatus.RETURNED]: [OrderStatus.WAREHOUSED, OrderStatus.CANCELED, OrderStatus.DISPOSED],
  [OrderStatus.DISPOSED]: [], // 폐기 시 종료
  [OrderStatus.MASTERED]: [], // 마스터 결합 시 개별 상태 변경 불가 (먼저 Dissolve 필요)
};

// 역할별 상태 변경 권한 정의
const ROLE_PERMISSIONS: Partial<Record<UserRole, OrderStatus[]>> = {
  [USER_ROLES.OPERATOR]: [OrderStatus.SCHEDULED, OrderStatus.WAREHOUSED, OrderStatus.PACKED, OrderStatus.RELEASED, OrderStatus.IN_TRANSIT, OrderStatus.HELD, OrderStatus.CANCELED, OrderStatus.CLAIMED],
  [USER_ROLES.CARRIER]: [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED],
  [USER_ROLES.AGENCY]: [OrderStatus.REGISTERED, OrderStatus.SCHEDULED, OrderStatus.WAREHOUSED, OrderStatus.PACKED, OrderStatus.RELEASED, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED],
  [USER_ROLES.CORPORATE]: [OrderStatus.REGISTERED, OrderStatus.CANCELED, OrderStatus.CLAIMED],
  [USER_ROLES.INDIVIDUAL]: [OrderStatus.REGISTERED, OrderStatus.CANCELED, OrderStatus.CLAIMED],
};

/**
 * 상태 변경이 가능한지 검증합니다.
 */
export function canChangeStatus(
  current: OrderStatus,
  target: OrderStatus,
  role: UserRole
): { allowed: boolean; message?: string } {
  // 1. Super Admin은 모든 전이 허용
  if (role === USER_ROLES.ZENITH_SUPER_ADMIN || role === USER_ROLES.ADMIN || role === USER_ROLES.MANAGER) {
    return { allowed: true };
  }

  // 2. 상태 전이 규칙 검증
  const allowedNext = TRANSITION_RULES[current] || [];
  if (!allowedNext.includes(target)) {
    return { 
      allowed: false, 
      message: `${current} 상태에서 ${target}으로 변경할 수 없습니다.` 
    };
  }

  // 3. 역할별 권한 검증
  const allowedByRole = ROLE_PERMISSIONS[role] || [];
  if (!allowedByRole.includes(target)) {
    return { 
      allowed: false, 
      message: `${role} 역할은 ${target} 상태로 변경할 권한이 없습니다.` 
    };
  }

  return { allowed: true };
}

/**
 * 화물 명세(중량, 부피) 수정이 가능한 상태인지 확인합니다.
 * CPO & Audit 권고: 입고(WAREHOUSED) 이후 수정 불가
 *
 * TASK-B-284 (Issue #1070): UPS 오더는 WAREHOUSED 상태에서도 부분 수정이 가능하다 —
 * SHXK 등록(registerUpsOrder)은 WAREHOUSED→PACKED 전환 시점에만 호출되므로, 그 사이
 * 창고 큐 대기 오더는 화주 정보 수정이 필요하다. 단, 실측된 패키지 치수/무게는 보호한다.
 */
export function isOrderEditable(status: OrderStatus): boolean {
  const nonEditableStates = [
    OrderStatus.PACKED,
    OrderStatus.RELEASED,
    OrderStatus.IN_TRANSIT,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELED,
    OrderStatus.DISPOSED, // 폐기 상태는 수정 불가
    OrderStatus.MASTERED // 마스터 결합 시 수정 불가
  ];
  return !nonEditableStates.includes(status);
}

/**
 * TASK-B-284 (Issue #1070): WAREHOUSED + UPS 오더가 "부분 수정 가능" 상태인지 확인.
 * (WAREHOUSED + 비UPS는 여전히 수정 불가 — 부분 수정 허용 범위는 UPS만 해당)
 */
export function isOrderPartiallyEditable(status: OrderStatus, transportMode?: string): boolean {
  return status === OrderStatus.WAREHOUSED && transportMode === 'UPS';
}

/**
 * TASK-B-284 (Issue #1070): 오더 수정 가능 범위를 나타내는 스코프.
 * - editable: 오더를 수정할 수 있는지 (전체 수정 or 부분 수정)
 * - fullEditable: 모든 필드 수정 가능한지 (REGISTERED/SCHEDULED 등 자유 수정 단계)
 * - lockShipperId / lockTransportMode: WAREHOUSED+UPS에서 항상 잠금
 * - lockMeasuredPackageDims: 실측(measured_at)된 패키지의 치수/무게/포장수 잠금
 * - auditEdit: WAREHOUSED 단계 수정이면 감사 로그 필요
 */
export interface OrderEditScope {
  editable: boolean;
  fullEditable: boolean;
  lockShipperId: boolean;
  lockTransportMode: boolean;
  lockMeasuredPackageDims: boolean;
  auditEdit: boolean;
}

export function getOrderEditScope(status: OrderStatus, transportMode?: string): OrderEditScope {
  // WAREHOUSED: UPS만 부분 수정 가능 — 비UPS는 여전히 수정 불가 (실측값 보호 필요 없는 일반 화물)
  if (status === OrderStatus.WAREHOUSED) {
    if (transportMode === 'UPS') {
      // WAREHOUSED + UPS: 헤더(제외 shipper_id/transport_mode)·아이템·미실측 패키지는 수정 가능,
      // 실측 패키지 치수/무게는 보호, 수정 시 감사 로그 기록
      return {
        editable: true,
        fullEditable: false,
        lockShipperId: true,
        lockTransportMode: true,
        lockMeasuredPackageDims: true,
        auditEdit: true,
      };
    }
    // WAREHOUSED + 비UPS(또는 미지정): 수정 불가
    return {
      editable: false,
      fullEditable: false,
      lockShipperId: true,
      lockTransportMode: true,
      lockMeasuredPackageDims: true,
      auditEdit: false,
    };
  }

  if (!isOrderEditable(status)) {
    // PACKED 이후(또는 취소/폐기/마스터)는 수정 불가
    return {
      editable: false,
      fullEditable: false,
      lockShipperId: true,
      lockTransportMode: true,
      lockMeasuredPackageDims: true,
      auditEdit: false,
    };
  }

  // REGISTERED/SCHEDULED 등 — 전체 자유 수정
  return {
    editable: true,
    fullEditable: true,
    lockShipperId: false,
    lockTransportMode: false,
    lockMeasuredPackageDims: false,
    auditEdit: false,
  };
}

/**
 * MASTERED 상태 여부를 확인합니다.
 * MASTERED 상태의 오더는 인보이스 발행 후 Lock 상태로, 사고비 추가/클레인 등록 등이 차단되어야 합니다.
 */
export function isMasteredStatus(status: OrderStatus): boolean {
  return status === OrderStatus.MASTERED;
}
