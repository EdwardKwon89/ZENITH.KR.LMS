import { UpsActualAdjustmentForm } from '@/components/orders/UpsActualAdjustmentForm';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/app/actions/finance/ups-actual-charges', () => ({
  recordUpsActualCharges: vi.fn().mockResolvedValue({ success: true }),
  getUpsActualCharges: vi.fn().mockResolvedValue([
    { charge_type: 'ADDITIONAL FEE', charge_amount: 50, currency: 'USD', notes: '추가 요금' },
  ]),
  getUpsChargeReconciliation: vi.fn().mockResolvedValue({
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
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('lucide-react', () => ({
  Loader2: (props: any) => <span data-testid="loader" {...props} />,
  Plus: (props: any) => <span data-testid="plus-icon" {...props} />,
  Trash2: (props: any) => <span data-testid="trash-icon" {...props} />,
  HelpCircle: (props: any) => <span data-testid="help-icon" {...props} />,
}));

vi.mock('@/components/ui/ZenUI', () => ({
  ZenCard: ({ children, className }: any) => <div data-testid="zen-card" className={className}>{children}</div>,
  ZenButton: ({ children, className, onClick, disabled, loading }: any) => (
    <button data-testid="zen-button" className={className} onClick={onClick} disabled={disabled}>{children}</button>
  ),
  ZenInput: ({ value, onChange, placeholder, className, type, list, step, min }: any) => (
    <input data-testid="zen-input" value={value} onChange={onChange} placeholder={placeholder} className={className} type={type} list={list} step={step} min={min} />
  ),
  ZenSelect: ({ value, onValueChange, options, className }: any) => (
    <select data-testid="zen-select" value={value} onChange={(e) => onValueChange(e.target.value)} className={className}>
      {options?.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  ),
  ZenBadge: ({ children, className }: any) => <span data-testid="zen-badge" className={className}>{children}</span>,
}));

vi.mock('@/lib/finance/settlement/cost-type-labels', () => ({
  getCostTypeLabel: (key: string) => {
    const map: Record<string, string> = {
      'BASE_FREIGHT': '기본 운임',
      'FUEL_SURCHARGE': '유류 할증',
      'ADDITIONAL FEE': '추가 요금',
    };
    return map[key] || key;
  },
}));

describe('TASK-B-226: UpsActualAdjustmentForm 예상청구액 리스트 통합', () => {
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
