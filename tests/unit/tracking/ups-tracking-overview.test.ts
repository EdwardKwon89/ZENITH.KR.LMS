import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: any) => fn),
}));

const mockValidateUserAction = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: (...args: any[]) => mockValidateUserAction(...args),
}));

function createMockSupabase(options: {
  trackingConfigs?: any[];
  trackingEvents?: any[];
  upsTrackingEvents?: any[];
}) {
  const { trackingConfigs = [], trackingEvents = [], upsTrackingEvents = [] } = options;

  const chain: any = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn((table: string) => {
      if (table === 'zen_tracking_configs') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: trackingConfigs,
            error: null,
            count: trackingConfigs.length,
          }),
        };
      }
      if (table === 'zen_tracking_events') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: trackingEvents,
            error: null,
          }),
        };
      }
      if (table === 'zen_ups_tracking_events') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: upsTrackingEvents,
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  };

  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TASK-B-201: getGlobalTrackingOverview UPS 오더 확장 (behavioral)', () => {
  it('UPS 오더는 zen_ups_tracking_events에서 latest_event를 가져온다', async () => {
    const upsEvent = {
      order_id: 'order-1',
      event_time: '2026-07-24 10:00:00',
      event_desc: 'In Transit',
      event_code: 'IT',
      location_city: 'Seoul',
    };

    const chain = createMockSupabase({
      trackingConfigs: [{
        order_id: 'order-1',
        order: { transport_mode: 'UPS', shipper_id: 'org-1', recipient_name: 'Test' },
      }],
      trackingEvents: [],
      upsTrackingEvents: [upsEvent],
    });

    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    });

    const { getGlobalTrackingOverview } = await import('@/app/actions/operations/tracking');
    const result = await getGlobalTrackingOverview(1, 50);

    expect(result.configs).toHaveLength(1);
    expect(result.configs[0].latest_event).toBeDefined();
    expect(result.configs[0].latest_event.description).toBe('In Transit');
    expect(result.configs[0].latest_event.location).toBe('Seoul');
    expect(result.configs[0].latest_event.source).toBe('ups');
  });

  it('비UPS 오더는 zen_tracking_events에서 latest_event를 가져온다', async () => {
    const trackingEvent = {
      order_id: 'order-2',
      event_time: '2026-07-24 09:00:00',
      description: ' Departure',
      location: 'Busan',
    };

    const chain = createMockSupabase({
      trackingConfigs: [{
        order_id: 'order-2',
        order: { transport_mode: 'AIR', shipper_id: 'org-1', recipient_name: 'Test' },
      }],
      trackingEvents: [trackingEvent],
      upsTrackingEvents: [],
    });

    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    });

    const { getGlobalTrackingOverview } = await import('@/app/actions/operations/tracking');
    const result = await getGlobalTrackingOverview(1, 50);

    expect(result.configs).toHaveLength(1);
    expect(result.configs[0].latest_event).toBeDefined();
    expect(result.configs[0].latest_event.description).toBe(' Departure');
    expect(result.configs[0].latest_event.location).toBe('Busan');
    expect(result.configs[0].latest_event.source).toBeUndefined();
  });

  it('UPS 오더에 zen_tracking_events가 있으면 그것을 우선 사용', async () => {
    const trackingEvent = {
      order_id: 'order-3',
      event_time: '2026-07-24 11:00:00',
      description: 'Legacy event',
      location: 'Legacy',
    };

    const chain = createMockSupabase({
      trackingConfigs: [{
        order_id: 'order-3',
        order: { transport_mode: 'UPS', shipper_id: 'org-1', recipient_name: 'Test' },
      }],
      trackingEvents: [trackingEvent],
      upsTrackingEvents: [{
        order_id: 'order-3',
        event_time: '2026-07-24 10:00:00',
        event_desc: 'UPS event',
        event_code: 'IT',
        location_city: 'UPS',
      }],
    });

    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    });

    const { getGlobalTrackingOverview } = await import('@/app/actions/operations/tracking');
    const result = await getGlobalTrackingOverview(1, 50);

    expect(result.configs).toHaveLength(1);
    expect(result.configs[0].latest_event.description).toBe('Legacy event');
    expect(result.configs[0].latest_event.source).toBeUndefined();
  });
});
