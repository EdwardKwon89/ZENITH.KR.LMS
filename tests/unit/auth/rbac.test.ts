import { describe, it, expect, vi } from 'vitest';
import { checkPermission, checkPermissionDB, USER_ROLES } from '@/lib/auth/rbac';

describe('🛡️ ZENITH Security Shield: RBAC Engine Tests', () => {
  describe('1. Synchronous checkPermission (Client-side / Fallback)', () => {
    it('TC-S.1: SUPER_ADMIN은 모든 경로에 접근 가능해야 함 (Bypass)', () => {
      expect(checkPermission(USER_ROLES.ZENITH_SUPER_ADMIN, '/any-path')).toBe(true);
    });

    it('TC-S.2: INDIVIDUAL 회원은 승급 신청 페이지 접근이 가능해야 함', () => {
      expect(checkPermission(USER_ROLES.INDIVIDUAL, '/mypage/grade')).toBe(true);
    });

    it('TC-S.3: 역할 정보가 없는 경우 접근이 거부되어야 함 (Default Deny)', () => {
      expect(checkPermission(null, '/dashboard')).toBe(false);
    });

    it('TC-S.4: allowedPaths가 제공된 경우 이를 우선적으로 확인해야 함', () => {
      const allowedPaths = ['/custom/path'];
      // STATIC_PERMISSIONS에는 /custom/path가 없음
      expect(checkPermission(USER_ROLES.INDIVIDUAL, '/custom/path', allowedPaths)).toBe(true);
      expect(checkPermission(USER_ROLES.INDIVIDUAL, '/mypage/grade', allowedPaths)).toBe(false);
    });
  });

  describe('2. Asynchronous checkPermissionDB (Server-side / DB-driven)', () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              data: [{ path: '/db/allowed/path' }],
              error: null
            }))
          }))
        }))
      }))
    };

    it('TC-A.1: DB에 설정된 권한이 있는 경우 접근을 허용해야 함', async () => {
      const result = await checkPermissionDB(mockSupabase, USER_ROLES.INDIVIDUAL, '/db/allowed/path');
      expect(result).toBe(true);
    });

    it('TC-A.2: DB에 없는 경로이나 STATIC_PERMISSIONS에 있는 경우 Fallback 허용 (DB 결과 없을 때)', async () => {
      // Mock for empty DB result
      const emptySupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      };

      const result = await checkPermissionDB(emptySupabase, USER_ROLES.INDIVIDUAL, '/mypage/grade');
      expect(result).toBe(true); // STATIC_PERMISSIONS fallback
    });

    it('TC-A.3: DB 조회 실패 시에도 STATIC_PERMISSIONS로 Fallback 해야 함', async () => {
      const errorSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'DB Error' }
              }))
            }))
          }))
        }))
      };

      const result = await checkPermissionDB(errorSupabase, USER_ROLES.INDIVIDUAL, '/mypage/grade');
      expect(result).toBe(true);
    });
  });
});
