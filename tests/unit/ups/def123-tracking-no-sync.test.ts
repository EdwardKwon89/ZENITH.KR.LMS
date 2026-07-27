import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/shxk/client', () => ({ callShxk: vi.fn() }));

const mockPlaceShxkOrder = vi.fn();
vi.mock('@/lib/shxk/order', () => ({
  createorder: (...args: any[]) => mockPlaceShxkOrder(...args),
  getnewlabel: vi.fn(),
  removeorder: vi.fn(),
}));

vi.mock('@/lib/ups/label-mapping', () => ({
  buildCreateOrderPayload: vi.fn().mockReturnValue({ reference_no: 'TEST001', shipper: {}, consignee: {}, cargovolume: [], invoice: [] }),
  determineOrderCargotype: vi.fn().mockReturnValue({ cargotype: 'W', mailCargoType: '4' }),
  buildCargovolume: vi.fn().mockReturnValue([]),
  buildInvoiceFromItems: vi.fn().mockReturnValue([]),
  resolveShipperStreet: vi.fn().mockReturnValue(''),
}));

const mockValidateUserAction = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: (...args: any[]) => mockValidateUserAction(...args),
}));

function createMockSupabase() {
  const trackingConfigUpdateFn = vi.fn().mockReturnThis();
  const trackingConfigEqFn = vi.fn().mockResolvedValue({ error: null });

  const trackingConfigChain = {
    update: trackingConfigUpdateFn,
    eq: trackingConfigEqFn,
  };
  trackingConfigUpdateFn.mockReturnValue(trackingConfigChain);

  const chain: any = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn((table: string) => {
      if (table === 'zen_tracking_configs') {
        return {
          update: trackingConfigUpdateFn,
          eq: trackingConfigEqFn,
        };
      }
      if (table === 'zen_orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'order-1',
              order_no: 'ORD-001',
              recipient_country_code: 'US',
              dest_port_id: 'port-1',
              ups_product_code: 'STD',
              incoterms: 'DAP',
              shipper_id: 'org-1',
            },
            error: null,
          }),
        };
      }
      if (table === 'zen_order_packages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'pkg-1', order_id: 'order-1', items: [] }],
            error: null,
          }),
        };
      }
      if (table === 'zen_ports') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { country_code: 'US' },
            error: null,
          }),
        };
      }
      if (table === 'zen_ups_shxk_country_map') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { shxk_code: 'UPS_STD' },
            error: null,
          }),
        };
      }
      if (table === 'zen_ups_labels') {
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: null }),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'label-1', reference_no: 'REF-001', tracking_number: null, is_voided: false },
            error: null,
          }),
        };
      }
      if (table === 'zen_ups_label_errors') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: any, reject: any) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
      };
    }),
  };

  return { chain, trackingConfigUpdateFn, trackingConfigEqFn, trackingConfigChain };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPlaceShxkOrder.mockResolvedValue({
    success: 1,
    data: {
      order_id: 'SHXK-001',
      shipping_method_no: '1Z999AA10123456784',
      reference_no: 'REF-001',
    },
  });
});

describe('TASK-B-195: DEF-123 registerUpsOrder 시 tracking_configs.tracking_no 갱신', () => {
  it('trackingNo가 있으면 zen_tracking_configs.tracking_no를 갱신한다', async () => {
    const { chain, trackingConfigUpdateFn, trackingConfigEqFn } = createMockSupabase();

    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    });

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder('order-1');

    if (!result.success) {
      console.log('registerUpsOrder failed:', result.error);
    }

    expect(result.success).toBe(true);
    expect(result.data?.tracking_number).toBe('1Z999AA10123456784');

    expect(trackingConfigUpdateFn).toHaveBeenCalledWith({
      tracking_no: '1Z999AA10123456784',
      updated_at: expect.any(String),
    });
    expect(trackingConfigEqFn).toHaveBeenCalledWith('order_id', 'order-1');
  });

  it('trackingNo가 null이면 zen_tracking_configs를 갱신하지 않는다', async () => {
    mockPlaceShxkOrder.mockResolvedValue({
      success: 1,
      data: {
        order_id: 'SHXK-002',
        shipping_method_no: null,
        reference_no: 'REF-002',
      },
    });

    const { chain, trackingConfigUpdateFn } = createMockSupabase();

    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    });

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder('order-1');

    expect(result.success).toBe(true);
    expect(trackingConfigUpdateFn).not.toHaveBeenCalled();
  });
});
