import { describe, it, expect } from 'vitest';
import { validateShxkPayload } from '@/lib/shxk/validate-payload';
import { buildCreateOrderPayload } from '@/lib/ups/label-mapping';

// TASK-B-344 (Issue #1270): UPS/SHXK 주소 AddressLine 길이 사전검증.
// 실제 validateShxkPayload 호출 반환값을 toEqual 로 단언한다(상수만 단언하는 테스트 금지).
//
// 한도 근거 (Jaison 확정 잠정값, 2026-11-13):
//   SHIPPER_STREET_MAX=70 (ShipFrom 2줄×35 — DEF-B-145/146 실측:49/58 성공,87 실패)
//   CONSIGNEE_STREET_MAX=105 (ShipTo 3줄×35 **가정** — ShipTo 실패 실측 없음)
// DEF-B-146 실측 문자열은 문서 표기(88/61)가 아닌 **실제 .length(87/58/49)** 로 고정한다.

const DEF146_OVER = '6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do';
const DEF146_OK_58 = '461-5 Gonghang-daero, Gangseo-gu, Seoul, Republic of Korea';
const DEF146_OK_49 = '6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil';

const shipperMsg = (len: number) => `발송인 주소가 너무 깁니다(현재 ${len}자, 최대 70자) — 상세주소를 줄여 주세요`;
const consigneeMsg = (len: number) => `수취인 주소가 너무 깁니다(현재 ${len}자, 최대 105자) — 상세주소를 줄여 주세요`;

const base = () => ({
  shipper: {
    shipper_name: 'Shipper',
    shipper_countrycode: 'KR',
    shipper_street: 'Seoul 1',
    shipper_telephone: '01012345678',
  },
  consignee: {
    consignee_name: 'Consignee',
    consignee_countrycode: 'US',
    consignee_street: 'NY 1',
    consignee_city: 'New York',
    consignee_postcode: '10001',
    consignee_telephone: '01012345678',
  },
  invoice: [
    { invoice_enname: 'Goods', invoice_quantity: '1', invoice_unitcharge: '1.00', hs_code: '1234567890' },
  ],
});

describe('TC-344-1: shipper_street 길이 경계 (validateShxkPayload 실제 호출)', () => {
  it('70자 → 통과 (에러 배열 빈 값 toEqual)', () => {
    const payload = base();
    payload.shipper.shipper_street = 'A'.repeat(70);
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it('71자 → 한글 오류 1건 (toEqual)', () => {
    const payload = base();
    payload.shipper.shipper_street = 'A'.repeat(71);
    expect(validateShxkPayload(payload)).toEqual([shipperMsg(71)]);
  });
});

describe('TC-344-2: consignee_street 길이 경계 (validateShxkPayload 실제 호출)', () => {
  it('105자 → 통과 (에러 배열 빈 값 toEqual)', () => {
    const payload = base();
    payload.consignee.consignee_street = 'B'.repeat(105);
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it('106자 → 한글 오류 1건 (toEqual)', () => {
    const payload = base();
    payload.consignee.consignee_street = 'B'.repeat(106);
    expect(validateShxkPayload(payload)).toEqual([consigneeMsg(106)]);
  });
});

describe('TC-344-3: DEF-B-146 실측 fixture (문서 표기 아닌 실제 .length 기준)', () => {
  it('실패 사례 문자열의 실제 길이는 87자 (문서 표기 88자와 무관)', () => {
    expect(DEF146_OVER.length).toBe(87);
  });
  it('성공 사례 문자열의 실제 길이는 58자 (문서 표기 61자와 무관)', () => {
    expect(DEF146_OK_58.length).toBe(58);
  });
  it('성공 사례 문자열의 실제 길이는 49자', () => {
    expect(DEF146_OK_49.length).toBe(49);
  });

  it('87자 shipper_street → 한도(70) 초과로 차단 — DEF-B-146 실패 재현', () => {
    const payload = base();
    payload.shipper.shipper_street = DEF146_OVER;
    expect(validateShxkPayload(payload)).toEqual([shipperMsg(87)]);
  });

  it('58자 shipper_street → 통과 (DEF-B-146 성공 사례와 모순 없음)', () => {
    const payload = base();
    payload.shipper.shipper_street = DEF146_OK_58;
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it('49자 shipper_street → 통과 (DEF-B-146 진단 재검증 사례와 동일)', () => {
    const payload = base();
    payload.shipper.shipper_street = DEF146_OK_49;
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it('87자 consignee_street → 통과 (ShipTo 한도 105 잠정값이 실측 최대치를 비차단함을 고정)', () => {
    const payload = base();
    payload.consignee.consignee_street = DEF146_OVER;
    expect(validateShxkPayload(payload)).toEqual([]);
  });
});

describe('TC-344-4: 빈 주소는 기존 누락 검사만 — 길이 오류 중복 없음', () => {
  it("shipper_street 빈 문자열 → '발송인 주소 누락' 단독 (길이 오류 미포함, toEqual)", () => {
    const payload = base();
    payload.shipper.shipper_street = '';
    expect(validateShxkPayload(payload)).toEqual(['발송인 주소 누락']);
  });

  it("consignee_street 빈 문자열 → '수취인 주소 누락' 단독 (toHaveLength1로 중복 검증)", () => {
    const payload = base();
    payload.consignee.consignee_street = '';
    expect(validateShxkPayload(payload)).toEqual(['수취인 주소 누락']);
  });
});

describe('TC-344-5: 통합 — buildCreateOrderPayload 조립(도로명 추출·쉼표 치환) 후 길이로 판정', () => {
  const longShipperRoad = 'X'.repeat(70); // 도로명 세그먼트(쉼표 없음)70자
  const longConsigneeRoad = 'Y'.repeat(106); // 도로명 세그먼트 106자

  const baseOrder = () => ({
    order_no: 'ORD-B344-001',
    shipper_name: 'Test Shipper',
    shipper_country_code: 'KR',
    shipper_state_province: '11',
    shipper_city: 'Seoul',
    shipper_address_english: `${longShipperRoad}, Gangnam-gu, Seoul`, // 조립 후 'Suite 100, <70자>' =81자
    shipper_address_detail_english: 'Suite 100',
    shipper_zipcode: '06236',
    shipper_contact_phone: '01012345678',
    recipient_name: 'Test Consignee',
    recipient_country_code: 'US',
    recipient_state_province: 'CA',
    recipient_city: 'Los Angeles',
    recipient_address: `${longConsigneeRoad}, Los Angeles, CA`, // 도로명 세그먼트만 반영 =106자
    recipient_zipcode: '90001',
    recipient_phone: '1234567890',
  });

  const packages = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      packing_unit: 'BOX',
      physical_box_count: 1,
      packing_count: 1,
      gross_weight: 1,
      content_type: 'NONDOC',
      items: [{ item_name: 'Item A', quantity: 1, unit_price: 10, hs_code: '1234567890' }],
    },
  ];

  it('조립 후 shipper_street/consignee_street가 각 한도를 넘어 한글 오류로 차단된다 (toEqual, 순서 고정)', () => {
    const payload = buildCreateOrderPayload('UPS', baseOrder(), 'US', packages, {
      name: 'SNTL Korea Co Ltd',
      country: 'KR',
    });

    // 조립(도로명 세그먼트 추출·쉼표 치환) 후의 최종 전송값 길이가 한도를 넘음을 먼저 고정
    const shipperStreetLen = String((payload.shipper as Record<string, unknown>).shipper_street).length;
    const consigneeStreetLen = String((payload.consignee as Record<string, unknown>).consignee_street).length;
    expect(shipperStreetLen).toBeGreaterThan(70);
    expect(consigneeStreetLen).toBeGreaterThan(105);

    expect(validateShxkPayload(payload)).toEqual([
      shipperMsg(shipperStreetLen),
      consigneeMsg(consigneeStreetLen),
    ]);
  });

  it('조립 후 한도 이내이면 통과 — 쉼표·시구도 제거가 길이 판정에 반영됨 (toEqual [])', () => {
    const order = baseOrder();
    order.shipper_address_english = 'Suite 100, 123 Teheran-ro'; // 짧은 도로명 (쉼표 제거 대상)
    order.recipient_address = '456 Wilshire Blvd, Los Angeles, CA';
    const payload = buildCreateOrderPayload('UPS', order, 'US', packages, {
      name: 'SNTL Korea Co Ltd',
      country: 'KR',
    });
    expect(validateShxkPayload(payload)).toEqual([]);
  });
});
