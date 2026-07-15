import { describe, it, expect, vi, afterEach } from 'vitest';
import { getKstToday } from '@/lib/utils/date-kst';

describe('TC-KST-TODAY: KST 기준 날짜 계산 (Issue #518)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC-KST-01: UTC 15:00 = KST 자정(다음날)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T15:00:00Z')); // UTC 07-16 15:00 = KST 07-17 00:00
    expect(getKstToday()).toBe('2026-07-17');
  });

  it('TC-KST-02: UTC 14:59 = KST 23:59 (당일) — 경계 직전', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T14:59:00Z')); // UTC 07-16 14:59 = KST 07-16 23:59
    expect(getKstToday()).toBe('2026-07-16');
  });

  it('TC-KST-03: UTC 00:00 = KST 09:00 (당일) — 기존 UTC 기준이던 시간', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T00:00:00Z')); // UTC 07-16 00:00 = KST 07-16 09:00
    expect(getKstToday()).toBe('2026-07-16');
  });

  it('TC-KST-04: UTC 23:59 = KST 08:59(다음날) — UTC/KST 날짜 갈리는 시간대', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T23:59:00Z')); // UTC 07-15 23:59 = KST 07-16 08:59
    expect(getKstToday()).toBe('2026-07-16');
  });

  it('TC-KST-05: UTC 15:00 월말 — 07-31 15:00 UTC = 08-01 00:00 KST', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-31T15:00:00Z'));
    expect(getKstToday()).toBe('2026-08-01');
  });

  it('TC-KST-06: UTC 15:00 연말 — 12-31 15:00 UTC = 01-01 00:00 KST', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T15:00:00Z'));
    expect(getKstToday()).toBe('2027-01-01');
  });

  it('TC-KST-07: 반환 포맷 YYYY-MM-DD 확인', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T10:00:00Z'));
    const result = getKstToday();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('TC-KST-08: UTC 06:00 = KST 15:00 (당일 오후)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T06:00:00Z')); // UTC 07-16 06:00 = KST 07-16 15:00
    expect(getKstToday()).toBe('2026-07-16');
  });
});
