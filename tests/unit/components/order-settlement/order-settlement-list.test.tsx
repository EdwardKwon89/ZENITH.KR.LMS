// TASK-B-369 (Issue #1425) — S1 오더정산 목록: 실제 컴포넌트를 렌더해 결과만 단언한다.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

const m = vi.hoisted(() => ({ lookup: vi.fn() }));

vi.mock('@/app/actions/finance/ups-actual-cost', () => ({
  getOrdersForCostSettlement: (...a: unknown[]) => m.lookup(...a),
  previewUpsActualCost: vi.fn(),
  recordUpsActualCost: vi.fn(),
  markOrderCostSettled: vi.fn(),
  unmarkOrderCostSettled: vi.fn(),
}));

vi.mock('next-intl', () => {
  const ko: Record<string, string> = {
    title: '오더정산',
    unsettledBadge: '미정산 {count}건',
    filterDeliveredFrom: '배송완료일 시작',
    filterDeliveredTo: '배송완료일 종료',
    filterStatus: '정산 상태',
    statusAll: '전체',
    statusNotSettled: '미정산',
    statusSettled: '정산완료',
    searchLabel: '오더번호 검색',
    searchPlaceholder: '오더번호 입력',
    search: '조회',
    colOrderNo: '오더번호',
    colShipperAgency: '화주/대리점',
    colDeliveredAt: '배송완료일',
    colUpsInvoice: 'UPS 청구서',
    colSettlementStatus: '정산 상태',
    colAction: '작업',
    invoiceEntered: '입력됨',
    invoiceMissing: '미입력',
    empty: '조회 결과가 없습니다.',
    actionSettle: '정산',
    actionView: '보기',
    legacyInvoiced: '레거시 청구됨',
    dateRequired: '조회 기간(시작·종료)은 필수입니다.',
    dateRangeInvalid: '시작일은 종료일보다 빠르거나 같아야 합니다.',
    actionFailed: '요청을 처리하지 못했습니다.',
  };
  return {
    useTranslations: () => (key: string, params?: Record<string, unknown>) => {
      const base = ko[key] ?? key;
      return params ? base.replace(/\{(\w+)\}/g, (_, k) => String(params[k])) : base;
    },
  };
});

import OrderSettlementList from '@/components/finance/order-settlement/OrderSettlementList';
import type { OrderSettlementRow } from '@/components/finance/order-settlement/types';

const rows: OrderSettlementRow[] = [
  {
    orderId: 'o1', orderNo: 'ORD-1', shipperName: 'A사', agencyName: 'B대리점',
    deliveredAt: '2026-11-10T03:00:00Z', settlementStatus: 'NOT_SETTLED', costSettledAt: null,
    upsInvoiceNo: null, hasActualCost: true, legacyInvoiced: false, excludedReason: null,
  },
  {
    orderId: 'o2', orderNo: 'ORD-2', shipperName: 'C사', agencyName: null,
    deliveredAt: '2026-11-11T03:00:00Z', settlementStatus: 'SETTLED', costSettledAt: '2026-11-12T03:00:00Z',
    upsInvoiceNo: 'INV-2', hasActualCost: true, legacyInvoiced: false, excludedReason: null,
  },
  {
    orderId: 'o3', orderNo: 'ORD-3', shipperName: 'D사', agencyName: 'E대리점',
    deliveredAt: '2026-11-12T03:00:00Z', settlementStatus: 'NOT_SETTLED', costSettledAt: null,
    upsInvoiceNo: 'INV-3', hasActualCost: true, legacyInvoiced: true, excludedReason: 'LEGACY_INVOICED',
  },
];

const baseProps = {
  initialOrders: rows,
  initialFilter: { status: 'ALL' as const, from: '2026-11-01', to: '2026-11-30' },
  locale: 'ko',
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('S1 오더정산 목록 (TASK-B-369)', () => {
  it('TC-369-01: 행·미정산 배지·레거시 배지·행 작업 링크를 렌더한다', () => {
    render(<OrderSettlementList {...baseProps} />);

    expect(screen.getByText('ORD-1')).toBeTruthy();
    expect(screen.getByText('INV-2')).toBeTruthy();
    // 레거시 오더는 미정산 건수에서 제외된다 (o1만 집계).
    expect(screen.getByText('미정산 1건')).toBeTruthy();
    expect(screen.getByText('레거시 청구됨')).toBeTruthy();

    const settleLink = screen.getByRole('link', { name: /정산/ });
    expect(settleLink.getAttribute('href')).toBe('/ko/finance/order-settlement/o1');
    expect(screen.getAllByRole('link', { name: /보기/ })).toHaveLength(2);
    expect(screen.getByText('입력됨')).toBeTruthy();
  });

  it('TC-369-02: 조회 시 필터 값을 서버 액션에 그대로 전달하고 결과로 교체한다', async () => {
    m.lookup.mockResolvedValue({ success: true, orders: [rows[1]], total: 1 });
    render(<OrderSettlementList {...baseProps} />);

    fireEvent.change(screen.getByLabelText('정산 상태'), { target: { value: 'SETTLED' } });
    fireEvent.change(screen.getByLabelText('배송완료일 시작'), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText('오더번호 검색'), { target: { value: ' ORD-2 ' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => expect(m.lookup).toHaveBeenCalledWith({
      status: 'SETTLED', from: '2026-11-05', to: '2026-11-30', q: 'ORD-2',
    }));
    await waitFor(() => expect(screen.queryByText('ORD-1')).toBeNull());
    expect(screen.getByText('ORD-2')).toBeTruthy();
  });

  it('TC-369-03: 기간이 역전되면 서버를 호출하지 않고 오류를 표시한다', () => {
    render(<OrderSettlementList {...baseProps} />);

    fireEvent.change(screen.getByLabelText('배송완료일 시작'), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(screen.getByRole('alert').textContent).toContain('시작일은 종료일보다');
    expect(m.lookup).not.toHaveBeenCalled();
  });

  it('TC-369-04: 조회 실패는 빈 목록 성공으로 위장하지 않고 오류와 기존 행을 유지한다', async () => {
    m.lookup.mockResolvedValue({ success: false, error: '조회 실패' });
    render(<OrderSettlementList {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('조회 실패'));
    expect(screen.getByText('ORD-1')).toBeTruthy();
  });
});
