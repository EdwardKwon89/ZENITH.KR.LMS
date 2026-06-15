import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createUpsZone,
  updateUpsZone,
  upsertUpsBaseRate,
  upsertUpsFuelSurcharge,
  createUpsOtherCharge,
} from '@/app/actions/ups/rates-mutation';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/supabase/server', () => {
  const mockFn = vi.fn();
  return { createClient: mockFn };
});

import { createClient } from '@/utils/supabase/server';

describe('TASK-146: UPS Rates Admin CRUD', () => {
  const mockAdmin = { id: 'admin-1', role: 'ADMIN' };
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    (createClient as any).mockResolvedValue(mockSupabase);
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'admin-1' },
      profile: mockAdmin,
      supabase: mockSupabase,
    });
  });

  describe('TC-UPS-ADMIN-01: Zone CRUD', () => {
    it('should create a zone with valid data', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'zone-1', zone_code: 'Z1', zone_name: 'Asia' },
        error: null,
      });

      const result = await createUpsZone({
        zone_code: 'Z1',
        zone_name: 'Asia',
        description: 'Asian countries',
        sort_order: 1,
      });

      expect(result.zone_code).toBe('Z1');
      expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_zones');
    });

    it('should update a zone', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'zone-1', zone_name: 'Asia Pacific' },
        error: null,
      });

      const result = await updateUpsZone('zone-1', { zone_name: 'Asia Pacific' });
      expect(result.zone_name).toBe('Asia Pacific');
    });
  });

  describe('TC-UPS-ADMIN-02: Base Rate UPSERT', () => {
    it('should upsert base rate with valid data', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'rate-1', product_id: 'prod-1', zone_id: 'zone-1', weight_kg: 0.5 },
        error: null,
      });

      const result = await upsertUpsBaseRate({
        product_id: '550e8400-e29b-41d4-a716-446655440000',
        zone_id: '550e8400-e29b-41d4-a716-446655440001',
        weight_kg: 0.5,
        selling_price: 10000,
        cost_price: 8000,
        currency: 'USD',
        valid_from: '2026-06-15',
      });

      expect(result.weight_kg).toBe(0.5);
      expect(mockSupabase.from).toHaveBeenCalledWith('zen_ups_base_rates');
    });
  });

  describe('TC-UPS-ADMIN-03: Fuel Surcharge UPSERT', () => {
    it('should upsert fuel surcharge', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'fs-1', effective_week: '2026-06-15', selling_rate: 0.25 },
        error: null,
      });

      const result = await upsertUpsFuelSurcharge({
        product_id: null,
        effective_week: '2026-06-15',
        selling_rate: 0.25,
        cost_rate: 0.20,
      });

      expect(result.selling_rate).toBe(0.25);
    });
  });

  describe('TC-UPS-ADMIN-04: Other Charge CRUD', () => {
    it('should create other charge', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'oc-1', charge_code: 'SUR', charge_name: 'Surcharge' },
        error: null,
      });

      const result = await createUpsOtherCharge({
        charge_code: 'SUR',
        charge_name: 'Surcharge',
        unit: 'PKG',
        fuel_surcharge_applicable: true,
        selling_price: 5000,
        cost_price: 4000,
        currency: 'USD',
      });

      expect(result.charge_code).toBe('SUR');
    });
  });

  describe('TC-UPS-ADMIN-05: Role Authorization', () => {
    it('should reject non-admin users', async () => {
      (validateUserAction as any).mockResolvedValue({
        user: { id: 'user-1' },
        profile: { id: 'user-1', role: 'SHIPPER' },
        supabase: mockSupabase,
      });

      await expect(createUpsZone({ zone_code: 'Z1', zone_name: 'Test' }))
        .rejects.toThrow('Permission denied');
    });
  });
});
