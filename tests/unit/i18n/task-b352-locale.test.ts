// TASK-B-352 (Issue #1325): 이번 Task에서 추가한 `Errors` 키가 4개 로케일에서
// 실제 서로 다른 문장으로 반환되는지 검증한다(전역 mock 은 ko 고정 → 개별 로케일 스위치 mock).
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

describe('TASK-B-352 신규 Errors 키 — 4개 로케일 문구', () => {
  it.each([
    ['ko', 'UPS 오더가 아닙니다.'],
    ['en', 'This is not a UPS order.'],
    ['zh', '不是 UPS 订单。'],
    ['ja', 'UPS 注文ではありません。'],
  ])('not_ups_order — %s', async (locale, expected) => {
    hoisted.locale = locale;
    await expect(trError('not_ups_order')).resolves.toBe(expected);
  });

  it.each([
    ['ko', '오더가 IN_TRANSIT 또는 DELIVERED 상태일 때만 실제 청구 요금을 입력할 수 있습니다.'],
    ['en', 'Actual charges can be entered only when the order is IN_TRANSIT or DELIVERED.'],
    ['zh', '仅当订单处于 IN_TRANSIT 或 DELIVERED 状态时才能输入实际费用。'],
    ['ja', '実費請求は注文が IN_TRANSIT または DELIVERED の状態でのみ入力できます。'],
  ])('ups_actual_charge_status_invalid — %s', async (locale, expected) => {
    hoisted.locale = locale;
    await expect(trError('ups_actual_charge_status_invalid')).resolves.toBe(expected);
  });

  it.each([
    ['ko', '수동 배송 완료 전환 사유 입력은 필수입니다.'],
    ['en', 'A reason is required to manually mark the order as delivered.'],
    ['zh', '手动标记为已送达时必须填写原因。'],
    ['ja', '手動で配送完了に変更するには理由の入力が必須です。'],
  ])('manual_reason_required — %s', async (locale, expected) => {
    hoisted.locale = locale;
    await expect(trError('manual_reason_required')).resolves.toBe(expected);
  });
});
