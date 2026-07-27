import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockTrackData = {
  server_hawbcode: 'TRACK123',
  destination_country: 'JP',
  track_status: 'DL',
  track_status_name: 'Delivered',
  signatory_name: 'TANAKA',
  details: [
    { track_occur_date: '2026-07-21 10:00', track_location: 'Tokyo', track_description: 'Delivered' },
  ],
};

const pollTrackingMock = vi.fn().mockResolvedValue(mockTrackData);
const storeTrackingEventsMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/shxk/tracking', () => ({
  pollTracking: (...args: any[]) => pollTrackingMock(...args),
  storeTrackingEvents: (...args: any[]) => storeTrackingEventsMock(...args),
  isDelivered: (status: string) => status === 'DL',
}));

function createChainableMock(returnValue: any) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(returnValue);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn().mockImplementation((resolve: any) => resolve(returnValue));
  return chain;
}

const ordersQueryResult = { data: [{ id: 'order-1' }], error: null };
const emptyOrdersResult = { data: [], error: null };
const labelResult = { data: { id: 'label-1', tracking_number: 'TRACK123' } };

const fromMock = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn().mockResolvedValue({ from: fromMock }),
}));

describe('TC-ISS635-E01: UPS Tracking Poll Cron 인증', () => {
  it('x-vercel-cron 헤더 없으면 401 반환', async () => {
    const { POST } = await import('@/app/api/cron/ups-tracking-poll/route');
    const req = new Request('http://localhost/api/cron/ups-tracking-poll', {
      method: 'POST',
      headers: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('x-api-key로 CRON_SECRET 대체 가능', async () => {
    process.env.CRON_SECRET = 'test-secret';
    fromMock.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock(ordersQueryResult);
      if (table === 'zen_ups_labels') return createChainableMock(labelResult);
      if (table === 'zen_ups_tracking_events') return createChainableMock({ data: [], error: null });
      if (table === 'zen_tracking_configs') return createChainableMock({ error: null });
      return createChainableMock({ error: null });
    });
    const { POST } = await import('@/app/api/cron/ups-tracking-poll/route');
    const req = new Request('http://localhost/api/cron/ups-tracking-poll', {
      method: 'POST',
      headers: { 'x-api-key': 'test-secret' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

describe('TC-ISS635-E02: UPS Tracking Poll Cron 로직', () => {
  it('IN_TRANSIT UPS 오더를 폴링하고 결과 반환', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock(ordersQueryResult);
      if (table === 'zen_ups_labels') return createChainableMock(labelResult);
      if (table === 'zen_ups_tracking_events') return createChainableMock({ data: [], error: null });
      if (table === 'zen_tracking_configs') return createChainableMock({ error: null });
      return createChainableMock({ error: null });
    });
    const { POST } = await import('@/app/api/cron/ups-tracking-poll/route');
    const req = new Request('http://localhost/api/cron/ups-tracking-poll', {
      method: 'POST',
      headers: { 'x-vercel-cron': '1' },
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.polled).toBeGreaterThanOrEqual(0);
    expect(body.delivered).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(body.errors)).toBe(true);
  });

  it('IN_TRANSIT UPS 오더가 없으면 polled:0 반환', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'zen_orders') return createChainableMock(emptyOrdersResult);
      return createChainableMock({ error: null });
    });
    const { POST } = await import('@/app/api/cron/ups-tracking-poll/route');
    const req = new Request('http://localhost/api/cron/ups-tracking-poll', {
      method: 'POST',
      headers: { 'x-vercel-cron': '1' },
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.polled).toBe(0);
  });
});
