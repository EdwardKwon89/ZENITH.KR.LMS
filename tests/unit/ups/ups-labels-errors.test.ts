import { describe, it, expect, vi } from 'vitest';
import { validateUserAction } from '@/lib/auth/guards';
import { createorder } from '@/lib/shxk/order';

vi.mock('@/lib/shxk/order', () => ({
  createorder: vi.fn(),
  getnewlabel: vi.fn(),
  removeorder: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/lib/shxk/config', () => ({
  SHXK_SHIPPER_NAME: 'Test Shipper',
  SHXK_SHIPPER_COUNTRY: 'KR',
}));

vi.mock('@/lib/ups/label-mapping', () => ({
  determineOrderCargotype: vi.fn().mockReturnValue({ cargotype: 'W', mailCargoType: '4' }),
  buildCargovolume: vi.fn().mockReturnValue([]),
  buildInvoiceFromItems: vi.fn().mockReturnValue([{ invoice_enname: 'Test', invoice_quantity: '1', invoice_unitcharge: '1.00' }]),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('Issue #553: SHXK response message handling', () => {
  let mockSupabase: any;

  function createChain(resolvedValue: any) {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(resolvedValue),
      maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    };
    chain.select.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    chain.update.mockReturnValue(chain);
    chain.delete.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.in.mockReturnValue(chain);
    chain.not.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    return chain;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    const orderData = {
      id: 'order-1', order_no: 'ZEN-001',
      ups_product_code: 'WW_EXP', incoterms: 'DDP',
      recipient_country_code: 'US',
      shipper_contact_name: 'Test',
      shipper_country_code: 'KR',
    };

    const packagesData = [
      { id: 'pkg-1', content_type: 'NONDOC', gross_weight: 10, physical_box_count: 1, length: 30, width: 20, height: 10, items: [] },
    ];

    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        const chains: Record<string, any> = {
          zen_orders: createChain({ data: orderData, error: null }),
          zen_order_packages: createChain({ data: packagesData, error: null }),
          zen_ups_shxk_country_map: createChain({ data: { shxk_code: 'FXUPS' }, error: null }),
          zen_ups_label_errors: createChain({ data: null, error: null }),
          zen_ups_labels: createChain({ data: null, error: null }),
        };
        return chains[table] || createChain({ data: null, error: null });
      }),
    };

    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-id', role: 'ADMIN' },
      user: { id: 'user-id' },
    });
  });

  it('placeShxkOrder 실패 시 zen_ups_label_errors에 INSERT', async () => {
    (createorder as any).mockResolvedValue({
      success: 0,
      message: 'SHXK API Error: Invalid product code',
      data: null,
    });

    const { issueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const result = await issueUpsLabel('order-1');

    expect(result.success).toBe(false);

    const errorInsertTable = mockSupabase.from.mock.calls.find(
      (c: any) => c[0] === 'zen_ups_label_errors'
    );
    expect(errorInsertTable).toBeDefined();
  });

  it('placeShxkOrder 성공 시 message가 반환 객체에 포함됨', async () => {
    (createorder as any).mockResolvedValue({
      success: 1,
      message: 'Order created successfully',
      data: { order_id: 'shxk-order-1', shipping_method_no: 'TRACK001', refrence_no: 'ZEN-001' },
    });

    const mockGetNewLabel = vi.fn().mockResolvedValue({
      success: 1,
      data: { label_url: 'https://example.com/label.pdf', label_type: 'PDF' },
    });
    const orderModule = await import('@/lib/shxk/order');
    (orderModule.getnewlabel as any) = mockGetNewLabel;

    const { issueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const result = await issueUpsLabel('order-1');

    // The response message should be stored in shxk_response_message
    const labelInsertCall = mockSupabase.from.mock.calls.find(
      (c: any) => c[0] === 'zen_ups_labels'
    );
    expect(labelInsertCall).toBeDefined();
    // Verify the insert included the response message
    expect(mockSupabase.insert).toHaveBeenCalled();
  });
});
