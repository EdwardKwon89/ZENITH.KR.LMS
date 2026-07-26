import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const dict: Record<string, string> = {
      scan_placeholder: '바코드 또는 오더번호를 스캔/입력하세요',
      search_btn: '조회',
      order_info: '오더 정보',
      route: '운송 경로',
    };
    return dict[key] || key;
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/app/actions/operations', () => ({
  getOrderByBarcodeOrNo: vi.fn(),
  confirmInbound: vi.fn(),
  saveInboundMeasurements: vi.fn(),
  getTodayInboundHistory: vi.fn().mockResolvedValue([]),
  cancelInbound: vi.fn(),
}));

function makeOrder(overrides: Partial<any> = {}) {
  return {
    id: 'order-1',
    order_no: 'ZEN-TEST-001',
    status: 'SCHEDULED',
    shipper: { name: 'Test Shipper' },
    origin_port: null,
    dest_port: null,
    shipper_country_code: null,
    recipient_country_code: null,
    items: [],
    packages: [],
    ...overrides,
  };
}

async function searchOrder(orderNo: string) {
  const { default: InboundProcessForm } = await import('@/components/warehouse/InboundProcessForm');
  render(<InboundProcessForm locale="ko" />);
  const input = screen.getByPlaceholderText('바코드 또는 오더번호를 스캔/입력하세요');
  fireEvent.change(input, { target: { value: orderNo } });
  fireEvent.click(screen.getByRole('button', { name: '조회' }));
}

describe('DEF-B-012: 운송경로 UPS 오더 country_code 폴백', () => {
  it('UPS 오더: port 없이 country_code로 표시', async () => {
    const { getOrderByBarcodeOrNo } = await import('@/app/actions/operations');
    vi.mocked(getOrderByBarcodeOrNo).mockResolvedValueOnce(
      makeOrder({ shipper_country_code: 'KR', recipient_country_code: 'US' }) as any
    );

    await searchOrder('ZEN-TEST-001');

    await waitFor(() => {
      expect(screen.getByText(/KR/)).toBeInTheDocument();
      expect(screen.getByText(/US/)).toBeInTheDocument();
    });
  });

  it('AIR 오더: port 코드가 country_code보다 우선 표시 (회귀)', async () => {
    const { getOrderByBarcodeOrNo } = await import('@/app/actions/operations');
    vi.mocked(getOrderByBarcodeOrNo).mockResolvedValueOnce(
      makeOrder({
        origin_port: { code: 'ICN' },
        dest_port: { code: 'LAX' },
        shipper_country_code: 'KR',
        recipient_country_code: 'US',
      }) as any
    );

    await searchOrder('ZEN-TEST-001');

    await waitFor(() => {
      expect(screen.getByText(/ICN/)).toBeInTheDocument();
      expect(screen.getByText(/LAX/)).toBeInTheDocument();
      expect(screen.queryByText(/^KR$/)).not.toBeInTheDocument();
    });
  });

  it('포트도 국가코드도 없으면 "-" 표시', async () => {
    const { getOrderByBarcodeOrNo } = await import('@/app/actions/operations');
    vi.mocked(getOrderByBarcodeOrNo).mockResolvedValueOnce(makeOrder() as any);

    await searchOrder('ZEN-TEST-001');

    await waitFor(() => {
      expect(screen.getByText('오더 정보')).toBeInTheDocument();
    });
    const routeLabel = screen.getByText('운송 경로');
    const routeValue = routeLabel.parentElement?.querySelector('span.font-semibold');
    expect(routeValue?.textContent).toBe('--');
  });
});
