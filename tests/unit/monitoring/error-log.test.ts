import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logClientError, getErrorLogs, resolveErrorLog } from '@/app/actions/monitoring';
import { createClient } from '@/utils/supabase/server';
import { validateAdminAction } from '@/lib/auth/guards';
import { sendInAppNotification } from '@/app/actions/notifications';

// Mock 의존성
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
}));

vi.mock('@/app/actions/notifications', () => ({
  sendInAppNotification: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Monitoring Actions: Error Logging System', () => {
  const supabaseMock: any = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(supabaseMock);
    
    supabaseMock.from.mockReturnValue(supabaseMock);
    supabaseMock.select.mockReturnValue(supabaseMock);
    supabaseMock.insert.mockReturnValue(supabaseMock);
    supabaseMock.update.mockReturnValue(supabaseMock);
    supabaseMock.eq.mockReturnValue(supabaseMock);
    supabaseMock.in.mockReturnValue(supabaseMock);
    supabaseMock.order.mockReturnValue(supabaseMock);
    supabaseMock.range.mockReturnValue(supabaseMock);
    supabaseMock.single.mockReturnValue(supabaseMock);
    
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('TC-ERR-01: [Success] logClientError는 에러를 DB에 기록해야 함', async () => {
    // Given
    supabaseMock.single.mockResolvedValueOnce({ data: { org_id: 'org-1' }, error: null }); // profile select
    supabaseMock.single.mockResolvedValueOnce({ data: { id: 'log-1' }, error: null }); // insert log
    
    const errorData = {
      message: 'Test Error',
      severity: 'ERROR' as const,
      error_type: 'CLIENT' as const
    };

    // When
    const result = await logClientError(errorData);

    // Then
    expect(supabaseMock.from).toHaveBeenCalledWith('zen_error_logs');
    expect(supabaseMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Test Error',
      severity: 'ERROR'
    }));
    expect(result.success).toBe(true);
  });

  it('TC-ERR-02: [Success] severity가 CRITICAL일 경우 관리자 알림을 발송해야 함', async () => {
    // Given
    supabaseMock.single.mockResolvedValueOnce({ data: { org_id: 'org-1' }, error: null }); // profile select
    supabaseMock.single.mockResolvedValueOnce({ data: { id: 'log-1' }, error: null }); // insert log
    
    // Mock admin search
    supabaseMock.in.mockResolvedValueOnce({ 
      data: [{ id: 'admin-1' }, { id: 'admin-2' }], 
      error: null 
    });

    const errorData = {
      message: 'Critical Crash',
      severity: 'CRITICAL' as const,
      error_type: 'SERVER' as const
    };

    // When
    await logClientError(errorData);

    // Then
    expect(sendInAppNotification).toHaveBeenCalledTimes(2);
    expect(sendInAppNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: "CRITICAL System Error",
      userId: 'admin-1'
    }));
  });

  it('TC-ERR-03: [Success] getErrorLogs는 권한 체크 후 로그 목록을 반환해야 함', async () => {
    // Given
    (validateAdminAction as any).mockResolvedValue({ supabase: supabaseMock });
    supabaseMock.range.mockResolvedValueOnce({ 
      data: [{ id: 'log-1', message: 'Err 1' }], 
      count: 1, 
      error: null 
    });

    // When
    const result = await getErrorLogs({ page: 1, pageSize: 10 });

    // Then
    expect(validateAdminAction).toHaveBeenCalled();
    expect(supabaseMock.from).toHaveBeenCalledWith('zen_error_logs');
    expect(result.data).toHaveLength(1);
    expect(result.count).toBe(1);
  });

  it('TC-ERR-04: [Success] resolveErrorLog는 로그 상태를 업데이트해야 함', async () => {
    // Given
    (validateAdminAction as any).mockResolvedValue({ supabase: supabaseMock });
    supabaseMock.eq.mockResolvedValueOnce({ error: null });

    // When
    const result = await resolveErrorLog('log-1');

    // Then
    expect(supabaseMock.update).toHaveBeenCalledWith({ resolved: true });
    expect(supabaseMock.eq).toHaveBeenCalledWith('id', 'log-1');
    expect(result.success).toBe(true);
  });
});
