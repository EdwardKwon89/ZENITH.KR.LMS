import { describe, it, expect } from 'vitest';
import { ORDER_REGISTRATION_DEFAULT_VALUES } from '@/components/orders/OrderRegistrationForm';

// Issue #547: incoterms 기본값 DDP 검증
// OrderRegistrationForm.tsx에서 추출한 ORDER_REGISTRATION_DEFAULT_VALUES 상수를 직접 import
//컴포넌트가 사용하는 동일한 defaultValues 객체를 검증

describe('TC-INC-01: OrderRegistrationForm defaultValues.incoterms', () => {
  it('폼 초기값에 incoterms가 DDP로 설정되어 있다', () => {
    expect(ORDER_REGISTRATION_DEFAULT_VALUES.incoterms).toBe('DDP');
  });

  it('폼 초기값에 order_type이 B2B로 설정되어 있다', () => {
    expect(ORDER_REGISTRATION_DEFAULT_VALUES.order_type).toBe('B2B');
  });

  it('폼 초기값에 transport_mode가 AIR로 설정되어 있다', () => {
    expect(ORDER_REGISTRATION_DEFAULT_VALUES.transport_mode).toBe('AIR');
  });

  it('폼 초기값에 delivery_method가 DIRECT로 설정되어 있다', () => {
    expect(ORDER_REGISTRATION_DEFAULT_VALUES.delivery_method).toBe('DIRECT');
  });
});
