/**
 * ZENITH Tracking Core Engine
 * Architecture: Adapter Pattern (CTO Designed)
 * implementation: Multi-Provider (Execution)
 */

export type TrackingEventCode = 'BOOKED' | 'PICKED_UP' | 'TERMINAL_IN' | 'DEPARTED' | 'IN_TRANSIT' | 'ARRIVED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELAYED' | 'EXCEPTION';

export interface TrackingStep {
  event_code: TrackingEventCode;
  event_time: Date;
  location: string;
  description: string;
  source: string;
}

/**
 * [CTO] Tracking Provider Interface
 * 모든 트래킹 공급자(시뮬레이터, 수동, 외부 API)가 준수해야 할 표준 계약
 */
export interface ITrackingProvider {
  name: string;
  track(trackingNo: string, orderId: string): Promise<TrackingStep[]>;
}

/**
 * [Execution] Virtual Simulator Provider
 * 오더 상태 변경 시점에 맞춘 과거 데이터 자동 생성 (사용자 가이드 준수)
 */
export class VirtualTrackingProvider implements ITrackingProvider {
  name = 'ZSim (Virtual)';

  async track(trackingNo: string, orderId: string): Promise<TrackingStep[]> {
    // 실제 구현 시 DB의 zen_tracking_events와 zen_tracking_scenarios를 연동하여 결과 반환
    return []; 
  }
  
  /**
   * 상태 변경 시 시나리오에 따른 과거 이벤트 생성 로직
   */
  async generateHistory(supabase: any, orderId: string, status: string, mode: string): Promise<void> {
    const { data: scenarios } = await supabase
      .from('zen_tracking_scenarios')
      .select('*')
      .eq('transport_mode', mode)
      .eq('order_status', status)
      .order('sequence_no', { ascending: true });

    if (!scenarios) return;

    for (const scenario of scenarios) {
      const eventTime = new Date();
      eventTime.setMinutes(eventTime.getMinutes() + scenario.relative_minutes);

      await supabase.from('zen_tracking_events').insert({
        order_id: orderId,
        event_code: scenario.event_code,
        event_time: eventTime.toISOString(),
        location: scenario.location_template,
        description: scenario.description_template,
        source_type: 'SYSTEM'
      });
    }
  }
}

/**
 * [Execution] Carrier API Provider
 * 실제 외부 캐리어 API를 호출하여 데이터를 가져오는 공급자 (Simulation)
 */
export class CarrierApiProvider implements ITrackingProvider {
  name = 'Carrier (API)';

  async track(trackingNo: string, orderId: string): Promise<TrackingStep[]> {
    // 실제 구현 시 외부 API(FedEx, DHL, 우체국 등)를 호출하여 데이터 파싱
    // 현재는 시뮬레이션을 위한 Mock 데이터를 반환합니다.
    console.log(`[CARRIER_API] Tracking No: ${trackingNo}`);
    
    return [
      {
        event_code: 'IN_TRANSIT',
        event_time: new Date(),
        location: 'Local Hub',
        description: 'Package is being processed at the local hub.',
        source: this.name
      }
    ];
  }
}
/**
 * [Execution] Manual Provider
 * 사용자가 직접 입력한 트래킹 데이터를 조회하는 공급자
 */
export class ManualTrackingProvider implements ITrackingProvider {
  name = 'Manual';

  async track(trackingNo: string, orderId: string): Promise<TrackingStep[]> {
    // 실제 구현 시 DB의 zen_tracking_events 테이블에서 직접 조회
    return [];
  }
}

/**
 * 오더 설정에 따라 적절한 프로바이더를 선택하는 오케스트레이터
 */
export class TrackingManager {
  private providers: Map<string, ITrackingProvider> = new Map();

  /**
   * 트래킹 이벤트 코드와 오더 상태 매핑 테이블
   */
  private statusMapping: Record<TrackingEventCode, string> = {
    'BOOKED': 'SCHEDULED',
    'PICKED_UP': 'RELEASED',
    'TERMINAL_IN': 'WAREHOUSED',
    'DEPARTED': 'IN_TRANSIT',
    'IN_TRANSIT': 'IN_TRANSIT',
    'ARRIVED': 'IN_TRANSIT',
    'OUT_FOR_DELIVERY': 'IN_TRANSIT',
    'DELIVERED': 'DELIVERED',
    'DELAYED': 'HELD',
    'EXCEPTION': 'HELD'
  };

  constructor() {
    this.providers.set('VIRTUAL', new VirtualTrackingProvider());
    this.providers.set('MANUAL', new ManualTrackingProvider());
    this.providers.set('API', new CarrierApiProvider());
  }

  async getTrackingData(supabase: any, orderId: string): Promise<TrackingStep[]> {
    const { data: config } = await supabase
      .from('zen_tracking_configs')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (!config) return [];

    const provider = this.providers.get(config.provider_type);
    if (!provider) return [];

    const steps = await provider.track(config.tracking_no, orderId);
    
    // 데이터가 있고 API 모드일 경우 상태 동기화 수행
    if (steps.length > 0 && config.provider_type === 'API') {
      const latest = steps[0]; // 보통 시간 역순으로 정렬됨을 가정
      await this.syncOrderStatus(supabase, orderId, latest.event_code);
    }

    return steps;
  }

  /**
   * 최신 트래킹 이벤트에 따라 오더 상태를 자동으로 업데이트합니다.
   */
  async syncOrderStatus(supabase: any, orderId: string, latestEventCode: TrackingEventCode): Promise<void> {
    const nextStatus = this.statusMapping[latestEventCode];
    if (!nextStatus) return;

    const { error } = await supabase
      .from('zen_orders')
      .update({ status: nextStatus })
      .eq('id', orderId);

    if (error) {
      console.error(`[TRACKING_SYNC] Failed to sync status for ${orderId}:`, error.message);
    } else {
      console.log(`[TRACKING_SYNC] Order ${orderId} status updated to ${nextStatus}`);
    }
  }
}

export const trackingManager = new TrackingManager();
