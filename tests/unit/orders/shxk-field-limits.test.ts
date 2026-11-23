import { describe, it, expect } from 'vitest';
import { orderRegistrationSchema } from '@/lib/validation/order';
import {
  stripNonDigits,
  HS_CODE_MAX,
  ITEM_NAME_MAX,
  PHONE_MAX_DIGITS,
  RECIPIENT_COMPANY_MAX,
  CONSIGNEE_NAME_MAX,
  CONSIGNEE_PROVINCE_MAX,
  CONSIGNEE_CITY_MAX,
  CONSIGNEE_POSTCODE_MAX,
  CONSIGNEE_EMAIL_MAX,
  CONSIGNEE_TARIFF_MAX,
} from '@/lib/validation/shxk-limits';

// 실제 orderRegistrationSchema.safeParse 호출 — vacuous/shadow 금지 (TASK-B-332 / Issue #1239)
const baseUps = () => ({
  order_type: 'B2B' as const,
  shipper_id: '11111111-1111-4111-8111-111111111111',
  transport_mode: 'UPS' as const,
  recipient_name: 'John Doe',
  recipient_address: '123 Main St',
  recipient_phone: '01012345678',
  shipper_contact_phone: '01012345678',
  recipient_country_code: 'US',
  recipient_zipcode: '10001',
  recipient_city: 'New York',
  packages: [
    {
      packing_unit: 'BOX',
      gross_weight: 1,
      items: [{ item_name: 'Goods', quantity: 1, hs_code: '1234567890' }],
    },
  ],
});

const baseAir = () => ({
  order_type: 'B2B' as const,
  shipper_id: '11111111-1111-4111-8111-111111111111',
  transport_mode: 'AIR' as const,
  origin_port_id: '22222222-2222-4222-8222-222222222222',
  dest_port_id: '33333333-3333-4333-8333-333333333333',
  recipient_name: 'John Doe',
  recipient_address: '123 Main St',
  recipient_phone: '01012345678',
  packages: [
    {
      packing_unit: 'BOX',
      gross_weight: 1,
      items: [{ item_name: 'Goods', quantity: 1, hs_code: '' }],
    },
  ],
});

describe('orderRegistrationSchema — UPS HS 코드 필수/한도', () => {
  it('UPS + HS 빈 값 → 실패, path에 hs_code 포함', () => {
    const payload = baseUps();
    payload.packages[0].items[0].hs_code = '';
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('packages.0.items.0.hs_code');
      expect(result.error.issues.some((i) => i.path.join('.').endsWith('hs_code'))).toBe(true);
    }
  });

  it('UPS + HS 있음 → 통과', () => {
    const result = orderRegistrationSchema.safeParse(baseUps());
    expect(result.success).toBe(true);
  });

  it('AIR + HS 빈 값 → 통과 (UPS 한정 확인)', () => {
    const result = orderRegistrationSchema.safeParse(baseAir());
    expect(result.success).toBe(true);
  });

  it(`UPS HS 코드 ${HS_CODE_MAX}자 초과 → 실패`, () => {
    const payload = baseUps();
    payload.packages[0].items[0].hs_code = '1'.repeat(HS_CODE_MAX + 1);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('orderRegistrationSchema — UPS 품명 35자 한도', () => {
  it(`UPS 품명 ${ITEM_NAME_MAX}자 → 통과`, () => {
    const payload = baseUps();
    payload.packages[0].items[0].item_name = 'A'.repeat(ITEM_NAME_MAX);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it(`UPS 품명 ${ITEM_NAME_MAX + 1}자 → 실패, path에 item_name 포함`, () => {
    const payload = baseUps();
    payload.packages[0].items[0].item_name = 'A'.repeat(ITEM_NAME_MAX + 1);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'packages.0.items.0.item_name')).toBe(true);
    }
  });

  it(`AIR 품명 ${ITEM_NAME_MAX + 1}자 → 통과 (UPS 한정 확인)`, () => {
    const payload = baseAir();
    payload.packages[0].items[0].item_name = 'A'.repeat(ITEM_NAME_MAX + 1);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

describe('orderRegistrationSchema — 전화번호 숫자만 + 15자리', () => {
  it("수하인 전화 '010-1234-5678' (하이픈) → 실패, path recipient_phone", () => {
    const payload = baseUps();
    payload.recipient_phone = '010-1234-5678';
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'recipient_phone')).toBe(true);
    }
  });

  it("수하인 전화 '01012345678' → 통과", () => {
    const result = orderRegistrationSchema.safeParse(baseUps());
    expect(result.success).toBe(true);
  });

  it('수하인 전화 16자리 → 실패', () => {
    const payload = baseUps();
    payload.recipient_phone = '1'.repeat(PHONE_MAX_DIGITS + 1);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("화주 전화 '010-1234-5678' (하이픈) → 실패, path shipper_contact_phone", () => {
    const payload = baseUps();
    payload.shipper_contact_phone = '010-1234-5678';
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'shipper_contact_phone')).toBe(true);
    }
  });

  it('stripNonDigits("010-1234-5678") === "01012345678"', () => {
    expect(stripNonDigits('010-1234-5678')).toBe('01012345678');
  });

  it(`전화 ${PHONE_MAX_DIGITS + 1}자리 → 실패`, () => {
    const payload = baseUps();
    payload.recipient_phone = '9'.repeat(PHONE_MAX_DIGITS + 1);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('orderRegistrationSchema — 수하인 회사명 200자 (TASK-B-346 / Issue #1278)', () => {
  it('recipient_company 미입력 → 통과 (선택 필드)', () => {
    const result = orderRegistrationSchema.safeParse(baseUps());
    expect(result.success).toBe(true);
  });

  it(`recipient_company ${RECIPIENT_COMPANY_MAX}자 → 통과 (경계값)`, () => {
    const payload = baseUps();
    (payload as any).recipient_company = 'A'.repeat(RECIPIENT_COMPANY_MAX);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it(`recipient_company ${RECIPIENT_COMPANY_MAX + 1}자 → 실패, path recipient_company`, () => {
    const payload = baseUps();
    (payload as any).recipient_company = 'A'.repeat(RECIPIENT_COMPANY_MAX + 1);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'recipient_company')).toBe(true);
    }
  });
});

// TASK-B-346 PR③ (Issue #1278): SHXK consignee.* 명세 상한을 폼(zod) 단계에도 적용 — 경계 N 통과 / N+1 실패.
describe('orderRegistrationSchema — 수하인 명세 상한 (TASK-B-346 PR③ / Issue #1278)', () => {
  it(`recipient_name ${CONSIGNEE_NAME_MAX}자 → 통과`, () => {
    const payload = baseUps();
    payload.recipient_name = 'A'.repeat(CONSIGNEE_NAME_MAX);
    expect(orderRegistrationSchema.safeParse(payload).success).toBe(true);
  });

  it(`recipient_name ${CONSIGNEE_NAME_MAX + 1}자 → 실패, path recipient_name`, () => {
    const payload = baseUps();
    payload.recipient_name = 'A'.repeat(CONSIGNEE_NAME_MAX + 1);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'recipient_name')).toBe(true);
    }
  });

  it(`recipient_state_province ${CONSIGNEE_PROVINCE_MAX}자 → 통과`, () => {
    const payload = baseUps();
    (payload as any).recipient_state_province = 'A'.repeat(CONSIGNEE_PROVINCE_MAX);
    expect(orderRegistrationSchema.safeParse(payload).success).toBe(true);
  });

  it(`recipient_state_province ${CONSIGNEE_PROVINCE_MAX + 1}자 → 실패, path recipient_state_province`, () => {
    const payload = baseUps();
    (payload as any).recipient_state_province = 'A'.repeat(CONSIGNEE_PROVINCE_MAX + 1);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'recipient_state_province')).toBe(true);
    }
  });

  it(`recipient_city ${CONSIGNEE_CITY_MAX}자 → 통과`, () => {
    const payload = baseUps();
    payload.recipient_city = 'A'.repeat(CONSIGNEE_CITY_MAX);
    expect(orderRegistrationSchema.safeParse(payload).success).toBe(true);
  });

  it(`recipient_city ${CONSIGNEE_CITY_MAX + 1}자 → 실패, path recipient_city`, () => {
    const payload = baseUps();
    payload.recipient_city = 'A'.repeat(CONSIGNEE_CITY_MAX + 1);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'recipient_city')).toBe(true);
    }
  });

  it(`recipient_zipcode ${CONSIGNEE_POSTCODE_MAX}자 → 통과`, () => {
    const payload = baseUps();
    payload.recipient_zipcode = 'A'.repeat(CONSIGNEE_POSTCODE_MAX);
    expect(orderRegistrationSchema.safeParse(payload).success).toBe(true);
  });

  it(`recipient_zipcode ${CONSIGNEE_POSTCODE_MAX + 1}자 → 실패, path recipient_zipcode`, () => {
    const payload = baseUps();
    payload.recipient_zipcode = 'A'.repeat(CONSIGNEE_POSTCODE_MAX + 1);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'recipient_zipcode')).toBe(true);
    }
  });

  it(`recipient_pccc ${CONSIGNEE_TARIFF_MAX}자 → 통과`, () => {
    const payload = baseUps();
    (payload as any).recipient_pccc = 'A'.repeat(CONSIGNEE_TARIFF_MAX);
    expect(orderRegistrationSchema.safeParse(payload).success).toBe(true);
  });

  it(`recipient_pccc ${CONSIGNEE_TARIFF_MAX + 1}자 → 실패, path recipient_pccc`, () => {
    const payload = baseUps();
    (payload as any).recipient_pccc = 'A'.repeat(CONSIGNEE_TARIFF_MAX + 1);
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'recipient_pccc')).toBe(true);
    }
  });

  // '@example.com' = 12자 → 로컬파트 88자 + 12 = 100자.
  it(`recipient_email ${CONSIGNEE_EMAIL_MAX}자 → 통과`, () => {
    const payload = baseUps();
    (payload as any).recipient_email = 'a'.repeat(CONSIGNEE_EMAIL_MAX - '@example.com'.length) + '@example.com';
    expect(orderRegistrationSchema.safeParse(payload).success).toBe(true);
  });

  it(`recipient_email ${CONSIGNEE_EMAIL_MAX + 1}자 → 실패, path recipient_email`, () => {
    const payload = baseUps();
    (payload as any).recipient_email = 'a'.repeat(CONSIGNEE_EMAIL_MAX + 1 - '@example.com'.length) + '@example.com';
    const result = orderRegistrationSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'recipient_email')).toBe(true);
    }
  });
});
