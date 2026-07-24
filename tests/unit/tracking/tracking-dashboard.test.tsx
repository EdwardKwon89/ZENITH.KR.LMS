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
});
