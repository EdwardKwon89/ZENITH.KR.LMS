import { describe, it, expect } from 'vitest';
import { translateShxkText, pickShxkLocaleText, SHXK_TRANSLATION_DICT } from '@/lib/shxk/translate';

// TASK-B-290 (Issue #1085 / DEF-B-060): SHXK 중문 번역 유틸 단위 테스트.

describe('translateShxkText — 사전 기반 중→한/영 번역', () => {
  it('사전에 있는 문구는 ko/en 번역본 반환', () => {
    const r = translateShxkText('离开设施');
    expect(r).toEqual({ ko: '시설을 출발했습니다', en: 'Departed from facility' });
  });

  it('공백이 있어도 trim 후 매칭', () => {
    const r = translateShxkText('  离开设施  ');
    expect(r?.ko).toBe('시설을 출발했습니다');
  });

  it('사전에 없는 문구는 null 반환 (원문 유지, 강제 번역 금지)', () => {
    expect(translateShxkText('未知的扫描事件')).toBeNull();
  });

  it('빈/null 입력은 null 반환', () => {
    expect(translateShxkText(null)).toBeNull();
    expect(translateShxkText(undefined)).toBeNull();
    expect(translateShxkText('')).toBeNull();
  });

  it('시딩 사전이 최소 9개 이상 존재 (실측 문구 커버리지)', () => {
    expect(Object.keys(SHXK_TRANSLATION_DICT).length).toBeGreaterThanOrEqual(9);
  });
});

describe('pickShxkLocaleText — 로케일별 표출 문자열', () => {
  const zh = '离开设施';
  const ko = '시설을 출발했습니다';
  const en = 'Departed from facility';

  it('ko → ko 번역본', () => {
    expect(pickShxkLocaleText('ko', zh, ko, en)).toBe(ko);
  });

  it('ko + ko 번역본 없으면 중문 원문 폴백', () => {
    expect(pickShxkLocaleText('ko', zh, null, en)).toBe(zh);
  });

  it('zh → 중문 원문', () => {
    expect(pickShxkLocaleText('zh', zh, ko, en)).toBe(zh);
  });

  it('en → en 번역본', () => {
    expect(pickShxkLocaleText('en', zh, ko, en)).toBe(en);
  });

  it('ja(그 외 로케일) → en 번역본', () => {
    expect(pickShxkLocaleText('ja', zh, ko, en)).toBe(en);
  });

  it('en + en 번역본 없으면 중문 원문 폴백', () => {
    expect(pickShxkLocaleText('en', zh, ko, null)).toBe(zh);
  });
});
