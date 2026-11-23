// TASK-B-351 (Issue #1299): `Errors` 네임스페이스가 로케일별로 실제 문장을 반환하는지 검증.
//
// 전역 mock(tests/setup.ts)은 ko 고정이므로, 이 파일에서는 `next-intl/server`를 **로케일 스위치형**
// 개별 mock으로 덮어써 ko/en/zh/ja 문구를 각각 확인한다(지시: 개별 mock 으로 4개 로케일 확인).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => ({ locale: 'ko' }));

vi.mock('next-intl/server', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const load = (locale: string) =>
    JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), 'utf-8')) as Record<string, any>;

  const getTranslations = vi.fn(async (arg?: string | { locale?: string; namespace?: string }) => {
    const locale = (typeof arg === 'object' && arg?.locale) || hoisted.locale;
    const namespace = typeof arg === 'string' ? arg : arg?.namespace;
    const messages = load(locale);
    const scoped = namespace ? messages[namespace] : messages;
    return (key: string, params?: Record<string, unknown>) => {
      const raw = key.split('.').reduce<any>((acc, part) => acc?.[part], scoped);
      if (typeof raw !== 'string') throw new Error(`MISSING_MESSAGE: ${namespace ?? ''}.${key} [${locale}]`);
      return raw.replace(/\{(\w+)\}/g, (whole, name: string) =>
        params && name in params ? String(params[name]) : whole,
      );
    };
  });

  return {
    getLocale: vi.fn(async () => hoisted.locale),
    getTranslations,
  };
});

import { getLocale } from 'next-intl/server';
import { actionLocale, trError } from '@/lib/i18n/action-error';

beforeEach(() => {
  hoisted.locale = 'ko';
  vi.mocked(getLocale).mockClear();
});

describe('trError — 4개 로케일 실제 문구 (TASK-B-351)', () => {
  it.each([
    ['ko', '택배사 시스템에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: E123)'],
    ['en', 'The carrier system could not process the request. Please try again shortly. (Code: E123)'],
    ['zh', '快递公司系统未能处理该请求，请稍后重试。（代码：E123）'],
    ['ja', '配送業者システムでリクエストを処理できませんでした。しばらくしてから再試行してください。（コード: E123）'],
  ])('%s 로케일 — shxk_generic 문장', async (locale, expected) => {
    hoisted.locale = locale;

    await expect(trError('shxk_generic', { code: 'E123' })).resolves.toBe(expected);
  });

  it('ICU 파라미터({fields})가 로케일별 문장에 치환된다', async () => {
    hoisted.locale = 'en';

    await expect(trError('shxk_validation_failed', { fields: 'A, B' })).resolves.toBe(
      'SHXK pre-validation failed: A, B',
    );
  });
});

describe('actionLocale — 해석 실패 시 ko 폴백 (TASK-B-351)', () => {
  it('getLocale() 예외 시 ko 반환', async () => {
    vi.mocked(getLocale).mockRejectedValueOnce(new Error('no request context'));

    await expect(actionLocale()).resolves.toBe('ko');
  });

  it('지원하지 않는 로케일이면 ko 반환', async () => {
    hoisted.locale = 'fr';

    await expect(actionLocale()).resolves.toBe('ko');
  });
});
