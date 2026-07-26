import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('TASK-B-208: 통합트래킹 order.status 기준 통일', () => {
  it('getGlobalTrackingOverview에 order.status select 포함', () => {
    const src = readFileSync('src/app/actions/operations/tracking.ts', 'utf-8');
    expect(src).toContain('transport_mode,\n        status');
  });

  it('TrackingDashboard 통계 카드가 order.status를 사용', () => {
    const src = readFileSync('src/components/tracking/TrackingDashboard.tsx', 'utf-8');
    expect(src).toContain('t.order?.status === "IN_TRANSIT"');
    expect(src).toContain('t.order?.status === "DELIVERED"');
    expect(src).toContain('t.order?.status === "CLAIMED"');
    expect(src).toContain('t.order?.status === "HELD"');
    expect(src).toContain('t.order?.status === "RETURNED"');
  });

  it('상태 아이콘이 order.status를 사용', () => {
    const src = readFileSync('src/components/tracking/TrackingDashboard.tsx', 'utf-8');
    expect(src).toContain('track.order?.status === "DELIVERED"');
    expect(src).toContain('track.order?.status === "HELD"');
    expect(src).toContain('track.order?.status === "CLAIMED"');
    expect(src).toContain('track.order?.status === "RETURNED"');
  });

  it('그리드 클래스가 6개 카드에 대응', () => {
    const src = readFileSync('src/components/tracking/TrackingDashboard.tsx', 'utf-8');
    expect(src).toContain('lg:grid-cols-6');
  });
});
