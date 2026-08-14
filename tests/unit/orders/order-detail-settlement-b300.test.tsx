// TASK-B-300 (Issue #1119) ③ 회귀 방지: ups-detail에서만 Settlement Preview(OrderFinanceSummary) 제거,
// 일반 오더 상세 화면(orders/[orderId]/page.tsx)에는 여전히 정상 표시되는지 서버 컴포넌트 렌더로 검증.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const { supabaseMock } = vi.hoisted(() => {
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
  return {
    supabaseMock: {
      from: (table: string) => {
        let data: any = null;
        if (table === 'zen_organizations') data = { type: 'PLATFORM' };
        if (table === 'zen_order_costs') data = [];
        return thenableResolve({ data, error: null });
      },
    },
  };
});

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    supabase: supabaseMock,
    profile: { id: 'admin-1', role: 'ADMIN', org_id: 'org-admin' },
  }),
  checkPermission: vi.fn().mockReturnValue(false),
}));
vi.mock('@/app/actions/orders', () => ({ getOrderDetails: vi.fn() }));
vi.mock('@/app/actions/tracking', () => ({
  getTrackingEvents: vi.fn().mockResolvedValue({ events: [] }),
  getTrackingRawLogs: vi.fn().mockResolvedValue({ logs: [] }),
}));
vi.mock('@/app/actions/customs', () => ({
  getDeclarations: vi.fn().mockResolvedValue({ declarations: [] }),
}));
vi.mock('@/app/actions/operations', () => ({
  getOrderRateSnapshot: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/app/actions/operations/ups-labels', () => ({
  getUpsLabelStatus: vi.fn().mockResolvedValue({ hasActiveLabel: false, trackingNumber: null }),
}));
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ children }: any) => <a>{children}</a> }));
vi.mock('lucide-react', () => ({
  Package: () => <span />,
  MapPin: () => <span />,
  Truck: () => <span />,
  ShieldCheck: () => <span />,
  FileText: () => <span />,
  Pencil: () => <span />,
}));
vi.mock('@/components/orders/OrderTisaDashboard', () => ({ OrderTisaDashboard: () => <div /> }));
vi.mock('@/components/orders/OrderQnaSection', () => ({ OrderQnaSection: () => <div /> }));
vi.mock('@/components/orders/OrderMainTabs', () => ({ OrderMainTabs: () => <div /> }));
vi.mock('@/components/tracking/TrackingTimeline', () => ({ default: () => <div /> }));
vi.mock('@/components/tracking/AdminTrackingControl', () => ({ default: () => <div /> }));
vi.mock('@/components/tracking/RawLogViewer', () => ({ default: () => <div /> }));
vi.mock('@/components/finance/OrderFinanceSummary', () => ({
  default: () => <div data-testid="settlement-preview">Settlement Preview</div>,
}));
vi.mock('@/components/routing/RouteOptimizationSection', () => ({ default: () => <div /> }));
vi.mock('@/components/routing/RouteConsistencyBadge', () => ({ default: () => <div /> }));
vi.mock('@/components/voc/OrderVocTrigger', () => ({ OrderVocTrigger: () => <div /> }));
vi.mock('@/components/documents/DocumentDownloadButton', () => ({ default: () => <div /> }));
vi.mock('@/components/documents/CommercialInvoicePDF', () => ({ default: () => <div /> }));
vi.mock('@/components/documents/PackingListPDF', () => ({ default: () => <div /> }));
vi.mock('@/components/documents/UpsInvoicePDF', () => ({ default: () => <div /> }));
vi.mock('@/components/customs/OrderCustomsSection', () => ({ default: () => <div /> }));
vi.mock('@/components/customs/OrderCustomsAdminControl', () => ({ default: () => <div /> }));
vi.mock('@/components/claims/OrderClaimTrigger', () => ({ OrderClaimTrigger: () => <div /> }));
vi.mock('@/components/orders/UpsTradeDocumentActions', () => ({ default: () => <div /> }));
vi.mock('@/components/orders/UpsActualAdjustmentForm', () => ({ UpsActualAdjustmentForm: () => <div /> }));

import OrderDetailPage from '@/app/[locale]/(dashboard)/orders/[orderId]/page';
import { getOrderDetails } from '@/app/actions/orders';

const order = {
  id: 'o1',
  order_no: 'ZEN-0001',
  order_type: 'B2B',
  transport_mode: 'AIR',
  status: 'DELIVERED',
  shipper_id: 'org-s',
  shipper_name: 'MASTER AIR',
  recipient_name: 'John Doe',
  recipient_address: '123 Main St',
  origin_port: { code: 'ICN', name: 'Incheon' },
  dest_port: { code: 'LAX', name: 'Los Angeles' },
  packages: [{
    id: 'p1', packing_unit: 'BOX', physical_box_count: 1, gross_weight: 5,
    items: [{ id: 'i1', item_name: 'Widget', quantity: 1, unit_price: 10 }],
  }],
  total_gross_weight: 5,
  total_volume: 0.01,
  cargo_details: {},
};

describe('TASK-B-300 ③ 회귀 방지: 일반 오더 상세 화면 Settlement Preview 유지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('일반 orders/[orderId]/page.tsx 렌더링 시 Settlement Preview 여전히 표시', async () => {
    (getOrderDetails as any).mockResolvedValue(order);
    const element = await OrderDetailPage({ params: { locale: 'ko', orderId: 'o1' } } as any);
    render(element as any);

    expect(screen.getByTestId('settlement-preview')).toBeTruthy();
    expect(screen.getByText('Settlement Preview')).toBeTruthy();
  });
});
