// TASK-B-361 (Issue #1367) T3 — S4 청구서 생성: truncated/excludedUnsettled 안내, 수기 화주, 페이로드를 렌더·호출로 단언.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

const m = vi.hoisted(() => ({
  listOrders: vi.fn(),
  listNames: vi.fn(),
  create: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@/app/actions/finance/billing-statements', () => ({
  listBillableOrders: (...a: any[]) => m.listOrders(...a),
  listAdhocShipperNames: (...a: any[]) => m.listNames(...a),
  createBillingStatement: (...a: any[]) => m.create(...a),
  cancelBillingStatement: vi.fn(),
  confirmStatementPayment: vi.fn(),
  issueBillingStatement: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: m.push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

vi.mock('next-intl', () => {
  const ko: Record<string, string> = {
    newTitle: '청구서 생성', targetMode: '청구 대상 방식', targetOrg: '등록 화주/대리점', targetAdhoc: '수기 입력 화주',
    target: '청구 대상', filterYear: '년', filterMonth: '월', dateBasis: '기준',
    colBasisDateDelivered: '배송완료일', colBasisDateReleased: '출고확정일',
    dateFrom: '시작일', dateTo: '종료일', lookupOrders: '후보 오더 조회',
    truncatedWarning: '조회 결과가 상한에 도달했습니다. 기간을 좁혀 다시 조회하세요.',
    excludedUnsettled: '미정산 {count}건은 제외됨 — 오더정산으로 이동', goOrderSettlement: '오더정산으로 이동',
    colOrderNo: '오더번호', colShipperName: '오더별 화주명', colWeight: '청구중량(kg)',
    colBaseFreight: '기본운임', colFuelSurcharge: '유류할증료', colSurgeFee: '급증수수료', colOtherCharges: '기타',
    colLineTotal: '금액', selectAll: '전체선택', selectedCount: '선택 {count}건 / 후보 {total}건',
    selectedTotal: '선택 합계 {amount}원', saveDraft: '초안 저장', cancel: '취소',
    similarNames: '유사 화주명 {count}건 — 함께 조회', bizNo: '사업자번호(선택)', shipperName: '화주명',
    dateRequired: '조회 기간(시작·종료)은 필수입니다.', noCandidates: '조회된 후보 오더가 없습니다.',
  };
  return {
    useTranslations: () => (key: string, params?: Record<string, unknown>) => {
      const base = ko[key] ?? key;
      return params ? base.replace(/\{(\w+)\}/g, (_, k) => String(params[k])) : base;
    },
  };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import StatementCreate from '@/components/finance/statements/StatementCreate';

const base = { basePath: '/finance/statements', locale: 'ko', allowAdhoc: false, defaultYear: 2026, defaultMonth: 10, targets: [{ id: 'org1', name: 'B대리점' }] };

const order = {
  orderId: 'o1', orderNo: 'ORD-1', basisDate: '2026-10-05', shipperName: 'C사', agencyName: 'B대리점',
  chargeWeightKg: 12.5, baseFreight: 50000, fuelSurcharge: 3000, surgeFee: 0, otherCharges: 1000, lineTotal: 54000,
};

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => cleanup());

function setDates() {
  fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-10-01' } });
  fireEvent.change(screen.getByLabelText('종료일'), { target: { value: '2026-10-31' } });
}

describe('S4 청구서 생성 (TASK-B-361)', () => {
  it('TC-361-08: 후보 조회가 truncated=true를 반환하면 경고를 렌더한다', async () => {
    m.listOrders.mockResolvedValue({ success: true, orders: [order], total: 1, totalAmount: 54000, excludedUnsettled: 0, truncated: true });
    render(<StatementCreate {...base} />);
    fireEvent.change(screen.getByLabelText('청구 대상'), { target: { value: 'org1' } });
    setDates();
    fireEvent.click(screen.getByRole('button', { name: '후보 오더 조회' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('상한에 도달했습니다'));
  });

  it('TC-361-09: excludedUnsettled 안내와 오더정산 링크를 렌더한다', async () => {
    m.listOrders.mockResolvedValue({ success: true, orders: [order], total: 1, totalAmount: 54000, excludedUnsettled: 3, truncated: false });
    render(<StatementCreate {...base} />);
    fireEvent.change(screen.getByLabelText('청구 대상'), { target: { value: 'org1' } });
    setDates();
    fireEvent.click(screen.getByRole('button', { name: '후보 오더 조회' }));
    await waitFor(() => expect(screen.getByText(/미정산 3건은 제외됨/)).toBeTruthy());
    expect(screen.getByRole('link', { name: '오더정산으로 이동' }).getAttribute('href')).toBe('/ko/settlement');
  });

  it('TC-361-10: 후보 표에 오더별 화주명 열과 값을 렌더한다', async () => {
    m.listOrders.mockResolvedValue({ success: true, orders: [order], total: 1, totalAmount: 54000, excludedUnsettled: 0, truncated: false });
    render(<StatementCreate {...base} />);
    fireEvent.change(screen.getByLabelText('청구 대상'), { target: { value: 'org1' } });
    setDates();
    fireEvent.click(screen.getByRole('button', { name: '후보 오더 조회' }));
    await waitFor(() => expect(screen.getByText('C사')).toBeTruthy());
    const table = screen.getByRole('table');
    expect(within(table).getByText('오더별 화주명')).toBeTruthy();
    expect(within(table).getByText('배송완료일')).toBeTruthy();
    expect(within(table).getByText('ORD-1')).toBeTruthy();
  });

  it('TC-361-11: 대리점은 수기 화주 자동완성과 유사명 칩을 보고, 다른 표기를 선택 재조회한다', async () => {
    m.listNames.mockResolvedValue({
      success: true,
      names: [
        { name: '(주)ABC', normalized: '(주)abc', count: 5, billableCount: 3 },
        { name: 'ABC 주식회사', normalized: 'abc 주식회사', count: 2, billableCount: 1 },
      ],
      truncated: false,
    });
    render(<StatementCreate {...base} allowAdhoc />);
    fireEvent.change(screen.getByLabelText('청구 대상 방식'), { target: { value: 'ADHOC' } });
    fireEvent.change(screen.getByLabelText('화주명'), { target: { value: 'ABC' } });
    await waitFor(() => expect(m.listNames).toHaveBeenCalledWith('ABC'));
    await waitFor(() => expect(screen.getByText('유사 화주명 2건 — 함께 조회')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /ABC 주식회사/ }));
    expect((screen.getByLabelText('화주명') as HTMLInputElement).value).toBe('ABC 주식회사');

    // 값 단언(Jaison 2026-11-22 지시): 공백 압축·양끝 제거·소문자 규칙이 공용 유틸에서 적용되어
    // '  ABC   주식회사  ' → 'abc 주식회사'로 정규화되어 해당 제안이 칩에서 제외된다.
    fireEvent.change(screen.getByLabelText('화주명'), { target: { value: '  ABC   주식회사  ' } });
    await waitFor(() => expect(screen.getByText('유사 화주명 1건 — 함께 조회')).toBeTruthy());
  });

  it('TC-361-12: 읽기 전용 경로(allowAdhoc=false)에는 수기 화주 옵션이 없다', () => {
    render(<StatementCreate {...base} allowAdhoc={false} />);
    const options = Array.from(screen.getByLabelText('청구 대상 방식').querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('등록 화주/대리점');
    expect(options).not.toContain('수기 입력 화주');
  });

  it('TC-361-13: 초안 저장은 서버에 billedTarget·기간·선택 오더만 보내고 상세로 이동한다', async () => {
    m.listOrders.mockResolvedValue({ success: true, orders: [order], total: 1, totalAmount: 54000, excludedUnsettled: 0, truncated: false });
    m.create.mockResolvedValue({ success: true, statementId: 'st-1', statementNo: 'ST-202610-01-1', roundNo: 1 });
    render(<StatementCreate {...base} />);
    fireEvent.change(screen.getByLabelText('청구 대상'), { target: { value: 'org1' } });
    setDates();
    fireEvent.click(screen.getByRole('button', { name: '후보 오더 조회' }));
    await waitFor(() => expect(screen.getByText('ORD-1')).toBeTruthy());
    fireEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[0]); // 첫 행 선택
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
    await waitFor(() => expect(m.create).toHaveBeenCalledWith(expect.objectContaining({
      billedTarget: { type: 'ORG', orgId: 'org1' },
      year: 2026, month: 10, orderIds: ['o1'], periodFrom: '2026-10-01', periodTo: '2026-10-31',
    })));
    expect(m.push).toHaveBeenCalledWith('/ko/finance/statements/st-1');
  });
});
