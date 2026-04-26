import { 
  ITrackingProvider, 
  VirtualTrackingProvider, 
  ManualTrackingProvider, 
  MockCarrierProvider 
} from './tracking-adapters';
import { getNumericParam } from '../params/service';

export type TrackingEventCode = 'BOOKED' | 'PICKED_UP' | 'TERMINAL_IN' | 'DEPARTED' | 'IN_TRANSIT' | 'ARRIVED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELAYED' | 'EXCEPTION';

export interface TrackingStep {
  event_code: TrackingEventCode;
  event_time: Date;
  location: string;
  description: string;
  source: string;
}

/**
 * [Execution] Virtual Simulator Utility
 * Moved from VirtualTrackingProvider to be used by system triggers
 */
export async function generateTrackingHistory(supabase: any, orderId: string, status: string, mode: string): Promise<void> {
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
    this.providers.set('API', new MockCarrierProvider());
  }

  async getTrackingData(supabase: any, orderId: string): Promise<TrackingStep[]> {
    const { data: config, error: configError } = await supabase
      .from('zen_tracking_configs')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (configError) {
      console.error(`[TRACKING_MANAGER] Error fetching config for ${orderId}:`, configError.message);
    }

    if (!config) {
      console.warn(`[TRACKING_MANAGER] No config found for order ${orderId}`);
      return [];
    }
    
    console.log(`[TRACKING_MANAGER] Found config for ${orderId}: provider_type=${config.provider_type}`);

    const provider = this.providers.get(config.provider_type);
    if (!provider) return [];

    const steps = await provider.track(supabase, config);
    
    // API 모드일 경우 데이터 영속화(Persistence) 및 상태 동기화 수행
    if (config.provider_type === 'API' && steps.length > 0) {
      // 1. 기존 이벤트 조회 (중복 방지)
      const { data: existingEvents } = await supabase
        .from('zen_tracking_events')
        .select('event_code, event_time')
        .eq('order_id', orderId);

      const existingKeys = new Set(
        existingEvents?.map((e: any) => `${e.event_code}|${new Date(e.event_time).getTime()}`) || []
      );

      // 2. 신규 이벤트 필터링 및 삽입
      const newSteps = steps.filter(
        step => !existingKeys.has(`${step.event_code}|${step.event_time.getTime()}`)
      );

      if (newSteps.length > 0) {
        await supabase.from('zen_tracking_events').insert(
          newSteps.map(step => ({
            order_id: orderId,
            tracking_config_id: config.id,
            event_code: step.event_code,
            event_time: step.event_time.toISOString(),
            location: step.location,
            description: step.description,
            source_type: 'EXTERNAL_API'
          }))
        );

        // 3. 최신 이벤트 기준으로 오더 상태 동기화
        const latest = steps.sort((a, b) => b.event_time.getTime() - a.event_time.getTime())[0];
        await this.syncOrderStatus(supabase, orderId, latest.event_code);
      }
    }

    // 4. 지연 판정 (Delay Detection)
    if (steps.length > 0) {
      const latest = steps.sort((a, b) => b.event_time.getTime() - a.event_time.getTime())[0];
      
      // 이미 배송 완료된 경우는 제외
      if (latest.event_code !== 'DELIVERED') {
        const threshold = await getNumericParam('TRACKING_DELAY_THRESHOLD_HOURS', 48);
        const hoursSinceLastEvent = (Date.now() - latest.event_time.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastEvent > threshold) {
          console.log(`[TRACKING_MANAGER] Order ${orderId} is delayed. Last event was ${hoursSinceLastEvent.toFixed(1)}h ago (Threshold: ${threshold}h)`);
          
          // 상태가 아직 HELD가 아니라면 업데이트
          await this.syncOrderStatus(supabase, orderId, 'DELAYED');
          
          // 가상의 DELAYED 스텝 추가 (UI 노출용, DB 저장은 하지 않음 - 필요 시 추후 확장)
          steps.unshift({
            event_code: 'DELAYED',
            event_time: new Date(),
            location: latest.location,
            description: `트래킹 업데이트가 ${threshold}시간 이상 지체되었습니다. 물류 센터 확인이 필요합니다.`,
            source: 'SYSTEM'
          });
        }
      }
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
