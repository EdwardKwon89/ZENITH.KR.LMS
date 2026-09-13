// DEF-B-145 / Issue #1192: SHXK createorder shipper_street에 국가명 중복 포함 → UPS "Invalid ShipFrom AddressLine3"
// 실제 재현 오더(ZEN-2026-000015)의 전송값을 fixture로 삼아 resolveShipperStreet()/resolveConsigneeStreet()/buildCreateOrderPayload()를
// 실제 호출하고 반환값으로 검증한다(소스 문자열 검사·함수 존재 확인 패턴 금지).
//
// ⚠️ TASK-B-326 (DEF-B-146) 반영: DEF-B-145 수정(국가명 제거·시/구/도 유지)으로도 길이 초과가 해소되지 않아,
// street에 시/구/도를 남기지 않고 도로명+상세주소만 구성하도록 방향 전환(첫 콤마 세그먼트 = 도로명).
// → 시/구/도를 "유지"하던 검증이 "제거"를 검증하도록 뒤집힘 — 의도된 변경이며, 시/구/도는 shipper_city/shipper_province 별도 필드로 전달됨.
import { describe, it, expect } from 'vitest';
import {
  resolveShipperStreet,
  resolveConsigneeStreet,
  buildCreateOrderPayload,
} from '@/lib/ups/label-mapping';

describe('DEF-B-145/146: 주소 조합 시 국가·시·구·도 제거(도로명만) + 상세주소 앞 정렬', () => {
  describe('resolveShipperStreet — 실제 재현 오더 ZEN-2026-000015 fixture', () => {
    // 실제 재현 시점 전송값(최초): "6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea 6 floor, 601 room"
    // Jaison 실검증(2026-09-13, DEF-B-146): 도로명+상세주소만 → "6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil" (49자) → UPS 등록 성공
    const reproducedOrder = {
      shipper_address_english: '6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea',
      shipper_address_detail_english: '6 floor, 601 room',
      // 재현 오더는 shipper_country_code가 빈 값이었음 — 최초엔 폴백 목록으로 처리하던 항목, 이제 첫 세그먼트 방식으로 커버
      shipper_country_code: '',
    };

    it('국가·시·구·도가 제거되고 도로명만 남으며 상세주소가 앞에 온다 (49자 성공형)', () => {
      const result = resolveShipperStreet(reproducedOrder, undefined);
      expect(result).toBe('6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil');
    });

    it('결과에 국가명이 어떤 형태로도 포함되지 않는다', () => {
      const result = resolveShipperStreet(reproducedOrder, undefined);
      expect(result).not.toContain('Republic of Korea');
      expect(result).not.toContain('South Korea');
      expect(result).not.toContain('Korea');
    });

    it('시/구/도 세그먼트(도로명 뒤)는 제거된다 (DEF-B-146 방향 전환 — 시/구/도는 별도 필드로 전달)', () => {
      const result = resolveShipperStreet(reproducedOrder, undefined);
      for (const segment of ['Bundang-gu', 'Seongnam-si', 'Gyeonggi-do']) {
        expect(result).not.toContain(segment);
      }
      // 도로명 부분은 유지되어야 한다
      expect(result).toContain('6 Daewangpangyo-ro 351beon-gil');
    });

    it('shipper_country_code가 명시된 경우에도 동일 결과 (첫 세그먼트 방식은 country_code 무관)', () => {
      const order = { ...reproducedOrder, shipper_country_code: 'KR' };
      expect(resolveShipperStreet(order, undefined)).toBe('6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil');
    });

    it('과거 성공 사례(국가명 포함 61자 전송)도 도로명만 남긴다', () => {
      const order = {
        shipper_address_english: '461-5 Gonghang-daero, Gangseo-gu, Seoul, Republic of Korea',
        shipper_address_detail_english: '',
        shipper_country_code: 'KR',
      };
      expect(resolveShipperStreet(order, undefined)).toBe('461-5 Gonghang-daero');
    });

    it('국가명/시/구/도 없는 일반 주소는 그대로 반환된다', () => {
      const order = {
        shipper_address_english: '10 Downing St, Westminster, London',
        shipper_address_detail_english: 'Flat 3',
        shipper_country_code: 'GB',
      };
      expect(resolveShipperStreet(order, undefined)).toBe('Flat 3, 10 Downing St');
    });

    it('단일 세그먼트(콤마 없음) 주소는 전체를 도로명으로 취급한다', () => {
      const order = {
        shipper_address_english: 'it venture tower',
        shipper_address_detail_english: '',
        shipper_country_code: 'JP',
      };
      expect(resolveShipperStreet(order, undefined)).toBe('it venture tower');
    });
  });

  describe('resolveConsigneeStreet — 수하인 측 동일 적용', () => {
    it('국가·시·구·도 포함 수하인 주소에서 도로명만 남고 상세주소가 앞에 온다', () => {
      const order = {
        recipient_address: '1-1-1 Nishi-Shinjuku, Shinjuku-ku, Tokyo, Japan',
        recipient_address_detail: 'Room 501',
        recipient_country_code: 'JP',
      };
      expect(resolveConsigneeStreet(order)).toBe('Room 501, 1-1-1 Nishi-Shinjuku');
    });

    it('단일 세그먼트 수하인 주소(실재 ZEN-2026-000015)는 그대로 + 상세주소 앞 정렬', () => {
      const order = {
        recipient_address: 'it venture tower',
        recipient_address_detail: '901 room',
        recipient_country_code: 'JP',
      };
      expect(resolveConsigneeStreet(order)).toBe('901 room, it venture tower');
    });

    it('국가명이 없는 수하인 주소는 그대로 반환된다', () => {
      const order = {
        recipient_address: '123 Main St',
        recipient_address_detail: 'Apt 101',
        recipient_country_code: 'US',
      };
      expect(resolveConsigneeStreet(order)).toBe('Apt 101, 123 Main St');
    });
  });

  describe('buildCreateOrderPayload — 실제 createorder payload 반환값 검증', () => {
    const baseOrder = {
      order_no: 'ZEN-2026-000015',
      shipper_contact_name: 'Shipper Kim',
      shipper_country_code: '',
      shipper_state_province: '41',
      shipper_city: 'Seongnam-si',
      shipper_zipcode: '13554',
      shipper_contact_phone: '02-1234-5678',
      shipper_address_english: '6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea',
      shipper_address_detail_english: '6 floor, 601 room',
      shipper_org: null,
      recipient_name: 'John Doe',
      recipient_country_code: 'US',
      recipient_state_province: 'CA',
      recipient_city: 'Los Angeles',
      recipient_address: '123 Main St',
      recipient_address_local: '',
      recipient_zipcode: '90001',
      recipient_phone: '213-555-0100',
      recipient_email: 'john@example.com',
      recipient_pccc: '123456',
    };
    const shipperDefaults = { name: 'SNTL Korea Co Ltd', country: 'KR' };
    const emptyPackages: Record<string, unknown>[] = [];

    it('shipper.shipper_street에 국가·시·구·도가 제거되고 상세주소가 앞에 온다 (Jaison 실검증 성공형)', () => {
      const result = buildCreateOrderPayload('SHXK', baseOrder as any, 'US', emptyPackages, shipperDefaults);
      expect((result.shipper as any).shipper_street).toBe('6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil');
      // 시/구/도·국가명 완전 제거 확인
      const street = (result.shipper as any).shipper_street as string;
      for (const segment of ['Bundang-gu', 'Seongnam-si', 'Gyeonggi-do', 'Republic of Korea']) {
        expect(street).not.toContain(segment);
      }
    });

    it('수하인 street도 국가·시·구/도 제거 (국가명 포함 입력 기준)', () => {
      const order = {
        ...baseOrder,
        recipient_address: '123 Main St, Los Angeles, CA, United States',
        recipient_country_code: 'US',
      };
      const result = buildCreateOrderPayload('SHXK', order as any, 'US', emptyPackages, shipperDefaults);
      expect((result.consignee as any).consignee_street).toBe('123 Main St');
      expect((result.consignee as any).consignee_countrycode).toBe('US');
    });

    it('consignee_city/province는 별도 필드로 계속 전달된다 (정보 손실 없음)', () => {
      const result = buildCreateOrderPayload('SHXK', baseOrder as any, 'US', emptyPackages, shipperDefaults);
      expect((result.shipper as any).shipper_city).toBe('Seongnam-si');
      expect((result.shipper as any).shipper_province).toBe('41');
      expect((result.consignee as any).consignee_city).toBe('Los Angeles');
      expect((result.consignee as any).consignee_province).toBe('CA');
    });
  });
});