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

import OrderDataTable, { resolveRouteCodes } from '@/components/orders/OrderDataTable';
import { ZenStatusBadge } from '@/components/domain/ZenStatusBadge';
import { OrderStatus } from '@/types/orders';

// TASK-1146 (Issue #1221, DEF-139): 배지 개행 방지 + UPS ROUTE 폴백
// - DOM 렌더링 결과 검증이 중심인 behavioral 테스트다.
// - 단, jsdom은 CSS computed style을 계산하지 못하므로 nowrap은 클래스 존재로
//   검증하고, 실제 시각 확인은 R-10 스크린샷(before/after)으로 갈음한다.

const baseOrder = {
  id: 'order-001',
  order_no: 'ZEN-2026-000001',
  order_type: 'STANDARD',
  created_at: '2026-10-01T09:00:00.000Z',
  shipper: { name: 'Master air' },
  shipper_name: null,
  recipient_name: 'John Doe',
  origin_port: { code: 'ICN' },
  dest_port: { code: 'LAX' },
  status: 'CREATED',
  transport_mode: 'SEA',
  billing_status: 'PENDING',
};

const props = {
  orders: [baseOrder],
  totalCount: 1,
  currentPage: 1,
  pageSize: 10,
  locale: 'ko',
};

describe('OrderDataTable 배지·ROUTE (TASK-1146)', () => {
  it('TC-ORDLIST-07: [Guard] STATUS 배지에 줄바꿈 방지 클래스가 있어야 함', () => {
    // When — 실제 배지 렌더링
    const { container } = render(
      <ZenStatusBadge status={'CREATED' as OrderStatus} />,
    );

    // Then — jsdom 한계로 클래스 존재 검증 (시각 증적은 R-10 스크린샷)
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('whitespace-nowrap');
  });

  it('TC-ORDLIST-08: [Guard] 목록의 STATUS·BILLING 배지에 줄바꿈 방지 클래스가 있어야 함', () => {
    // When
    const { container } = render(<OrderDataTable {...props} />);

    // Then — BILLING 배지(rounded-full)와 STATUS 배지(font-bold+border, rounded-full 제외)에 nowrap
    const billing = container.querySelector('span.rounded-full');
    expect(billing?.className).toContain('whitespace-nowrap');
    const statusBadge = container.querySelector('span.font-bold.border:not(.rounded-full)');
    expect(statusBadge?.textContent?.trim().length).toBeGreaterThan(0);
    expect(statusBadge?.className).toContain('whitespace-nowrap');
  });

  it('TC-ORDLIST-09: [Success] UPS 오더(항구 없음)는 국가 코드로 ROUTE가 표시되어야 함', () => {
    // Given — production 실측 형태 (port NULL, KR→TH 보유)
    const upsOrder = {
      ...baseOrder,
      id: 'order-ups',
      transport_mode: 'UPS',
      origin_port: null,
      dest_port: null,
      pickup_country_code: 'KR',
      recipient_country_code: 'TH',
    };

    // When — 실제 테이블 렌더링
    const { container } = render(<OrderDataTable {...props} orders={[upsOrder]} />);

    // Then
    expect(container.textContent).toContain('KR');
    expect(container.textContent).toContain('TH');
  });

  it('TC-ORDLIST-10: [Guard] 非-UPS 오더(항구 없음)에는 국가 폴백을 적용하지 않아야 함', () => {
    // Given
    const seaOrder = {
      ...baseOrder,
      transport_mode: 'SEA',
      origin_port: null,
      dest_port: null,
      pickup_country_code: 'KR',
      recipient_country_code: 'TH',
    };

    // When
    const { container } = render(<OrderDataTable {...props} orders={[seaOrder]} />);

    // Then — 폴백 미적용 (기존 빈 배지 동작 유지)
    expect(container.textContent).not.toContain('KR');
    expect(container.textContent).not.toContain('TH');
  });

  it('TC-ORDLIST-11: [Guard] 항구가 하나라도 있으면 폴백 없이 항구 코드를 유지해야 함', () => {
    // Then — 단위 함수로 경계 고정
    expect(resolveRouteCodes({ origin_port: { code: 'ICN' }, dest_port: null, transport_mode: 'UPS', pickup_country_code: 'KR', recipient_country_code: 'TH' })).toEqual(['ICN', undefined]);
    expect(resolveRouteCodes({ origin_port: null, dest_port: null, transport_mode: 'UPS', pickup_country_code: 'KR', recipient_country_code: 'TH' })).toEqual(['KR', 'TH']);
    expect(resolveRouteCodes({ origin_port: null, dest_port: null, transport_mode: 'SEA', pickup_country_code: 'KR', recipient_country_code: 'TH' })).toEqual([undefined, undefined]);
    expect(resolveRouteCodes({ origin_port: null, dest_port: null, transport_mode: 'UPS', pickup_country_code: null, recipient_country_code: null })).toEqual([undefined, undefined]);
  });
});
