/**
 * 🔐 ZENITH RBAC Engine (rbac.ts)
 * 8대 표준 역할 및 메뉴 접근 권한을 관리하는 중앙 브레인입니다.
 */

export const USER_ROLES = {
  ZENITH_SUPER_ADMIN: 'ZENITH_SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  OPERATOR: 'OPERATOR',
  CARRIER: 'CARRIER',
  CORPORATE: 'CORPORATE',
  INDIVIDUAL: 'INDIVIDUAL',
  USER: 'USER',
} as const;

export type UserRole = keyof typeof USER_ROLES;

/**
 * 경로에서 다국어 접두사(예: /ko, /en)를 제거하여 정규화합니다.
 */
function normalizePath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const locales = ['ko', 'en', 'zh', 'ja'];
  
  if (segments.length > 0 && locales.includes(segments[0])) {
    return '/' + segments.slice(1).join('/');
  }
  
  return path.startsWith('/') ? path : '/' + path;
}

/**
 * 특정 경로(Path)에 대한 역할별 접근 권한을 검증합니다.
 * @param role 사용자의 역할
 * @param path 접근하려는 경로
 */
export function checkPermission(role: string | null | undefined, path: string): boolean {
  if (!role) return false;

  // 🎯 경로 정규화 (다국어 접두어 제거)
  const normalizedPath = normalizePath(path);

  // 1. ZENITH_SUPER_ADMIN (Bypass) - 모든 권한 허용
  if (role === USER_ROLES.ZENITH_SUPER_ADMIN) {
    return true;
  }

  // 2. 공통 접근 가능 경로 (Common Access)
  // '/' 경로는 완전 일치해야 하며, 나머지는 접두어 기반으로 검사합니다.
  const commonPaths = ['/dashboard', '/profile', '/notifications', '/support', '/mypage'];
  if (normalizedPath === '/' || commonPaths.some(cp => normalizedPath.startsWith(cp))) {
    return true;
  }

  // 3. 역할별 동적 권한 검증 (추후 Table 기반으로 확장 가능)
  // 현재는 시스템의 안정적 기동을 위해 기본 매핑 정책을 적용합니다.
  const permissions: Record<string, string[]> = {
    [USER_ROLES.ADMIN]: ['/master', '/admin', '/orders', '/logistics', '/billing', '/tracking', '/inventory', '/finance', '/settlement'],
    [USER_ROLES.MANAGER]: ['/orders', '/logistics', '/billing', '/reports', '/tracking', '/inventory', '/finance', '/settlement'],
    [USER_ROLES.OPERATOR]: ['/orders', '/logistics', '/tracking'],
    [USER_ROLES.CARRIER]: ['/logistics/delivery', '/orders/assigned'],
    [USER_ROLES.CORPORATE]: ['/orders/register', '/orders/history', '/billing/invoice', '/tracking', '/finance', '/settlement'],
    [USER_ROLES.INDIVIDUAL]: ['/orders/register', '/orders/history', '/tracking'],
    [USER_ROLES.USER]: [],
  };

  const allowedPaths = permissions[role] || [];
  
  // 요청한 경로가 허용된 경로 목록에 포함되어 있는지 확인
  return allowedPaths.some(ap => normalizedPath.startsWith(ap));
}
