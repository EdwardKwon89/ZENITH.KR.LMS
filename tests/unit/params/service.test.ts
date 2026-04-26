import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getNumericParam } from '../../../src/lib/params/service';

// Mock 의존성 설정
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidateTag: vi.fn(),
}));

describe('SystemParamService', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    };
    (global as any).mockSupabase = mockSupabase;
  });

  it('TC-OPS-01: [Success] getNumericParam should return value from DB if exists', async () => {
    // Given
    mockSupabase.single.mockResolvedValue({
      data: { key: 'VAT_RATE', value_numeric: 0.15 },
      error: null
    });

    // When
    const value = await getNumericParam('VAT_RATE', 0.1);

    // Then
    expect(value).toBe(0.15);
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_system_params');
    expect(mockSupabase.eq).toHaveBeenCalledWith('key', 'VAT_RATE');
  });

  it('TC-OPS-02: [Success] getNumericParam should return default value if DB record is missing', async () => {
    // Given
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { message: 'Not found' }
    });

    // When
    const value = await getNumericParam('MISSING_KEY', 100);

    // Then
    expect(value).toBe(100);
  });

  it('TC-OPS-03: [Success] getNumericParam should return default value if value_numeric is null', async () => {
    // Given
    mockSupabase.single.mockResolvedValue({
      data: { key: 'NULL_KEY', value_numeric: null },
      error: null
    });

    // When
    const value = await getNumericParam('NULL_KEY', 999);

    // Then
    expect(value).toBe(999);
  });

  it('TC-OPS-04: [Success] getNumericParam should work for EXCHANGE_RATE_USD_KRW', async () => {
    mockSupabase.single.mockResolvedValue({
      data: { key: 'EXCHANGE_RATE_USD_KRW', value_numeric: 1380.5 },
      error: null
    });
    const value = await getNumericParam('EXCHANGE_RATE_USD_KRW', 1350);
    expect(value).toBe(1380.5);
  });

  it('TC-OPS-05: [Success] getNumericParam should work for TRACKING_DELAY_THRESHOLD_HOURS', async () => {
    mockSupabase.single.mockResolvedValue({
      data: { key: 'TRACKING_DELAY_THRESHOLD_HOURS', value_numeric: 24 },
      error: null
    });
    const value = await getNumericParam('TRACKING_DELAY_THRESHOLD_HOURS', 48);
    expect(value).toBe(24);
  });
});
