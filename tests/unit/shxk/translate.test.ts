import { describe, it, expect } from 'vitest';
import { translateShxkText, translateShxkMessage, pickShxkLocaleText, SHXK_TRANSLATION_DICT } from '@/lib/shxk/translate';

// TASK-B-290 (Issue #1085 / DEF-B-060): SHXK 중문 번역 유틸 단위 테스트.

describe('translateShxkText — 사전 기반 중→한/영 번역', () => {
  it('사전에 있는 문구는 ko/en/zh/ja 번역본 반환', () => {
    const r = translateShxkText('离开设施');
    expect(r).toEqual({
      ko: '시설을 출발했습니다',
      en: 'Departed from facility',
      zh: '离开设施',
      ja: '施設を出発しました',
    });
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

describe('translateShxkText — 실측 전체 문장 부분일치 (PR#1086 반려 대응)', () => {
  it('실측 원문 "我们正在遇到运输延迟。我们将尽快递送您的包裹。" 번역됨 (사전 키 포함)', () => {
    const r = translateShxkText('我们正在遇到运输延迟。我们将尽快递送您的包裹。');
    expect(r).not.toBeNull();
    expect(r?.ko).toBe('운송 지연이 발생하고 있습니다');
  });

  it('실측 원문 "发件人已创建标签，但是 UPS 尚未收到包裹。" 번역됨 (사전 키 포함)', () => {
    const r = translateShxkText('发件人已创建标签，但是 UPS 尚未收到包裹。');
    expect(r).not.toBeNull();
    expect(r?.ko).toBe('발송인이 라벨을 생성했습니다');
  });

  it('앞부분/뒷부분 여분 텍스트가 붙은 문장도 사전 키로 매칭 (완전일치 아님)', () => {
    // 사전 키 "离开设施"가 앞에 오고 뒷문장이 붙은 실전 패턴
    const r = translateShxkText('离开设施，你的包裹正在路上。');
    expect(r?.ko).toBe('시설을 출발했습니다');
  });

  it('어떤 사전 키도 포함하지 않는 문장은 null (원문 유지)', () => {
    expect(translateShxkText('完全未知的事件描述内容')).toBeNull();
  });
});

describe('pickShxkLocaleText — 로케일별 표출 문자열', () => {
  const zh = '离开设施';
  const ko = '시설을 출발했습니다';
  const en = 'Departed from facility';

  it('ko → ko 번역본', () => {
    expect(pickShxkLocaleText('ko', zh, ko, en)).toBe(ko);
  });

  it('ko + ko 번역본 없으면 사전 ko 값으로 폴백 (TASK-B-351)', () => {
    expect(pickShxkLocaleText('ko', zh, null, en)).toBe(ko);
  });

  it('zh → 중문 원문', () => {
    expect(pickShxkLocaleText('zh', zh, ko, en)).toBe(zh);
  });

  it('en → en 번역본', () => {
    expect(pickShxkLocaleText('en', zh, ko, en)).toBe(en);
  });

  it('ja → 사전 ja 번역본 (TASK-B-351, 이전에는 en 이었다)', () => {
    expect(pickShxkLocaleText('ja', zh, ko, en)).toBe('施設を出発しました');
  });

  it('en + en 번역본 없으면 사전 en 값으로 폴백 (TASK-B-351)', () => {
    expect(pickShxkLocaleText('en', zh, ko, null)).toBe(en);
  });

  it('사전 미매칭 zh는 ja 로케일에서 en/ko 값 → 중문 원문 순으로 폴백', () => {
    expect(pickShxkLocaleText('ja', '未知の文言', '알 수 없는 문구', 'Unknown text')).toBe('Unknown text');
    expect(pickShxkLocaleText('ja', '未知の文言', null, null)).toBe('未知の文言');
  });
});

// TASK-B-351 (Issue #1299): SHXK 오류 문구 4개 로케일 번역 + 원문 은닉용 유틸
describe('translateShxkMessage — 오류 원문 4개 로케일 변환', () => {
  it('실측 문구 未找到订单信息 → 4개 로케일 각각 다른 문장 (ko/en/zh/ja)', () => {
    expect(translateShxkMessage('未找到订单信息', 'ko')).toBe('주문 정보를 찾을 수 없습니다');
    expect(translateShxkMessage('未找到订单信息', 'en')).toBe('Order information was not found');
    expect(translateShxkMessage('未找到订单信息', 'zh')).toBe('未找到订单信息');
    expect(translateShxkMessage('未找到订单信息', 'ja')).toBe('注文情報が見つかりません');
  });

  it('실측 문구 Invalid ShipFrom AddressLine3 → 4개 로케일 (영문 원문 기반)', () => {
    expect(translateShxkMessage('Invalid ShipFrom AddressLine3', 'ko')).toBe('발송인 주소 3번째 줄이 올바르지 않습니다');
    expect(translateShxkMessage('Invalid ShipFrom AddressLine3', 'en')).toBe('Invalid ShipFrom AddressLine3');
    expect(translateShxkMessage('Invalid ShipFrom AddressLine3', 'zh')).toBe('发件人地址第3行无效');
    expect(translateShxkMessage('Invalid ShipFrom AddressLine3', 'ja')).toBe('発送元住所の3行目が無効です');
  });

  it('미매칭 원문은 null (호출부에서 일반문구로 대체 — 추측 번역 금지)', () => {
    expect(translateShxkMessage('未知のエラー本文', 'ko')).toBeNull();
    expect(translateShxkMessage(null, 'ko')).toBeNull();
  });
});
