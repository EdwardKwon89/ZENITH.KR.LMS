import { describe, it, expect } from 'vitest';
import { getOrderDetailPath } from '@/lib/orders/detail-path';

// TASK-B-339 (Issue #1254): 오더 상세 경로 단일화 —
//   UPS 오더의 리다이렉트·돌아가기가 일반 상세(/orders/{id})로 잘못 보내지 않도록 한다.

describe('TASK-B-339: getOrderDetailPath (Issue #1254)', () => {
  it('TC-PATH-01: UPS → /orders/{id}/ups-detail', () => {
    expect(getOrderDetailPath('order-1', 'UPS')).toBe('/orders/order-1/ups-detail');
  });

  it('TC-PATH-02: AIR → /orders/{id}', () => {
    expect(getOrderDetailPath('order-1', 'AIR')).toBe('/orders/order-1');
  });

  it('TC-PATH-03: null → /orders/{id}', () => {
    expect(getOrderDetailPath('order-1', null)).toBe('/orders/order-1');
  });

  it('TC-PATH-04: undefined → /orders/{id}', () => {
    expect(getOrderDetailPath('order-1')).toBe('/orders/order-1');
  });

  it('TC-PATH-05: 소문자 ups는 UPS로 간주하지 않는다 (대소문자 정확 비교)', () => {
    expect(getOrderDetailPath('order-1', 'ups')).toBe('/orders/order-1');
  });
});
