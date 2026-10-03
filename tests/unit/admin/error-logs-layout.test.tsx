import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/app/actions/monitoring', () => ({
  getErrorLogs: vi.fn(async () => ({ data: [], count: 0 })),
  resolveErrorLog: vi.fn(),
  logClientError: vi.fn(),
}));

import { ErrorLogsTable } from '@/components/admin/error-logs/ErrorLogsTable';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import AdminErrorLogsPage from '@/app/[locale]/(dashboard)/admin/error-logs/page';

// TASK-1147 (Issue #1222, DEF-140): error-logs 레이아웃 — 이중 패딩 해소 +
// Control 컬럼 보호. 실제 렌더링 결과(DOM)를 검증하는 behavioral 테스트다.
// (jsdom은 overflow/clip을 계산하지 못하므로 "잘림" 자체가 아니라
// 그것을 방지하는 구조 — 패딩·폭 상한·nowrap — 를 검증하고,
// 실제 시각 확인은 R-10 해상도별 스크린샷으로 갈음한다.)

const sampleLog = {
  id: 'log-1',
  severity: 'ERROR',
  error_type: 'SERVER',
  message: 'Something broke badly in production with a very long message text',
  url: 'https://example.com/api/orders',
  user: { full_name: 'Test Admin', email: 'admin@zenith.kr' },
  sentry_id: 'abc123def456',
  created_at: '2026-10-02T10:00:00.000Z',
  resolved: false,
};

describe('error-logs 레이아웃 (TASK-1147)', () => {
  it('TC-ERRLOG-01: [Guard] 페이지 루트에 자체 좌우 패딩이 없어야 함 (이중 패딩 해소)', async () => {
    // When — 실제 서버 컴포넌트 실행 (자식은 element 생성のみ, 실행 안 됨)
    const element = (await AdminErrorLogsPage()) as React.ReactElement<{ className?: string }>;

    // Then — 레이아웃 <main> 공통 패딩만 적용되도록 자체 p-6/md:p-10 제거
    expect(element.props.className).not.toMatch(/(^|\s)p-6(\s|$)/);
    expect(element.props.className).not.toContain('md:p-10');
  });

  it('TC-ERRLOG-02: [Guard] Error Message 셀 폭 상한이 300px이어야 함', () => {
    // When
    const { container } = render(<ErrorLogsTable initialLogs={[sampleLog]} totalCount={1} />);

    // Then
    const msgCell = container.querySelector('div.max-w-\\[300px\\], div[class*="max-w-"]');
    expect(msgCell?.className).toContain('max-w-[300px]');
    expect(msgCell?.className).not.toContain('max-w-[400px]');
  });

  it('TC-ERRLOG-03: [Guard] Control 셀(Resolve 버튼 행)이 줄바꿈되지 않아야 함', () => {
    // When
    render(<ErrorLogsTable initialLogs={[sampleLog]} totalCount={1} />);

    // Then — Resolve 버튼이 렌더되고 그 행 컨테이너가 nowrap
    const resolveBtn = screen.getByText('Resolve');
    const cell = resolveBtn.closest('div.whitespace-nowrap');
    expect(cell).toBeTruthy();
  });

  it('TC-ERRLOG-04: [Guard] 그리드 헤더 라벨이 줄바꿈되지 않아야 함 (공용 보호)', () => {
    // When
    const { container } = render(<ErrorLogsTable initialLogs={[sampleLog]} totalCount={1} />);

    // Then — 모든 th에 nowrap (Control 포함)
    const headers = Array.from(container.querySelectorAll('th'));
    expect(headers.length).toBeGreaterThan(0);
    for (const th of headers) {
      expect(th.className).toContain('whitespace-nowrap');
    }
  });

  it('TC-ERRLOG-05: [Guard] 그리드 meta.nowrap 옵트인이 동작해야 함', () => {
    // When — 직접 그리드 렌더링 (옵트인 컬럼 vs 일반 컬럼)
    const { container } = render(
      <ZenDataGrid
        columns={[
          { header: 'Keep', accessorKey: 'a' },
          { header: 'Lock', accessorKey: 'b', meta: { nowrap: true } as any },
        ]}
        data={[{ a: 'x', b: 'y' }]}
      />,
    );

    // Then — 두 번째 열 td에만 nowrap
    const cells = container.querySelectorAll('tbody td');
    expect(cells.length).toBe(2);
    expect(cells[0].className).not.toContain('whitespace-nowrap');
    expect(cells[1].className).toContain('whitespace-nowrap');
  });
});
