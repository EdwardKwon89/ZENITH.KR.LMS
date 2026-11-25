import { USER_ROLES } from './rbac';

/**
 * UPS 요율 관리 화면·액션의 역할 판정 공용 정의.
 * (TASK-B-373 PR-2 — 기존 rates-mutation.ts / pricing-schedule.ts 파일 로컬 함수를 통합)
 */

export function hasAdminOrManagerRole(role?: string | null): boolean {
  return (
    role === USER_ROLES.ADMIN ||
    role === USER_ROLES.MANAGER ||
    role === USER_ROLES.ZENITH_SUPER_ADMIN
  );
}

export function hasAdminManagerOrSubAdminRole(role?: string | null): boolean {
  return hasAdminOrManagerRole(role) || role === USER_ROLES.SUB_ADMIN;
}

export function requireAdminOrManager(role?: string | null): void {
  if (!hasAdminOrManagerRole(role)) {
    throw new Error('UPS 요율 관리 권한이 없습니다.');
  }
}

export function requireAdminManagerOrSubAdmin(role?: string | null): void {
  if (!hasAdminManagerOrSubAdminRole(role)) {
    throw new Error('Agency 원가 할인율 관리 권한이 없습니다.');
  }
}
