// TASK-B-301 (Issue #1121): UPS 오더 상세 — ① 상태이력 스텝별 전이 시각 표시 + ② 목록보기(router.back)
// UpsOrderStatusStepper / UpsDetailBackToListButton을 실제 컴포넌트로 렌더해 검증한다.
// (mock 금지 — 화면 렌더 결과를 그대로 확인)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const { supabaseMock, statusHistoryRows, routerBackMock } = vi.hoisted(() => {
  const statusHistoryRows: any[] = [];
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
      if (table === 'order_status_history') data = statusHistoryRows;
      return thenableResolve({ data, error: null });
    },
  };
  return { supabaseMock, statusHistoryRows, routerBackMock };
});

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    supabase: supabaseMock,
    profile: { id: 'admin-1', role: 'ADMIN', org_id: 'org-admin' },
  }),
}));
vi.mock('@/lib/auth/rbac', () => ({ checkPermission: vi.fn().mockReturnValue(false) }));
vi.mock('@/app/actions/operations/orders', () => ({
  getOrderDetails: vi.fn(),
  getOrderEditHistory: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/app/actions/operations/tisa', () => ({
  getOrderRateSnapshot: vi.fn().mockResolvedValue({ metadata: {} }),
}));
vi.mock('@/app/actions/operations/ups-labels', () => ({
  getUpsLabelStatus: vi.fn().mockResolvedValue({ trackingNumber: null, hasActiveLabel: false }),
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
vi.mock('next/link', () => ({ default: ({ children }: any) => <a>{children}</a> }));
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span />,
  Truck: () => <span />,
  FileText: () => <span />,
  User: () => <span />,
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

const baseOrder = {
  id: 'o1',
  order_no: 'ZEN-2026-000073',
  order_type: 'B2B',
  transport_mode: 'UPS',
  status: 'IN_TRANSIT',
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
  const element = await UpsOrderDetailPage({ params: { locale: 'ko', orderId: 'o1' } } as any);
  render(element as any);
}

describe('TASK-B-301 ①: 스테퍼 단계별 전이 시각 표시', () => {
  beforeEach(() => {
    statusHistoryRows.length = 0;
    routerBackMock.mockClear();
    vi.clearAllMocks();
  });

  it('도달 단계(REGISTERED/WAREHOUSED/PACKED) 시각 표시 + 재방문 시 최신 시각 우선 + 미도달 단계 미표시', async () => {
    statusHistoryRows.push(
      { prev_status: null, next_status: 'REGISTERED', created_at: '2026-08-13T13:39:55.000Z' },
      { prev_status: 'REGISTERED', next_status: 'WAREHOUSED', created_at: '2026-08-13T13:40:28.000Z' },
      { prev_status: 'WAREHOUSED', next_status: 'PACKED', created_at: '2026-08-13T13:40:47.000Z' },
      { prev_status: 'PACKED', next_status: 'WAREHOUSED', created_at: '2026-08-13T13:42:41.000Z' },
    );
    await renderPage(baseOrder);

    const regTime = new Date('2026-08-13T13:39:55.000Z').toLocaleString('ko-KR');
    const latestWhTime = new Date('2026-08-13T13:42:41.000Z').toLocaleString('ko-KR');
    const olderWhTime = new Date('2026-08-13T13:40:28.000Z').toLocaleString('ko-KR');
    const packedTime = new Date('2026-08-13T13:40:47.000Z').toLocaleString('ko-KR');

    expect(screen.getByText(regTime)).toBeTruthy();
    expect(screen.getByText(latestWhTime)).toBeTruthy();
    expect(screen.getByText(packedTime)).toBeTruthy();
    // 같은 상태 재방문(22:42:41)이므로 이전 시각(22:40:28)은 표시되면 안 됨
    expect(screen.queryByText(olderWhTime)).toBeNull();
    // 미도달 단계(RELEASED 등) 미표시 — 표시된 시각은 정확히 3개
    expect(screen.getAllByText(/^\d{4}\./)).toHaveLength(3);
  });

  it('statusHistory가 비어 있으면 어느 단계에도 시각 미표시', async () => {
    await renderPage(baseOrder);
    expect(screen.queryByText(/^\d{4}\./)).toBeNull();
  });
});

describe('TASK-B-301 ②: 목록보기 버튼 (router.back)', () => {
  beforeEach(() => {
    statusHistoryRows.length = 0;
    routerBackMock.mockClear();
    vi.clearAllMocks();
  });

  it('"목록보기" 버튼 노출 + 클릭 시 router.back 호출', async () => {
    await renderPage(baseOrder);

    const btn = screen.getByText('목록보기');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(routerBackMock).toHaveBeenCalledTimes(1);
  });

  it('기존 "일반 오더 상세 보기로 이동" Link는 제거됨', async () => {
    await renderPage(baseOrder);
    expect(screen.queryByText('일반 오더 상세 보기로 이동')).toBeNull();
  });
});
