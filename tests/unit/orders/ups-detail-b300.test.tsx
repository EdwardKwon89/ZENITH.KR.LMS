// TASK-B-300 (Issue #1119): UPS 오더 상세 화면 개선 — ② 배송 기본 정보 카드 확장 + ③ Settlement Preview 제거
// 서버 컴포넌트(UpsOrderDetailPage)를 RTL로 렌더링해 실제 화면 렌더 결과를 검증한다.
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
}));
vi.mock('next/navigation', () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ children }: any) => <a>{children}</a> }));
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span />,
  Truck: () => <span />,
  FileText: () => <span />,
  User: () => <span />,
}));
vi.mock('@/components/ui/ZenUI', () => ({
  ZenCard: ({ children }: any) => <div>{children}</div>,
  ZenBadge: (props: any) => <span>{props.children}</span>,
}));
vi.mock('@/components/ups/UpsOrderStatusStepper', () => ({ default: () => <div /> }));
vi.mock('@/components/ups/UpsDetailBackToListButton', () => ({ default: () => <div /> }));
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

describe('TASK-B-300 ②: 배송 기본 정보 카드 화주/수하인 연락처·이메일·주소 확장', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('값이 있을 때 화주 연락처/이메일/주소(detail 이어붙임)와 수하인 연락처/이메일/주소 표시', async () => {
    await renderPage({
      ...baseOrder,
      shipper_contact_phone: '010-1234-5678',
      shipper_contact_email: 'shipper@test.kr',
      shipper_address: '서울 강남구',
      shipper_address_detail: '테헤란로 123',
      recipient_contact: '001-555-0101',
      recipient_email: 'john@example.com',
      recipient_address: '123 Main St',
    });

    expect(screen.getByText('연락처: 010-1234-5678')).toBeTruthy();
    expect(screen.getByText('이메일: shipper@test.kr')).toBeTruthy();
    expect(screen.getByText('주소: 서울 강남구 테헤란로 123')).toBeTruthy();
    expect(screen.getByText('연락처: 001-555-0101')).toBeTruthy();
    expect(screen.getByText('이메일: john@example.com')).toBeTruthy();
    expect(screen.getByText('주소: 123 Main St')).toBeTruthy();
  });

  it('recipient_phone 폴백 (recipient_contact 없을 때)', async () => {
    await renderPage({
      ...baseOrder,
      shipper_contact_phone: '010-1234-5678',
      recipient_phone: '010-2222-3333',
      recipient_address: '123 Main St',
    });

    expect(screen.getByText('연락처: 010-2222-3333')).toBeTruthy();
  });

  it('값이 없으면 연락처/이메일/주소 항목 자체가 노출되지 않음 (빈 줄 미노출)', async () => {
    await renderPage(baseOrder);

    expect(screen.queryByText(/^연락처:/)).toBeNull();
    expect(screen.queryByText(/^이메일:/)).toBeNull();
    expect(screen.queryByText(/^주소:/)).toBeNull();
    expect(screen.getByText('주문 상태')).toBeTruthy();
  });
});

describe('TASK-B-300 ③: ups-detail 페이지에서 Settlement Preview 제거', () => {
  it('ups-detail 페이지 렌더링 시 "Settlement Preview" 텍스트 미출현', async () => {
    await renderPage(baseOrder);

    expect(screen.queryByText('Settlement Preview')).toBeNull();
  });
});
