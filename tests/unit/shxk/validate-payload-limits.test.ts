import { describe, it, expect } from 'vitest';
import { validateShxkPayload } from '@/lib/shxk/validate-payload';
import { ITEM_NAME_MAX } from '@/lib/validation/shxk-limits';

// 실제 validateShxkPayload 호출 — 반환된 에러 배열에 대한 toContain 만 허용 (TASK-B-332 / Issue #1239)
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

describe('validateShxkPayload — 기준 케이스', () => {
  it('정상 payload → 에러 없음', () => {
    expect(validateShxkPayload(base())).toEqual([]);
  });
});

describe('validateShxkPayload — HS 코드 누락', () => {
  it('invoice 항목 hs_code 누락 → HS 코드 누락 에러 포함', () => {
    const payload = base();
    delete (payload.invoice[0] as any).hs_code;
    const errors = validateShxkPayload(payload);
    expect(errors).toContain('품목 1: HS 코드 누락');
  });
});

describe('validateShxkPayload — 품명 35자 초과', () => {
  it(`품명 ${ITEM_NAME_MAX + 1}자 → 품명 초과 에러 포함`, () => {
    const payload = base();
    payload.invoice[0].invoice_enname = 'A'.repeat(ITEM_NAME_MAX + 1);
    const errors = validateShxkPayload(payload);
    expect(errors).toContain(`품목 1: 품명 ${ITEM_NAME_MAX}자 초과`);
  });
});

describe('validateShxkPayload — 전화번호 숫자만 + 15자리', () => {
  it('하이픈 포함 전화 → 숫자만 에러 포함', () => {
    const payload = base();
    payload.shipper.shipper_telephone = '010-1234-5678';
    payload.consignee.consignee_telephone = '010-1234-5678';
    const errors = validateShxkPayload(payload);
    expect(errors).toContain('발송인 전화번호는 숫자만 사용할 수 있습니다');
    expect(errors).toContain('수취인 전화번호는 숫자만 사용할 수 있습니다');
  });

  it('16자리 전화 → 15자리 초과 에러 포함', () => {
    const payload = base();
    payload.shipper.shipper_telephone = '1'.repeat(16);
    const errors = validateShxkPayload(payload);
    expect(errors).toContain('발송인 전화번호는 15자리 이하여야 합니다');
  });
});
