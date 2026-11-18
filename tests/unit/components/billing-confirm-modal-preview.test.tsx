// TASK-B-364 (Issue #1374) T8: 청구확정 모달은 클라이언트 가산 계산 대신 서버 미리보기 합계를 표시한다.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

const mockPreview = vi.fn();
const mockFinalize = vi.fn();

vi.mock('@/app/actions/finance/ups-actual-cost', () => ({
  previewUpsActualCost: (...args: any[]) => mockPreview(...args),
  recordActualCostAndFinalize: (...args: any[]) => mockFinalize(...args),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import BillingConfirmModal from '@/components/finance/BillingConfirmModal';

beforeEach(() => {
  vi.clearAllMocks();
  mockPreview.mockResolvedValue({ success: true, totalCostKrw: 213000 });
});

describe('BillingConfirmModal — 서버 미리보기 합계 표시 (TASK-B-364)', () => {
  it('T8: 표시 합계가 preview 응답 totalCostKrw와 일치한다', async () => {
    render(
      <BillingConfirmModal
        open
        orderId="order-1"
        orderNo="ORD-1"
        initialBaseFreight={1000}
        initialFuelSurcharge={45000}
        initialSurgeFee={7500}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('₩213,000')).toBeTruthy();
    });

    const [, input] = mockPreview.mock.calls[0];
    expect(input.baseFreightKrw).toBe(1000);
    expect(input.baseFreightCurrency).toBe('KRW');
    expect(input.fuelSurchargeKrw).toBe(45000);
    expect(input.surgeFeeKrw).toBe(7500);
    cleanup();
  });
});
