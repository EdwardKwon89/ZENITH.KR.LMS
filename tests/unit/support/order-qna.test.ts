import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getOrderQnaList } from '../../../src/app/actions/support';
import { validateUserAction } from '../../../src/lib/auth/guards';

// Mock the auth guards
vi.mock('../../../src/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

describe('Order-linked QnA Unit Tests', () => {
  let mockSupabase: any;
  let mockUser: any;
  let mockProfile: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };

    mockUser = { id: 'test-user-id' };
    mockProfile = { id: 'test-user-id', org_id: 'test-org-id', role: 'CORPORATE' };

    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: mockUser,
      profile: mockProfile,
    });
  });

  it('TC-ORD-QNA-01: should filter QnA by specific orderId', async () => {
    mockSupabase.range.mockResolvedValueOnce({
      data: [
        { 
          id: 'qna-1', 
          order_id: 'order-123',
          order: { order_no: 'ORD-123' }, 
          answer_count: [{ count: 1 }] 
        }
      ],
      error: null,
      count: 1
    });

    const result = await getOrderQnaList('order-123');
    
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_qna');
    expect(mockSupabase.eq).toHaveBeenCalledWith('order_id', 'order-123');
    expect(result.qnas).toHaveLength(1);
    expect(result.qnas[0].order_no).toBe('ORD-123');
    expect(result.qnas[0].answer_count).toBe(1);
  });

  it('TC-ORD-QNA-02: should filter by org_id for non-admin users', async () => {
    mockSupabase.range.mockResolvedValueOnce({
      data: [],
      error: null,
      count: 0
    });

    await getOrderQnaList('order-123');
    
    // Check if org_id filter was applied
    expect(mockSupabase.eq).toHaveBeenCalledWith('org_id', 'test-org-id');
  });

  it('TC-ORD-QNA-03: should NOT filter by org_id for admin users', async () => {
    const adminProfile = { ...mockProfile, role: 'ADMIN' };
    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: mockUser,
      profile: adminProfile,
    });

    mockSupabase.range.mockResolvedValueOnce({
      data: [],
      error: null,
      count: 0
    });

    await getOrderQnaList('order-123');
    
    // eq('org_id', ...) should NOT be called
    const eqCalls = mockSupabase.eq.mock.calls;
    const orgIdCall = eqCalls.find((call: any) => call[0] === 'org_id');
    expect(orgIdCall).toBeUndefined();
  });
});
