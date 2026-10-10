import { describe, it, expect } from 'vitest';
import { formatCurrencyAmount } from '@/components/orders/ItemsTotalSummary';

describe('formatCurrencyAmount — TASK-B-331 (Issue #1234)', () => {
  it('통화 기호를 제거하고 숫자 뒤에 통화코드를 붙인다 (USD)', () => {
    expect(formatCurrencyAmount(20, 'USD')).toBe('20.00 USD');
  });

  it('CNY 는 소수 2자리를 유지한다', () => {
    expect(formatCurrencyAmount(360, 'CNY')).toBe('360.00 CNY');
  });

  it('KRW 는 Intl 기본 소수 자릿수(0)를 따른다 — 천단위 구분 포함', () => {
    expect(formatCurrencyAmount(50000, 'KRW')).toBe('50,000 KRW');
  });

  it('JPY 는 Intl 기본 소수 자릿수(0)를 따른다', () => {
    expect(formatCurrencyAmount(1000, 'JPY')).toBe('1,000 JPY');
  });

  it('큰 수의 반올림·천단위 구분을 처리한다', () => {
    expect(formatCurrencyAmount(1234567.891, 'USD')).toBe('1,234,567.89 USD');
  });

  it('EUR 소수 2자리를 유지한다', () => {
    expect(formatCurrencyAmount(12.5, 'EUR')).toBe('12.50 EUR');
  });

  it('0 도 통화별 형식으로 표기한다', () => {
    expect(formatCurrencyAmount(0, 'USD')).toBe('0.00 USD');
  });

  it('유효하지 않은 통화코드는 toFixed(2) 폴백을 사용한다', () => {
    expect(formatCurrencyAmount(5, 'X')).toBe('5.00 X');
  });
});
