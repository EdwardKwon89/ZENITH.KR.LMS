import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getErrorLogs } from '@/app/actions/monitoring';
import { validateAdminAction } from '@/lib/auth/guards';

/**
 * TASK-1140 (Issue #1186): /admin/error-logs 필터·검색 개선
 *
 * TC-ELF: getErrorLogs의 필터 파라미터 전달 및 우선순위 정렬 검증
 */

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
}));

describe('TC-ELF: getErrorLogs 필터·검색·정렬 파라미터', () => {
  const supabaseMock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (validateAdminAction as any).mockResolvedValue({ supabase: supabaseMock });
    supabaseMock.from.mockReturnValue(supabaseMock);
    supabaseMock.select.mockReturnValue(supabaseMock);
    supabaseMock.eq.mockReturnValue(supabaseMock);
    supabaseMock.ilike.mockReturnValue(supabaseMock);
    supabaseMock.order.mockReturnValue(supabaseMock);
    supabaseMock.range.mockResolvedValue({ data: [{ id: 'log-1' }], count: 1, error: null });
  });

  it('[TC-ELF-01] severity 파라미터가 eq 필터로 전달된다', async () => {
    await getErrorLogs({ page: 1, pageSize: 50, severity: 'CRITICAL' });

    expect(supabaseMock.eq).toHaveBeenCalledWith('severity', 'CRITICAL');
  });

  it('[TC-ELF-02] resolved=false(미해결) 파라미터가 eq 필터로 전달된다', async () => {
    await getErrorLogs({ page: 1, pageSize: 50, resolved: false });

    expect(supabaseMock.eq).toHaveBeenCalledWith('resolved', false);
  });

  it('[TC-ELF-03] search 키워드가 ilike(message) 서버 필터로 전달되며 좌우 공백이 제거된다', async () => {
    await getErrorLogs({ page: 1, pageSize: 50, search: '  UPS label  ' });

    expect(supabaseMock.ilike).toHaveBeenCalledWith('message', '%UPS label%');
  });

  it('[TC-ELF-04] search가 빈 문자열이면 ilike 필터를 적용하지 않는다', async () => {
    await getErrorLogs({ page: 1, pageSize: 50, search: '   ' });

    expect(supabaseMock.ilike).not.toHaveBeenCalled();
  });

  it('[TC-ELF-05] 기본 정렬은 미해결→CRITICAL→최신순 3단 다중 정렬이다', async () => {
    await getErrorLogs({ page: 1, pageSize: 50 });

    expect(supabaseMock.order).toHaveBeenNthCalledWith(1, 'resolved', { ascending: true });
    expect(supabaseMock.order).toHaveBeenNthCalledWith(2, 'severity', { ascending: true });
    expect(supabaseMock.order).toHaveBeenNthCalledWith(3, 'created_at', { ascending: false });
  });

  it('[TC-ELF-06] 필터가 없으면 eq·ilike를 호출하지 않고 페이징만 적용한다', async () => {
    const result = await getErrorLogs({ page: 1, pageSize: 50 });

    expect(supabaseMock.eq).not.toHaveBeenCalled();
    expect(supabaseMock.ilike).not.toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.count).toBe(1);
  });
});
