// TASK-B-361 (Issue #1367) T4 — S5 청구서 상세: 읽기 전용 작업영역 미렌더, 발행/입금확인 확인 모달을 렌더 결과로 단언.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

const m = vi.hoisted(() => ({
  issue: vi.fn(),
  payment: vi.fn(),
  cancel: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@/app/actions/finance/billing-statements', () => ({
  issueBillingStatement: (...a: any[]) => m.issue(...a),
  confirmStatementPayment: (...a: any[]) => m.payment(...a),
  cancelBillingStatement: (...a: any[]) => m.cancel(...a),
  listBillableOrders: vi.fn(),
  listAdhocShipperNames: vi.fn(),
  createBillingStatement: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: m.push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

vi.mock('next-intl', () => {
  const ko: Record<string, string> = {
    detailTitle: '청구서 상세', statusDraft: '초안', statusIssued: '발행', statusClosed: '마감',
    scopeMine: '내 청구', scopeReceived: '나에게 청구된', scopeSupervised: '감독 조회',
    issue: '발행', issueCancel: '취소(삭제)', issueConfirm: '발행 확정',
    issueWarning: '발행하면 취소·삭제할 수 없습니다.', confirmPayment: '입금확인',
    paymentTitle: '입금확인', paymentPaidAt: '입금일', paymentAmount: '입금액',
    paymentConfirm: '입금확인 완료', paymentMismatch: '입금액이 청구액과 다릅니다. 전액 일치만 가능합니다.',
    close: '닫기', readOnly: '조회 전용', notFound: '청구서를 찾을 수 없습니다.',
    colOrderNo: '오더번호', colWeight: '청구중량(kg)', colBaseFreight: '기본운임',
    colFuelSurcharge: '유류할증료', colSurgeFee: '급증수수료', colOtherCharges: '기타',
    colSubtotal: '소계', colBilledTarget: '청구대상', colPeriodRound: '기간/차수',
    totalLabel: '합계 {amount}원', itemCount: '오더 {count}건', billedBizNoLabel: '사업자번호',
    view: '보기', actionFailed: '요청을 처리하지 못했습니다.', excel: 'Excel 저장',
  };
  return {
    useTranslations: () => (key: string, params?: Record<string, unknown>) => {
      const base = ko[key] ?? key;
      return params ? base.replace(/\{(\w+)\}/g, (_, k) => String(params[k])) : base;
    },
  };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import StatementDetail from '@/components/finance/statements/StatementDetail';
import type { StatementDetail as Detail } from '@/components/finance/statements/types';

function detail(overrides: Partial<Detail> = {}): Detail {
  return {
    id: 'st-1', statementNo: 'ST-202610-01-1', billedPartyType: 'ORG', billedOrgId: 'org1',
    billedName: 'B대리점', billedBizNo: null, tier: 'ADMIN_TO_AGENCY',
    periodYear: 2026, periodMonth: 10, roundNo: 1, periodFrom: '2026-10-01', periodTo: '2026-10-31',
    totalAmount: 100000, status: 'DRAFT', issuerOrgId: 'issuer1', scope: 'MINE',
    createdAt: '2026-10-01T00:00:00Z',
    items: [{ orderId: 'o1', orderNo: 'ORD-1', chargeWeightKg: 10, baseFreight: 90000, fuelSurcharge: 5000, surgeFee: 0, otherCharges: 5000, lineTotal: 100000 }],
    ...overrides,
  };
}

const base = { basePath: '/finance/statements', locale: 'ko' };

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => cleanup());

describe('S5 청구서 상세 — 권한별 작업 영역 (TASK-B-361)', () => {
  it('TC-361-14: 내 청구 DRAFT는 발행·취소(삭제)를 렌더한다', () => {
    render(<StatementDetail {...base} detail={detail()} />);
    expect(screen.getByRole('button', { name: '발행' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '취소(삭제)' })).toBeTruthy();
    expect(screen.getByText('ST-202610-01-1')).toBeTruthy();
  });

  it('TC-361-15: 내 청구 ISSUED는 입금확인만 렌더하고 취소·발행은 없다', () => {
    render(<StatementDetail {...base} detail={detail({ status: 'ISSUED' })} />);
    expect(screen.getByRole('button', { name: '입금확인' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '발행' })).toBeNull();
    expect(screen.queryByRole('button', { name: '취소(삭제)' })).toBeNull();
  });

  it('TC-361-16: 나에게 청구된(읽기 전용)은 작업 버튼 없이 조회 전용 배지를 렌더한다', () => {
    render(<StatementDetail {...base} basePath="/shipper/statements" detail={detail({ status: 'ISSUED', scope: 'RECEIVED' })} />);
    expect(screen.getByText('조회 전용')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '발행' })).toBeNull();
    expect(screen.queryByRole('button', { name: '취소(삭제)' })).toBeNull();
    expect(screen.queryByRole('button', { name: '입금확인' })).toBeNull();
    expect(screen.getByText('ORD-1')).toBeTruthy();
  });

  it('TC-361-17: Admin 감독 조회(DRAFT)도 읽기 전용 — 작업 영역 미렌더', () => {
    render(<StatementDetail {...base} detail={detail({ scope: 'SUPERVISED' })} />);
    expect(screen.getByText('감독 조회')).toBeTruthy();
    expect(screen.getByText('조회 전용')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '발행' })).toBeNull();
    expect(screen.queryByRole('button', { name: '취소(삭제)' })).toBeNull();
  });

  it('TC-361-18: 발행 확인 모달은 경고를 렌더하고 액션 호출 후 발행 버튼이 사라진다', async () => {
    m.issue.mockResolvedValue({ success: true, issuedAt: '2026-10-02T00:00:00Z' });
    render(<StatementDetail {...base} detail={detail()} />);
    fireEvent.click(screen.getByRole('button', { name: '발행' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('발행하면 취소·삭제할 수 없습니다.')).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: '발행 확정' }));
    await waitFor(() => expect(m.issue).toHaveBeenCalledWith('st-1'));
    await waitFor(() => expect(screen.queryByRole('button', { name: '발행' })).toBeNull());
    expect(screen.getByText('발행')).toBeTruthy(); // 상태 배지
  });

  it('TC-361-19: 입금액 불일치는 서버 호출 없이 경고를 렌더한다', async () => {
    render(<StatementDetail {...base} detail={detail({ status: 'ISSUED' })} />);
    fireEvent.click(screen.getByRole('button', { name: '입금확인' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('입금액'), { target: { value: '99999' } });
    fireEvent.click(dialog.getByRole('button', { name: '입금확인 완료' }));
    await waitFor(() => expect(dialog.getByRole('alert').textContent).toContain('전액 일치만 가능합니다'));
    expect(m.payment).not.toHaveBeenCalled();
  });

  it('TC-361-20: 입금확인 성공은 paidAt·전액을 서버에 보내고 마감 상태로 바꾼다', async () => {
    m.payment.mockResolvedValue({ success: true });
    render(<StatementDetail {...base} detail={detail({ status: 'ISSUED' })} />);
    fireEvent.click(screen.getByRole('button', { name: '입금확인' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('입금일'), { target: { value: '2026-10-03' } });
    fireEvent.change(dialog.getByLabelText('입금액'), { target: { value: '100000' } });
    fireEvent.click(dialog.getByRole('button', { name: '입금확인 완료' }));
    await waitFor(() => expect(m.payment).toHaveBeenCalledWith('st-1', { paidAt: '2026-10-03', amount: 100000 }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '입금확인' })).toBeNull());
    expect(screen.getByText('마감')).toBeTruthy();
  });

  it('TC-361-21: 조회 실패 시 찾을 수 없음 화면을 렌더한다', () => {
    render(<StatementDetail {...base} detail={null} error="요청한 청구서가 존재하지 않습니다." />);
    expect(screen.getByText('청구서를 찾을 수 없습니다.')).toBeTruthy();
    expect(screen.getByText('요청한 청구서가 존재하지 않습니다.')).toBeTruthy();
  });

  it('TC-361-28: 읽기 전용 상세에서도 Excel 저장 링크를 렌더한다', () => {
    render(<StatementDetail {...base} basePath="/shipper/statements" detail={detail({ status: 'ISSUED', scope: 'RECEIVED' })} />);
    const link = screen.getByRole('link', { name: 'Excel 저장' });
    expect(link.getAttribute('href')).toBe('/api/finance/statements/st-1/export');
    expect(link.hasAttribute('download')).toBe(true);
    expect(screen.queryByRole('button', { name: '발행' })).toBeNull();
  });
});
