import { TrackingEventCode, TrackingStep } from './tracking';

/**
 * [CTO] Tracking Provider Interface
 * Standard contract for all tracking providers (Simulators, Manual, External APIs)
 */
export interface ITrackingProvider {
  name: string;
  track(supabase: any, config: { id: string; tracking_no: string; order_id: string }): Promise<TrackingStep[]>;
}

/**
 * [Execution] Virtual Simulator Provider
 * Generates historical data based on order status changes
 */
export class VirtualTrackingProvider implements ITrackingProvider {
  name = 'ZSim (Virtual)';

  async track(supabase: any, config: { id: string; tracking_no: string; order_id: string }): Promise<TrackingStep[]> {
    const { data: events, error } = await supabase
      .from('zen_tracking_events')
      .select('event_code, event_time, location, description')
      .eq('order_id', config.order_id)
      .order('event_time', { ascending: false });

    if (error) {
      console.error('[VIRTUAL] Failed to fetch events:', error);
      return [];
    }

    const latestEvents = new Map<string, TrackingStep>();
    for (const e of events) {
      if (!latestEvents.has(e.event_code)) {
        latestEvents.set(e.event_code, {
          event_code: e.event_code,
          event_time: new Date(e.event_time),
          location: e.location,
          description: e.description,
          source: 'VIRTUAL'
        });
      }
    }

    return Array.from(latestEvents.values()).sort((a, b) => b.event_time.getTime() - a.event_time.getTime());
  }
}

/**
 * [Execution] Mock Carrier API Provider
 * Simulates external carrier API response
 */
export class MockCarrierProvider implements ITrackingProvider {
  name = 'MockCarrier';

  async track(supabase: any, config: { id: string; tracking_no: string; order_id: string }): Promise<TrackingStep[]> {
    const mockApiResponse = {
      checkpoints: [
        { code: 'DEPARTURE', hours_ago: 48, loc: 'Shanghai, CN', msg: 'Departed from origin' },
        { code: 'TRANSIT', hours_ago: 24, loc: 'Incheon, KR', msg: 'Arrived at transit hub' },
        { code: 'CUSTOMS', hours_ago: 12, loc: 'Incheon, KR', msg: 'Customs clearance in progress' },
      ]
    };

    const { error: logError } = await supabase
      .from('zen_tracking_raw_logs')
      .insert({ order_id: config.order_id, provider_name: this.name, raw_data: mockApiResponse });

    if (logError) {
      console.error(`[MOCK_CARRIER] Failed to save raw log for ${config.order_id}:`, logError);
    } else {
      console.log(`[MOCK_CARRIER] Raw log saved successfully for ${config.order_id}`);
    }

    // 3. Map to Internal Standard Format
    // [Fix] Use a stable baseDate by rounding down to the start of the current day.
    // This avoids generating new distinct timestamps for every sync execution within the same day,
    // which prevents duplicate records from bypassing the deduplication check in TrackingManager.
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    return mockApiResponse.checkpoints.map(cp => {
      const eventTime = new Date(baseDate);
      eventTime.setHours(eventTime.getHours() - cp.hours_ago);
      
      return {
        event_code: cp.code as TrackingEventCode,
        event_time: eventTime,
        location: cp.loc,
        description: cp.msg,
        source: this.name
      };
    });
  }
}

/**
 * [Execution] Manual Provider
 * Retrieves manually entered tracking data
 */
export class ManualTrackingProvider implements ITrackingProvider {
  name = 'Manual';

  async track(supabase: any, config: { id: string; tracking_no: string; order_id: string }): Promise<TrackingStep[]> {
    const { data: events, error } = await supabase
      .from('zen_tracking_events')
      .select('event_code, event_time, location, description')
      .eq('order_id', config.order_id)
      .eq('source_type', 'MANUAL')
      .order('event_time', { ascending: false });

    if (error || !events) return [];

    return events.map((e: any) => ({
      event_code: e.event_code as TrackingEventCode,
      event_time: new Date(e.event_time),
      location: e.location,
      description: e.description,
      source: this.name
    }));
  }
}
