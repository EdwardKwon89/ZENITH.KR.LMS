import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock fs module BEFORE importing createVoc
vi.mock('fs', () => ({
  default: { appendFileSync: vi.fn() },
  appendFileSync: vi.fn(),
}));

import { createVoc } from '../../../src/app/actions/voc';
import { validateUserAction } from '../../../src/lib/auth/guards';

// Mock the auth guards
vi.mock('../../../src/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

// Mock fs module
vi.mock('fs', () => ({
  default: {
    appendFileSync: vi.fn(),
  },
  appendFileSync: vi.fn(),
}));

describe('VOC Action Unit Tests', () => {
  let mockSupabase: any;
  let mockUser: any;
  let mockProfile: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };

    mockUser = { id: 'test-user-id' };
    mockProfile = { id: 'test-user-id', org_id: 'test-org-id', role: 'CORPORATE' };

    (validateUserAction as any).mockResolvedValue({
      supabase: mockSupabase,
      user: mockUser,
      profile: mockProfile,
    });
  });

  it('should create a VOC successfully when user has ownership of the order', async () => {
    // 1. Mock Order Ownership Check
    mockSupabase.single.mockResolvedValueOnce({
      data: { order_no: 'ORD-1001', org_id: 'test-org-id', shipper_id: 'test-org-id' },
      error: null
    });

    // 2. Mock VOC Insertion
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'voc-123' },
      error: null
    });

    // 3. Mock Admin Notification Search
    mockSupabase.in.mockResolvedValueOnce({
      data: [{ id: 'admin-1' }],
      error: null
    });

    const payload = {
      order_id: '550e8400-e29b-41d4-a716-446655440001',
      type: 'DELAY' as const,
      title: 'Test VOC Title',
      description: 'Test VOC Description'
    };

    // Act
    const result = await createVoc(payload);

    // Assert
    expect(result.data).toBe('voc-123');
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_voc');
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      order_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test VOC Title',
      status: 'OPEN'
    }));
  });

  it('should throw error when user tries to create VOC for an order they do not own', async () => {
    // Mock Order with DIFFERENT org_id
    mockSupabase.single.mockResolvedValueOnce({
      data: { order_no: 'ORD-1002', org_id: 'other-org-id', shipper_id: 'other-org-id' },
      error: null
    });

    const payload = {
      order_id: '550e8400-e29b-41d4-a716-446655440002',
      type: 'DAMAGE' as const,
      title: 'Hack Attempt',
      description: 'Trying to post VOC to other org order'
    };

    // Act & Assert
    const result = await createVoc(payload);
    expect(result.data).toBeNull();
    expect(result.error).toContain('UNAUTHORIZED');
  });
});
