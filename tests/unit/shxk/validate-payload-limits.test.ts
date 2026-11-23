import { describe, it, expect } from 'vitest';
import { validateShxkPayload } from '@/lib/shxk/validate-payload';
import {
  ITEM_NAME_MAX,
  RECIPIENT_COMPANY_MAX,
  CONSIGNEE_NAME_MAX,
  CONSIGNEE_COUNTRYCODE_MAX,
  CONSIGNEE_PROVINCE_MAX,
  CONSIGNEE_CITY_MAX,
  CONSIGNEE_POSTCODE_MAX,
  CONSIGNEE_EMAIL_MAX,
  CONSIGNEE_TARIFF_MAX,
} from '@/lib/validation/shxk-limits';

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

describe('validateShxkPayload — 수취인 회사명 200자 (TASK-B-346)', () => {
  it('consignee_company 없으면 에러 없음 (선택 필드)', () => {
    expect(validateShxkPayload(base())).toEqual([]);
  });

  it(`consignee_company ${RECIPIENT_COMPANY_MAX}자 → 에러 없음 (경계값)`, () => {
    const payload = base();
    (payload.consignee as any).consignee_company = 'A'.repeat(RECIPIENT_COMPANY_MAX);
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it(`consignee_company ${RECIPIENT_COMPANY_MAX + 1}자 → 회사명 초과 단일 에러`, () => {
    const payload = base();
    (payload.consignee as any).consignee_company = 'A'.repeat(RECIPIENT_COMPANY_MAX + 1);
    expect(validateShxkPayload(payload)).toEqual([`수취인 회사명 ${RECIPIENT_COMPANY_MAX}자 초과`]);
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

// TASK-B-346 PR③ (Issue #1278): SHXK 명세 consignee.* 상한 — 경계 N → 에러 없음 / N+1 → 단일 에러.
// 명세 행 근거는 shxk-limits.ts 상수 주석 참조 (docs/80_RawData/Phase8_UPS_API_리서치_결과.md 130~147행).
describe('validateShxkPayload — 수취인 성명 상한 (TASK-B-346 PR③)', () => {
  it(`${CONSIGNEE_NAME_MAX}자 → 에러 없음 (경계값)`, () => {
    const payload = base();
    (payload.consignee as any).consignee_name = 'A'.repeat(CONSIGNEE_NAME_MAX);
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it(`${CONSIGNEE_NAME_MAX + 1}자 → 단일 에러`, () => {
    const payload = base();
    (payload.consignee as any).consignee_name = 'A'.repeat(CONSIGNEE_NAME_MAX + 1);
    expect(validateShxkPayload(payload)).toEqual([`수취인 성명 ${CONSIGNEE_NAME_MAX}자 초과`]);
  });
});

describe('validateShxkPayload — 수취인 국가코드 상한 (TASK-B-346 PR③)', () => {
  it(`${CONSIGNEE_COUNTRYCODE_MAX}자 → 에러 없음 (경계값)`, () => {
    const payload = base();
    (payload.consignee as any).consignee_countrycode = 'A'.repeat(CONSIGNEE_COUNTRYCODE_MAX);
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it(`${CONSIGNEE_COUNTRYCODE_MAX + 1}자 → 단일 에러`, () => {
    const payload = base();
    (payload.consignee as any).consignee_countrycode = 'A'.repeat(CONSIGNEE_COUNTRYCODE_MAX + 1);
    expect(validateShxkPayload(payload)).toEqual([`수취인 국가코드 ${CONSIGNEE_COUNTRYCODE_MAX}자 초과`]);
  });
});

describe('validateShxkPayload — 수취인 주/도 상한 (TASK-B-346 PR③)', () => {
  it(`${CONSIGNEE_PROVINCE_MAX}자 → 에러 없음 (경계값)`, () => {
    const payload = base();
    (payload.consignee as any).consignee_province = 'A'.repeat(CONSIGNEE_PROVINCE_MAX);
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it(`${CONSIGNEE_PROVINCE_MAX + 1}자 → 단일 에러`, () => {
    const payload = base();
    (payload.consignee as any).consignee_province = 'A'.repeat(CONSIGNEE_PROVINCE_MAX + 1);
    expect(validateShxkPayload(payload)).toEqual([`수취인 주/도 ${CONSIGNEE_PROVINCE_MAX}자 초과`]);
  });
});

describe('validateShxkPayload — 수취인 도시 상한 (TASK-B-346 PR③)', () => {
  it(`${CONSIGNEE_CITY_MAX}자 → 에러 없음 (경계값)`, () => {
    const payload = base();
    (payload.consignee as any).consignee_city = 'A'.repeat(CONSIGNEE_CITY_MAX);
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it(`${CONSIGNEE_CITY_MAX + 1}자 → 단일 에러`, () => {
    const payload = base();
    (payload.consignee as any).consignee_city = 'A'.repeat(CONSIGNEE_CITY_MAX + 1);
    expect(validateShxkPayload(payload)).toEqual([`수취인 도시 ${CONSIGNEE_CITY_MAX}자 초과`]);
  });
});

describe('validateShxkPayload — 수취인 우편번호 상한 (TASK-B-346 PR③)', () => {
  it(`${CONSIGNEE_POSTCODE_MAX}자 → 에러 없음 (경계값)`, () => {
    const payload = base();
    (payload.consignee as any).consignee_postcode = 'A'.repeat(CONSIGNEE_POSTCODE_MAX);
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it(`${CONSIGNEE_POSTCODE_MAX + 1}자 → 단일 에러`, () => {
    const payload = base();
    (payload.consignee as any).consignee_postcode = 'A'.repeat(CONSIGNEE_POSTCODE_MAX + 1);
    expect(validateShxkPayload(payload)).toEqual([`수취인 우편번호 ${CONSIGNEE_POSTCODE_MAX}자 초과`]);
  });
});

describe('validateShxkPayload — 수취인 이메일 상한 (TASK-B-346 PR③)', () => {
  it(`${CONSIGNEE_EMAIL_MAX}자 → 에러 없음 (경계값)`, () => {
    const payload = base();
    (payload.consignee as any).consignee_email = 'A'.repeat(CONSIGNEE_EMAIL_MAX);
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it(`${CONSIGNEE_EMAIL_MAX + 1}자 → 단일 에러`, () => {
    const payload = base();
    (payload.consignee as any).consignee_email = 'A'.repeat(CONSIGNEE_EMAIL_MAX + 1);
    expect(validateShxkPayload(payload)).toEqual([`수취인 이메일 ${CONSIGNEE_EMAIL_MAX}자 초과`]);
  });
});

describe('validateShxkPayload — 수취인 통관부호 상한 (TASK-B-346 PR③)', () => {
  it(`${CONSIGNEE_TARIFF_MAX}자 → 에러 없음 (경계값)`, () => {
    const payload = base();
    (payload.consignee as any).consignee_tariff = 'A'.repeat(CONSIGNEE_TARIFF_MAX);
    expect(validateShxkPayload(payload)).toEqual([]);
  });

  it(`${CONSIGNEE_TARIFF_MAX + 1}자 → 단일 에러`, () => {
    const payload = base();
    (payload.consignee as any).consignee_tariff = 'A'.repeat(CONSIGNEE_TARIFF_MAX + 1);
    expect(validateShxkPayload(payload)).toEqual([`수취인 통관부호 ${CONSIGNEE_TARIFF_MAX}자 초과`]);
  });
});
