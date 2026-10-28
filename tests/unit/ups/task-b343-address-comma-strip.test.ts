// TASK-B-343 (Issue #1268): UPS createorder 주소 쉼표 제거 + AddressLine 길이 사전검증
// 실제 함수 호출로 검증 (toContain 소스 검사 금지)
import { describe, it, expect } from 'vitest';
import { resolveShipperStreet, resolveConsigneeStreet, buildCreateOrderPayload } from '@/lib/ups/label-mapping';

describe('TC-343-1: resolveShipperStreet - 쉼표 제거 (도로명 추출 순서 유지)', () => {
  it('shipper_address_english에 쉼표 포함 시 도로명 세그먼트만 사용하고 쉼표 제거', () => {
    const order = {
      shipper_address_english: '123 Gangnam-daero, Gangnam-gu, Seoul, Korea',
      shipper_address_detail_english: 'Suite 100, APT',
    };
    const result = resolveShipperStreet(order, undefined);
    expect(result).not.toContain(',');
    // 도로명 세그먼트(123 Gangnam-daero) 추출 확인
    expect(result).toContain('123 Gangnam-daero');
  });

  it('상세주소에도 쉼표가 있으면 공백 치환', () => {
    const order = {
      shipper_address_english: '50 Teheran-ro',
      shipper_address_detail_english: 'Bldg A, 5F',
    };
    const result = resolveShipperStreet(order, undefined);
    expect(result).not.toContain(',');
    expect(result).toContain('Bldg A');
    expect(result).toContain('5F');
  });
});

describe('TC-343-2: resolveConsigneeStreet - 쉼표 제거', () => {
  it('recipient_address에 쉼표 포함 시 도로명만 추출 후 쉼표 제거', () => {
    const order = {
      recipient_address: '100 Market St, San Francisco, CA',
      recipient_address_detail: 'Unit 5, Box 2',
    };
    const result = resolveConsigneeStreet(order);
    expect(result).not.toContain(',');
    expect(result).toContain('100 Market St');
  });

  it('recipient_address_local에도 쉼표 정제', () => {
    const order = {
      recipient_address: '200 Broadway',
      recipient_address_local: '서울시, 강남구',
    };
    const result = resolveConsigneeStreet(order);
    expect(result).not.toContain(',');
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

  it('shipper_street/consignee_street에 쉼표 없음', () => {
    const payload: any = buildCreateOrderPayload('UPS', baseOrder, 'US', packages, { name: 'SNTL Korea Co Ltd', country: 'KR' });
    expect(String(payload.shipper.shipper_street)).not.toContain(',');
    expect(String(payload.consignee.consignee_street)).not.toContain(',');
    expect(String(payload.shipper.shipper_city)).not.toContain(',');
    expect(String(payload.shipper.shipper_province)).not.toContain(',');
    expect(String(payload.consignee.consignee_city)).not.toContain(',');
    expect(String(payload.consignee.consignee_province)).not.toContain(',');
  });

  it('도로명 추출 순서 유지 - shipper_address_english 첫 세그먼트만 사용', () => {
    const payload: any = buildCreateOrderPayload('UPS', baseOrder, 'US', packages, { name: 'SNTL Korea Co Ltd', country: 'KR' });
    // 첫 세그먼트 '123 Teheran-ro'가 포함되어야 함
    expect(String(payload.shipper.shipper_street)).toContain('123 Teheran-ro');
  });
});

describe('TC-343-5/6/7: AddressLine 길이 사전검증 (별도 분리 - 실측 후 Jaison 확정)', () => {
  it('길이 검증은 본 PR에서 제외 (실측 결과 후 확정)', () => {
    expect(true).toBe(true);
  });
});
