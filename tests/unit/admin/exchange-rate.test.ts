import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

const mockSettingsData = [
  { key: 'BASE_CURRENCY', label: '기준 통화', value: '"KRW"', updated_at: '2026-06-15T00:00:00.000Z' },
  { key: 'EXCHANGE_RATE_USD', label: 'USD 환율', value: '1380.00', updated_at: '2026-06-15T00:00:00.000Z' },
  { key: 'EXCHANGE_RATE_CNY', label: 'CNY 환율', value: '190.00', updated_at: '2026-06-15T01:00:00.000Z' },
  { key: 'EXCHANGE_RATE_JPY', label: 'JPY 환율', value: '9.20', updated_at: '2026-06-15T02:00:00.000Z' }
];

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      in: vi.fn(() => Promise.resolve({ data: mockSettingsData, error: null }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
};

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { validateAdminAction } from '@/lib/auth/guards';

describe('TC-EXR: 환율 설정 어드민 Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-EXR-01: getExchangeRateSettings() — 기본값 반환', async () => {
    (validateAdminAction as Mock).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-platform' }
    });

    const { getExchangeRateSettings } = await import('@/app/actions/admin/settings');
    const result = await getExchangeRateSettings();

    expect(result.baseCurrency).toBe('KRW');
    expect(result.rates).toHaveLength(3);
    expect(result.rates[0]).toEqual({
      key: 'EXCHANGE_RATE_USD',
      label: 'USD 환율',
      value: '1380.00'
    });
    expect(result.updatedAt).toBe('2026-06-15T02:00:00.000Z');
  });

  it('TC-EXR-02: updateExchangeRateSettings() — 정상 저장', async () => {
    (validateAdminAction as Mock).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-platform' }
    });

    const { updateExchangeRateSettings } = await import('@/app/actions/admin/settings');
    const result = await updateExchangeRateSettings({
      baseCurrency: 'KRW',
      exchangeRates: {
        EXCHANGE_RATE_USD: '1400.00',
        EXCHANGE_RATE_CNY: '195.00',
        EXCHANGE_RATE_JPY: '9.50'
      }
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('TC-EXR-03: 잘못된 환율값(음수) 입력 시 Zod 에러 반환', async () => {
    (validateAdminAction as Mock).mockResolvedValue({
      supabase: mockSupabase,
      profile: { id: 'admin-1', role: USER_ROLES.ADMIN, org_id: 'org-platform' }
    });

    const { updateExchangeRateSettings } = await import('@/app/actions/admin/settings');
    const result = await updateExchangeRateSettings({
      baseCurrency: 'KRW',
      exchangeRates: {
        EXCHANGE_RATE_USD: '-1400.00',
        EXCHANGE_RATE_CNY: '195.00',
        EXCHANGE_RATE_JPY: '9.50'
      }
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('환율은 0보다 큰 숫자여야 합니다');
  });
});
