import { describe, it, expect, vi, beforeEach } from 'vitest';
import { payInvoiceFromWallet, getWalletBalance } from '@/app/actions/wallet';
import { createClient } from '@/utils/supabase/server';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

describe('Wallet Server Actions', () => {
  let mockSupabase: any;
  const mockUser = { id: 'user-123' };
  const mockProfile = { id: 'user-123', org_id: 'org-456' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Define sub-mocks for different chains
    const updateChain = {
      eq: vi.fn().mockResolvedValue({ error: null })
    };
    
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn()
    };

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation((data) => {
        // If it's a simple insert with no chain
        if (data && (data.wallet_id || data.type)) return Promise.resolve({ error: null });
        return insertChain;
      }),
      update: vi.fn().mockReturnValue(updateChain),
      single: vi.fn(),
    };

    // Ensure createClient always returns mockSupabase
    (createClient as any).mockImplementation(() => Promise.resolve(mockSupabase));
    (validateUserAction as any).mockResolvedValue({ 
      supabase: mockSupabase, 
      user: mockUser, 
      profile: mockProfile 
    });
    (validateAdminAction as any).mockResolvedValue({ 
      supabase: mockSupabase, 
      user: mockUser, 
      profile: mockProfile 
    });
  });

  it('WAL-01: should return wallet balance and create wallet if not exists (Lazy Init)', async () => {
    // 1. Initial find wallet -> not found
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    
    // 2. Insert chain's single() -> success
    // We need to target the insertChain's single
    (mockSupabase.insert() as any).single.mockResolvedValueOnce({ 
      data: { balance: 0, currency: 'KRW', id: 'w-1' }, 
      error: null 
    });
    
    const result = await getWalletBalance();
    
    expect(result.balance).toBe(0);
  });

  it('WAL-04: should successfully pay invoice from wallet and update balance/invoice status', async () => {
    // 1. Get invoice info
    mockSupabase.single.mockResolvedValueOnce({ 
      data: { id: 'inv-123', invoice_no: 'INV-001', total_amount: 5000, currency: 'KRW', status: 'UNPAID', shipper_id: 'org-456' }, 
      error: null 
    });

    // 2. Wallet found
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'wallet-123', balance: 10000 }, error: null });
    
    // The updateChain and simple insert mocks are already set up to return success
    const result = await payInvoiceFromWallet('inv-123');
    
    expect(result.success).toBe(true);
    expect(mockSupabase.update).toHaveBeenCalledWith({ balance: 5000 });
  });

  it('WAL-04: should fail payment if balance is insufficient', async () => {
    // 1. Get invoice info
    mockSupabase.single.mockResolvedValueOnce({ 
      data: { id: 'inv-123', total_amount: 5000, currency: 'KRW', status: 'UNPAID', shipper_id: 'org-456' }, 
      error: null 
    });

    // 2. Insufficient balance
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'wallet-123', balance: 1000 }, error: null });

    const result = await payInvoiceFromWallet('inv-123');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_BALANCE');
  });

  it('WAL-04: should fail payment if invoice is already paid', async () => {
    // 1. Get invoice info (Already PAID)
    mockSupabase.single.mockResolvedValueOnce({ 
      data: { id: 'inv-123', total_amount: 5000, currency: 'KRW', status: 'PAID', shipper_id: 'org-456' }, 
      error: null 
    });

    await expect(payInvoiceFromWallet('inv-123')).rejects.toThrow("이미 결제된 인보이스입니다.");
  });
});
