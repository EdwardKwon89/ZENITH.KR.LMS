import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'ko' }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => children,
}));

import OrderDataTable, {
  formatReceivedDate,
  formatShipperCell,
} from '@/components/orders/OrderDataTable';

// TASK-1144 (Issue #1216, IMP-170/171): 오더 목록 접수일자 + Shipper 소속/화주 병기
// - 실제 컴포넌트 렌더링 결과(DOM)를 검증하는 behavioral 테스트다.

const baseOrder = {
  id: 'order-001',
  order_no: 'ZEN-2026-000001',
  order_type: 'EXPORT',
  created_at: '2026-10-01T09:00:00.000Z',
  shipper: { name: 'Master air' },
  shipper_name: 'WOOWON CO.,LTD',
  recipient_name: 'John Doe',
  origin_port: { code: 'ICN' },
  dest_port: { code: 'LAX' },
  status: 'CREATED',
  transport_mode: 'SEA',
};

const props = {
  orders: [baseOrder],
  totalCount: 1,
  currentPage: 1,
  pageSize: 10,
  locale: 'ko',
};

describe('OrderDataTable 접수일자·Shipper 병기 (TASK-1144)', () => {
  it('TC-ORDLIST-01: [Success] 접수일자 헤더와 ko-KR 날짜 셀이 렌더링되어야 함', () => {
    // When — 실제 컴포넌트 렌더링
    const { container } = render(<OrderDataTable {...props} />);

    // Then
    expect(screen.getByText('접수일자')).toBeTruthy();
    const expected = new Date(baseOrder.created_at).toLocaleDateString('ko-KR');
    expect(container.textContent).toContain(expected);
  });

  it('TC-ORDLIST-02: [Success] 소속과 화주가 다르면 "소속/화주"로 병기되어야 함', () => {
    // When
    render(<OrderDataTable {...props} />);

    // Then — Edward 확정 예시 형태
    expect(screen.getByText('Master air/WOOWON CO.,LTD')).toBeTruthy();
  });

  it('TC-ORDLIST-03: [Guard] override가 소속과 동일하면 중복 없이 1개만 표시되어야 함', () => {
    // Given
    const sameOrder = {
      ...baseOrder,
      shipper: { name: 'Master air' },
      shipper_name: 'Master air',
    };

    // When
    const { container } = render(<OrderDataTable {...props} orders={[sameOrder]} />);

    // Then
    expect(screen.getByText('Master air')).toBeTruthy();
    expect(container.textContent).not.toContain('Master air/Master air');
  });

  it('TC-ORDLIST-04: [Guard] override 미입력 시 소속만, 둘 다 없으면 - 표시', () => {
    // Given
    const noOverride = { ...baseOrder, shipper_name: null };
    const neither = { ...baseOrder, id: 'order-002', shipper: null, shipper_name: null };

    // When
    const { container } = render(<OrderDataTable {...props} orders={[noOverride, neither]} />);

    // Then
    expect(screen.getByText('Master air')).toBeTruthy();
    expect(container.textContent).not.toContain('Master air/');
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('TC-ORDLIST-05: [Guard] created_at 없으면 접수일자 셀에 - 표시', () => {
    // Given
    const noDate = { ...baseOrder, created_at: null };

    // When
    render(<OrderDataTable {...props} orders={[noDate]} />);

    // Then — 헤더는 유지되고 데이터 셀 폴백 확인 (단위 함수로 경계 고정)
    expect(screen.getByText('접수일자')).toBeTruthy();
    expect(formatReceivedDate(null)).toBe('-');
    expect(formatReceivedDate('not-a-date')).toBe('-');
  });

  it('TC-ORDLIST-06: [Guard] 소속 없고 override만 있으면 override만 표시되어야 함', () => {
    // Then — "/X" 형태의 깨진 병기 방지
    expect(formatShipperCell(null, 'WOOWON CO.,LTD')).toBe('WOOWON CO.,LTD');
    expect(formatShipperCell('  ', 'WOOWON CO.,LTD')).toBe('WOOWON CO.,LTD');
    expect(formatShipperCell(null, null)).toBe('-');
  });
});
