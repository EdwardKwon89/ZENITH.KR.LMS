import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';

// TASK-B-290 (Issue #1085 / DEF-B-060): UpsTrackingEventsList 로케일별 렌더링 테스트.

const mockUseLocale = vi.fn();
vi.mock('next-intl', () => ({
  useLocale: () => mockUseLocale(),
}));

import UpsTrackingEventsList from '@/components/tracking/UpsTrackingEventsList';

afterEach(() => {
  cleanup();
});

const baseEvents = [
  {
    id: 'e1',
    tracking_number: '1Z123',
    event_date: '2026-08-11',
    event_time: '15:24:27',
    event_code: 'AF',
    event_desc: '离开设施',
    event_desc_ko: '시설을 출발했습니다',
    event_desc_en: 'Departed from facility',
    location_city: 'Incheon',
    location_country: 'KR',
  },
];

describe('TASK-B-290: UpsTrackingEventsList 로케일 렌더링 (Issue #1085 / DEF-B-060)', () => {
  it('ko 로케일 → event_desc_ko 표출', () => {
    mockUseLocale.mockReturnValue('ko');
    render(<UpsTrackingEventsList events={baseEvents as any} />);
    expect(screen.getByText('시설을 출발했습니다')).toBeTruthy();
  });

  it('zh 로케일 → 중문 원문(event_desc) 표출', () => {
    mockUseLocale.mockReturnValue('zh');
    render(<UpsTrackingEventsList events={baseEvents as any} />);
    expect(screen.getByText('离开设施')).toBeTruthy();
  });

  it('en 로케일 → event_desc_en 표출', () => {
    mockUseLocale.mockReturnValue('en');
    render(<UpsTrackingEventsList events={baseEvents as any} />);
    expect(screen.getByText('Departed from facility')).toBeTruthy();
  });

  it('번역본 없는 이벤트는 중문 원문 표출 (ko 로케일에서도 폴백)', () => {
    mockUseLocale.mockReturnValue('ko');
    const events = [{ ...baseEvents[0], event_desc_ko: null, event_desc_en: null }];
    render(<UpsTrackingEventsList events={events as any} />);
    expect(screen.getByText('离开设施')).toBeTruthy();
  });

  it('event_time은 TIME 포맷 그대로 표시 (split(" ")[1] 가정 제거)', () => {
    mockUseLocale.mockReturnValue('ko');
    render(<UpsTrackingEventsList events={baseEvents as any} />);
    // "15:24:27" 그대로 보여야 함
    expect(screen.getByText('15:24:27')).toBeTruthy();
  });

  it('이벤트 없으면 빈 상태 문구 표시', () => {
    mockUseLocale.mockReturnValue('ko');
    render(<UpsTrackingEventsList events={[]} />);
    expect(screen.getByText(/UPS 트래킹 이벤트가 없습니다/)).toBeTruthy();
  });
});
