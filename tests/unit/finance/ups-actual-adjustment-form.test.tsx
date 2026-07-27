import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockGetUpsChargeReconciliation = vi.fn();
const mockGetUpsActualCharges = vi.fn();
const mockRecordUpsActualCharges = vi.fn();

vi.mock('@/app/actions/finance/ups-actual-charges', () => ({
  getUpsChargeReconciliation: (...args: any[]) => mockGetUpsChargeReconciliation(...args),
  getUpsActualCharges: (...args: any[]) => mockGetUpsActualCharges(...args),
  recordUpsActualCharges: (...args: any[]) => mockRecordUpsActualCharges(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('DEF-B-020: UpsActualAdjustmentForm 실제 청구액 카드', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUpsActualCharges.mockResolvedValue([]);
    mockRecordUpsActualCharges.mockResolvedValue({ success: true });
  });

  it('charges가 비어있어도 reconciliation.actual 값을 "실제 청구액" 카드에 표시', async () => {
    mockGetUpsChargeReconciliation.mockResolvedValue({
      estimated: 150,
      estimatedBreakdown: [
        { costType: 'BASE_FREIGHT', amount: 100, currency: 'USD' },
        { costType: 'FUEL_SURCHARGE', amount: 50, currency: 'USD' },
      ],
      actual: 150,
      variance: 0,
      currency: 'USD',
      isFinalized: false,
    });

    const { UpsActualAdjustmentForm } = await import('@/components/orders/UpsActualAdjustmentForm');
    const { container } = render(
      <UpsActualAdjustmentForm
        orderId="order-1"
        orderStatus="DELIVERED"
        isPlatformAdmin={true}
      />
    );

    await waitFor(() => {
      expect(container.textContent).toContain('150.00');
    });
  });

  it('reconciliation.variance가 카드에 그대로 반영됨', async () => {
    mockGetUpsChargeReconciliation.mockResolvedValue({
      estimated: 100,
      estimatedBreakdown: [],
      actual: 175,
      variance: 75,
      currency: 'USD',
      isFinalized: false,
    });

    const { UpsActualAdjustmentForm } = await import('@/components/orders/UpsActualAdjustmentForm');
    const { container } = render(
      <UpsActualAdjustmentForm
        orderId="order-2"
        orderStatus="DELIVERED"
        isPlatformAdmin={true}
      />
    );

    await waitFor(() => {
      expect(container.textContent).toContain('+75.00');
    });
  });
});
