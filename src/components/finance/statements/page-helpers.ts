import 'server-only';

// TASK-B-361 (Issue #1367) — 3경로 서버 페이지 공통 가드/설정.
// 조회 범위·버튼 노출은 서버가 역할로 결정해 props로 내려준다(UI 숨김만으로 권한 통제하지 않음).
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { checkPermission, USER_ROLES } from '@/lib/auth/rbac';

export type StatementArea = 'finance' | 'agency' | 'shipper';

export interface StatementRouteConfig {
  basePath: string;
  permission: string;
  roles: string[];
  canCreate: boolean;
  allowAdhoc: boolean;
  /** 원가 정산 표시 권한(Admin) — 현재 S1·S2 화면 미구현으로 안내 문구 분기에만 사용. */
  canSettleOrders: boolean;
}

export const STATEMENT_ROUTES: Record<StatementArea, StatementRouteConfig> = {
  finance: {
    basePath: '/finance/statements',
    permission: '/finance',
    roles: [USER_ROLES.ADMIN, USER_ROLES.ZENITH_SUPER_ADMIN],
    canCreate: true,
    // 설계 §6-5d: Admin 수기 화주 청구는 범위 외 (등록 조직만)
    allowAdhoc: false,
    canSettleOrders: true,
  },
  agency: {
    basePath: '/agency/statements',
    permission: '/agency',
    roles: [USER_ROLES.AGENCY],
    canCreate: true,
    allowAdhoc: true,
    canSettleOrders: false,
  },
  shipper: {
    basePath: '/shipper/statements',
    permission: '/shipper',
    roles: [USER_ROLES.SHIPPER, USER_ROLES.AGENCY_SHIPPER],
    canCreate: false,
    allowAdhoc: false,
    canSettleOrders: false,
  },
};

export async function guardStatementRoute(area: StatementArea) {
  const { profile } = await requireAuth();
  const cfg = STATEMENT_ROUTES[area];
  if (!profile || !cfg.roles.includes(profile.role) || !checkPermission(profile.role, cfg.permission)) {
    redirect('/dashboard');
  }
  return { profile, cfg };
}
