import { describe, it, expect, vi, beforeEach } from 'vitest';
import { issueTaxInvoice, sendTaxInvoiceEmail, getTaxInvoiceHistory } from '@/app/actions/finance';
import { validateAdminAction, validateUserAction } from '@/lib/auth/guards';

// Set environment variable
process.env.RESEND_API_KEY = 're_test_123';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

// Mock Resend correctly for vitest to handle it as a class/constructor
vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: vi.fn().mockResolvedValue({ data: { id: 'msg-123' }, error: null }),
      };
    }
  };
});

// Create a stable mock factory
const createMockSupabase = () => {
  const mock: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.insert.mockReturnValue(mock);
  mock.update.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  mock.order.mockReturnValue(mock);
  return mock;
};

let activeMockSupabase = createMockSupabase();

vi.mock('@/lib/supabase', () => ({
  get supabase() { return activeMockSupabase; }
}));

describe('FIN-03 Tax Invoice Regression Tests', () => {
  const mockAdmin = { id: 'admin-1', org_id: 'zenith-hq', role: 'ADMIN' };
  const mockUser = { id: 'user-1', org_id: 'shipper-1', role: 'USER' };

  beforeEach(() => {
    vi.clearAllMocks();
    activeMockSupabase = createMockSupabase();
    (global as any).mockSupabase = activeMockSupabase;
  });

  describe('TC-F.7: issueTaxInvoice', () => {
    it('should successfully issue a tax invoice', async () => {
      (validateAdminAction as any).mockResolvedValue({ supabase: activeMockSupabase, profile: mockAdmin });
      
      activeMockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'inv-1',
          shipper_id: 'shipper-1',
          total_amount: 110000,
          shipper: { business_number: '111-22-33333', name: 'Shipper Co', address: 'Seoul' },
          costs: [{ cost_type: 'Freight', quantity: 1, unit_price: 100000 }]
        },
        error: null
      });
      activeMockSupabase.single.mockResolvedValueOnce({
        data: { value_numeric: 0.1 },
        error: null
      });
      activeMockSupabase.single.mockResolvedValueOnce({
        data: { value_numeric: 1350 },
        error: null
      });
      activeMockSupabase.single.mockResolvedValueOnce({
        data: { id: 'tax-inv-1' },
        error: null
      });

      const result = await issueTaxInvoice('inv-1');
      expect(result.success).toBe(true);
      expect(result.taxInvoiceId).toBe('tax-inv-1');
    });
  });

  describe('TC-F.8: sendTaxInvoiceEmail', () => {
    it('should successfully send an email and update status', async () => {
      (validateAdminAction as any).mockResolvedValue({ supabase: activeMockSupabase, profile: mockAdmin });

      activeMockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'tax-inv-1',
          tax_invoice_no: 'TX-20260424-1234',
          buyer_info: { name: 'Shipper Co' },
          total_amount: 110000,
          metadata: {}
        },
        error: null
      });

      const result = await sendTaxInvoiceEmail('tax-inv-1', 'test@example.com');
      expect(result.success).toBe(true);
      expect(activeMockSupabase.update).toHaveBeenCalled();
    });
  });

  describe('TC-F.9: getTaxInvoiceHistory', () => {
    it('should retrieve history for an invoice', async () => {
      (validateUserAction as any).mockResolvedValue({ supabase: activeMockSupabase, profile: mockUser });

      activeMockSupabase.order.mockResolvedValueOnce({
        data: [
          { id: 'tax-inv-1', status: 'SENT', issued_at: new Date().toISOString() }
        ],
        error: null
      });

      const result = await getTaxInvoiceHistory('inv-1');
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('SENT');
    });
  });
});
