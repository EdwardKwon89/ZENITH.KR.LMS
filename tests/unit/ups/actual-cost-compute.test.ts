// TASK-B-364 (Issue #1374): computeUpsActualCostKrw 단위 테스트 (T2~T5 계산 규칙)
import { describe, it, expect } from 'vitest';
import { computeUpsActualCostKrw } from '@/lib/ups/actual-cost';

const base = { amount: 1000, currency: 'HKD' };
const zero = { amount: 0, currency: 'HKD' };

describe('computeUpsActualCostKrw — 항목별 통화·가산 규칙 (TASK-B-364)', () => {
  it('기본운임에만 +7% 가산, 유류·급증은 그대로 환산', () => {
    const r = computeUpsActualCostKrw(
      {
        baseFreight: base,
        fuelSurcharge: { amount: 300, currency: 'HKD' },
        surgeFee: { amount: 50, currency: 'HKD' },
        otherCharges: [],
      },
      { exchangeRates: { HKD: 150, KRW: 1 } },
    );

    expect(r.base.krw).toBe(160500); // 1000*150*1.07
    expect(r.base.surchargeRate).toBe(0.07);
    expect(r.base.surchargeAmountKrw).toBe(10500); // 160500 - 150000
    expect(r.fuel.krw).toBe(45000);
    expect(r.surge.krw).toBe(7500);
    expect(r.totalCostKrw).toBe(213000);
    expect(r.appliedExchangeRates).toEqual({ HKD: 150 });
  });

  it('KRW 입력은 환율 1로 계산한다', () => {
    const zeroKrw = { amount: 0, currency: 'KRW' };
    const r = computeUpsActualCostKrw(
      { baseFreight: { amount: 100000, currency: 'KRW' }, fuelSurcharge: zeroKrw, surgeFee: zeroKrw, otherCharges: [] },
      { exchangeRates: { KRW: 1 } },
    );

    expect(r.base.exchangeRate).toBe(1);
    expect(r.base.krw).toBe(107000);
    expect(r.totalCostKrw).toBe(107000);
  });

  it('항목 통화 혼합(기본 USD·유류 HKD·기타 KRW) 환산 합계', () => {
    const r = computeUpsActualCostKrw(
      {
        baseFreight: { amount: 1000, currency: 'USD' },
        fuelSurcharge: { amount: 300, currency: 'HKD' },
        surgeFee: zero,
        otherCharges: [{ name: 'Customs', amount: 50000, currency: 'KRW' }],
      },
      { exchangeRates: { USD: 1350, HKD: 150, KRW: 1 } },
    );

    expect(r.base.krw).toBe(1444500); // 1000*1350*1.07
    expect(r.fuel.krw).toBe(45000);
    expect(r.otherChargesKrwTotal).toBe(50000);
    expect(r.totalCostKrw).toBe(1539500);
    expect(r.appliedExchangeRates).toEqual({ USD: 1350, HKD: 150, KRW: 1 });
  });

  it('기타부가운임 2행은 행별 통화로 환산해 합산한다', () => {
    const r = computeUpsActualCostKrw(
      {
        baseFreight: zero,
        fuelSurcharge: zero,
        surgeFee: zero,
        otherCharges: [
          { name: 'A', amount: 100, currency: 'HKD' },
          { name: 'B', amount: 50000, currency: 'KRW' },
        ],
      },
      { exchangeRates: { HKD: 150, KRW: 1 } },
    );

    expect(r.otherCharges).toEqual([
      { name: 'A', amount: 100, currency: 'HKD', exchangeRate: 150, krw: 15000 },
      { name: 'B', amount: 50000, currency: 'KRW', exchangeRate: 1, krw: 50000 },
    ]);
    expect(r.otherChargesKrwTotal).toBe(65000);
  });

  it('환율 누락 시 MISSING_RATE:<통화>를 throw 한다', () => {
    expect(() =>
      computeUpsActualCostKrw(
        { baseFreight: { amount: 100, currency: 'JPY' }, fuelSurcharge: zero, surgeFee: zero, otherCharges: [] },
        { exchangeRates: { KRW: 1 } },
      ),
    ).toThrow('MISSING_RATE:JPY');
  });
});
