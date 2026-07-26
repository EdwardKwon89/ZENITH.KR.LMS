import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'ko' }),
}));

vi.mock('@/app/actions/tracking', () => ({
  getGlobalTrackingOverview: vi.fn().mockResolvedValue({
    configs: [
      {
        order_id: 'order-123',
        tracking_no: 'TRACK-001',
        latest_event: { event_code: 'IN_TRANSIT', location: 'Seoul' },
        updated_at: '2026-07-23T10:00:00Z',
        order: { order_no: 'ZEN-2026-000001' },
      },
    ],
  }),
  syncExternalTracking: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => <div {...props} />,
    tr: (props: any) => <tr {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('DEF-121: TrackingDashboard Detail locale prefix', () => {
  it('Detail link contains /ko/ locale prefix', async () => {
    const { default: TrackingDashboard } = await import('@/components/tracking/TrackingDashboard');
    render(<TrackingDashboard />);

    await waitFor(() => {
      const link = screen.getByText('Detail').closest('a');
      expect(link).toBeTruthy();
      expect(link?.getAttribute('href')).toBe('/ko/orders/order-123');
    });
  });

  it('Detail link does NOT use bare /orders/ path', async () => {
    const { default: TrackingDashboard } = await import('@/components/tracking/TrackingDashboard');
    render(<TrackingDashboard />);

    await waitFor(() => {
      const link = screen.getByText('Detail').closest('a');
      expect(link?.getAttribute('href')).not.toBe('/orders/order-123');
    });
  });

  it('UPS order Detail link routes to /ups-detail', async () => {
    const { getGlobalTrackingOverview } = await import('@/app/actions/tracking');
    vi.mocked(getGlobalTrackingOverview).mockResolvedValueOnce({
      configs: [
        {
          order_id: 'order-456',
          tracking_no: 'TRACK-UPS-001',
          latest_event: { event_code: 'PICKED_UP', location: 'Incheon' },
          updated_at: '2026-07-24T12:00:00Z',
          order: { order_no: 'ZEN-UPS-000001', transport_mode: 'UPS' },
        },
      ],
    } as any);

    const { default: TrackingDashboard } = await import('@/components/tracking/TrackingDashboard');
    render(<TrackingDashboard />);

    await waitFor(() => {
      const link = screen.getByText('Detail').closest('a');
      expect(link?.getAttribute('href')).toBe('/ko/orders/order-456/ups-detail');
    });
  });

  it('non-UPS order Detail link routes to standard detail', async () => {
    const { getGlobalTrackingOverview } = await import('@/app/actions/tracking');
    vi.mocked(getGlobalTrackingOverview).mockResolvedValueOnce({
      configs: [
        {
          order_id: 'order-789',
          tracking_no: 'TRACK-SEA-001',
          latest_event: { event_code: 'IN_TRANSIT', location: 'Busan' },
          updated_at: '2026-07-24T12:00:00Z',
          order: { order_no: 'ZEN-SEA-000001', transport_mode: 'SEA' },
        },
      ],
    } as any);

    const { default: TrackingDashboard } = await import('@/components/tracking/TrackingDashboard');
    render(<TrackingDashboard />);

    await waitFor(() => {
      const link = screen.getByText('Detail').closest('a');
      expect(link?.getAttribute('href')).toBe('/ko/orders/order-789');
    });
  });

  it('DEF-B-005: UPS order shows "UPS" text with blue badge in Provider column', async () => {
    const { getGlobalTrackingOverview } = await import('@/app/actions/tracking');
    vi.mocked(getGlobalTrackingOverview).mockResolvedValueOnce({
      configs: [
        {
          order_id: 'order-ups-badge',
          tracking_no: 'TRACK-BADGE-001',
          provider_type: 'MANUAL',
          provider_name: 'MANUAL',
          latest_event: { event_code: 'PICKED_UP', location: 'Incheon' },
          updated_at: '2026-07-26T10:00:00Z',
          order: { order_no: 'ZEN-BADGE-001', transport_mode: 'UPS' },
        },
      ],
    } as any);

    const { default: TrackingDashboard } = await import('@/components/tracking/TrackingDashboard');
    render(<TrackingDashboard />);

    await waitFor(() => {
      const upsElements = screen.getAllByText('UPS');
      expect(upsElements.length).toBeGreaterThanOrEqual(2);
      const badge = upsElements.find(el => el.className.includes('text-[10px]'));
      expect(badge).toBeTruthy();
      expect(badge!.className).toContain('bg-blue-50');
      expect(badge!.className).toContain('text-blue-600');
    });
  });

  it('DEF-B-005: non-UPS order preserves provider_type badge (VIRTUAL=purple)', async () => {
    const { getGlobalTrackingOverview } = await import('@/app/actions/tracking');
    vi.mocked(getGlobalTrackingOverview).mockResolvedValueOnce({
      configs: [
        {
          order_id: 'order-virtual',
          tracking_no: 'TRACK-VIRT-001',
          provider_type: 'VIRTUAL',
          provider_name: 'Virtual',
          latest_event: { event_code: 'IN_TRANSIT', location: 'Seoul' },
          updated_at: '2026-07-26T10:00:00Z',
          order: { order_no: 'ZEN-VIRT-001', transport_mode: 'AIR' },
        },
      ],
    } as any);

    const { default: TrackingDashboard } = await import('@/components/tracking/TrackingDashboard');
    render(<TrackingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('VIRTUAL')).toBeTruthy();
      const badge = screen.getByText('VIRTUAL');
      expect(badge.className).toContain('bg-purple-50');
      expect(badge.className).toContain('text-purple-600');
    });
  });
});

describe('TASK-B-208: 통계 카드 order.status 기준', () => {
  it('DELIVERED 오더가 "Delivered" 카드에 카운트됨', async () => {
    const { getGlobalTrackingOverview } = await import('@/app/actions/tracking');
    vi.mocked(getGlobalTrackingOverview).mockResolvedValueOnce({
      configs: [
        { order_id: '1', order: { status: 'DELIVERED', order_no: 'O1' }, latest_event: null, updated_at: '' },
        { order_id: '2', order: { status: 'IN_TRANSIT', order_no: 'O2' }, latest_event: null, updated_at: '' },
      ],
    } as any);

    const { default: TrackingDashboard } = await import('@/components/tracking/TrackingDashboard');
    render(<TrackingDashboard />);

    await waitFor(() => {
      const deliveredCard = screen.getByText('Delivered').closest('div')?.parentElement;
      expect(deliveredCard?.textContent).toContain('1');
    });
  });

  it('CLAIMED/HELD/RETURNED가 각각 별도 카드에 카운트됨', async () => {
    const { getGlobalTrackingOverview } = await import('@/app/actions/tracking');
    vi.mocked(getGlobalTrackingOverview).mockResolvedValueOnce({
      configs: [
        { order_id: '1', order: { status: 'CLAIMED', order_no: 'O1' }, latest_event: null, updated_at: '' },
        { order_id: '2', order: { status: 'HELD', order_no: 'O2' }, latest_event: null, updated_at: '' },
        { order_id: '3', order: { status: 'RETURNED', order_no: 'O3' }, latest_event: null, updated_at: '' },
        { order_id: '4', order: { status: 'DELIVERED', order_no: 'O4' }, latest_event: null, updated_at: '' },
      ],
    } as any);

    const { default: TrackingDashboard } = await import('@/components/tracking/TrackingDashboard');
    render(<TrackingDashboard />);

    await waitFor(() => {
      const getCardCount = (label: string) => {
        const labelEl = screen.getByText(label);
        const card = labelEl.closest('div')?.parentElement;
        return card?.textContent ?? '';
      };
      expect(getCardCount('Claimed')).toContain('1');
      expect(getCardCount('Held')).toContain('1');
      expect(getCardCount('Returned')).toContain('1');
      expect(getCardCount('Delivered')).toContain('1');
      expect(getCardCount('Total Tracks')).toContain('4');
    });
  });
});
