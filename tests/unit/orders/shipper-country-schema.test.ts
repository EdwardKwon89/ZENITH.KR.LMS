// TASK-B-340 (Issue #1256): shipper_country_code 스키마 변환 — ''/공백/미지정은 'KR', 다른 값은 trim.
import { describe, it, expect } from 'vitest';
import { orderRegistrationSchema } from '@/lib/validation/order';

// 최소 유효 UPS 페이로드 (tests/unit/orders/shxk-field-limits.test.ts의 baseUps와 동일 구조 — 그 파일은 수정 금지)
function baseUps() {
  return {
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
  } as Record<string, unknown>;
}

function parseWithCountry(value: string | undefined) {
  const payload = baseUps();
  if (value === undefined) {
    delete payload.shipper_country_code;
  } else {
    payload.shipper_country_code = value;
  }
  return orderRegistrationSchema.safeParse(payload);
}

describe('TASK-B-340 (Issue #1256): shipper_country_code 빈 값 → KR', () => {
  it('"" → "KR"', () => {
    const result = parseWithCountry('');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.shipper_country_code).toBe('KR');
  });

  it('"  " (공백) → "KR"', () => {
    const result = parseWithCountry('  ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.shipper_country_code).toBe('KR');
  });

  it('미지정(undefined) → "KR"', () => {
    const result = parseWithCountry(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.shipper_country_code).toBe('KR');
  });

  it('"JP" → "JP" (다른 국가 값 보존)', () => {
    const result = parseWithCountry('JP');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.shipper_country_code).toBe('JP');
  });

  it('" KR " → "KR" (trim)', () => {
    const result = parseWithCountry(' KR ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.shipper_country_code).toBe('KR');
  });

  it('recipient_country_code는 변환하지 않는다 ("US" 그대로)', () => {
    const result = orderRegistrationSchema.safeParse(baseUps());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.recipient_country_code).toBe('US');
  });
});
