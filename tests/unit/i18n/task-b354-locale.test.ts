// TASK-B-354 (Issue #1330): 이번 Task 신규 `Errors` 키의 4개 로케일 문구 검증.
// 전역 mock 은 ko 고정 → 개별 로케일 스위치 mock. ko 문구가 원문과 같은 키가 있으므로 en 단언을 포함한다.
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

  return { getLocale: vi.fn(async () => hoisted.locale), getTranslations };
});

import { trError } from '@/lib/i18n/action-error';

beforeEach(() => {
  hoisted.locale = 'ko';
});

describe('TASK-B-354 신규 Errors 키 — 4개 로케일 문구', () => {
  it.each([
    ['ko', '인보이스를 찾을 수 없습니다.'],
    ['en', 'Invoice not found.'],
    ['zh', '找不到发票。'],
    ['ja', '請求書が見つかりません。'],
  ])('invoice_not_found — %s', async (locale, expected) => {
    hoisted.locale = locale;
    await expect(trError('invoice_not_found')).resolves.toBe(expected);
  });

  it.each([
    ['ko', '현재 상태에서는 오더를 수정할 수 없습니다. (상태: WAREHOUSED)'],
    ['en', 'The order cannot be edited in its current status. (Status: WAREHOUSED)'],
    ['zh', '当前状态下无法修改订单。（状态：WAREHOUSED）'],
    ['ja', '現在のステータスでは注文を編集できません。（ステータス: WAREHOUSED）'],
  ])('order_edit_status_invalid({status}) — %s', async (locale, expected) => {
    hoisted.locale = locale;
    await expect(trError('order_edit_status_invalid', { status: 'WAREHOUSED' })).resolves.toBe(expected);
  });

  it.each([
    ['en', 'Orders registered with UPS cannot be edited. Cancel the UPS registration in the warehouse first.'],
    ['ko', 'UPS에 등록된 오더는 수정할 수 없습니다. 수정이 필요하면 창고에서 "UPS 등록취소" 후 진행하세요.'],
  ])('ups_edit_registered_locked — %s', async (locale, expected) => {
    hoisted.locale = locale;
    await expect(trError('ups_edit_registered_locked')).resolves.toBe(expected);
  });
});
