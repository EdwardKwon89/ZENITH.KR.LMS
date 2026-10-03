import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

// next/link를 prop 캡처형 스텁으로 교체 — prefetch prop이 실제 Link에
// 전달되는지 behavioral로 검증한다 (DOM에는 prefetch가 드러나지 않으므로).
const seenLinkProps: any[] = [];
vi.mock('next/link', () => ({
  default: (props: any) => {
    seenLinkProps.push(props);
    const { href, children, ...rest } = props;
    return (
      <a href={href} data-prefetch={String(props.prefetch)}>
        {children}
      </a>
    );
  },
}));

import OrderDataTable from '@/components/orders/OrderDataTable';

// TASK-1148 (Issue #1226, DEF-141): 행별 상세 Link prefetch 차단

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

const upsOrder = {
  ...baseOrder,
  id: 'order-ups',
  order_no: 'ZEN-2026-000002',
  transport_mode: 'UPS',
  origin_port: null,
  dest_port: null,
  pickup_country_code: 'KR',
  recipient_country_code: 'TH',
};

function detailLinks() {
  return seenLinkProps.filter((p) => /\/orders\/[^?]+$/.test(p.href) || /\/orders\/[^?]+\/ups-detail$/.test(p.href));
}

function pageLinks() {
  return seenLinkProps.filter((p) => p.href.includes('page='));
}

describe('OrderDataTable prefetch (TASK-1148)', () => {
  beforeEach(() => {
    seenLinkProps.length = 0;
  });

  it('TC-PREF-01: [Success] 행별 상세 Link에 prefetch={false}가 전달되어야 함 (SEA)', () => {
    // When — 실제 컴포넌트 렌더링
    render(
      <OrderDataTable orders={[baseOrder]} totalCount={1} currentPage={1} pageSize={10} locale="ko" />,
    );

    // Then — 상세 Link prop 확인
    const links = detailLinks();
    expect(links.length).toBe(1);
    expect(links[0].href).toBe('/ko/orders/order-001');
    expect(links[0].prefetch).toBe(false);
  });

  it('TC-PREF-02: [Success] UPS 상세 Link에도 prefetch={false}가 전달되어야 함', () => {
    // When
    render(
      <OrderDataTable orders={[upsOrder]} totalCount={1} currentPage={1} pageSize={10} locale="ko" />,
    );

    // Then
    const links = detailLinks();
    expect(links.length).toBe(1);
    expect(links[0].href).toBe('/ko/orders/order-ups/ups-detail');
    expect(links[0].prefetch).toBe(false);
  });

  it('TC-PREF-03: [Guard] 행 수만큼 상세 Link가 모두 차단되어야 함 (폭주 원천 차단)', () => {
    // When — 20행 렌더링 (최대 페이지 규모)
    const orders = Array.from({ length: 20 }, (_, i) => ({ ...baseOrder, id: `order-${i}` }));
    render(<OrderDataTable orders={orders} totalCount={20} currentPage={1} pageSize={20} locale="ko" />);

    // Then — 20개 전부 prefetch=false (하나라도 누락 시 폭주 재발)
    const links = detailLinks();
    expect(links.length).toBe(20);
    expect(links.every((l) => l.prefetch === false)).toBe(true);
  });

  it('TC-PREF-04: [Guard] 페이지네이션 Link는 기본 prefetch를 유지해야 함 (빠른 전환)', () => {
    // When — 2페이지 규모
    render(
      <OrderDataTable orders={[baseOrder]} totalCount={11} currentPage={1} pageSize={10} locale="ko" />,
    );

    // Then — 페이지 Link는 prefetch 미지정(기본값 유지) — 목록 쿼리라 가벼움
    const links = pageLinks();
    expect(links.length).toBe(2);
    expect(links.every((l) => l.prefetch === undefined)).toBe(true);
  });

  it('TC-PREF-05: [Guard] 렌더된 앵커가 정상 동작해야 함 (href 유지)', () => {
    // When
    render(
      <OrderDataTable orders={[baseOrder]} totalCount={1} currentPage={1} pageSize={10} locale="ko" />,
    );

    // Then
    const link = screen.getByText('View Details');
    expect(link.getAttribute('href')).toBe('/ko/orders/order-001');
  });
});
