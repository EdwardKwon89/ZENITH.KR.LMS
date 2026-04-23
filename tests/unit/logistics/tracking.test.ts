import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TrackingManager } from '../../../src/lib/logistics/tracking';
import { ITrackingProvider } from '../../../src/lib/logistics/tracking-adapters';

describe('TrackingManager', () => {
  let trackingManager: TrackingManager;
  let mockSupabase: any;

  beforeEach(() => {
    trackingManager = new TrackingManager();
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
    };
  });

  it('should prevent duplicate tracking events', async () => {
    const orderId = 'test-order-id';
    const configId = 'test-config-id';
    const eventTime = new Date('2026-04-23T00:00:00Z');

    // 1. Mock Config
    mockSupabase.single.mockResolvedValue({
      data: {
        id: configId,
        order_id: orderId,
        provider_type: 'API',
        tracking_no: 'TRK123'
      }
    });

    // 2. Mock Existing Events
    // TrackingManager calls: supabase.from('zen_tracking_events').select('event_code, event_time').eq('order_id', orderId)
    // We need to make sure the result of this chain has the data.
    // Since we use mockReturnThis, the last call in the chain will be eq() if not single().
    mockSupabase.eq.mockImplementation((field: string, value: any) => {
      if (field === 'order_id' && value === orderId) {
        // If it's the second time (for events), return existing events
        if (mockSupabase.select.mock.calls.length > 1) {
            return Promise.resolve({
                data: [
                    { event_code: 'DEPARTED', event_time: eventTime.toISOString() }
                ]
            });
        }
      }
      return mockSupabase; // return self for chaining
    });


    // 3. Provider Returns 1 existing and 1 new step
    const steps = [
      { event_code: 'DEPARTED', event_time: eventTime, location: 'Loc1', description: 'Desc1', source: 'Mock' },
      { event_code: 'ARRIVED', event_time: new Date(eventTime.getTime() + 1000), location: 'Loc2', description: 'Desc2', source: 'Mock' }
    ];

    const mockProvider: ITrackingProvider = {
      name: 'Mock',
      track: vi.fn().mockResolvedValue(steps)
    };
    
    // Inject mock provider
    (trackingManager as any).providers.set('API', mockProvider);

    // Act
    await trackingManager.getTrackingData(mockSupabase, orderId);

    // Assert
    expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
    const insertedData = mockSupabase.insert.mock.calls[0][0];
    expect(insertedData).toHaveLength(1);
    expect(insertedData[0].event_code).toBe('ARRIVED');
  });

  it('should sync order status when new events are added', async () => {
    const orderId = 'test-order-id';
    
    // Mock update success
    mockSupabase.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    // Act
    await trackingManager.syncOrderStatus(mockSupabase, orderId, 'DELIVERED');

    // Assert
    expect(mockSupabase.from).toHaveBeenCalledWith('zen_orders');
    expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'DELIVERED' });
  });
});

