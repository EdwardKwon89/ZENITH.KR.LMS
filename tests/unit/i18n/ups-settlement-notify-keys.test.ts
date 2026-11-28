import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES = ['ko', 'en', 'zh', 'ja'] as const;

function notify(locale: string): Record<string, string> {
  const messages = JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), 'utf-8'));
  return messages.UpsSettlementNotify;
}

// TASK-B-381 PR-4a — 정산마감 알림 문구 4개 로케일 키 동기화
describe('UpsSettlementNotify 로케일 키', () => {
  it('4개 로케일 모두 title·body를 가지고 body는 {orderNo}만 사용한다', () => {
    for (const locale of LOCALES) {
      const messages = notify(locale);
      expect(messages.title, `${locale}.title`).toBeTruthy();
      expect(messages.body, `${locale}.body`).toBeTruthy();
      expect([...messages.body.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()).toEqual(['orderNo']);
    }
  });
});
