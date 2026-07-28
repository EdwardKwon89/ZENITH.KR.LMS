import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { UpsActualAdjustmentForm } from '@/components/orders/UpsActualAdjustmentForm';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/finance/settlement/cost-type-labels', () => ({
  getCostTypeLabel: (key: string) => {
    const map: Record<string, string> = {
      BASE_FREIGHT: '기본 운임',
      FUEL_SURCHARGE: '유류 할증',
    };
    return map[key] || key;
  },
}));

const mockGetUpsChargeReconciliation = vi.fn();
const mockGetUpsActualCharges = vi.fn();
const mockRecordUpsActualCharges = vi.fn();

vi.mock('@/app/actions/finance/ups-actual-charges', () => ({
  getUpsChargeReconciliation: (...args: any[]) => mockGetUpsChargeReconciliation(...args),
  getUpsActualCharges: (...args: any[]) => mockGetUpsActualCharges(...args),
  recordUpsActualCharges: (...args: any[]) => mockRecordUpsActualCharges(...args),
}));

describe('DEF-B-020: UpsActualAdjustmentForm 실제 청구액 카드', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUpsActualCharges.mockResolvedValue([]);
    mockRecordUpsActualCharges.mockResolvedValue({ success: true });
  });

  it('charges가 비어있어도 reconciliation.actual 값을 "실제 청구액" 카드에 표시', async () => {
    mockGetUpsChargeReconciliation.mockResolvedValue({
      estimated: 100,
      estimatedBreakdown: [
        { costType: 'BASE_FREIGHT', amount: 100, currency: 'USD' },
      ],
      actual: 150,
      variance: 50,
      currency: 'USD',
      isFinalized: false,
    });

    render(
      <UpsActualAdjustmentForm
        orderId="order-1"
        orderStatus="DELIVERED"
        isPlatformAdmin={true}
      />
    );

    await waitFor(() => {
      const actualLabel = screen.getByText('실제 청구액 (Actual)');
      const actualCard = actualLabel.closest('.bg-gray-50')?.parentElement;
      expect(actualCard?.textContent).toContain('150.00');
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

describe('TASK-B-226/229: UpsActualAdjustmentForm 예상청구액 리스트 통합', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUpsActualCharges.mockResolvedValue([
      { charge_type: 'ADDITIONAL FEE', charge_amount: 50, currency: 'USD', notes: '추가 요금' },
    ]);
    mockRecordUpsActualCharges.mockResolvedValue({ success: true });
    mockGetUpsChargeReconciliation.mockResolvedValue({
      estimated: 100,
      estimatedBreakdown: [
        { costType: 'BASE_FREIGHT', amount: 60, currency: 'USD' },
        { costType: 'FUEL_SURCHARGE', amount: 40, currency: 'USD' },
      ],
      actual: 150,
      variance: 50,
      currency: 'USD',
      isFinalized: false,
      invoiceNo: null,
      invoiceDate: null,
    });
  });

  it('estimatedBreakdown 항목들이 "예상" 배지와 함께 테이블에 렌더링됨', async () => {
    render(
      <UpsActualAdjustmentForm
        orderId="order-123"
        orderStatus="DELIVERED"
        isPlatformAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('기본 운임')).toBeDefined();
      expect(screen.getByText('유류 할증')).toBeDefined();
    });

    const badges = screen.getAllByText('예상');
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('기존 charges 행들이 "추가" 배지와 함께 렌더링됨', async () => {
    render(
      <UpsActualAdjustmentForm
        orderId="order-123"
        orderStatus="DELIVERED"
        isPlatformAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('ADDITIONAL FEE')).toBeDefined();
    });

    const badges = screen.getAllByText('추가');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('별도 "예상 청구액 상세" 카드가 렌더링되지 않음', async () => {
    render(
      <UpsActualAdjustmentForm
        orderId="order-123"
        orderStatus="DELIVERED"
        isPlatformAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('기본 운임')).toBeDefined();
    });

    const separateCard = screen.queryByText('예상 청구액 상세 (Estimated Breakdown)');
    expect(separateCard).toBeNull();
  });

  it('테이블 헤더에 "구분" 컬럼이 포함됨', async () => {
    render(
      <UpsActualAdjustmentForm
        orderId="order-123"
        orderStatus="DELIVERED"
        isPlatformAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('구분')).toBeDefined();
    });
  });
});
