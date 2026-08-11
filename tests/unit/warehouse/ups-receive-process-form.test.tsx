import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

const translations: Record<string, string> = {
  confirm_btn: 'UPS 등록 확정',
  registering: 'UPS 등록 중...',
  success_msg: 'UPS 등록이 완료되었습니다.',
  error_none_selected: 'UPS 등록할 오더를 선택해주세요.',
  partial_success: 'UPS 등록 완료: {success}건 성공, {fail}건 실패',
  recent_fail_badge: '⚠ 최근 등록 실패',
  result_title: 'UPS 등록 결과',
  result_summary: '{success}건 성공 · {fail}건 실패',
  result_success_badge: '성공',
  result_fail_badge: '실패',
  result_edit_link: '수정하기 →',
  result_confirm: '확인',
  today_history: '오늘의 UPS 접수 이력',
  empty_history: '오늘 UPS 접수된 내역이 없습니다.',
  undo_title: 'UPS 등록취소',
  undo_desc: '이 오더의 UPS 등록을 취소하고 WAREHOUSED로 되돌리시겠습니까?',
  undo_confirm: '등록취소 확정',
  undo_success: 'UPS 등록취소가 완료되었습니다.',
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: any) => {
    const tpl = translations[key] || key;
    if (params) {
      return tpl.replace(/\{(\w+)\}/g, (_m: string, k: string) => String(params[k] ?? `{${k}}`));
    }
    return tpl;
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/app/actions/operations', () => ({
  getWarehousedOrders: vi.fn(),
  getTodayUpsHistory: vi.fn(),
  getLatestUpsLabelErrors: vi.fn(),
  confirmUpsRegistration: vi.fn(),
  undoUpsRegistration: vi.fn(),
}));

import { getWarehousedOrders, getTodayUpsHistory, getLatestUpsLabelErrors, confirmUpsRegistration } from '@/app/actions/operations';
import { toast } from 'sonner';

function makeOrder(overrides: Partial<any> = {}) {
  return {
    id: 'order-1',
    order_no: 'ZEN-285-001',
    shipper: { name: 'Test Shipper' },
    dest_port: { code: 'ICN' },
    order_packages: [],
    ...overrides,
  };
}

async function renderForm() {
  const { default: UpsReceiveProcessForm } = await import('@/components/warehouse/UpsReceiveProcessForm');
  render(<UpsReceiveProcessForm locale="ko" />);
  await waitFor(() => expect(getWarehousedOrders).toHaveBeenCalled());
}

describe('TASK-B-285 (Issue #1071): UPS 등록 실패 상세 노출', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTodayUpsHistory).mockResolvedValue({ success: true, items: [] } as any);
  });

  it('TC-285-21: 최근 등록 실패가 있는 오더에 큐 인라인 배지 표시, 없는 오더엔 미표시', async () => {
    vi.mocked(getWarehousedOrders).mockResolvedValue({
      success: true,
      orders: [makeOrder({ id: 'o-fail', order_no: 'ZEN-FAIL' }), makeOrder({ id: 'o-ok', order_no: 'ZEN-OK' })],
    } as any);
    vi.mocked(getLatestUpsLabelErrors).mockResolvedValue({
      success: true,
      errors: { 'o-fail': { id: 'e1', error_message: '收件人城市不能为空' } },
    } as any);

    await renderForm();

    expect(await screen.findByText('⚠ 최근 등록 실패')).toBeTruthy();
    expect(screen.getAllByText('⚠ 최근 등록 실패')).toHaveLength(1);
    // 오더 2건 모두 정상 렌더
    expect(screen.getByText('ZEN-FAIL')).toBeTruthy();
    expect(screen.getByText('ZEN-OK')).toBeTruthy();
  });

  it('TC-285-22: 배치 등록 부분 실패 → 결과 모달에 성공/실패 뱃지 + 실패 사유 + 수정 링크', async () => {
    vi.mocked(getWarehousedOrders).mockResolvedValue({
      success: true,
      orders: [makeOrder({ id: 'o-fail', order_no: 'ZEN-FAIL' }), makeOrder({ id: 'o-ok', order_no: 'ZEN-OK' })],
    } as any);
    vi.mocked(getLatestUpsLabelErrors).mockResolvedValue({ success: true, errors: {} } as any);
    vi.mocked(confirmUpsRegistration)
      .mockResolvedValueOnce({ success: false, error: '收件人邮编不能为空' } as any)
      .mockResolvedValueOnce({ success: true, data: { shxk_order_id: 'SHXK-1' } } as any);

    await renderForm();

    // 오더 카드 클릭으로 선택 후 등록 확정 (div 기반 선택 UI)
    fireEvent.click(screen.getByText('ZEN-FAIL'));
    fireEvent.click(screen.getByText('ZEN-OK'));
    fireEvent.click(screen.getByRole('button', { name: /UPS 등록 확정/ }));

    // 결과 모달 표시
    expect(await screen.findByText('UPS 등록 결과')).toBeTruthy();
    expect(await screen.findByText('성공')).toBeTruthy();
    expect(screen.getByText('실패')).toBeTruthy();
    // 실패 사유 표시
    expect(screen.getByText('收件人邮编不能为空')).toBeTruthy();
    // 수정 링크 → /orders/o-fail/edit
    const link = screen.getByRole('link', { name: '수정하기 →' });
    expect(link.getAttribute('href')).toBe('/orders/o-fail/edit');
    // 성공 오더엔 링크 없음
    expect(screen.getAllByRole('link', { name: '수정하기 →' })).toHaveLength(1);
    // toast.warning 호출
    expect(toast.warning).toHaveBeenCalledWith('UPS 등록 완료: 1건 성공, 1건 실패');
  });

  it('TC-285-23: 배치 등록 전체 성공 → 모달 미표시 + toast.success', async () => {
    vi.mocked(getWarehousedOrders).mockResolvedValue({
      success: true,
      orders: [makeOrder({ id: 'o-ok1', order_no: 'ZEN-OK1' })],
    } as any);
    vi.mocked(getLatestUpsLabelErrors).mockResolvedValue({ success: true, errors: {} } as any);
    vi.mocked(confirmUpsRegistration).mockResolvedValue({ success: true, data: { shxk_order_id: 'SHXK-1' } } as any);

    await renderForm();

    fireEvent.click(screen.getByText('ZEN-OK1'));
    fireEvent.click(screen.getByRole('button', { name: /UPS 등록 확정/ }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('UPS 등록이 완료되었습니다.'));
    expect(screen.queryByText('UPS 등록 결과')).toBeNull();
  });

  it('TC-285-24: 결과 모달에서 실패 오더 재조회 시 에러 조회 N+1 없이 일괄 1회 호출', async () => {
    const orders = [makeOrder({ id: 'o-a', order_no: 'ZEN-A' }), makeOrder({ id: 'o-b', order_no: 'ZEN-B' })];
    vi.mocked(getWarehousedOrders).mockResolvedValue({ success: true, orders } as any);
    vi.mocked(getLatestUpsLabelErrors).mockResolvedValue({ success: true, errors: {} } as any);

    await renderForm();

    // 첫 로드에서 orderIds 일괄 1회만 호출
    expect(getLatestUpsLabelErrors).toHaveBeenCalledTimes(1);
    const [firstCallIds] = vi.mocked(getLatestUpsLabelErrors).mock.calls[0];
    expect(firstCallIds).toEqual(['o-a', 'o-b']);
  });
});
