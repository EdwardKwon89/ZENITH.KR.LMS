// TASK-B-368 / DEF-B-162 (Issue #1415) — 화주명 정규화 유틸 단위 검증
//
// 원칙(이슈 DoD): 입력/기대값 **실제 값 단언** — 소스 문자열 검사 금지.
// 규칙은 RPC `billed_key`(ADHOC)와 서버 후보 매칭이 **3중 일치**해야 하므로 바이트 단위 고정 검증이다.
import { describe, it, expect } from 'vitest';
import { normalizeShipperName } from '@/lib/finance/billing/normalize-shipper-name';

describe('normalizeShipperName (DEF-B-162 유틸 분리 — 규칙 바이트 단위 고정)', () => {
  it('연속 공백을 단일 공백으로 압축한다', () => {
    expect(normalizeShipperName('A   B')).toBe('a b');
    expect(normalizeShipperName('A B')).toBe('a b');
  });

  it('양끝 공백을 제거한다', () => {
    expect(normalizeShipperName('   이름   ')).toBe('이름');
    expect(normalizeShipperName('  (주)ABC Co  ')).toBe('(주)abc co');
  });

  it('영문을 소문자로 만든다', () => {
    expect(normalizeShipperName('ABC Co.')).toBe('abc co.');
    expect(normalizeShipperName('Hyundai LOGISTICS')).toBe('hyundai logistics');
  });

  it('한글·특수문자는 그대로 유지한다', () => {
    expect(normalizeShipperName('가나다')).toBe('가나다');
    expect(normalizeShipperName('(주)한국화주')).toBe('(주)한국화주');
  });

  it('전각 공백(U+3000)·NBSP(U+00A0)·개행·탭도 공백으로 압축한다 (JS `\\s` 정의)', () => {
    expect(normalizeShipperName('가\u3000나')).toBe('가 나');   // 전각 공백
    expect(normalizeShipperName('가\u00a0나')).toBe('가 나');   // NBSP
    expect(normalizeShipperName('\t가\n나\r')).toBe('가 나');   // 개행·탭
    expect(normalizeShipperName('  A \t\u3000 B  ')).toBe('a b');
  });

  it('빈 문자열·공백만 있는 입력은 빈 문자열이 된다', () => {
    expect(normalizeShipperName('')).toBe('');
    expect(normalizeShipperName('   ')).toBe('');
    expect(normalizeShipperName('\u3000')).toBe('');
  });

  it('실DB ADHOC 테스트와 동일한 표기 변형이 같은 결과로 수렴한다', () => {
    // '  (주)ABC   Co '(오더의 shipper_name) ↔ '(주)abc co'(청구 대상명)
    expect(normalizeShipperName('  (주)ABC   Co ')).toBe('(주)abc co');
    expect(normalizeShipperName('(주)abc co')).toBe('(주)abc co');
    expect(normalizeShipperName('(주)ABC  co')).toBe('(주)abc co');
  });

  it('RPC `billed_key`의 ADHOC 규칙(regexp_replace → btrim → lower)과 같은 순서로 동작한다', () => {
    // 규칙 순서가 어긋나면(예: lower 먼저) 결과는 같지만 공백 경계에서 갈린다 — 경계 케이스 고정
    const input = '  ZEN   Shipper CO ';
    const rpcStyle = input.replace(/\s+/g, ' ').trim().toLowerCase();
    expect(normalizeShipperName(input)).toBe(rpcStyle);
    expect(normalizeShipperName(input)).toBe('zen shipper co');
  });
});
