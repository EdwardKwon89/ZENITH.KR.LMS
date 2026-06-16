import { describe, it, expect } from 'vitest';
import { checkPermission, USER_ROLES } from '@/lib/auth/rbac';

describe('🏢 AGENCY 역할 RBAC 권한 검증 (TASK-139 / IMP-111)', () => {
  it('TC-P7-AGENCY-01: AGENCY는 /orders에 접근 가능해야 함', () => {
    expect(checkPermission(USER_ROLES.AGENCY, '/orders')).toBe(true);
  });

  it('TC-P7-AGENCY-02: AGENCY는 /agency에 접근 가능해야 함 (대리점 전용 메뉴)', () => {
    expect(checkPermission(USER_ROLES.AGENCY, '/agency')).toBe(true);
  });

  it('TC-P7-AGENCY-03: AGENCY는 /ups-rates에 접근 가능해야 함 (요율 조회)', () => {
    expect(checkPermission(USER_ROLES.AGENCY, '/ups-rates')).toBe(true);
  });

  it('TC-P7-AGENCY-04: AGENCY는 /admin에 접근 불가 (관리자 전용 경로)', () => {
    expect(checkPermission(USER_ROLES.AGENCY, '/admin')).toBe(false);
  });

  it('TC-P7-AGENCY-05: AGENCY는 /tracking에 접근 가능해야 함', () => {
    expect(checkPermission(USER_ROLES.AGENCY, '/tracking')).toBe(true);
  });

  it('TC-P7-AGENCY-06: AGENCY는 /settlement에 접근 가능해야 함', () => {
    expect(checkPermission(USER_ROLES.AGENCY, '/settlement')).toBe(true);
  });

  it('TC-P7-AGENCY-07: USER_ROLES에 AGENCY 키가 존재해야 함', () => {
    expect(USER_ROLES.AGENCY).toBe('AGENCY');
  });
});
