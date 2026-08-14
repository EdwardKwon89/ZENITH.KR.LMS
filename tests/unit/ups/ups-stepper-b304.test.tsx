// TASK-B-304 (Issue #1128): UPS 진행상태 스테퍼 — ① 단계별 시각을 Step Indicator 바 아래로 이동
// ② CANCELED/HELD 배너에 전이 시각 추가(정상 시각 회색과 구분되는 rose/amber).
// UpsOrderStatusStepper를 실제 컴포넌트로 렌더해 검증 (mock 금지 — 화면 렌더 결과 그대로 확인)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import UpsOrderStatusStepper from '@/components/ups/UpsOrderStatusStepper';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/app/actions/operations/tracking', () => ({
  checkRealtimeUpsTrackingAction: vi.fn(),
  manuallySetOrderDeliveredAction: vi.fn(),
}));
vi.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="icon-alert" />,
  CheckCircle2: () => <span />,
  Clock: () => <span />,
  RefreshCw: () => <span />,
  ShieldCheck: () => <span />,
  Package: () => <span />,
  Calendar: () => <span />,
  Warehouse: () => <span />,
  Send: () => <span />,
  Truck: () => <span />,
  X: () => <span />,
  FileText: () => <span />,
}));

const REGISTERED_AT = new Date('2026-08-13T13:39:55.000Z').toLocaleString('ko-KR');
const CANCELED_AT = new Date('2026-08-13T14:20:10.000Z').toLocaleString('ko-KR');
const HELD_AT = new Date('2026-08-13T15:05:30.000Z').toLocaleString('ko-KR');

function renderStepper(props: Partial<Parameters<typeof UpsOrderStatusStepper>[0]> = {}) {
  return render(
    <UpsOrderStatusStepper
      orderId="o1"
      currentStatus="IN_TRANSIT"
      statusHistory={[
        { next_status: 'REGISTERED', created_at: '2026-08-13T13:39:55.000Z' },
        { next_status: 'WAREHOUSED', created_at: '2026-08-13T13:42:41.000Z' },
        { next_status: 'IN_TRANSIT', created_at: '2026-08-13T14:00:00.000Z' },
      ]}
      {...props}
    />
  );
}

describe('TASK-B-304 ①: 정상 스텝 시각 위치 — Step Indicator 바 아래', () => {
  it('단계별 시각이 Step Indicator Dot/Line 바 아래에 렌더링된다 (DOM 순서 검증)', () => {
    const { container } = renderStepper();

    // 접수등록 스텝: Step Indicator 바(Dot/Line)가 시각보다 먼저 나와야 함
    const stageBlocks = Array.from(container.querySelectorAll('.grid-cols-7 > div'));
    expect(stageBlocks.length).toBe(7);

    // 첫 스텝(접수등록) 내부에서 시각 span이 indicator 바 div 다음에 위치하는지 확인
    const firstBlock = stageBlocks[0];
    const children = Array.from(firstBlock.children);
    // 마지막 세 자식: [Step Label, Dot/Line 바, stageTime]
    const lastThree = children.slice(-3);
    // Dot/Line 바 (inner span에 h-1 rounded-full) 다음에 stageTime (text-[9px])이 와야 함
    const indicatorIdx = lastThree.findIndex((el) => !!el.querySelector('.h-1.rounded-full'));
    const timeIdx = lastThree.findIndex((el) => el.textContent === REGISTERED_AT);
    expect(indicatorIdx).toBeGreaterThanOrEqual(0);
    expect(timeIdx).toBeGreaterThan(indicatorIdx);
  });

  it('시각이 있는 모든 스텝에서 indicator 바 아래에 시각이 온다 (IN_TRANSIT 포함)', () => {
    const { container } = renderStepper();
    const blocks = Array.from(container.querySelectorAll('.grid-cols-7 > div'));
    // IN_TRANSIT(5번째 스텝) 시각
    const inTransitTime = new Date('2026-08-13T14:00:00.000Z').toLocaleString('ko-KR');
    const inTransitBlock = blocks.find((b) => b.textContent?.includes('UPS 배송중'));
    const children = Array.from(inTransitBlock!.children).slice(-3);
    const indicatorIdx = children.findIndex((el) => !!el.querySelector('.h-1.rounded-full'));
    const timeIdx = children.findIndex((el) => el.textContent === inTransitTime);
    expect(timeIdx).toBeGreaterThan(indicatorIdx);
  });
});

describe('TASK-B-304 ②: CANCELED/HELD 배너 전이 시각', () => {
  it('CANCELED 상태에서 배너에 "취소 일시"가 표시되고 rose 계열 색을 쓴다', () => {
    const { container } = renderStepper({
      currentStatus: 'CANCELED',
      statusHistory: [
        { next_status: 'REGISTERED', created_at: '2026-08-13T13:39:55.000Z' },
        { next_status: 'CANCELED', created_at: '2026-08-13T14:20:10.000Z' },
      ],
    });

    expect(screen.getByText(/취소\(CANCELED\)/)).toBeTruthy();
    const timeSpan = screen.getByText(`취소 일시: ${CANCELED_AT}`);
    expect(timeSpan).toBeTruthy();
    // rose 계열 색 (정상 시각 text-slate-400과 구분)
    expect(timeSpan.className).toContain('text-rose-');
    // 7단계 스테퍼는 숨김 (기존 동작 유지)
    expect(container.querySelector('.grid-cols-7')).toBeNull();
  });

  it('HELD 상태에서 배너에 "보류 일시"가 표시되고 amber 계열 색을 쓴다', () => {
    const { container } = renderStepper({
      currentStatus: 'HELD',
      statusHistory: [
        { next_status: 'REGISTERED', created_at: '2026-08-13T13:39:55.000Z' },
        { next_status: 'HELD', created_at: '2026-08-13T15:05:30.000Z' },
      ],
    });

    expect(screen.getByText(/보류\(HELD\)/)).toBeTruthy();
    const timeSpan = screen.getByText(`보류 일시: ${HELD_AT}`);
    expect(timeSpan).toBeTruthy();
    expect(timeSpan.className).toContain('text-amber-');
    // HELD는 CANCELED와 달리 7단계 스테퍼가 그대로 유지된다 (기존 구조 — `!isCanceled` 조건)
    expect(container.querySelector('.grid-cols-7')).not.toBeNull();
  });

  it('statusHistory에 CANCELED/HELD 전이 이력이 없으면 시각 텍스트가 렌더링되지 않는다 (데이터 누락 가드)', () => {
    renderStepper({
      currentStatus: 'CANCELED',
      statusHistory: [
        { next_status: 'REGISTERED', created_at: '2026-08-13T13:39:55.000Z' },
      ],
    });

    expect(screen.getByText(/취소\(CANCELED\)/)).toBeTruthy();
    expect(screen.queryByText(/취소 일시:/)).toBeNull();
  });

  it('같은 상태로 재전이된 이력이 여러 건이면 가장 최근 것이 표시된다 (reverse().find() 패턴)', () => {
    renderStepper({
      currentStatus: 'HELD',
      statusHistory: [
        { next_status: 'REGISTERED', created_at: '2026-08-13T13:39:55.000Z' },
        { next_status: 'HELD', created_at: '2026-08-13T14:30:00.000Z' },
        { next_status: 'IN_TRANSIT', created_at: '2026-08-13T14:45:00.000Z' },
        { next_status: 'HELD', created_at: '2026-08-13T15:05:30.000Z' },
      ],
    });

    // 최신 HELD 전이(15:05:30)만 표시 — 중간의 HELD(14:30)는 미표시
    const latestTime = new Date('2026-08-13T15:05:30.000Z').toLocaleString('ko-KR');
    const olderTime = new Date('2026-08-13T14:30:00.000Z').toLocaleString('ko-KR');
    expect(screen.getByText(`보류 일시: ${latestTime}`)).toBeTruthy();
    expect(screen.queryByText(`보류 일시: ${olderTime}`)).toBeNull();
  });

  it('Invalid Date created_at은 시각 미표시 (기존 TASK-B-301 가드 패턴)', () => {
    renderStepper({
      currentStatus: 'CANCELED',
      statusHistory: [
        { next_status: 'CANCELED', created_at: 'invalid-date-value' },
      ],
    });
    expect(screen.getByText(/취소\(CANCELED\)/)).toBeTruthy();
    expect(screen.queryByText(/취소 일시:/)).toBeNull();
  });
});
