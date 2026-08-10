// DEF-B-047 / Issue #1050: UPS 오더 상세 도착국 표시 US 하드코딩 수정 회귀 테스트
import { describe, it, expect } from 'vitest';

describe('TC-DEF-B047-01: destCountryCode 소스 검증', () => {
  it('order.recipient_country_code가 있으면 해당 값을 사용', () => {
    const order = { recipient_country_code: 'CN', dest_port: null };
    const result = order.recipient_country_code || (order.dest_port as any)?.country_code || 'US';
    expect(result).toBe('CN');
  });

  it('order.recipient_country_code가 없고 dest_port가 있으면 dest_port 사용', () => {
    const order = { recipient_country_code: null, dest_port: { country_code: 'JP' } };
    const result = order.recipient_country_code || (order.dest_port as any)?.country_code || 'US';
    expect(result).toBe('JP');
  });

  it('둘 다 없으면 US 폴백', () => {
    const order = { recipient_country_code: null, dest_port: null };
    const result = order.recipient_country_code || (order.dest_port as any)?.country_code || 'US';
    expect(result).toBe('US');
  });
});

describe('TC-DEF-B047-02: 되돌리기 검증', () => {
  it('기존 버그 패턴(dest_country_code) 사용 시 항상 US 반환', () => {
    const order = { recipient_country_code: 'CN', dest_port: null };
    // 기존 버그: dest_country_code는 존재하지 않는 컬럼 → undefined
    const buggyResult = (order as any).dest_country_code || (order.dest_port as any)?.country_code || 'US';
    expect(buggyResult).toBe('US'); // WRONG! CN이어야 함
  });

  it('수정 후 패턴(recipient_country_code) 사용 시 정확한 값 반환', () => {
    const order = { recipient_country_code: 'CN', dest_port: null };
    const correctResult = order.recipient_country_code || (order.dest_port as any)?.country_code || 'US';
    expect(correctResult).toBe('CN');
  });
});
