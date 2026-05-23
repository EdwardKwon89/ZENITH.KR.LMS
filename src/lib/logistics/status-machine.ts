import { OrderStatus } from "../../types/orders";
import { UserRole, USER_ROLES } from "../auth/rbac";

/**
 * 🛰️ ZENITH Status Machine Engine
 * 오더 상태 관리에 대한 비즈니스 규칙을 강제합니다.
 */

// 상태 전이 규칙 정의 (Current -> Allowed Next States)
const TRANSITION_RULES: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.REGISTERED]: [OrderStatus.SCHEDULED, OrderStatus.CANCELED, OrderStatus.HELD],
  [OrderStatus.SCHEDULED]: [OrderStatus.WAREHOUSED, OrderStatus.CANCELED, OrderStatus.HELD],
  [OrderStatus.WAREHOUSED]: [OrderStatus.PACKED, OrderStatus.RELEASED, OrderStatus.HELD, OrderStatus.RETURNED], // IMP-074: WAREHOUSED→RELEASED 출고 확정
  [OrderStatus.PACKED]: [OrderStatus.RELEASED, OrderStatus.HELD],
  [OrderStatus.RELEASED]: [OrderStatus.IN_TRANSIT, OrderStatus.HELD],
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
  [OrderStatus.MASTERED]: [], // 마스터 결합 시 개별 상태 변경 불가 (먼저 Dissolve 필요)
};

// 역할별 상태 변경 권한 정의
const ROLE_PERMISSIONS: Partial<Record<UserRole, OrderStatus[]>> = {
  [USER_ROLES.OPERATOR]: [OrderStatus.SCHEDULED, OrderStatus.HELD, OrderStatus.CANCELED, OrderStatus.CLAIMED],
  [USER_ROLES.CARRIER]: [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED],
  [USER_ROLES.CORPORATE]: [OrderStatus.REGISTERED, OrderStatus.CANCELED, OrderStatus.CLAIMED], // 고객은 스케줄 전까지만 가능, 클레임 접수 가능
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
 */
export function isOrderEditable(status: OrderStatus): boolean {
  const nonEditableStates = [
    OrderStatus.WAREHOUSED,
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
 * MASTERED 상태 여부를 확인합니다.
 * MASTERED 상태의 오더는 인보이스 발행 후 Lock 상태로, 사고비 추가/클레인 등록 등이 차단되어야 합니다.
 */
export function isMasteredStatus(status: OrderStatus): boolean {
  return status === OrderStatus.MASTERED;
}
