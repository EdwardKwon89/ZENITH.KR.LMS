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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveOrderRateSnapshot } from '@/app/actions/operations/orders';
import { estimateUpsFreight } from '@/app/actions/ups/freight';

vi.mock('@/app/actions/ups/freight', () => ({
  estimateUpsFreight: vi.fn(),
}));

describe('TC-P7-ORDER-SNAPSHOT-03: saveOrderRateSnapshot — DB 조회 + estimateUpsFreight 호출 + 스냅샷 INSERT 검증', () => {
  const mockProduct = { id: 'prod-1111-2222' };
  const mockPort = { country_code: 'US' };
  const mockEstimate = {
    platform: { totalSellingPrice: 150.00, currency: 'USD' },
    agency: { agencySellingPrice: 135.00 },
    shipper: { finalFreight: 128.25 },
  };
  const mockOrderId = 'order-1234-5678';
  const mockAgencyOrgId = 'agency-org-id-mock';

  let mockSupabase: any;
  let mockInsertTable: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInsertTable = {
      insert: vi.fn().mockReturnThis(),
    };

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'zen_ups_products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
          };
        }
        if (table === 'zen_ports') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockPort, error: null }),
          };
        }
        if (table === 'zen_order_rate_snapshots') {
          return mockInsertTable;
        }
        if (table === 'zen_agency_shippers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { agency_org_id: mockAgencyOrgId }, error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(), insert: vi.fn() };
      }),
    };

    (estimateUpsFreight as any).mockResolvedValue(mockEstimate);
  });

  it('정상 입력: 제품 존재 + 포트 존재 → estimateUpsFreight 호출 + 스냅샷 INSERT', async () => {
    const validated = {
      ups_product_code: 'WW_EXPEDITED',
      packages: [{ packing_unit: 'BOX', packing_count: 2, gross_weight: 5 }],
      dest_port_id: 'port-us-001',
    } as any;

    const profile = { org_id: 'agency-org-001', role: 'AGENCY_SHIPPER' };

    await saveOrderRateSnapshot({
      supabase: mockSupabase,
      orderId: mockOrderId,
      validated,
      profile,
      agencyOrgId: mockAgencyOrgId,
      estimateFn: estimateUpsFreight,
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_products');
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_ports');
    expect(estimateUpsFreight).toHaveBeenCalledWith({
      productId: mockProduct.id,
      destCountryCode: mockPort.country_code,
      actualWeightKg: 10,
      dimL: undefined,
      dimW: undefined,
      dimH: undefined,
      incoterms: undefined,
      agencyOrgId: mockAgencyOrgId,
      shipperOrgId: profile.org_id,
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_order_rate_snapshots');
    expect(mockInsertTable.insert).toHaveBeenCalledWith({
      order_id: mockOrderId,
      applied_unit_price: 150.00,
      applied_currency: 'USD',
      applied_rule: 'UPS_3TIER',
      metadata: mockEstimate,
    });
  });

  it('제품 미존재: maybeSingle null → early return, snapshot 미저장', async () => {
    const emptyProduct = vi.fn().mockResolvedValue({ data: null, error: null });
    const localSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'zen_ups_products') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: emptyProduct };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn() };
      }),
    };

    await saveOrderRateSnapshot({
      supabase: localSupabase,
      orderId: mockOrderId,
      validated: { ups_product_code: 'UNKNOWN', packages: [{ packing_unit: 'BOX', packing_count: 1, gross_weight: 10 }], dest_port_id: 'x' } as any,
      profile: { org_id: 'a', role: 'AGENCY_SHIPPER' },
      estimateFn: estimateUpsFreight as any,
    });

    expect(estimateUpsFreight).not.toHaveBeenCalled();
  });
});
