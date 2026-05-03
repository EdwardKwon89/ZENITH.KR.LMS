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
      .select('*')
      .eq('order_id', config.order_id)
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

/**
 * [Execution] Mock Carrier API Provider
 * Simulates external carrier API calls with raw log persistence
 */
export class MockCarrierProvider implements ITrackingProvider {
  name = 'MockCarrier';

  async track(supabase: any, config: { id: string; tracking_no: string; order_id: string }): Promise<TrackingStep[]> {
    // Deterministic checkpoints based on tracking number suffix
    const lastChar = config.tracking_no.slice(-1);
    const isOdd = parseInt(lastChar, 16) % 2 !== 0;

    // 1. Simulate external API call
    const mockApiResponse = {
      carrier: "MOCK_EXPRESS",
      tracking_no: config.tracking_no,
      status: isOdd ? "ARRIVED" : "IN_TRANSIT",
      timestamp: new Date().toISOString(),
      checkpoints: [
        { code: "DEPARTED", loc: "Incheon, KR", msg: "Export customs cleared and departed", hours_ago: 24 },
        { code: "ARRIVED", loc: "Singapore, SG", msg: "Arrived at destination airport", hours_ago: 12 },
        ...(isOdd ? [{ code: "IN_TRANSIT", loc: "Singapore Hub", msg: "Out for distribution", hours_ago: 2 }] : [])
      ]
    };

    console.log(`[MOCK_CARRIER] Attempting to insert raw log for order ${config.order_id}`);
    // 2. Persist Raw Log (Auditing)
    const { error: logError } = await supabase.from('zen_tracking_raw_logs').insert({
      order_id: config.order_id,
      tracking_no: config.tracking_no,
      provider_name: this.name,
      raw_data: mockApiResponse
    });

    if (logError) {
      console.error(`[MOCK_CARRIER] Failed to save raw log:`, logError.message);
    } else {
      console.log(`[MOCK_CARRIER] Raw log saved successfully for ${config.order_id}`);
    }

    // 3. Map to Internal Standard Format
    // [Fix] Use current date as base to avoid immediate "DELAYED" detection
    const baseDate = new Date();
    
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
      .select('*')
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
