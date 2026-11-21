// TASK-B-361 (Issue #1367) T1/T2 — S3 청구서 목록: scope·status별 버튼 노출을 렌더 결과로 단언.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

const m = vi.hoisted(() => ({
  cancel: vi.fn(),
  payment: vi.fn(),
}));

vi.mock('@/app/actions/finance/billing-statements', () => ({
  cancelBillingStatement: (...a: any[]) => m.cancel(...a),
  confirmStatementPayment: (...a: any[]) => m.payment(...a),
  listBillableOrders: vi.fn(),
  listAdhocShipperNames: vi.fn(),
  createBillingStatement: vi.fn(),
  issueBillingStatement: vi.fn(),
}));

vi.mock('next-intl', () => {
  const ko: Record<string, string> = {
    title: '청구서 관리', createButton: '+ 청구서 생성', filterScope: '조회 범위',
    scopeAll: '전체', scopeMine: '내 청구', scopeReceived: '나에게 청구된', scopeSupervised: '감독 조회',
    statusDraft: '초안', statusIssued: '발행', statusClosed: '마감',
    view: '보기', cancel: '취소', confirmPayment: '입금확인', excel: 'Excel 저장',
    colAction: '작업', onlyMineNote: '※본인 생성분만 표시',
  };
  return {
    useTranslations: () => (key: string, params?: Record<string, unknown>) => {
      const base = ko[key] ?? key;
      return params ? base.replace(/\{(\w+)\}/g, (_, k) => String(params[k])) : base;
    },
  };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import StatementsList from '@/components/finance/statements/StatementsList';
import type { StatementListRow } from '@/components/finance/statements/types';

function row(id: string, scope: StatementListRow['scope'], status: string): StatementListRow {
  return {
    id, statementNo: `ST-${id}`, billedName: `대상-${id}`, billedOrgId: `org-${id}`,
    billedPartyType: 'ORG', tier: 'ADMIN_TO_AGENCY', periodYear: 2026, periodMonth: 10,
    roundNo: 1, totalAmount: 1000, status, scope, createdAt: '2026-10-01T00:00:00Z',
  };
}

const base = { basePath: '/finance/statements', locale: 'ko', canCreate: true };
const tbl = () => within(screen.getByRole('table'));

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => cleanup());

describe('S3 청구서 목록 — scope/status별 버튼 노출 (TASK-B-361)', () => {
  it('TC-361-01: 내 청구 DRAFT는 취소를 렌더하고 입금확인은 렌더하지 않는다', () => {
    render(<StatementsList {...base} statements={[row('a', 'MINE', 'DRAFT')]} />);
    expect(tbl().getByText('ST-a')).toBeTruthy();
    expect(tbl().getByRole('button', { name: '취소' })).toBeTruthy();
    expect(tbl().queryByRole('button', { name: '입금확인' })).toBeNull();
    expect(tbl().getAllByText('보기').length).toBe(1);
    expect(tbl().getByText('내 청구')).toBeTruthy();
    expect(tbl().getByText('초안')).toBeTruthy();
  });

  it('TC-361-02: 내 청구 ISSUED는 입금확인을 렌더하고 취소는 렌더하지 않는다', () => {
    render(<StatementsList {...base} statements={[row('b', 'MINE', 'ISSUED')]} />);
    expect(tbl().getByRole('button', { name: '입금확인' })).toBeTruthy();
    expect(tbl().queryByRole('button', { name: '취소' })).toBeNull();
    expect(tbl().getByText('발행')).toBeTruthy();
  });

  it('TC-361-03: 나에게 청구된(읽기 전용) 행은 변형 버튼 없이 보기만 렌더한다', () => {
    render(<StatementsList {...base} basePath="/shipper/statements" canCreate={false} statements={[row('c', 'RECEIVED', 'ISSUED')]} />);
    expect(tbl().getByText('ST-c')).toBeTruthy();
    expect(tbl().getAllByText('보기').length).toBe(1);
    expect(tbl().queryByRole('button', { name: '취소' })).toBeNull();
    expect(tbl().queryByRole('button', { name: '입금확인' })).toBeNull();
    expect(screen.queryByText('+ 청구서 생성')).toBeNull();
    expect(tbl().getByText('나에게 청구된')).toBeTruthy();
  });

  it('TC-361-04: Admin 감독 조회(DRAFT 포함)는 읽기 전용 — 취소/입금확인 미렌더', () => {
    render(<StatementsList {...base} statements={[row('d', 'SUPERVISED', 'DRAFT')]} />);
    expect(tbl().getByText('ST-d')).toBeTruthy();
    expect(tbl().getByText('초안')).toBeTruthy();
    expect(tbl().getByText('감독 조회')).toBeTruthy();
    expect(tbl().queryByRole('button', { name: '취소' })).toBeNull();
    expect(tbl().queryByRole('button', { name: '입금확인' })).toBeNull();
  });

  it('TC-361-05: 조회 범위 필터를 감독 조회로 바꾸면 감독 행만 남는다', () => {
    render(<StatementsList {...base} statements={[row('m', 'MINE', 'DRAFT'), row('s', 'SUPERVISED', 'DRAFT')]} />);
    expect(tbl().getByText('ST-m')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('조회 범위'), { target: { value: 'SUPERVISED' } });
    expect(tbl().queryByText('ST-m')).toBeNull();
    expect(tbl().getByText('ST-s')).toBeTruthy();
  });

  it('TC-361-06: canCreate=true면 생성 링크가, false면 렌더되지 않는다', () => {
    const { unmount } = render(<StatementsList {...base} statements={[]} />);
    expect(screen.getByText('+ 청구서 생성').closest('a')?.getAttribute('href')).toBe('/ko/finance/statements/new');
    unmount();
    render(<StatementsList {...base} canCreate={false} statements={[]} />);
    expect(screen.queryByText('+ 청구서 생성')).toBeNull();
  });

  it('TC-361-07: 취소 클릭은 서버 액션을 호출하고 해당 행을 목록에서 제거한다', async () => {
    m.cancel.mockResolvedValue({ success: true });
    render(<StatementsList {...base} statements={[row('a', 'MINE', 'DRAFT'), row('b', 'MINE', 'DRAFT')]} />);
    fireEvent.click(tbl().getAllByRole('button', { name: '취소' })[0]);
    await waitFor(() => expect(m.cancel).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(tbl().queryByText('ST-a')).toBeNull());
    expect(tbl().getByText('ST-b')).toBeTruthy();
  });

  it('TC-361-26: 내 청구 행은 Excel 저장 링크를 렌더한다', () => {
    render(<StatementsList {...base} statements={[row('x', 'MINE', 'DRAFT')]} />);
    const link = tbl().getByRole('link', { name: 'Excel 저장' });
    expect(link.getAttribute('href')).toBe('/api/finance/statements/x/export');
    expect(link.hasAttribute('download')).toBe(true);
  });

  it('TC-361-27: 읽기 전용(나에게 청구된) 행에서도 Excel 저장 링크를 렌더한다', () => {
    render(<StatementsList {...base} basePath="/shipper/statements" canCreate={false} statements={[row('r', 'RECEIVED', 'ISSUED')]} />);
    expect(tbl().queryByRole('button', { name: '취소' })).toBeNull();
    expect(tbl().getByRole('link', { name: 'Excel 저장' }).getAttribute('href')).toBe('/api/finance/statements/r/export');
  });
});
