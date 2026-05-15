import { describe, it, expect } from 'vitest';
import { canChangeStatus } from '@/lib/logistics/status-machine';
import { OrderStatus } from '@/types/orders';
import { USER_ROLES } from '@/lib/auth/rbac';

describe('ZENITH Status Machine: CLAIMED 전이 규칙 (R-09)', () => {

  describe('CLAIMED 상태로의 진입', () => {
    it('TC-CLM-T1: IN_TRANSIT → CLAIMED 허용 (OPERATOR)', () => {
      const result = canChangeStatus(OrderStatus.IN_TRANSIT, OrderStatus.CLAIMED, USER_ROLES.OPERATOR);
      expect(result.allowed).toBe(true);
    });

    it('TC-CLM-T2: DELIVERED → CLAIMED 허용 (OPERATOR)', () => {
      const result = canChangeStatus(OrderStatus.DELIVERED, OrderStatus.CLAIMED, USER_ROLES.OPERATOR);
      expect(result.allowed).toBe(true);
    });

    it('TC-CLM-T3: REGISTERED → CLAIMED 불가 (허용되지 않은 전이)', () => {
      const result = canChangeStatus(OrderStatus.REGISTERED, OrderStatus.CLAIMED, USER_ROLES.OPERATOR);
      expect(result.allowed).toBe(false);
    });

    it('TC-CLM-T4: SCHEDULED → CLAIMED 불가 (허용되지 않은 전이)', () => {
      const result = canChangeStatus(OrderStatus.SCHEDULED, OrderStatus.CLAIMED, USER_ROLES.OPERATOR);
      expect(result.allowed).toBe(false);
    });
  });

  describe('CLAIMED 상태로부터의 전이', () => {
    it('TC-CLM-T5: CLAIMED → DELIVERED 허용 (ADMIN bypass)', () => {
      const result = canChangeStatus(OrderStatus.CLAIMED, OrderStatus.DELIVERED, USER_ROLES.ADMIN);
      expect(result.allowed).toBe(true);
    });

    it('TC-CLM-T6: CLAIMED → HELD 허용', () => {
      const result = canChangeStatus(OrderStatus.CLAIMED, OrderStatus.HELD, USER_ROLES.OPERATOR);
      expect(result.allowed).toBe(true);
    });

    it('TC-CLM-T7: CLAIMED → CANCELED 허용', () => {
      const result = canChangeStatus(OrderStatus.CLAIMED, OrderStatus.CANCELED, USER_ROLES.OPERATOR);
      expect(result.allowed).toBe(true);
    });

    it('TC-CLM-T8: CLAIMED → REGISTERED 불가 (허용되지 않은 전이)', () => {
      const result = canChangeStatus(OrderStatus.CLAIMED, OrderStatus.REGISTERED, USER_ROLES.OPERATOR);
      expect(result.allowed).toBe(false);
    });
  });

  describe('CLAIMED 전이 권한 검증', () => {
    it('TC-CLM-T9: OPERATOR는 CLAIMED 전이 가능', () => {
      const result = canChangeStatus(OrderStatus.IN_TRANSIT, OrderStatus.CLAIMED, USER_ROLES.OPERATOR);
      expect(result.allowed).toBe(true);
    });

    it('TC-CLM-T10: CORPORATE는 CLAIMED 전이 가능', () => {
      const result = canChangeStatus(OrderStatus.IN_TRANSIT, OrderStatus.CLAIMED, USER_ROLES.CORPORATE);
      expect(result.allowed).toBe(true);
    });

    it('TC-CLM-T11: INDIVIDUAL은 CLAIMED 전이 가능', () => {
      const result = canChangeStatus(OrderStatus.IN_TRANSIT, OrderStatus.CLAIMED, USER_ROLES.INDIVIDUAL);
      expect(result.allowed).toBe(true);
    });

    it('TC-CLM-T12: ADMIN은 역할 제한 없이 CLAIMED 전이 가능', () => {
      const result = canChangeStatus(OrderStatus.IN_TRANSIT, OrderStatus.CLAIMED, USER_ROLES.ADMIN);
      expect(result.allowed).toBe(true);
    });

    it('TC-CLM-T13: ZENITH_SUPER_ADMIN은 역할 제한 없이 CLAIMED 전이 가능', () => {
      const result = canChangeStatus(OrderStatus.IN_TRANSIT, OrderStatus.CLAIMED, USER_ROLES.ZENITH_SUPER_ADMIN);
      expect(result.allowed).toBe(true);
    });

    it('TC-CLM-T14: CARRIER는 CLAIMED 전이 불가 (권한 없음)', () => {
      const result = canChangeStatus(OrderStatus.IN_TRANSIT, OrderStatus.CLAIMED, USER_ROLES.CARRIER);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('권한이 없습니다');
    });

    it('TC-CLM-T15: MANAGER는 모든 전이 허용 (bypass)', () => {
      const result = canChangeStatus(OrderStatus.REGISTERED, OrderStatus.CLAIMED, USER_ROLES.MANAGER);
      expect(result.allowed).toBe(true);
    });
  });
});
