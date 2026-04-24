import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerStatusChangeNotification, markNotificationRead, markAllNotificationsRead } from '@/app/actions/notifications';
import { OrderStatus } from '@/types/orders';

const mockSendStatusChangeEmail = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/lib/notifications/email', () => ({
  sendStatusChangeEmail: mockSendStatusChangeEmail,
}));

vi.mock('next/cache', () => ({
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
    shipper_id:      'shipper-uuid-001',
    recipient_email: 'recipient@test.com',
    shipper:         { full_name: '테스트 화주', email: 'shipper@test.com' },
  };

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

  // TC-N.2: WAREHOUSED → 송하인 IN_APP 알림 생성 + 이메일
  it('[TC-N.2] should create IN_APP notification and send email to shipper on WAREHOUSED', async () => {
    await triggerStatusChangeNotification(mockOrderId, OrderStatus.WAREHOUSED);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockOrder.shipper_id,
        channel: 'IN_APP',
        type:    'STATUS_CHANGE',
        title:   '입고 완료',
      })
    );

    expect(mockSendStatusChangeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: mockOrder.shipper!.email }),
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

    // 송하인은 IN_TRANSIT 대상이 아님 → IN_APP insert 없음
    expect(mockInsert).not.toHaveBeenCalled();
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
