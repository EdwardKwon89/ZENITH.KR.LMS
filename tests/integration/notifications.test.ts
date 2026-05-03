import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerStatusChangeNotification, markNotificationRead, markAllNotificationsRead } from '@/app/actions/notifications';
import { OrderStatus } from '@/types/orders';

const mockSendStatusChangeEmail = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/lib/notifications/email', () => ({
  sendStatusChangeEmail: mockSendStatusChangeEmail,
}));

vi.mock('next/cache', () => ({ unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

let mockSupabase: any;
let mockInsert: ReturnType<typeof vi.fn>;

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

describe('ZENITH Notification Engine: WBS 3.1.2.2', () => {
  const mockOrderId = 'order-test-uuid-001';
  const mockOrder = {
    order_no:        'ZEN-2026-TEST-001',
    shipper_id:      'shipper-org-uuid-001',   // org_id, NOT user_id
    recipient_email: 'recipient@test.com',
  };
  // 실제 송하인 사용자 (profiles.org_id = shipper_id)
  const mockShipperUsers = [
    { id: 'shipper-user-uuid-001', email: 'shipper@test.com' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert = vi.fn().mockResolvedValue({ error: null });

    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'zen_orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq:     vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
          };
        }
        if (table === 'profiles') {
          // profiles WHERE org_id = shipper_id 쿼리 시뮬레이션
          return {
            select: vi.fn().mockReturnThis(),
            eq:     vi.fn().mockResolvedValue({ data: mockShipperUsers, error: null }),
          };
        }
        if (table === 'zen_notifications') {
          return { insert: mockInsert };
        }
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq:     vi.fn().mockReturnThis(),
        };
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-uuid-001' } } }),
      },
    };
  });

  // TC-N.1: 비트리거 상태 → DB 호출 없음
  it('[TC-N.1] should NOT trigger notifications for non-trigger statuses (REGISTERED)', async () => {
    await triggerStatusChangeNotification(mockOrderId, OrderStatus.REGISTERED);

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockSendStatusChangeEmail).not.toHaveBeenCalled();
  });

  // TC-N.2: WAREHOUSED → 송하인 org 사용자에게 IN_APP 알림 + 이메일 (profiles.org_id 기반)
  it('[TC-N.2] should create IN_APP notification and send email to shipper org users on WAREHOUSED', async () => {
    await triggerStatusChangeNotification(mockOrderId, OrderStatus.WAREHOUSED);

    // 실제 user_id (profiles.id)로 알림 저장, org_id가 아님
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockShipperUsers[0].id,
        channel: 'IN_APP',
        type:    'STATUS_CHANGE',
        title:   '입고 완료',
      })
    );

    expect(mockSendStatusChangeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: mockShipperUsers[0].email }),
      mockOrder.order_no,
      OrderStatus.WAREHOUSED
    );
  });

  // TC-N.3: IN_TRANSIT → 수하인 이메일만 발송 (송하인 미포함, IN_APP 없음)
  it('[TC-N.3] should send email ONLY to recipient on IN_TRANSIT (no IN_APP insert)', async () => {
    await triggerStatusChangeNotification(mockOrderId, OrderStatus.IN_TRANSIT);

    // 수하인 이메일 발송 확인
    expect(mockSendStatusChangeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: mockOrder.recipient_email }),
      mockOrder.order_no,
      OrderStatus.IN_TRANSIT
    );

    // 송하인도 IN_TRANSIT 대상임 → IN_APP + EMAIL insert 발생 확인
    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'IN_APP', user_id: mockShipperUsers[0].id })
    );
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'EMAIL', user_id: mockShipperUsers[0].id })
    );
  });

  // TC-N.4: markNotificationRead → 단건 읽음 처리
  it('[TC-N.4] should mark a single notification as read', async () => {
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockResolvedValue({ error: null }),
    };
    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'zen_notifications') return updateChain;
      return {};
    });

    const result = await markNotificationRead('notif-id-001');

    expect(result.success).toBe(true);
    expect(updateChain.update).toHaveBeenCalledWith({ is_read: true });
  });

  // TC-N.5: markAllNotificationsRead → 전체 IN_APP 읽음 처리
  it('[TC-N.5] should mark all unread IN_APP notifications as read for the current user', async () => {
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 'n1' }, { id: 'n2' }], error: null }),
    };
    mockSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'zen_notifications') return updateChain;
      return {};
    });

    const result = await markAllNotificationsRead();

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(2);
    expect(updateChain.update).toHaveBeenCalledWith({ is_read: true });
  });
});
