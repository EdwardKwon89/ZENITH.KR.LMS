import { describe, it, expect } from 'vitest';
import { buildAddressBookPayload } from '@/lib/orders/build-address-book-payload';

// handleConfirmSaveAddressBook의 payload 조립 로직을 검증하는 테스트
// OrderRegistrationForm.tsx에서 추출한 buildAddressBookPayload 함수를 직접 import

describe('TC-ADDR-01: buildAddressBookPayload recipient_email 포함 검증', () => {
  const formValues: Record<string, any> = {
    recipient_name: '홍길동',
    recipient_address: '서울시 강남구',
    recipient_address_detail: '101동',
    recipient_address_local: '',
    recipient_phone: '010-1234-5678',
    recipient_email: 'hong@example.com',
    recipient_country_code: 'KR',
    recipient_state_province: '서울특별시',
    recipient_city: '강남구',
    recipient_zipcode: '06123',
    recipient_pccc: 'P1234567',
  };

  const watch = (key: string) => formValues[key];

  it('recipient_email이 payload에 포함된다', () => {
    const payload = buildAddressBookPayload(watch, '테스트 주소');
    expect(payload.recipient_email).toBe('hong@example.com');
  });

  it('recipient_email이 없으면 undefined가 payload에 포함된다', () => {
    const noEmailValues = { ...formValues, recipient_email: undefined };
    const noEmailWatch = (key: string) => noEmailValues[key];
    const payload = buildAddressBookPayload(noEmailWatch, '테스트 주소');
    expect(payload.recipient_email).toBeUndefined();
  });

  it('recipient_email이 빈 문자열이면 undefined가 payload에 포함된다', () => {
    const emptyEmailValues = { ...formValues, recipient_email: '' };
    const emptyEmailWatch = (key: string) => emptyEmailValues[key];
    const payload = buildAddressBookPayload(emptyEmailWatch, '테스트 주소');
    expect(payload.recipient_email).toBeUndefined();
  });

  it('다른 필드들도 정확히 payload에 포함된다', () => {
    const payload = buildAddressBookPayload(watch, '테스트 주소');
    expect(payload.display_name).toBe('테스트 주소');
    expect(payload.recipient_name).toBe('홍길동');
    expect(payload.recipient_address).toBe('서울시 강남구');
    expect(payload.recipient_address_detail).toBe('101동');
    expect(payload.recipient_phone).toBe('010-1234-5678');
    expect(payload.country_code).toBe('KR');
    expect(payload.display_mode).toBe('EN');
    expect(payload.is_default).toBe(false);
  });
});
