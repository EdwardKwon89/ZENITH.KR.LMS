// TASK-B-343 (Issue #1268): UPS createorder 주소 쉼표 제거 + AddressLine 길이 사전검증
// 실제 함수 호출로 검증 (toContain 소스 검사 금지)
import { describe, it, expect } from 'vitest';
import { resolveShipperStreet, resolveConsigneeStreet, buildCreateOrderPayload } from '@/lib/ups/label-mapping';

describe('TC-343-1: resolveShipperStreet - 표시용 출력 유지 (전송은 buildShipperPayload에서 정제)', () => {
  it('shipper_address_english에 쉼표 포함 시 기존 형식 유지 (도로명 세그먼트 추출)', () => {
    const order = {
      shipper_address_english: '123 Gangnam-daero, Gangnam-gu, Seoul, Korea',
      shipper_address_detail_english: 'Suite 100',
    };
    const result = resolveShipperStreet(order, undefined);
    // 표시용 함수는 기존 구분자 유지
    expect(result).toBe('Suite 100, 123 Gangnam-daero');
  });
});

describe('TC-343-2: resolveConsigneeStreet - 표시용 출력 유지', () => {
  it('기존 형식 유지', () => {
    const order = {
      recipient_address: '100 Market St, San Francisco, CA',
      recipient_address_detail: 'Unit 5',
    };
    const result = resolveConsigneeStreet(order);
    expect(result).toBe('Unit 5, 100 Market St');
  });
});

describe('TC-343-3/4: buildCreateOrderPayload - 전송 payload 쉼표 제거 (벌크 경로 포함)', () => {
  const baseOrder = {
    order_no: 'ORD-TEST-001',
    shipper_name: 'Test Shipper',
    shipper_country_code: 'KR',
    shipper_state_province: '11',
    shipper_city: 'Seoul',
    shipper_address_english: '123 Teheran-ro, Gangnam-gu, Seoul',
    shipper_address_detail_english: 'Suite 100, Tower A',
    shipper_zipcode: '06236',
    shipper_contact_phone: '01012345678',
    recipient_name: 'Test Consignee',
    recipient_country_code: 'US',
    recipient_state_province: 'CA',
    recipient_city: 'Los Angeles',
    recipient_address: '456 Wilshire Blvd, Los Angeles, CA',
    recipient_address_local: 'LA, Downtown',
    recipient_address_detail: 'Apt 10, Floor 2',
    recipient_zipcode: '90001',
    recipient_phone: '1234567890',
    recipient_email: 'test@test.com',
  };

  const packages = [{ id: 'p1', content_type: 'DOC', gross_weight: 0.5, physical_box_count: 1, items: [{ item_name: 'Document', quantity: 1, unit_price: '1.00', item_packing_unit: 'PCE', hs_code: '4901990000' }] }];

  it('shipper_street/consignee_street에 쉼표 없음 (전송 지점에서 정제)', () => {
    const payload: any = buildCreateOrderPayload('UPS', baseOrder, 'US', packages, { name: 'SNTL Korea Co Ltd', country: 'KR' });
    expect(String(payload.shipper.shipper_street)).not.toContain(',');
    expect(String(payload.consignee.consignee_street)).not.toContain(',');
    expect(String(payload.shipper.shipper_city)).not.toContain(',');
    expect(String(payload.shipper.shipper_province)).not.toContain(',');
    expect(String(payload.consignee.consignee_city)).not.toContain(',');
    expect(String(payload.consignee.consignee_province)).not.toContain(',');
  });

  it('도로명 추출 순서 유지 - shipper_address_english 첫 세그먼트만 사용 (전송 payload)', () => {
    const payload: any = buildCreateOrderPayload('UPS', baseOrder, 'US', packages, { name: 'SNTL Korea Co Ltd', country: 'KR' });
    expect(String(payload.shipper.shipper_street)).toBe('Suite 100 Tower A 123 Teheran-ro');
  });
});

// TC-343-5/6/7: AddressLine 길이 사전검증은 별도 Task로 분리 (실측 후 Jaison 확정)
