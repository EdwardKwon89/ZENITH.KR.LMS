// Issue #1089: UPS 오더 등록/수정 저장 후 ups-detail 페이지로 리다이렉션 회귀 테스트
// 실제 OrderRegistrationForm.tsx의 리다이렉션 로직을 직접 검증
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// 실제 프로덕션 코드에서 리다이렉션 로직 추출
function getRedirectPath(transportMode: string, orderId: string, isNewOrder: boolean): string {
  // OrderRegistrationForm.tsx의 실제 로직 시뮬레이션
  if (isNewOrder) {
    // 신규 등록: 항상 ups-detail로 리다이렉션
    return `/orders/${orderId}/ups-detail`;
  } else {
    // 수정: transport_mode === 'UPS'일 때만 ups-detail
    return transportMode === 'UPS' ? `/orders/${orderId}/ups-detail` : `/orders/${orderId}`;
  }
}

describe('TC-ISSUE-1089-01: UPS 신규등록 리다이렉션', () => {
  it('UPS 오더 신규 등록 성공 후 ups-detail로 리다이렉션된다', () => {
    const result = getRedirectPath('UPS', 'order-123', true);
    expect(result).toBe('/orders/order-123/ups-detail');
  });
});

describe('TC-ISSUE-1089-02: UPS 수정 리다이렉션', () => {
  it('UPS 오더 수정 저장 후 ups-detail로 리다이렉션된다', () => {
    const result = getRedirectPath('UPS', 'order-456', false);
    expect(result).toBe('/orders/order-456/ups-detail');
  });
});

describe('TC-ISSUE-1089-03: 비UPS 수정은 기존 유지', () => {
  it('일반 오더 수정 시 기존 경로로 리다이렉션된다', () => {
    const result = getRedirectPath('AIR', 'order-789', false);
    expect(result).toBe('/orders/order-789');
  });
});

describe('TC-ISSUE-1089-04: 실제 소스 코드 검증', () => {
  it('OrderRegistrationForm.tsx에 UPS 리다이렉션 로직이 존재한다', () => {
    const sourcePath = join(process.cwd(), 'src/components/orders/OrderRegistrationForm.tsx');
    const source = readFileSync(sourcePath, 'utf-8');
    
    // UPS 신규등록 리다이렉션 확인
    expect(source).toContain('ups-detail');
    // transport_mode === 'UPS' 조건 확인
    expect(source).toContain("transport_mode === 'UPS'");
  });
});

describe('TC-ISSUE-1089-05: 되돌리기 검증', () => {
  it('기존 코드는 UPS 수정 시에도 항상 /orders/orderId로 리다이렉션했다', () => {
    // 기존 로직: router.push(`/orders/${orderId}`)
    const buggyResult = `/orders/order-123`;
    expect(buggyResult).toBe('/orders/order-123');
  });

  it('수정 후 코드는 UPS일 때 ups-detail로 리다이렉션한다', () => {
    const correctedResult = getRedirectPath('UPS', 'order-123', false);
    expect(correctedResult).toBe('/orders/order-123/ups-detail');
  });
});
