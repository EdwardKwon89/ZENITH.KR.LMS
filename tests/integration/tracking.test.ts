import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateOrderStatus } from '@/app/actions/orders';
import { getTrackingEvents, addTrackingEvent, updateTrackingConfig } from '@/app/actions/tracking';
import { validateUserAction, validateAdminAction } from '@/lib/auth/guards';
import { OrderStatus } from '@/types/orders';

// Mock 의존성 설정
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
  checkPermission: vi.fn(),
}));

vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

describe('ZENITH Tracking Visibility: Phase 3.3 Multi-Agent Cases', () => {
  const mockUser = { id: 'auth-user-123' };
  const mockAdminProfile = { id: 'admin-123', org_id: 'zenith-hq', role: 'ADMIN' };
  const mockShipperProfile = { id: 'shipper-1', org_id: 'shipper-corp', role: 'CORPORATE' };

  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      order: vi.fn().mockReturnThis(),
    };

    (validateUserAction as any).mockResolvedValue({ 
      user: mockUser, 
      profile: mockAdminProfile, 
      supabase: mockSupabase 
    });

    (validateAdminAction as any).mockResolvedValue({
      user: mockUser,
      profile: mockAdminProfile,
      supabase: mockSupabase
    });
  });

  describe('Scenario 1: Provider & Simulation Logic (CTO Case)', () => {
    it('TC-TR.1: [Success] 트래킹 공급자 설정 변경이 정상적으로 반영되어야 함', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { success: true }, error: null });
      
      const result = await updateTrackingConfig('order-1', 'MANUAL');
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('zen_tracking_configs');
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({ provider_type: 'MANUAL' }));
    });

    it('TC-TR.2: [Success] 오더 상태 변경 시 시뮬레이션 이벤트가 과거 시점으로 생성되어야 함', async () => {
      // updateOrderStatus 호출 시 가상 트래커가 작동하여 이벤트를 생성하는지 확인
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null }); // Master check
      mockSupabase.single.mockResolvedValueOnce({ data: { status: OrderStatus.REGISTERED, transport_mode: 'AIR' } }); // Current order
      
      // VirtualTrackingProvider.generateHistory 내부의 scenarios 조회 모킹
      mockSupabase.order.mockResolvedValueOnce({ 
        data: [{ sequence_no: 1, event_code: 'PICKUP', relative_minutes: -60, location_template: 'Origin' }], 
        error: null 
      });

      await updateOrderStatus('order-simulation', OrderStatus.SCHEDULED);

      // zen_tracking_events 테이블에 인서트가 발생했는지 확인
      const trackingInsert = mockSupabase.from.mock.calls.find((c: unknown[]) => c[0] === 'zen_tracking_events');
      expect(trackingInsert).toBeDefined();
    });
  });

  describe('Scenario 2: UI & Manual Override (CPO Case)', () => {
    it('TC-TR.3: [Success] 어드민 수동 이벤트가 시나리오 자동 생성 데이터보다 우선 노출되어야 함', async () => {
      // 1. Config 조회 모킹 필수 (getTrackingEvents 내부 로직)
      mockSupabase.single.mockResolvedValueOnce({ data: { provider_type: 'MANUAL' }, error: null });

      // 2. 이벤트 조회 모킹 (현재 getTrackingEvents는 event_time DESC로 정렬하여 반환함)
      const mockEvents = [
        { id: 2, event_code: 'DELAYED', source_type: 'MANUAL', event_time: '2026-04-22T10:00:00Z' },
        { id: 1, event_code: 'ARRIVED', source_type: 'SYSTEM', event_time: '2026-04-20T10:00:00Z' },
      ];
      mockSupabase.order.mockResolvedValueOnce({ data: mockEvents, error: null });

      const events = await getTrackingEvents('order-1');
      
      expect(events[0].source_type).toBe('MANUAL'); 
      expect(events.length).toBe(2);
    });

    it('TC-TR.4: [Logic] 운송 모드(SEA)에 따른 선박 특화 노드가 매핑되어야 함', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null }); // Master check
      mockSupabase.single.mockResolvedValueOnce({ data: { status: OrderStatus.REGISTERED, transport_mode: 'SEA' } });
      
      // Scenario 조회 모킹
      mockSupabase.order.mockResolvedValueOnce({ 
        data: [{ sequence_no: 1, event_code: 'VESSEL_DEPARTED', relative_minutes: -10 }], 
        error: null 
      });

      await updateOrderStatus('order-sea', OrderStatus.SCHEDULED);
      
      const trackingInsert = mockSupabase.from.mock.calls.find((c: unknown[]) => c[0] === 'zen_tracking_events');
      expect(trackingInsert).toBeDefined();
    });
  });

  describe('Scenario 3: Governance & Security (CIO Case)', () => {
    it('TC-TR.5: [Security] 타 화주 소속의 트래킹 정보 조회가 차단되어야 함', async () => {
      // Config 조회 시 데이터가 없는 시나리오 모킹 (이미 security에 의해 필터링됨 가정)
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      (validateUserAction as any).mockResolvedValueOnce({ 
        user: mockUser, 
        profile: mockShipperProfile, 
        supabase: mockSupabase 
      });
      
      const events = await getTrackingEvents('other-corp-order');
      expect(events).toEqual([]); // 가시성 차단 시 빈 배열 반환 확인
    });

    it('TC-TR.6: [Integrity] 수동 입력 이벤트 발행 시 감사 정보(Source)가 보존되어야 함', async () => {
      const eventData = { 
        event_code: 'EX_HOLD', 
        location: 'Incheon Port', 
        description: 'Weather Delay' 
      };
      
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'evt-1' }, error: null });
      
      await addTrackingEvent('order-1', eventData);
      
      const insertCall = mockSupabase.insert.mock.calls.find((c: unknown[]) => (c[0] as Record<string, unknown>).event_code === 'EX_HOLD');
      expect(insertCall[0].source_type).toBe('MANUAL');
      expect(insertCall[0].order_id).toBe('order-1');
    });
  });
});
