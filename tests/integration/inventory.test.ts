import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adjustInventory, syncInventoryFromOrder } from '@/app/actions/inventory';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { OrderStatus } from '@/types/orders';

// Mock Dependencies
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

describe('ZENITH Inventory Integration', () => {
  const mockUser = { id: 'user-1' };
  const mockProfile = { id: 'profile-1', org_id: 'org-1', role: 'ADMIN' };
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
    };

    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: mockProfile,
      supabase: mockSupabase
    });

    (validateAdminAction as any).mockResolvedValue({
      user: mockUser,
      profile: mockProfile,
      supabase: mockSupabase
    });
  });

  describe('adjustInventory', () => {
    it('should successfully adjust inventory and log history', async () => {
      // Mock existing inventory item
      mockSupabase.single.mockResolvedValueOnce({
        data: { on_hand_qty: 100 },
        error: null
      });

      // Mock successful update
      mockSupabase.update.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValueOnce({ error: null })
      });
      // Mock successful history insert
      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      const result = await adjustInventory({
        inventoryId: '123e4567-e89b-12d3-a456-426614174000',
        adjustmentQty: 50,
        reason: 'Restock'
      });

      expect(result.success).toBe(true);
      expect(result.finalQty).toBe(150);

      // Verify history insertion was called with correct data
      expect(mockSupabase.from).toHaveBeenCalledWith('zen_inventory_history');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        transaction_type: 'ADJUSTMENT',
        change_qty: 50,
        result_qty: 150
      }));
    });

    it('should prevent negative inventory adjustment', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { on_hand_qty: 10 },
        error: null
      });

      const result = await adjustInventory({
        inventoryId: '123e4567-e89b-12d3-a456-426614174000',
        adjustmentQty: -20,
        reason: 'Damage'
      });
      expect(result).toEqual({ success: false, error: '재고 수량은 0 미만이 될 수 없습니다.' });
    });
  });

  describe('syncInventoryFromOrder', () => {
    it('should reserve inventory on order REGISTERED', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: [{ sku_code: 'SKU-001', quantity: 10 }],
        error: null
      }); // order items
      
      mockSupabase.in.mockResolvedValue({
        data: [{ id: 'inv-1', sku_code: 'SKU-001', reserved_qty: 5, on_hand_qty: 100 }],
        error: null
      }); // inventory batch

      await syncInventoryFromOrder('order-1', OrderStatus.REGISTERED);

      // Verify update payload for reserved_qty
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        reserved_qty: 15
      }));

      // Verify history payload
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        transaction_type: 'RESERVATION',
        change_qty: 10,
        result_qty: 100
      }));
    });

    it('should reduce inventory on order RELEASED', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: [{ sku_code: 'SKU-002', quantity: 5 }],
        error: null
      }); // order items
      
      mockSupabase.in.mockResolvedValue({
        data: [{ id: 'inv-2', sku_code: 'SKU-002', reserved_qty: 20, on_hand_qty: 50 }],
        error: null
      }); // inventory batch

      await syncInventoryFromOrder('order-2', OrderStatus.RELEASED);

      // Verify update payload for on_hand and reserved
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        on_hand_qty: 45,
        reserved_qty: 15
      }));

      // Verify history payload
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        transaction_type: 'OUTBOUND',
        change_qty: -5,
        result_qty: 45
      }));
    });

    it('should restore on_hand and reserved on order CANCELED from WAREHOUSED', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: [{ sku_code: 'SKU-003', quantity: 8 }],
        error: null
      }); // order items
      
      mockSupabase.in.mockResolvedValue({
        data: [{ id: 'inv-3', sku_code: 'SKU-003', reserved_qty: 10, on_hand_qty: 100 }],
        error: null
      }); // inventory batch

      await syncInventoryFromOrder('order-3', OrderStatus.CANCELED, undefined, OrderStatus.WAREHOUSED);

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        on_hand_qty: 92,
        reserved_qty: 2
      }));

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        transaction_type: 'ADJUSTMENT',
        change_qty: -8,
        result_qty: 92
      }));
    });

    it('should restore on_hand on order CANCELED from RELEASED', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: [{ sku_code: 'SKU-004', quantity: 5 }],
        error: null
      }); // order items
      
      mockSupabase.in.mockResolvedValue({
        data: [{ id: 'inv-4', sku_code: 'SKU-004', reserved_qty: 0, on_hand_qty: 50 }],
        error: null
      }); // inventory batch

      await syncInventoryFromOrder('order-4', OrderStatus.CANCELED, undefined, OrderStatus.RELEASED);

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        on_hand_qty: 55
      }));

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        transaction_type: 'INBOUND',
        change_qty: 5,
        result_qty: 55
      }));
    });

    it('should query order_status_history as fallback if prevStatus is not provided on CANCELED', async () => {
      let lastTable = '';
      mockSupabase.from.mockImplementation((table: string) => {
        lastTable = table;
        return mockSupabase;
      });

      mockSupabase.eq.mockImplementation((col: string, val: any) => {
        if (lastTable === 'zen_order_items') {
          return Promise.resolve({
            data: [{ sku_code: 'SKU-005', quantity: 4 }],
            error: null
          });
        }
        return mockSupabase;
      });
      
      mockSupabase.in.mockResolvedValue({
        data: [{ id: 'inv-5', sku_code: 'SKU-005', reserved_qty: 15, on_hand_qty: 200 }],
        error: null
      }); // inventory batch

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { prev_status: OrderStatus.WAREHOUSED },
        error: null
      });

      await syncInventoryFromOrder('order-5', OrderStatus.CANCELED);

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        on_hand_qty: 196,
        reserved_qty: 11
      }));

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        transaction_type: 'ADJUSTMENT',
        change_qty: -4,
        result_qty: 196
      }));
    });
  });
});
