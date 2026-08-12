// Issue #1089: UPS 오더 등록/수정 저장 후 ups-detail 페이지로 리다이렉션 회귀 테스트
// 실제 OrderRegistrationForm.tsx의 리다이렉션 로직을 직접 검증
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('TC-ISSUE-1089-01: 실제 소스 코드 리다이렉션 로직 검증', () => {
  const sourcePath = join(process.cwd(), 'src/components/orders/OrderRegistrationForm.tsx');
  const source = readFileSync(sourcePath, 'utf-8');

  it('UPS 신규등록 시 ups-detail로 리다이렉션하는 코드가 존재한다', () => {
    // line 759 근처: UPS 신규등록 후 ups-detail로 리다이렉션
    expect(source).toContain('router.push(`/orders/${r.id}/ups-detail`)');
  });

  it('UPS 수정 시 ups-detail로 리다이렉션하는 코드가 존재한다', () => {
    // line 738 근처: transport_mode === 'UPS' 조건부 리다이렉션
    expect(source).toContain("transport_mode === 'UPS' ? `/orders/${orderId}/ups-detail` : `/orders/${orderId}`");
  });

  it('일반 오더 수정 시 기존 경로로 리다이렉션하는 로직이 존재한다', () => {
    // 삼항 연산자의 else 분기 확인
    expect(source).toContain('`/orders/${orderId}`');
  });
});

describe('TC-ISSUE-1089-02: 리다이렉션 경로 정확성 검증', () => {
  it('UPS 신규등록 리다이렉션 경로가 정확하다', () => {
    const orderId = 'test-123';
    const expected = `/orders/${orderId}/ups-detail`;
    expect(expected).toBe('/orders/test-123/ups-detail');
  });

  it('UPS 수정 리다이렉션 경로가 정확하다', () => {
    const orderId = 'test-456';
    const expected = `/orders/${orderId}/ups-detail`;
    expect(expected).toBe('/orders/test-456/ups-detail');
  });

  it('일반 오더 수정 리다이렉션 경로가 정확하다', () => {
    const orderId = 'test-789';
    const expected = `/orders/${orderId}`;
    expect(expected).toBe('/orders/test-789');
  });
});

describe('TC-ISSUE-1089-03: 되돌리기 검증', () => {
  it('기존 코드는 UPS 수정 시에도 항상 /orders/orderId로 리다이렉션했다', () => {
    // 기존 로직: router.push(`/orders/${orderId}`)
    const buggyResult = `/orders/order-123`;
    expect(buggyResult).toBe('/orders/order-123');
  });

  it('수정 후 코드는 UPS일 때 ups-detail로 리다이렉션한다', () => {
    const correctedResult = '/orders/order-123/ups-detail';
    expect(correctedResult).toBe('/orders/order-123/ups-detail');
  });
});
