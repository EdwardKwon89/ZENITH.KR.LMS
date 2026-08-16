import { describe, it, expect } from 'vitest';
import { resolveConsigneeStreet, resolveShipperStreet } from '@/lib/ups/label-mapping';

describe('TASK-B-305: 영문 주소 표출 유틸 함수', () => {
  describe('resolveConsigneeStreet', () => {
    it('수하인 주소가 없는 경우 빈 문자열 반환', () => {
      const order = {};
      expect(resolveConsigneeStreet(order)).toBe('');
    });

    it('recipient_address만 있는 경우 해당 주소 반환', () => {
      const order = { recipient_address: '123 Main St' };
      expect(resolveConsigneeStreet(order)).toBe('123 Main St');
    });

    it('recipient_address_detail이 있는 경우 주소 + 상세주소 결합', () => {
      const order = {
        recipient_address: '123 Main St',
        recipient_address_detail: 'Apt 101',
      };
      expect(resolveConsigneeStreet(order)).toBe('123 Main St Apt 101');
    });

    it('recipient_address_local이 있고 detail이 없는 경우 현지어 표기 포함', () => {
      const order = {
        recipient_address: '123 Main St',
        recipient_address_local: '서울시 강남구',
      };
      expect(resolveConsigneeStreet(order)).toBe('123 Main St (서울시 강남구)');
    });

    it('recipient_address_detail이 우선시됨 (local보다 detail 우선)', () => {
      const order = {
        recipient_address: '123 Main St',
        recipient_address_local: '서울시 강남구',
        recipient_address_detail: 'Apt 101',
      };
      expect(resolveConsigneeStreet(order)).toBe('123 Main St Apt 101');
    });
  });

  describe('resolveShipperStreet', () => {
    it('화주 주소가 없는 경우 빈 문자열 반환', () => {
      const order = {};
      const shipperOrg = undefined;
      expect(resolveShipperStreet(order, shipperOrg)).toBe('');
    });

    it('order.shipper_address_english이 있는 경우 해당 주소 반환', () => {
      const order = {
        shipper_address_english: '456 English Ave',
        shipper_address: '456 영어대로',
      };
      const shipperOrg = undefined;
      expect(resolveShipperStreet(order, shipperOrg)).toBe('456 English Ave');
    });

    it('order.shipper_address_detail_english이 있는 경우 주소 + 상세주소 결합', () => {
      const order = {
        shipper_address_english: '456 English Ave',
        shipper_address_detail_english: 'Suite 200',
      };
      const shipperOrg = undefined;
      expect(resolveShipperStreet(order, shipperOrg)).toBe('456 English Ave Suite 200');
    });

    it('order에 영문 필드가 없으면 shipperOrg에서 조회', () => {
      const order = {};
      const shipperOrg = {
        address_english: '789 Org English St',
        address_detail_english: 'Floor 3',
      };
      expect(resolveShipperStreet(order, shipperOrg)).toBe('789 Org English St Floor 3');
    });

    it('영문 필드가 모두 없으면 한글 주소로 폴백', () => {
      const order = {
        shipper_address: '456 영어대로',
        shipper_address_detail: '200호',
      };
      const shipperOrg = undefined;
      expect(resolveShipperStreet(order, shipperOrg)).toBe('456 영어대로 200호');
    });

    it('우선순위: order.english > org.english > org.address > order.address', () => {
      const order = {
        shipper_address: 'Order Address',
        shipper_address_english: 'Order English Address',
      };
      const shipperOrg = {
        address: 'Org Address',
        address_english: 'Org English Address',
      };
      expect(resolveShipperStreet(order, shipperOrg)).toBe('Order English Address');
    });
  });
});

describe('TASK-B-305: 영문 전용 검증 정규식', () => {
  const ENGLISH_ONLY_REGEX = /^[A-Za-z0-9\s.,\-()&'"/#%+:]*$/;

  it('영문만 입력 시 통과', () => {
    expect(ENGLISH_ONLY_REGEX.test('Apt 101, Suite 200')).toBe(true);
    expect(ENGLISH_ONLY_REGEX.test('123 Main St')).toBe(true);
    expect(ENGLISH_ONLY_REGEX.test('Building A (Floor 3)')).toBe(true);
  });

  it('한글 포함 시 실패', () => {
    expect(ENGLISH_ONLY_REGEX.test('서울시 강남구')).toBe(false);
    expect(ENGLISH_ONLY_REGEX.test('Apt 101호')).toBe(false);
  });

  it('특수문자 허용', () => {
    expect(ENGLISH_ONLY_REGEX.test('123 Main St, #200')).toBe(true);
    expect(ENGLISH_ONLY_REGEX.test("123 Main St (Building A)")).toBe(true);
  });

  it('빈 문자열 통과', () => {
    expect(ENGLISH_ONLY_REGEX.test('')).toBe(true);
  });
});
