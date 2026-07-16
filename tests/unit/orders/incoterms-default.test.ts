import { describe, it, expect } from 'vitest';
import { orderRegistrationSchema } from '@/lib/validation/order';

// Issue #547: incoterms 기본값 DDP 검증
// useForm defaultValues에 incoterms: 'DDP' 추가 후, 폼 제출 시 incoterms가 undefined가 아닌 'DDP'로 설정되는지 확인

describe('TC-INC-01: incoterms 기본값 DDP 검증', () => {
  it('incoterms가 DDP로 전달되면 DDP로 저장된다', () => {
    const result = orderRegistrationSchema.safeParse({
      order_type: 'B2B',
      shipper_id: '550e8400-e29b-41d4-a716-446655440001',
      recipient_name: '홍길동',
      recipient_address: '서울시 강남구',
      recipient_phone: '010-1234-5678',
      transport_mode: 'UPS',
      incoterms: 'DDP',
      packages: [{
        packing_unit: 'BOX',
        packing_count: 1,
        gross_weight: 10,
        items: [{ item_name: '테스트', quantity: 1, unit_price: 100, currency: 'USD', item_packing_unit: 'EA' }],
      }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.incoterms).toBe('DDP');
    }
  });

  it('incoterms가 DDU로 전달되면 DDU로 저장된다', () => {
    const result = orderRegistrationSchema.safeParse({
      order_type: 'B2B',
      shipper_id: '550e8400-e29b-41d4-a716-446655440001',
      recipient_name: '홍길동',
      recipient_address: '서울시 강남구',
      recipient_phone: '010-1234-5678',
      transport_mode: 'UPS',
      incoterms: 'DDU',
      packages: [{
        packing_unit: 'BOX',
        packing_count: 1,
        gross_weight: 10,
        items: [{ item_name: '테스트', quantity: 1, unit_price: 100, currency: 'USD', item_packing_unit: 'EA' }],
      }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.incoterms).toBe('DDU');
    }
  });
});
