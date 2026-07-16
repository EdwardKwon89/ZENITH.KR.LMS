import { describe, it, expect, vi, beforeEach } from 'vitest';
import { issueUpsLabel, voidUpsLabel } from '@/app/actions/operations/ups-labels';
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

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('Issue #553: SHXK response message handling', () => {
  let mockSupabase: any;
  let mockValidateUserAction: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };

    mockValidateUserAction = vi.fn().mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-id', role: 'ADMIN' },
      user: { id: 'user-id' },
    });

    const guards = require('@/lib/auth/guards');
    guards.validateUserAction = mockValidateUserAction;
  });

  it('placeShxkOrder 실패 시 zen_ups_label_errors에 INSERT', async () => {
    // Mock createorder to fail
    (createorder as any).mockResolvedValue({
      success: 0,
      message: 'SHXK API Error: Invalid product code',
      data: null,
    });

    // Mock lookup to return an order with packages
    mockSupabase.single
      .mockResolvedValueOnce({ data: { id: 'order-1', order_no: 'ZEN-001', ups_product_code: 'WW_EXP', incoterms: 'DDP', recipient_country_code: 'US' }, error: null });

    mockSupabase.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })  // resolveShxkCode
      .mockResolvedValueOnce({ data: { id: 'rate-1', shxk_code: 'FXUPS' }, error: null });  // shxk map

    // Mock packages query
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'zen_orders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'order-1', order_no: 'ZEN-001', ups_product_code: 'WW_EXP', incoterms: 'DDP', recipient_country_code: 'US' },
            error: null,
          }),
        };
      }
      if (table === 'zen_order_packages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
        };
      }
      if (table === 'zen_ups_shxk_country_map') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { shxk_code: 'FXUPS' },
            error: null,
          }),
        };
      }
      return mockSupabase;
    });

    const result = await issueUpsLabel('order-1');

    expect(result.success).toBe(false);
    // Should have inserted into zen_ups_label_errors
    const insertCalls = mockSupabase.insert.mock.calls;
    const errorInsert = insertCalls.find((call: any) => call[0]?.error_message);
    expect(errorInsert).toBeDefined();
    if (errorInsert) {
      expect(errorInsert[0].error_message).toContain('SHXK API Error');
    }
  });
});
