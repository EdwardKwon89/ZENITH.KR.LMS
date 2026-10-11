import { describe, it, expect } from 'vitest';
import { sumItemAmountByCurrency } from '@/lib/orders/item-totals';

describe('sumItemAmountByCurrency — TASK-B-330 (Issue #1232)', () => {
  it('① 단일 통화(USD) 품목을 수량×단가로 합산한다', () => {
    const result = sumItemAmountByCurrency([
      {
        items: [
          { quantity: 2, unit_price: 10, currency: 'USD' },
          { quantity: 3, unit_price: 5.5, currency: 'USD' },
        ],
      },
    ]);
    expect(result).toEqual({ USD: 36.5 });
  });

  it('② USD + KRW 혼합 시 통화별 두 키로 각각 합산한다(환산 없음)', () => {
    const result = sumItemAmountByCurrency([
      { items: [{ quantity: 1, unit_price: 100, currency: 'USD' }] },
      { items: [{ quantity: 2, unit_price: 1000, currency: 'KRW' }] },
    ]);
    expect(Object.keys(result).sort()).toEqual(['KRW', 'USD']);
    expect(result.USD).toBe(100);
    expect(result.KRW).toBe(2000);
  });

  it('③ 빈 packages / 빈 items 는 {} 를 반환한다', () => {
    expect(sumItemAmountByCurrency([])).toEqual({});
    expect(sumItemAmountByCurrency(null)).toEqual({});
    expect(sumItemAmountByCurrency(undefined)).toEqual({});
    expect(sumItemAmountByCurrency([{ items: [] }])).toEqual({});
    expect(sumItemAmountByCurrency([{}])).toEqual({});
  });

  it('④ null / NaN / 음수 quantity·unit_price 는 0으로 무시한다', () => {
    const result = sumItemAmountByCurrency([
      {
        items: [
          { quantity: null, unit_price: 100, currency: 'USD' },
          { quantity: 5, unit_price: NaN, currency: 'USD' },
          { quantity: -3, unit_price: 10, currency: 'USD' },
          { quantity: 2, unit_price: -4, currency: 'USD' },
          { quantity: 4, unit_price: 25, currency: 'USD' },
        ],
      },
    ]);
    expect(result).toEqual({ USD: 100 });
  });

  it('⑤ 소수점(0.1×3) 부동소수 합산 — 오차 허용', () => {
    const result = sumItemAmountByCurrency([
      { items: [{ quantity: 0.1, unit_price: 3, currency: 'USD' }] },
    ]);
    expect(result.USD).toBeCloseTo(0.3, 10);
  });

  it('⑥ currency 미지정·공백·소문자 입력을 정규화한다(미지정 → USD)', () => {
    const result = sumItemAmountByCurrency([
      {
        items: [
          { quantity: 1, unit_price: 10 },
          { quantity: 1, unit_price: 10, currency: '' },
          { quantity: 1, unit_price: 10, currency: null },
          { quantity: 1, unit_price: 10, currency: 'usd' },
          { quantity: 1, unit_price: 10, currency: ' krw ' },
        ],
      },
    ]);
    expect(result).toEqual({ USD: 40, KRW: 10 });
  });

  it('⑦ 입력 객체/배열을 변경하지 않는다(불변)', () => {
    const packages = [
      { items: [{ quantity: 2, unit_price: 10, currency: 'USD' }] },
      { items: [{ quantity: 1, unit_price: 1000, currency: 'KRW' }] },
    ];
    const snapshot = JSON.parse(JSON.stringify(packages));

    sumItemAmountByCurrency(packages);

    expect(packages).toEqual(snapshot);
  });
});
