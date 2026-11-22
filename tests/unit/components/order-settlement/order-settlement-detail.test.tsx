// TASK-B-369 (Issue #1425) — S2 오더정산 상세: 실제 컴포넌트를 렌더해 결과만 단언한다.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import React from 'react';

const m = vi.hoisted(() => ({
  preview: vi.fn(),
  record: vi.fn(),
  mark: vi.fn(),
  unmark: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/app/actions/finance/ups-actual-cost', () => ({
  getOrdersForCostSettlement: vi.fn(),
  previewUpsActualCost: (...a: unknown[]) => m.preview(...a),
  recordUpsActualCost: (...a: unknown[]) => m.record(...a),
  markOrderCostSettled: (...a: unknown[]) => m.mark(...a),
  unmarkOrderCostSettled: (...a: unknown[]) => m.unmark(...a),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: m.push, refresh: m.refresh, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '',
  useParams: () => ({ locale: 'ko' }),
}));

vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => m.toastSuccess(...a), error: (...a: unknown[]) => m.toastError(...a) } }));

vi.mock('next-intl', () => {
  const ko: Record<string, string> = {
    detailTitle: '오더정산 — {orderNo}', backToList: '목록으로', statusSettled: '정산완료', statusNotSettled: '미정산',
    legacyInvoiced: '레거시 청구됨', labelShipper: '화주', labelAgency: '대리점', labelDeliveredAt: '배송완료일',
    labelReleasedAt: '출고확정일', labelProduct: 'UPS 상품', labelDestination: '도착국',
    labelExchangeRate: '적용 환율 (HKD→KRW)', labelSettledAt: '정산일',
    settledNotice: '이 오더는 정산 완료 상태입니다. 원가를 수정하려면 정산을 되돌리세요.',
    legacyNotice: '기존 오더별 인보이스가 발행된 오더입니다. 신규 정산 대상이 아닙니다.',
    savedKrwNotice: '기존 저장 원가는 KRW 기준입니다(합계 {amount}원). HKD 청구서값을 다시 입력해 주세요.',
    fieldInvoiceNo: 'UPS 청구서번호', fieldInvoiceDate: '청구서 발행일', fieldActualWeight: '실측 청구중량(kg)',
    fieldBaseFreight: '기본운임 (HKD)', fieldFuelSurcharge: '유류할증료 (HKD)', fieldSurgeFee: '급증수수료 (HKD)',
    fieldOtherCharges: '기타 부가운임 (HKD)', fieldLength: '길이', fieldWidth: '너비', fieldHeight: '높이', fieldNotes: '비고',
    colItem: '항목', colSystemValue: '시스템 등록값', colInvoiceValue: 'UPS 청구서값',
    rowChargeWeight: '청구중량(kg)', rowBaseFreight: '기본운임', rowFuelSurcharge: '유류할증료',
    rowSurgeFee: '급증수수료', rowOtherCharges: '기타 부가운임', rowDims: '실측 치수 (cm)', volumetricShort: '부피',
    previewTitle: '원가(KRW) 미리보기', previewTotal: '합계 {amount}원',
    previewPending: '입력값으로 원가를 계산하는 중입니다…',
    recalcAgency: '대리점: 기존 {before} → 신규 {after}', recalcShipper: '화주: 기존 {before} → 신규 {after}',
    recalcDelta: '변동: 대리점 {agency}원 · 화주 {shipper}원',
    inputRequired: 'UPS 청구서값을 하나 이상 입력하세요.', saveDraft: '임시저장', markSettled: '정산 완료',
    unmarkSettled: '정산 되돌리기', markConfirmTitle: '정산 완료',
    markConfirmBody: '정산 완료 후 청구서 포함 전까지만 되돌릴 수 있습니다. 계속하시겠습니까?',
    unmarkConfirmTitle: '정산 되돌리기', unmarkConfirmBody: '정산을 되돌리면 이 오더의 원가를 다시 수정할 수 있습니다. 계속하시겠습니까?',
    markConfirm: '정산 완료', unmarkConfirm: '되돌리기', close: '닫기',
    saveSuccess: '저장했습니다. 원가 합계 {amount}원', markSuccess: '정산 완료 처리했습니다.', unmarkSuccess: '정산을 되돌렸습니다.',
    actionFailed: '요청을 처리하지 못했습니다.',
    dirtyNotice: '변경 사항이 있습니다. 먼저 임시저장한 뒤 정산 완료하세요.',
  };
  return {
    useTranslations: () => (key: string, params?: Record<string, unknown>) => {
      const base = ko[key] ?? key;
      return params ? base.replace(/\{(\w+)\}/g, (_, k) => String(params[k])) : base;
    },
  };
});

import OrderSettlementDetail from '@/components/finance/order-settlement/OrderSettlementDetail';
import type { OrderSettlementDetailData } from '@/components/finance/order-settlement/types';

const savedCost = {
  upsInvoiceNo: 'UP-INV-1', upsInvoiceDate: '2026-11-15', actualWeightKg: 16,
  actualLengthCm: 40, actualWidthCm: 30, actualHeightCm: 20,
  baseFreightHkd: 1240, fuelSurchargeHkd: 310, surgeFeeHkd: 45, otherChargesHkd: 120,
  notes: 'memo', totalCostKrw: 323140, krwBased: false,
};

function detail(overrides: Partial<OrderSettlementDetailData> = {}): OrderSettlementDetailData {
  return {
    orderId: 'o1', orderNo: 'ORD-1', settlementStatus: 'NOT_SETTLED', costSettledAt: null,
    deliveredAt: '2026-11-10T03:00:00Z', releasedAt: '2026-10-02',
    shipperName: 'A사', agencyName: 'B대리점', upsProductCode: 'WW_EXP', recipientCountryCode: 'US',
    exchangeRate: 188.42, legacyInvoiced: false,
    system: { actualWeightKg: 12.5, volumetricWeightKg: 15.2, chargeableWeightKg: 15.2, billingWeightKg: 12.5, totalSellingPrice: 310000 },
    revenueBaseline: { agencyTotal: 280000, shipperTotal: 310000 },
    savedCost: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.preview.mockResolvedValue({ success: true, totalCostKrw: 323140, appliedExchangeRate: 188.42 });
});
afterEach(() => cleanup());

describe('S2 오더정산 상세 (TASK-B-369)', () => {
  it('TC-369-05: 기존 저장값과 시스템 등록값을 프리필/표시한다', () => {
    render(<OrderSettlementDetail detail={detail({ savedCost })} locale="ko" />);

    expect((screen.getByLabelText('UPS 청구서번호') as HTMLInputElement).value).toBe('UP-INV-1');
    expect((screen.getByLabelText('기본운임 (HKD)') as HTMLInputElement).value).toBe('1240');
    expect((screen.getByLabelText('유류할증료 (HKD)') as HTMLInputElement).value).toBe('310');
    expect((screen.getByLabelText('실측 청구중량(kg)') as HTMLInputElement).value).toBe('16');
    expect(screen.getByText(/15\.2 \(부피 15\.2\)/)).toBeTruthy();
  });

  it('TC-369-06: 300ms 디바운스 후 미리보기를 호출하고 서버 합계를 표시한다', async () => {
    m.preview.mockResolvedValue({ success: true, totalCostKrw: 213000, appliedExchangeRate: 150 });
    render(<OrderSettlementDetail detail={detail()} locale="ko" />);

    fireEvent.change(screen.getByLabelText('기본운임 (HKD)'), { target: { value: '1000' } });

    await waitFor(() => expect(m.preview).toHaveBeenCalledWith('o1', { baseFreightHkd: 1000 }), { timeout: 2000 });
    await waitFor(() => expect(screen.getByText('합계 213,000원')).toBeTruthy());
  });

  it('TC-369-07: 임시저장 성공 토스트는 서버 응답 totalCostKrw 를 사용한다', async () => {
    m.record.mockResolvedValue({ success: true, totalCostKrw: 213000 });
    render(<OrderSettlementDetail detail={detail({ savedCost })} locale="ko" />);

    fireEvent.click(screen.getByRole('button', { name: /임시저장/ }));

    await waitFor(() => expect(m.record).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(m.toastSuccess).toHaveBeenCalledWith('저장했습니다. 원가 합계 213,000원'));
    expect(m.refresh).toHaveBeenCalled();
  });

  it('TC-369-08: 확인 모달 전에는 정산 액션을 호출하지 않고, 확인 후 상태를 갱신한다', async () => {
    m.mark.mockResolvedValue({ success: true, settledAt: '2026-11-22T00:00:00Z' });
    render(<OrderSettlementDetail detail={detail({ savedCost })} locale="ko" />);

    fireEvent.click(screen.getByRole('button', { name: /정산 완료/ }));
    const dialog = screen.getByRole('dialog');
    expect(m.mark).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: '정산 완료' }));

    await waitFor(() => expect(m.mark).toHaveBeenCalledWith('o1'));
    await waitFor(() => expect(m.toastSuccess).toHaveBeenCalledWith('정산 완료 처리했습니다.'));
    expect(screen.getAllByText('정산완료').length).toBeGreaterThan(0);
  });

  it('TC-369-09: 정산 완료 상태는 입력·저장을 막고 되돌리기를 호출한다', async () => {
    m.unmark.mockResolvedValue({ success: true });
    render(<OrderSettlementDetail
      detail={detail({ settlementStatus: 'SETTLED', costSettledAt: '2026-11-20T03:00:00Z', savedCost })}
      locale="ko"
    />);

    expect((screen.getByLabelText('기본운임 (HKD)') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /임시저장/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /정산 되돌리기/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '되돌리기' }));

    await waitFor(() => expect(m.unmark).toHaveBeenCalledWith('o1'));
    await waitFor(() => expect(m.toastSuccess).toHaveBeenCalledWith('정산을 되돌렸습니다.'));
    expect(screen.getAllByText('미정산').length).toBeGreaterThan(0);
  });

  it('TC-369-10: 레거시 인보이스 오더는 정산 완료 버튼이 비활성이고 안내를 표시한다', () => {
    render(<OrderSettlementDetail detail={detail({ legacyInvoiced: true, savedCost })} locale="ko" />);

    expect((screen.getByRole('button', { name: /정산 완료/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/기존 오더별 인보이스가 발행된 오더입니다/)).toBeTruthy();
  });

  it('TC-369-11: 되돌리기 실패 사유를 모달에 그대로 표시한다', async () => {
    m.unmark.mockResolvedValue({ success: false, error: '청구서에 포함된 오더는 되돌릴 수 없습니다.' });
    render(<OrderSettlementDetail
      detail={detail({ settlementStatus: 'SETTLED', costSettledAt: '2026-11-20T03:00:00Z', savedCost })}
      locale="ko"
    />);

    fireEvent.click(screen.getByRole('button', { name: /정산 되돌리기/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '되돌리기' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('청구서에 포함된 오더는 되돌릴 수 없습니다.'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('TC-369-17: 저장 후 입력을 바꾸면 [정산 완료]가 비활성되고 안내가 표시된다', () => {
    render(<OrderSettlementDetail detail={detail({ savedCost })} locale="ko" />);

    fireEvent.change(screen.getByLabelText('기본운임 (HKD)'), { target: { value: '999' } });

    const markButton = screen.getByRole('button', { name: /정산 완료/ }) as HTMLButtonElement;
    expect(markButton.disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('변경 사항이 있습니다');
  });

  it('TC-369-18: 변경 사항을 임시저장하면 [정산 완료]가 다시 활성화된다', async () => {
    m.record.mockResolvedValue({ success: true, totalCostKrw: 213000 });
    render(<OrderSettlementDetail detail={detail({ savedCost })} locale="ko" />);

    fireEvent.change(screen.getByLabelText('기본운임 (HKD)'), { target: { value: '999' } });
    expect((screen.getByRole('button', { name: /정산 완료/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /임시저장/ }));

    await waitFor(() => expect((screen.getByRole('button', { name: /정산 완료/ }) as HTMLButtonElement).disabled).toBe(false));
  });

  it('TC-369-19: 미저장 변경이 있으면 [정산 완료]를 눌러도 서버 액션을 호출하지 않는다', () => {
    render(<OrderSettlementDetail detail={detail({ savedCost })} locale="ko" />);

    fireEvent.change(screen.getByLabelText('유류할증료 (HKD)'), { target: { value: '999' } });
    const markButton = screen.getByRole('button', { name: /정산 완료/ }) as HTMLButtonElement;
    fireEvent.click(markButton);

    expect(m.mark).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('TC-369-12: 입력값이 없으면 저장하지 않고 안내한다', () => {
    render(<OrderSettlementDetail detail={detail()} locale="ko" />);

    fireEvent.click(screen.getByRole('button', { name: /임시저장/ }));

    expect(screen.getByRole('alert').textContent).toContain('UPS 청구서값을 하나 이상 입력하세요');
    expect(m.record).not.toHaveBeenCalled();
  });
});
