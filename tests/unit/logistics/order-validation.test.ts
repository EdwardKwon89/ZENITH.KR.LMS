import { describe, it, expect } from 'vitest';
import { orderRegistrationSchema, orderItemSchema } from '@/lib/validation/order';

describe('ZENITH Order Integrity: Registration Schema Validation', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  
  const validPayload = {
    order_type: 'B2B',
    shipper_id: validUUID,
    origin_port_id: validUUID,
    dest_port_id: validUUID,
    recipient_name: 'Hong Gil-dong',
    recipient_address: '123 Zenith St, Seoul',
    recipient_phone: '010-1234-5678',
    packages: [
      {
        packing_unit: 'BOX',
        packing_count: 1,
        gross_weight: 10.5,
        items: [
          {
            item_name: 'Industrial Robot Arm',
            quantity: 2,
            unit_price: 15000,
          }
        ]
      }
    ]
  };

  it('TC-O.1: 유효한 데이터 입력 시 검증을 통과해야 함', () => {
    const result = orderRegistrationSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('TC-O.1: 필수 항목(shipper_id) 누락 시 검증에 실패해야 함 (Negative)', () => {
    const invalidPayload = { ...validPayload, shipper_id: undefined };
    const result = orderRegistrationSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('TC-O.1: 부적절한 이메일 형식 입력 시 검증에 실패해야 함 (Negative)', () => {
    const invalidPayload = { ...validPayload, recipient_email: 'invalid-email-format' };
    const result = orderRegistrationSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('TC-O.1: 패키지가 최소 1개 이상 존재해야 함', () => {
    const invalidPayload = { ...validPayload, packages: [] };
    const result = orderRegistrationSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
  
  it('TC-O.2: 송하인 담당자 정보 및 비고 필드가 포함된 경우 통과해야 함 (v2)', () => {
    const payloadWithNewFields = {
      ...validPayload,
      shipper_contact_name: 'Manager Kim',
      shipper_contact_phone: '010-9999-8888',
      description: 'Handle with care. Fragile items inside.'
    };
    const result = orderRegistrationSchema.safeParse(payloadWithNewFields);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shipper_contact_name).toBe('Manager Kim');
      expect(result.data.shipper_contact_phone).toBe('010-9999-8888');
      expect(result.data.description).toContain('Fragile');
    }
  });

  it('TC-O.3: 송하인 정보가 누락되어도 optional이므로 통과해야 함 (v2)', () => {
    const payloadWithoutNewFields = { ...validPayload };
    const result = orderRegistrationSchema.safeParse(payloadWithoutNewFields);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shipper_contact_name).toBeUndefined();
    }
  });

  it('TC-O.4: [Negative] 패키지 중량 또는 아이템 수량이 0 이하일 때 실패해야 함', () => {
    const invalidPayload = JSON.parse(JSON.stringify(validPayload));
    invalidPayload.packages[0].gross_weight = -1;
    invalidPayload.packages[0].items[0].quantity = 0;

    const result = orderRegistrationSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('TC-O.5: [Negative] 필수 수취인 정보(name, address) 누락 시 실패해야 함', () => {
    const invalidPayload = { ...validPayload, recipient_name: '', recipient_address: undefined };
    const result = orderRegistrationSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});

describe('DEF-105: Item name English-only validation', () => {
  it('한글 품명(청바지) → safeParse 실패, item_name 경로 에러', () => {
    const result = orderItemSchema.safeParse({ item_name: '청바지', quantity: 1, unit_price: 100 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('item_name');
    }
  });

  it('영문 품명(Jeans) → success: true', () => {
    const result = orderItemSchema.safeParse({ item_name: 'Jeans', quantity: 1, unit_price: 100 });
    expect(result.success).toBe(true);
  });

  it('영문+숫자+일반기호 혼합 → success: true', () => {
    const result = orderItemSchema.safeParse({ item_name: "Men's T-Shirt (Size L) #123", quantity: 1, unit_price: 100 });
    expect(result.success).toBe(true);
  });

  it('빈 문자열 → min(1) 검증 실패', () => {
    const result = orderItemSchema.safeParse({ item_name: '', quantity: 1, unit_price: 100 });
    expect(result.success).toBe(false);
  });

  it('한글+영문 혼합 → 실패', () => {
    const result = orderItemSchema.safeParse({ item_name: 'Jean청바지', quantity: 1, unit_price: 100 });
    expect(result.success).toBe(false);
  });
});
