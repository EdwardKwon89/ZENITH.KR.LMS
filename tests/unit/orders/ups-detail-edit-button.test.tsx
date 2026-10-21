// TASK-B-339 (Issue #1254): UPS 상세 화면 "수정" 버튼 —
//   ① 항상 표시 ② 등록 전이면 링크, 등록 후면 비활성 버튼.
//   ups-detail-b301.test.tsx의 mock 구조를 재사용해 **실제 default export를 렌더**한다 (mock 금지).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const { supabaseMock, labelState, routerBackMock } = vi.hoisted(() => {
  const labelState = { hasActiveLabel: false, trackingNumber: null as string | null };
  const routerBackMock = vi.fn();
  const thenableResolve = (value: any) => {
    const t = Promise.resolve(value);
    const obj: any = Object.assign(t, {
      single: () => Promise.resolve(value),
      maybeSingle: () => Promise.resolve(value),
      select: () => obj,
      eq: () => obj,
      order: () => obj,
      limit: () => obj,
    });
    return obj;
  };
  const supabaseMock = {
    from: (table: string) => {
      let data: any = null;
      if (table === 'zen_organizations') data = { type: 'PLATFORM' };
      if (table === 'zen_order_costs') data = [];
      if (table === 'order_status_history') data = [];
      return thenableResolve({ data, error: null });
    },
  };
  return { supabaseMock, labelState, routerBackMock };
});

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    supabase: supabaseMock,
    profile: { id: 'admin-1', role: 'ADMIN', org_id: 'org-admin' },
  }),
}));
vi.mock('@/lib/auth/rbac', () => ({
  checkPermission: vi.fn().mockReturnValue(false),
  USER_ROLES: {
    ZENITH_SUPER_ADMIN: 'ZENITH_SUPER_ADMIN',
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    OPERATOR: 'OPERATOR',
    CARRIER: 'CARRIER',
    AGENCY: 'AGENCY',
    CORPORATE: 'CORPORATE',
    INDIVIDUAL: 'INDIVIDUAL',
  },
}));
vi.mock('@/app/actions/operations/orders', () => ({
  getOrderDetails: vi.fn(),
  getOrderEditHistory: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/app/actions/operations/tisa', () => ({
  getOrderRateSnapshot: vi.fn().mockResolvedValue({ metadata: {} }),
}));
vi.mock('@/app/actions/operations/ups-labels', () => ({
  getUpsLabelStatus: vi.fn().mockImplementation(async () => ({
    trackingNumber: labelState.trackingNumber,
    hasActiveLabel: labelState.hasActiveLabel,
  })),
}));
vi.mock('@/app/actions/operations/tracking', () => ({
  getUpsTrackingEvents: vi.fn().mockResolvedValue({ events: [] }),
  checkRealtimeUpsTrackingAction: vi.fn(),
  manuallySetOrderDeliveredAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
  useRouter: () => ({ back: routerBackMock }),
}));
vi.mock('next/link', () => ({ default: ({ children, href, title, ...rest }: any) => <a href={href} title={title} {...rest}>{children}</a> }));
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span />,
  Truck: () => <span />,
  FileText: () => <span />,
  User: () => <span />,
  Pencil: () => <span data-testid="pencil-icon" />,
  CheckCircle2: () => <span />,
  Clock: () => <span />,
  RefreshCw: () => <span />,
  ShieldCheck: () => <span />,
  Package: () => <span />,
  Calendar: () => <span />,
  Warehouse: () => <span />,
  Send: () => <span />,
  AlertCircle: () => <span />,
  X: () => <span />,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/ZenUI', () => ({
  ZenCard: ({ children }: any) => <div>{children}</div>,
  ZenBadge: (props: any) => <span>{props.children}</span>,
}));
vi.mock('@/components/ups/UpsPackageItemsModal', () => ({ default: () => <div /> }));
vi.mock('@/components/ups/UpsOrderBreakdownCard', () => ({ default: () => <div data-testid="breakdown-card" /> }));
vi.mock('@/components/orders/UpsActualAdjustmentForm', () => ({ UpsActualAdjustmentForm: () => <div /> }));
vi.mock('@/components/tracking/UpsTrackingEventsList', () => ({ default: () => <div /> }));
vi.mock('@/components/documents/DocumentDownloadButton', () => ({ default: () => <div /> }));
vi.mock('@/components/documents/CommercialInvoicePDF', () => ({ default: () => <div /> }));
vi.mock('@/components/documents/PackingListPDF', () => ({ default: () => <div /> }));
vi.mock('@/components/documents/UpsInvoicePDF', () => ({ default: () => <div /> }));
vi.mock('@/components/orders/UpsTradeDocumentActions', () => ({ default: () => <div /> }));

import UpsOrderDetailPage from '@/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page';
import { getOrderDetails } from '@/app/actions/operations/orders';
import { UPS_REGISTERED_EDIT_BLOCK_MESSAGE } from '@/lib/orders/ups-edit-availability';

const ORDER_ID = 'o1';

const baseOrder = {
  id: ORDER_ID,
  order_no: 'ZEN-2026-000339',
  order_type: 'B2B',
  transport_mode: 'UPS',
  status: 'REGISTERED',
  shipper_id: 'org-s',
  shipper_name: 'MASTER AIR',
  shipper: { name: 'MASTER AIR' },
  recipient_name: 'John Doe',
  cargo_details: {},
  packages: [{ gross_weight: 5, items: [{ item_name: 'Widget', quantity: 1, unit_price: 10 }] }],
  dest_port: null,
};

async function renderPage(order: any) {
  (getOrderDetails as any).mockResolvedValue(order);
  const element = await UpsOrderDetailPage({ params: { locale: 'ko', orderId: ORDER_ID } } as any);
  render(element as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  labelState.hasActiveLabel = false;
  labelState.trackingNumber = null;
  routerBackMock.mockClear();
});

describe('TASK-B-339: UPS 상세 화면 수정 버튼 (Issue #1254)', () => {
  it('TC-BTN-①: REGISTERED + 라벨 없음 → 수정 링크 href=/orders/{id}/edit', async () => {
    await renderPage({ ...baseOrder, status: 'REGISTERED' });

    // 부정 단언 전에 "목록보기" 버튼이 실제로 렌더됐음을 먼저 단언한다
    expect(screen.getByText('목록보기')).toBeTruthy();

    const link = screen.getByText('수정').closest('a');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBe(`/orders/${ORDER_ID}/edit`);
    expect(link!.querySelector('[data-testid="pencil-icon"]')).toBeTruthy();
  });

  it('TC-BTN-②: WAREHOUSED + 라벨 없음 → 수정 링크 + title에 "재실측" 안내', async () => {
    await renderPage({ ...baseOrder, status: 'WAREHOUSED' });

    expect(screen.getByText('목록보기')).toBeTruthy();

    const link = screen.getByText('수정').closest('a');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBe(`/orders/${ORDER_ID}/edit`);
    expect(link!.getAttribute('title')).toContain('재실측');
  });

  it('TC-BTN-③: PACKED + 라벨 없음 → 수정 링크 없음 + aria-disabled 버튼 존재', async () => {
    await renderPage({ ...baseOrder, status: 'PACKED' });

    expect(screen.getByText('목록보기')).toBeTruthy();

    expect(screen.queryByText('수정').closest('a')).toBeNull();
    const button = screen.getByText('수정').closest('button');
    expect(button).toBeTruthy();
    expect(button!.getAttribute('aria-disabled')).toBe('true');
    expect(button!.getAttribute('title')).toBe('현재 상태에서는 수정할 수 없습니다.');
  });

  it('TC-BTN-④: HELD + 활성 라벨 있음 → 수정 링크 없음 + title에 "UPS 등록취소"', async () => {
    labelState.hasActiveLabel = true;
    await renderPage({ ...baseOrder, status: 'HELD' });

    expect(screen.getByText('목록보기')).toBeTruthy();

    expect(screen.queryByText('수정').closest('a')).toBeNull();
    const button = screen.getByText('수정').closest('button');
    expect(button).toBeTruthy();
    expect(button!.getAttribute('aria-disabled')).toBe('true');
    expect(button!.getAttribute('title')).toBe(UPS_REGISTERED_EDIT_BLOCK_MESSAGE);
    expect(button!.getAttribute('title')).toContain('UPS 등록취소');
  });

  it('TC-BTN-⑤: IN_TRANSIT + 활성 라벨 있음 → 등록 사실이 상태보다 우선해 비활성', async () => {
    labelState.hasActiveLabel = true;
    await renderPage({ ...baseOrder, status: 'IN_TRANSIT' });

    expect(screen.getByText('목록보기')).toBeTruthy();
    expect(screen.queryByText('수정').closest('a')).toBeNull();
  });
});
