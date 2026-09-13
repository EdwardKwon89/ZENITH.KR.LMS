// DEF-B-146 / Issue #1194: SHXK createorder shipper_street에 시/구/도 포함 시 UPS AddressLine(2줄, 약 70자) 초과로
// "Invalid ShipFrom AddressLine3" 거부 → street는 도로명+상세주소만으로 구성 (시/구/도는 city/province 별도 필드 전달).
//
// Jaison이 실제 SHXK API로 검증한 두 값(2026-09-13):
//   [실패] "6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do" (88자)
//   [성공] "6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil" (49자) — order_id=785179 발급, removeorder 정리
// 위 두 값을 fixture로 삼아 실제 함수 호출·반환값으로 검증한다(소스 문자열 검사·존재 확인 패턴 금지).
import { describe, it, expect } from 'vitest';
import { resolveShipperStreet, resolveConsigneeStreet, buildCreateOrderPayload } from '@/lib/ups/label-mapping';

// UPS ShipFrom AddressLine 1~2줄 총 길이 상한(추정). 61자 성공/88자 실패 실측 경계 반영.
const ADDRESS_LINE_LIMIT = 70;

describe('DEF-B-146: street 시/구/도 제거 → AddressLine 초과 해소 (88자 실패 → 49자 성공형)', () => {
  describe('resolveShipperStreet — 시/구/도 포함 88자 입력이 49자 성공형으로 변환', () => {
    const failStreetInput = {
      shipper_address_english: '6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea',
      shipper_address_detail_english: '6 floor, 601 room',
      shipper_country_code: '',
    };

    it('Jaison 실검증 성공값과 정확 일치 (49자)', () => {
      const result = resolveShipperStreet(failStreetInput, undefined);
      expect(result).toBe('6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil');
      expect(result.length).toBe(49);
    });

    it('결과 길이가 AddressLine 상한(70자)을 넘지 않는다', () => {
      const result = resolveShipperStreet(failStreetInput, undefined);
      expect(result.length).toBeLessThanOrEqual(ADDRESS_LINE_LIMIT);
    });

    it('결과에 시/구/도·국가가 완전히 제거된다', () => {
      const result = resolveShipperStreet(failStreetInput, undefined);
      for (const token of ['Bundang-gu', 'Seongnam-si', 'Gyeonggi-do', 'Republic of Korea', 'Korea']) {
        expect(result).not.toContain(token);
      }
    });
  });

  describe('buildCreateOrderPayload — 실제 payload의 street 전환 (88자 → 49자)', () => {
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
      recipient_address: '123 Main St, Los Angeles, CA',
      recipient_address_local: '',
      recipient_zipcode: '90001',
      recipient_phone: '213-555-0100',
      recipient_email: 'john@example.com',
      recipient_pccc: '123456',
    };
    const shipperDefaults = { name: 'SNTL Korea Co Ltd', country: 'KR' };

    it('shipper_street이 49자 성공형이 되고 시/구/도·국가가 제거된다', () => {
      const result = buildCreateOrderPayload('SHXK', baseOrder as any, 'US', [], shipperDefaults) as any;
      expect(result.shipper.shipper_street).toBe('6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil');
      expect(result.shipper.shipper_street.length).toBe(49);
    });

    it('consignee_street도 도로명만 남는다', () => {
      const result = buildCreateOrderPayload('SHXK', baseOrder as any, 'US', [], shipperDefaults) as any;
      expect(result.consignee.consignee_street).toBe('123 Main St');
    });

    it('시/구/도는 별도 필드로 유지된다 (정보 손실 없음)', () => {
      const result = buildCreateOrderPayload('SHXK', baseOrder as any, 'US', [], shipperDefaults) as any;
      expect(result.shipper.shipper_city).toBe('Seongnam-si');
      expect(result.shipper.shipper_province).toBe('41');
      expect(result.consignee.consignee_city).toBe('Los Angeles');
      expect(result.consignee.consignee_province).toBe('CA');
      expect(result.consignee.consignee_countrycode).toBe('US');
    });
  });

  describe('resolveConsigneeStreet — 수하인 street 동일 축약', () => {
    it('상세주소(파일 케이스: 901 room) + 단일 세그먼트 도로명(it venture tower)', () => {
      const order = {
        recipient_address: 'it venture tower',
        recipient_address_detail: '901 room',
        recipient_country_code: 'JP',
      };
      expect(resolveConsigneeStreet(order)).toBe('901 room, it venture tower');
    });
  });
});