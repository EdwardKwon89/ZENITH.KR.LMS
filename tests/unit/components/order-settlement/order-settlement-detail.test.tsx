import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

const actions = vi.hoisted(() => ({
  preview: vi.fn(),
  save: vi.fn(),
  finalize: vi.fn(),
  unmark: vi.fn(),
}));
const routerMock = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/app/actions/finance/ups-settlement', () => ({
  previewUpsSettlement: actions.preview,
  saveUpsSettlementDraft: actions.save,
  finalizeUpsSettlement: actions.finalize,
}));
vi.mock('@/app/actions/finance/ups-actual-cost', () => ({
  unmarkOrderCostSettled: actions.unmark,
}));
vi.mock('next/navigation', () => ({ useRouter: () => routerMock }));
vi.mock('sonner', () => ({ toast: toastMock }));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params?.amount != null ? `${key}:${params.amount}` : key,
}));

import OrderSettlementDetail from '@/components/finance/order-settlement/OrderSettlementDetail';
import type { OrderSettlementDetailData, SavedActualCost } from '@/components/finance/order-settlement/types';

function saved(overrides: Partial<SavedActualCost> = {}): SavedActualCost {
  return {
    upsInvoiceNo: 'INV-1',
    upsInvoiceDate: '2026-11-20',
    actualWeightKg: 5,
    actualLengthCm: null,
    actualWidthCm: null,
    actualHeightCm: null,
    baseFreightHkd: 1000,
    baseFreightCurrency: 'KRW',
    fuelSurchargeHkd: 100,
    fuelSurchargeCurrency: 'KRW',
    surgeFeeHkd: 50,
    surgeFeeCurrency: 'KRW',
    otherChargesHkd: 30,
    otherCharges: [{ name: '주소정정', amount: 30, currency: 'KRW' }],
    calcVersion: 3,
    notes: null,
    totalCostKrw: 1232,
    krwBased: true,
    ...overrides,
  };
}

function detail(savedCost: SavedActualCost | null, overrides: Partial<OrderSettlementDetailData> = {}): OrderSettlementDetailData {
  return {
    orderId: 'order-1',
    orderNo: 'ORD-1',
    settlementStatus: 'NOT_SETTLED',
    costSettledAt: null,
    deliveredAt: '2026-11-10T00:00:00Z',
    releasedAt: '2026-11-15',
    shipperName: '화주A',
    agencyName: '대리점A',
    upsProductCode: 'WW_SAVER_NONDOC',
    recipientCountryCode: 'US',
    exchangeRate: 1,
    legacyInvoiced: false,
    system: { actualWeightKg: 5, volumetricWeightKg: 5, chargeableWeightKg: 5, billingWeightKg: 5, totalSellingPrice: 120 },
    revenueBaseline: { agencyTotal: 90, shipperTotal: 130 },
    savedCost,
    ...overrides,
  };
}

const PREVIEW_RESULT = {
  success: true,
  preview: {
    releasedDate: '2026-11-15',
    chargeWeightKg: 5,
    cost: { totalCostKrw: 1232, exchangeRates: { KRW: 1 }, releasedDate: '2026-11-15' },
    amounts: [
      { tier: 'ADMIN_TO_AGENCY', base_freight: 80, fuel_surcharge: 8, surge_fee: 4, other_charges: 4, freight_adjustment: -6, settlement_charges_total: 30, line_total: 120 },
      { tier: 'SHIPPER', base_freight: 100, fuel_surcharge: 10, surge_fee: 5, other_charges: 5, freight_adjustment: 10, settlement_charges_total: 30, line_total: 160 },
    ],
    charges: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  actions.preview.mockResolvedValue(PREVIEW_RESULT);
  actions.save.mockResolvedValue({ success: true });
  actions.finalize.mockResolvedValue({ success: true, runId: 'run-1', version: 1 });
  actions.unmark.mockResolvedValue({ success: true });
});

afterEach(() => cleanup());

describe('TASK-B-381 PR-4a — 신규 정산마감 화면', () => {
  it('calc_version 3 초안은 원금액·통화·부가항목을 그대로 복원한다', () => {
    render(<OrderSettlementDetail detail={detail(saved())} locale="ko" />);

    expect((screen.getByLabelText('fieldBaseFreight') as HTMLInputElement).value).toBe('1000');
    expect((screen.getByLabelText('fieldFuelSurcharge') as HTMLInputElement).value).toBe('100');
    expect((screen.getByLabelText('fieldSurgeFee') as HTMLInputElement).value).toBe('50');
    expect((screen.getByLabelText('colChargeName 1') as HTMLInputElement).value).toBe('주소정정');
    expect((screen.getByLabelText('colChargeAmount 1') as HTMLInputElement).value).toBe('30');
  });

  it('calc_version < 3 초안은 금액을 복원하지 않고 재입력 안내를 보여 준다', () => {
    render(<OrderSettlementDetail detail={detail(saved({ calcVersion: 2 }))} locale="ko" />);

    expect((screen.getByLabelText('fieldBaseFreight') as HTMLInputElement).value).toBe('');
    expect(screen.queryByLabelText('colChargeName 1')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('savedKrwNotice');
  });

  it('미리보기는 부가항목을 항목명·금액·통화 배열로 서버에 전달한다', async () => {
    render(<OrderSettlementDetail detail={detail(saved())} locale="ko" />);

    await waitFor(() => expect(actions.preview).toHaveBeenCalled(), { timeout: 2000 });
    const input = actions.preview.mock.calls.at(-1)![0];
    expect(input.orderId).toBe('order-1');
    expect(input.baseFreight).toEqual({ amount: 1000, currency: 'KRW' });
    expect(input.otherCharges).toEqual([{ name: '주소정정', amount: 30, currency: 'KRW' }]);
    await waitFor(() => expect(screen.getByText('tierAgencySettlement — 120')).toBeTruthy());
  });

  it('부가항목 행 추가·삭제가 가능하고 새 행도 미리보기에 포함된다', async () => {
    render(<OrderSettlementDetail detail={detail(null)} locale="ko" />);

    fireEvent.click(screen.getByText('addCharge'));
    fireEvent.change(screen.getByLabelText('colChargeName 1'), { target: { value: '반송' } });
    fireEvent.change(screen.getByLabelText('colChargeAmount 1'), { target: { value: '12.5' } });
    fireEvent.change(screen.getByLabelText('fieldBaseFreight'), { target: { value: '1000' } });

    await waitFor(() => expect(actions.preview).toHaveBeenCalled(), { timeout: 2000 });
    const input = actions.preview.mock.calls.at(-1)![0];
    expect(input.otherCharges).toEqual([{ name: '반송', amount: 12.5, currency: 'KRW' }]);

    fireEvent.click(screen.getByLabelText('removeCharge 1'));
    expect(screen.queryByLabelText('colChargeName 1')).toBeNull();
  });

  it('임시저장은 현재 입력을 그대로 saveUpsSettlementDraft로 보낸다', async () => {
    render(<OrderSettlementDetail detail={detail(saved())} locale="ko" />);

    fireEvent.click(screen.getByText('saveDraft'));
    await waitFor(() => expect(actions.save).toHaveBeenCalledTimes(1));
    const input = actions.save.mock.calls[0][0];
    expect(input.baseFreight).toEqual({ amount: 1000, currency: 'KRW' });
    expect(input.fuelSurcharge).toEqual({ amount: 100, currency: 'KRW' });
    expect(input.surgeFee).toEqual({ amount: 50, currency: 'KRW' });
    expect(input.otherCharges).toEqual([{ name: '주소정정', amount: 30, currency: 'KRW' }]);
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('정산마감 확인 시 finalizeUpsSettlement를 호출하고 SETTLED로 전환한다', async () => {
    render(<OrderSettlementDetail detail={detail(saved())} locale="ko" />);

    fireEvent.click(screen.getByText('markSettled'));
    fireEvent.click(screen.getByText('markConfirm'));

    await waitFor(() => expect(actions.finalize).toHaveBeenCalledTimes(1));
    expect(actions.finalize.mock.calls[0][0].orderId).toBe('order-1');
    expect(screen.getByText('statusSettled')).toBeTruthy();
    expect(toastMock.success).toHaveBeenCalledWith('markSuccess');
  });

  it('되돌리기 실패 사유를 표시한다', async () => {
    actions.unmark.mockResolvedValue({ success: false, error: 'statement_includes_order' });
    render(<OrderSettlementDetail detail={detail(saved(), { settlementStatus: 'SETTLED' })} locale="ko" />);

    fireEvent.click(screen.getByText('unmarkSettled'));
    fireEvent.click(screen.getByText('unmarkConfirm'));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('statement_includes_order'));
    expect(actions.unmark).toHaveBeenCalledWith('order-1');
  });
});
