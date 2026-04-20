import { describe, it, expect } from 'vitest';
import { orderRegistrationSchema } from '@/lib/validation/order';

describe('ZENITH Order Integrity: Registration Schema Validation', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  
  const validPayload = {
    order_type: 'B2B',
    shipper_id: validUUID,
    origin_port_id: validUUID,
    dest_port_id: validUUID,
    items: [
      {
        item_name: 'Industrial Robot Arm',
        quantity: 2,
        unit_price: 15000,
        weight: 500.5,
        volume: 2.1,
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

  it('TC-O.1: 아이템이 최소 1개 이상 존재해야 함', () => {
    const invalidPayload = { ...validPayload, items: [] };
    const result = orderRegistrationSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});
