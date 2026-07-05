import { orderRegistrationSchema } from '@/lib/validation/order';

describe('TC-P7-ORDER-AGENCYID-01: orderRegistrationSchema — ups_product_code + incoterms 필드 허용', () => {
  const basePayload = {
    order_type: 'B2B' as const,
    shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
    origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
    dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
    recipient_name: 'Test Recipient',
    recipient_address: '123 Test St',
    recipient_phone: '1234567890',
    packages: [{ packing_unit: 'BOX', packing_count: 1, gross_weight: 10, items: [{ item_name: 'Widget', quantity: 1, unit_price: 0, currency: 'USD', item_packing_unit: 'UNIT' }] }],
  };

  it('should accept optional ups_product_code and incoterms fields', () => {
    const result = orderRegistrationSchema.safeParse({
      ...basePayload,
      ups_product_code: 'WW_EXPEDITED',
      incoterms: 'DDP',
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid input without ups_product_code', () => {
    const result = orderRegistrationSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
  });

  it('should reject invalid incoterms value', () => {
    const result = orderRegistrationSchema.safeParse({
      ...basePayload,
      incoterms: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});

describe('TC-P7-ORDER-SNAPSHOT-01: orderRegistrationSchema — ups_product_code 다양한 값 허용', () => {
  const basePayload = {
    order_type: 'B2B' as const,
    shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
    origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
    dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
    recipient_name: 'Test Recipient',
    recipient_address: '123 Test St',
    recipient_phone: '1234567890',
    packages: [{ packing_unit: 'BOX', packing_count: 1, gross_weight: 10, items: [{ item_name: 'Widget', quantity: 1, unit_price: 0, currency: 'USD', item_packing_unit: 'UNIT' }] }],
  };

  it('should accept WW_EXPEDITED product code', () => {
    const result = orderRegistrationSchema.safeParse({ ...basePayload, ups_product_code: 'WW_SAVER' });
    expect(result.success).toBe(true);
  });

  it('should accept WW_EXPEDITED_MAX product code', () => {
    const result = orderRegistrationSchema.safeParse({ ...basePayload, ups_product_code: 'WW_EXPEDITED_MAX' });
    expect(result.success).toBe(true);
  });
});

describe('TC-P7-ORDER-SNAPSHOT-02: orderRegistrationSchema — incoterms DDU 허용', () => {
  const basePayload = {
    order_type: 'B2B' as const,
    shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
    origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
    dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
    recipient_name: 'Test Recipient',
    recipient_address: '123 Test St',
    recipient_phone: '1234567890',
    packages: [{ packing_unit: 'BOX', packing_count: 1, gross_weight: 10, items: [{ item_name: 'Widget', quantity: 1, unit_price: 0, currency: 'USD', item_packing_unit: 'UNIT' }] }],
  };

  it('should accept DDU incoterms', () => {
    const result = orderRegistrationSchema.safeParse({ ...basePayload, incoterms: 'DDU' });
    expect(result.success).toBe(true);
  });
});
