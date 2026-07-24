import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';
import { OrderStatus } from '@/types/orders';
import { canChangeStatus } from '@/lib/logistics/status-machine';

const createChainableMock = (data: any = null, error: any = null) => {
  const mockObj: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'not', 'limit', 'order', 'single', 'maybeSingle', 'gte', 'lte', 'neq', 'filter'];
  methods.forEach((method) => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });
  mockObj.then = (resolve: any) => resolve({ data, error });
  return mockObj;
};

const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
  validateAdminAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (fn: any) => fn,
}));

vi.mock('@/lib/shxk/tracking', () => ({
  pollTracking: vi.fn(),
  storeTrackingEvents: vi.fn(),
  isDelivered: vi.fn((status: string) => status === 'DL'),
}));

import { validateUserAction } from '@/lib/auth/guards';
import { pollTracking } from '@/lib/shxk/tracking';
import {
  checkRealtimeUpsTrackingAction,
  manuallySetOrderDeliveredAction,
} from '@/app/actions/operations/tracking';

describe('UPS Order Detail order.status 중심 상태 재구성 및 액션 검증 (Issue #794 / TASK-209)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Status Machine Agency 권한 확장 검증', () => {
    it('AGENCY 역할은 IN_TRANSIT 상태에서 DELIVERED 상태로 전이 허용', () => {
      const check = canChangeStatus(OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED, USER_ROLES.AGENCY);
      expect(check.allowed).toBe(true);
    });
  });

  describe('checkRealtimeUpsTrackingAction (실시간 UPS 배송 확인)', () => {
    it('SHXK 트래킹이 DL(배송완료) 상태일 때 오더 상태가 DELIVERED로 자동 전환됨', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'usr-1', role: USER_ROLES.ADMIN },
        user: { id: 'usr-1' },
      });

      (pollTracking as any).mockResolvedValue({
        server_hawbcode: '1Z123456789',
        track_status: 'DL',
        track_status_name: 'DELIVERED',
        details: [{ track_occur_date: '2026-07-24 10:00:00', track_location: 'SEOUL', track_description: 'Delivered' }],
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_orders') {
          return createChainableMock({
            id: 'ord-100',
            order_no: 'ORD-100',
            status: OrderStatus.IN_TRANSIT,
            transport_mode: 'UPS',
          });
        }
        if (table === 'zen_ups_labels') {
          return createChainableMock({
            id: 'lbl-100',
            tracking_number: '1Z123456789',
          });
        }
        if (table === 'order_status_history') {
          return createChainableMock();
        }
        return createChainableMock();
      });

      const res = await checkRealtimeUpsTrackingAction('ord-100');
      expect(res.success).toBe(true);
      expect(res.trackStatus).toBe('DL');
      expect(res.statusUpdated).toBe(true);
    });

    it('활성 UPS 라벨이 없을 경우 에러 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'usr-1', role: USER_ROLES.ADMIN },
        user: { id: 'usr-1' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_orders') {
          return createChainableMock({ id: 'ord-100', order_no: 'ORD-100', status: OrderStatus.IN_TRANSIT });
        }
        if (table === 'zen_ups_labels') {
          return createChainableMock(null);
        }
        return createChainableMock();
      });

      const res = await checkRealtimeUpsTrackingAction('ord-100');
      expect(res.success).toBe(false);
      expect(res.error).toContain('발급된 활성 UPS 운송장 번호가 없습니다');
    });
  });

  describe('manuallySetOrderDeliveredAction (수동 배송완료 전환)', () => {
    it('수동 전환 사유(reason)가 누락되면 에러 반환', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'usr-1', role: USER_ROLES.AGENCY, org_id: 'agency-org-1' },
        user: { id: 'usr-1' },
      });

      const res = await manuallySetOrderDeliveredAction('ord-100', '   ');
      expect(res.success).toBe(false);
      expect(res.error).toContain('사유 입력은 필수입니다');
    });

    it('Agency 사용자가 본인 소속 화주의 오더를 수동으로 DELIVERED 전환 성공', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'usr-agency-1', role: USER_ROLES.AGENCY, org_id: 'agency-org-1' },
        user: { id: 'usr-agency-1' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_orders') {
          return createChainableMock({
            id: 'ord-100',
            order_no: 'ORD-100',
            status: OrderStatus.IN_TRANSIT,
            shipper_id: 'shipper-org-1',
          });
        }
        if (table === 'zen_agency_shippers') {
          return createChainableMock({ id: 'link-1' });
        }
        if (table === 'order_status_history') {
          return createChainableMock();
        }
        return createChainableMock();
      });

      const res = await manuallySetOrderDeliveredAction('ord-100', '고객 전화 확인 완료');
      expect(res.success).toBe(true);
    });

    it('Agency 사용자가 타인 화주의 오더를 전환하려 할 경우 차단', async () => {
      (validateUserAction as any).mockResolvedValue({
        supabase: mockSupabase,
        profile: { id: 'usr-agency-1', role: USER_ROLES.AGENCY, org_id: 'agency-org-1' },
        user: { id: 'usr-agency-1' },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'zen_orders') {
          return createChainableMock({
            id: 'ord-100',
            order_no: 'ORD-100',
            status: OrderStatus.IN_TRANSIT,
            shipper_id: 'other-shipper-org',
          });
        }
        if (table === 'zen_agency_shippers') {
          return createChainableMock(null); // No link
        }
        return createChainableMock();
      });

      const res = await manuallySetOrderDeliveredAction('ord-100', '타사 오더 시도');
      expect(res.success).toBe(false);
      expect(res.error).toContain('소속 대리점이 관리하는 화주의 오더만');
    });
  });
});
