// DEF-B-047 / Issue #1050: UPS 오더 상세 도착국 표시 US 하드코딩 수정 회귀 테스트
// 실제 프로덕션 함수(resolveDestCountryCode)를 import해서 검증
import { describe, it, expect } from 'vitest';
import { resolveDestCountryCode } from '@/lib/ups/order-helpers';

describe('TC-DEF-B047-01: resolveDestCountryCode 실제 함수 검증', () => {
  it('recipient_country_code가 있으면 해당 값을 사용', () => {
    const order = { recipient_country_code: 'CN', dest_port: null };
    expect(resolveDestCountryCode(order)).toBe('CN');
  });

  it('recipient_country_code가 없고 dest_port가 있으면 dest_port 사용', () => {
    const order = { recipient_country_code: null, dest_port: { country_code: 'JP' } };
    expect(resolveDestCountryCode(order)).toBe('JP');
  });

  it('둘 다 없으면 US 폴백', () => {
    const order = { recipient_country_code: null, dest_port: null };
    expect(resolveDestCountryCode(order)).toBe('US');
  });

  it('recipient_country_code가 빈 문자열이면 dest_port 시도', () => {
    const order = { recipient_country_code: '', dest_port: { country_code: 'KR' } };
    expect(resolveDestCountryCode(order)).toBe('KR');
  });

  it('recipient_country_code가 빈 문자열이고 dest_port도 없으면 US 폴백', () => {
    const order = { recipient_country_code: '', dest_port: null };
    expect(resolveDestCountryCode(order)).toBe('US');
  });
});

describe('TC-DEF-B047-02: 되돌리기 검증 — 실제 프로덕션 코드 연결', () => {
  it('기존 버그 패턴(dest_country_code) 사용 시 항상 US 반환', () => {
    const order = { recipient_country_code: 'CN', dest_port: null };
    // 기존 버그: dest_country_code는 존재하지 않는 컬럼 → undefined
    const buggyResult = (order as any).dest_country_code || (order.dest_port as any)?.country_code || 'US';
    expect(buggyResult).toBe('US'); // WRONG! CN이어야 함
  });

  it('resolveDestCountryCode 사용 시 정확한 값 반환', () => {
    const order = { recipient_country_code: 'CN', dest_port: null };
    expect(resolveDestCountryCode(order)).toBe('CN');
  });
});
