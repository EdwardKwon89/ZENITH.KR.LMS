/**
 * 🔐 ZENITH RBAC Engine (rbac.ts)
 * 8대 표준 역할 및 메뉴 접근 권한을 관리하는 중앙 브레인입니다.
 */

import { cache } from 'react';

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
  if (!path) return '/';
  const segments = path.split('/').filter(Boolean);
  const locales = ['ko', 'en', 'zh', 'ja'];
  
  if (segments.length > 0 && locales.includes(segments[0])) {
    return '/' + segments.slice(1).join('/');
  }
  
  return path.startsWith('/') ? path : '/' + path;
}

/**
 * Fallback: Static Permissions (DB 연동 전 또는 장애 시 대비)
 */
export const STATIC_PERMISSIONS: Record<string, string[]> = {
  [USER_ROLES.ADMIN]: ['/master', '/admin', '/orders', '/logistics', '/billing', '/tracking', '/inventory', '/finance', '/settlement', '/voc', '/support', '/mypage', '/warehouse'],
  [USER_ROLES.MANAGER]: ['/orders', '/logistics', '/billing', '/reports', '/tracking', '/inventory', '/finance', '/settlement', '/voc', '/support', '/mypage', '/warehouse'],
  [USER_ROLES.OPERATOR]: ['/orders', '/logistics', '/tracking', '/voc', '/support', '/mypage'],
  [USER_ROLES.CARRIER]: ['/logistics/delivery', '/orders/assigned', '/admin/transport-costs', '/admin/rates', '/voc', '/support', '/mypage'],
  [USER_ROLES.CORPORATE]: ['/orders', '/billing/invoice', '/tracking', '/finance', '/settlement', '/voc', '/support', '/mypage'],
  [USER_ROLES.INDIVIDUAL]: ['/orders', '/tracking', '/voc', '/support', '/mypage'],
  [USER_ROLES.USER]: ['/dashboard', '/mypage', '/support'],
};

/**
 * 특정 경로(Path)에 대한 역할별 접근 권한을 검증합니다. (Sync version)
 * 주로 Client Component에서 UI 노출 여부를 결정할 때 사용합니다.
 */
export function checkPermission(
  role: string | null | undefined, 
  path: string, 
  allowedPaths?: string[]
): boolean {
  if (!role) return false;

  const normalizedPath = normalizePath(path);

  // 1. ZENITH_SUPER_ADMIN (Bypass) - 모든 권한 허용
  if (role === USER_ROLES.ZENITH_SUPER_ADMIN) {
    return true;
  }

  // 2. 미리 제공된 허용 경로 목록이 있는 경우 (Server -> Client 전달된 경우)
  if (allowedPaths && allowedPaths.length > 0) {
    return allowedPaths.some(ap => normalizedPath === ap || normalizedPath.startsWith(ap + '/'));
  }

  // 3. 공통 접근 가능 경로 (Common Access)
  const commonPaths = ['/dashboard', '/notifications', '/support', '/mypage'];
  if (normalizedPath === '/' || normalizedPath === '/dashboard' || commonPaths.some(cp => normalizedPath.startsWith(cp))) {
    return true;
  }

  // 4. Fallback: Static Permissions
  const allowed = STATIC_PERMISSIONS[role as UserRole] || [];
  return allowed.some(ap => normalizedPath === ap || normalizedPath.startsWith(ap + '/'));
}

/**
 * [Server-side] DB에서 역할별 권한 목록을 조회합니다. (Cached)
 */
export const getPermissionsByRole = cache(async (supabase: any, role: string): Promise<string[]> => {
  if (role === USER_ROLES.ZENITH_SUPER_ADMIN) return ['*'];
  
  const { data, error } = await supabase
    .from('zen_role_permissions')
    .select('path')
    .eq('role_code', role)
    .eq('is_allowed', true);

  if (error || !data || data.length === 0) {
    return STATIC_PERMISSIONS[role as UserRole] || [];
  }

  return data.map((p: any) => p.path);
});

/**
 * [Async] DB에서 역할별 권한을 조회하여 검증합니다. (Server Component용)
 */
export async function checkPermissionDB(supabase: any, role: string, path: string): Promise<boolean> {
  if (role === USER_ROLES.ZENITH_SUPER_ADMIN) return true;
  
  const allowedPaths = await getPermissionsByRole(supabase, role);
  return checkPermission(role, path, allowedPaths);
}

/**
 * 시스템의 모든 리소스 경로 목록입니다. (권한 설정 UI용)
 */
export const ALL_RESOURCE_PATHS = [
  { path: '/master', label: '기본 정보 (마스터)' },
  { path: '/admin', label: '관리자 전용 기능' },
  { path: '/orders', label: '오더 관리' },
  { path: '/logistics', label: '물류/배송 관리' },
  { path: '/tracking', label: '통합 트래킹' },
  { path: '/inventory', label: '재고 관리' },
  { path: '/finance', label: '재무/정산 현황' },
  { path: '/settlement', label: '정산 처리' },
  { path: '/voc', label: 'VOC 관리' },
  { path: '/support', label: '고객지원' },
  { path: '/reports', label: '통계/보고서' },
  { path: '/admin/rates', label: '슬랩 구간율 (관리)' },
  { path: '/admin/transport-costs', label: '운송원가 (관리)' },
  { path: '/admin/organizations', label: '회원사 승인' },
  { path: '/admin/members', label: '회원 관리' },
  { path: '/admin/upgrade-requests', label: '등급 승급 심사' },
  { path: '/admin/customs', label: '통관 관리 (관리자)' },
  { path: '/admin/error-logs', label: '에러 로그 모니터링' },
  { path: '/admin/settings', label: '시스템 설정' },
  { path: '/admin/permissions', label: '권한 관리' },
];

