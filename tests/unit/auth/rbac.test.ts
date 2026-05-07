import { describe, it, expect } from 'vitest';
import { checkPermission, USER_ROLES } from '@/lib/auth/rbac';

describe('ZENITH Security Shield: RBAC Permission Logic', () => {
  it('TC-S.1: SUPER_ADMIN은 모든 경로에 접근 가능해야 함 (Bypass 확인)', async () => {
    const result = await checkPermission(USER_ROLES.ZENITH_SUPER_ADMIN, '/admin/settings');
    expect(result).toBe(true);
  });

  it('TC-S.1: CORPORATE 화주는 관리자 메뉴 접근이 금지되어야 함 (차단 확인)', async () => {
    const result = await checkPermission(USER_ROLES.CORPORATE, '/admin/rates');
    expect(result).toBe(false);
  });

  it('TC-S.1: ADMIN은 locale 접두사가 붙은 승급 심사 경로에 접근 가능해야 함', async () => {
    const result = await checkPermission(USER_ROLES.ADMIN, '/ko/admin/upgrade-requests');
    expect(result).toBe(true);
  });

  it('TC-S.1: CORPORATE 화주는 오더 등록 및 이력 확인이 가능해야 함 (허용 확인)', async () => {
    const registerResult = await checkPermission(USER_ROLES.CORPORATE, '/orders/register');
    const historyResult = await checkPermission(USER_ROLES.CORPORATE, '/orders/history');
    expect(registerResult).toBe(true);
    expect(historyResult).toBe(true);
  });

  it('TC-S.1: 역할정보가 없는 경우 모든 접근을 차단해야 함 (Default Deny)', async () => {
    const result = await checkPermission(null, '/dashboard');
    expect(result).toBe(false);
  });
});
