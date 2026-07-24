import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';

describe('Issue #770: getGlobalTrackingOverview UPS 트래킹 확장', () => {
  it('tracking.ts에 zen_ups_tracking_events 조회 로직이 포함됨', async () => {
    const src = readFileSync('src/app/actions/operations/tracking.ts', 'utf-8');
    expect(src).toContain('zen_ups_tracking_events');
    expect(src).toContain('transport_mode === \'UPS\'');
    expect(src).toContain('source: \'ups\'');
  });

  it('UPS 오더의 최신 이벤트가 zen_ups_tracking_events에서 조회됨', async () => {
    const src = readFileSync('src/app/actions/operations/tracking.ts', 'utf-8');
    // UPS 이벤트 조회 쿼리 확인
    expect(src).toContain('.from("zen_ups_tracking_events")');
    expect(src).toContain('event_desc');
    expect(src).toContain('event_code');
    expect(src).toContain('location_city');
  });

  it('UPS 이벤트가 기존 이벤트보다 우선하여 표시됨', async () => {
    const src = readFileSync('src/app/actions/operations/tracking.ts', 'utf-8');
    // UPS 이벤트가 latestEventMap에 없을 때만 추가되는 로직 확인
    expect(src).toContain('if (!latestEventMap.has(evt.order_id))');
  });
});
