import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'ko' }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      title: '출고확정',
      select_orders: '출고확정할 오더 선택',
      search_placeholder: '오더번호로 검색',
      select_all: '전체 선택',
      deselect_all: '전체 해제',
      confirm_btn: '출고확정 처리',
      today_history: '오늘의 출고확정 이력',
      empty_history: '이력 없음',
      undo_btn: '출고확정취소',
      undo_title: '출고확정취소',
      undo_desc: '취소 확인',
      undo_confirm: '취소 확정',
      undo_success: '취소 완료',
      undo_failed: '취소 실패',
    };
    return map[key] || key;
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/app/actions/operations', () => ({
  getReleasedOrders: vi.fn().mockResolvedValue({ success: true, orders: [] }),
  confirmDeparture: vi.fn(),
  undoDeparture: vi.fn().mockResolvedValue({ success: true }),
  getTodayDepartureHistory: vi.fn().mockResolvedValue({
    success: true,
    items: [
      {
        id: 'hist-001',
        order_id: 'order-001',
        created_at: '2026-07-26T10:00:00Z',
        order: {
          id: 'order-001',
          order_no: 'ORD-001',
          status: 'IN_TRANSIT',
          recipient_name: 'Kim',
          order_packages: [],
        },
      },
    ],
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} />, tr: (p: any) => <tr {...p} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('DepartureConfirmForm undo button visibility', () => {
  it('shows undo button for history items even without UPS label', async () => {
    const { default: DepartureConfirmForm } = await import('@/components/warehouse/DepartureConfirmForm');
    render(<DepartureConfirmForm locale="ko" />);

    await waitFor(() => {
      const btn = screen.getByText('출고확정취소');
      expect(btn).toBeTruthy();
    });
  });
});
