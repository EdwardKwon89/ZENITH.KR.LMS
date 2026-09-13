// DEF-B-145 / Issue #1192: SHXK createorder shipper_street에 국가명 중복 포함 → UPS "Invalid ShipFrom AddressLine3"
// 실제 재현 오더(ZEN-2026-000015)의 전송값을 fixture로 삼아 resolveShipperStreet()/resolveConsigneeStreet()/buildCreateOrderPayload()를
// 실제 호출하고 반환값으로 검증한다(소스 문자열 검사·함수 존재 확인 패턴 금지).
import { describe, it, expect } from 'vitest';
import {
  resolveShipperStreet,
  resolveConsigneeStreet,
  buildCreateOrderPayload,
} from '@/lib/ups/label-mapping';

describe('DEF-B-145: 주소 조합 시 국가명 중복 제거 + 상세주소 앞 정렬', () => {
  describe('resolveShipperStreet — 실제 재현 오더 ZEN-2026-000015 fixture', () => {
    // 실제 재현 시점 전송값: "6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea 6 floor, 601 room"
    const reproducedOrder = {
      shipper_address_english: '6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea',
      shipper_address_detail_english: '6 floor, 601 room',
      // 재현 오더는 shipper_country_code가 빈 값이었음 — 폴백 목록으로만 처리되어야 함
      shipper_country_code: '',
    };

    it('국가명(Republic of Korea)이 제거되고 상세주소가 앞에 온다', () => {
      const result = resolveShipperStreet(reproducedOrder, undefined);
      expect(result).toBe('6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do');
    });

    it('결과에 국가명이 어떤 형태로도 중복 포함되지 않는다', () => {
      const result = resolveShipperStreet(reproducedOrder, undefined);
      expect(result).not.toContain('Republic of Korea');
      expect(result).not.toContain('South Korea');
      expect(result).not.toContain('Korea');
    });

    it('시/구/도 세그먼트(도로명 이상)는 그대로 유지된다', () => {
      const result = resolveShipperStreet(reproducedOrder, undefined);
      for (const segment of ['Bundang-gu', 'Seongnam-si', 'Gyeonggi-do']) {
        expect(result).toContain(segment);
      }
    });

    it('shipper_country_code가 명시된 경우에도 resolveCountryName 결과와 폴백 모두 처리된다', () => {
      const order = { ...reproducedOrder, shipper_country_code: 'KR' };
      expect(resolveShipperStreet(order, undefined)).toBe(
        '6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do',
      );
    });

    it('국가명이 없는 일반 주소는 변형 없이 그대로 반환된다', () => {
      const order = {
        shipper_address_english: '10 Downing St, Westminster, London',
        shipper_address_detail_english: 'Flat 3',
        shipper_country_code: 'GB',
      };
      expect(resolveShipperStreet(order, undefined)).toBe('Flat 3, 10 Downing St, Westminster, London');
    });
  });

  describe('resolveConsigneeStreet — 수하인 측 동일 결함 점검', () => {
    it('국가명 포함 수하인 주소에서 국가명이 제거되고 상세주소가 앞에 온다', () => {
      const order = {
        recipient_address: '1-1-1 Nishi-Shinjuku, Shinjuku-ku, Tokyo, Japan',
        recipient_address_detail: 'Room 501',
        recipient_country_code: 'JP',
      };
      expect(resolveConsigneeStreet(order)).toBe('Room 501, 1-1-1 Nishi-Shinjuku, Shinjuku-ku, Tokyo');
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
      shipper_state_province: 'Gyeonggi-do',
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

    it('shipper.shipper_street에 국가명이 중복 포함되지 않고 상세주소가 앞에 온다', () => {
      const result = buildCreateOrderPayload('SHXK', baseOrder as any, 'US', emptyPackages, shipperDefaults);
      expect((result.shipper as any).shipper_street).toBe(
        '6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do',
      );
    });

    it('수하인 street도 국가명이 중복 포함되지 않는다 (국가명 포함 입력 기준)', () => {
      const order = {
        ...baseOrder,
        recipient_address: '123 Main St, Los Angeles, CA, United States',
        recipient_country_code: 'US',
      };
      const result = buildCreateOrderPayload('SHXK', order as any, 'US', emptyPackages, shipperDefaults);
      expect((result.consignee as any).consignee_street).toBe('123 Main St, Los Angeles, CA');
      expect((result.consignee as any).consignee_countrycode).toBe('US');
    });
  });
});