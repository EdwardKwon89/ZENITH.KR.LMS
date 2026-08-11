// DEF-B-059 / Issue #1079: 오더 화주 주소 영문 컬럼 부재 수정 회귀 테스트
// 실제 프로덕션 함수(resolveShipperStreet)를 import해서 검증 + Supabase CLI로 DB 검증
import { describe, it, expect, beforeAll } from 'vitest';
import { resolveShipperStreet } from '@/lib/ups/label-mapping';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

function queryDB(sql: string): string {
  return execSync(`npx supabase db query --local "${sql}"`, {
    cwd: process.cwd(),
    encoding: 'utf-8',
  });
}

describe('TC-DEF-B059-01: resolveShipperStreet 실제 함수 검증', () => {
  it('order.shipper_address_english가 있으면 우선 사용', () => {
    const order = {
      shipper_address_english: '123 Test Street',
      shipper_address_detail_english: 'Suite 100',
      shipper_address: '테스트 주소',
      shipper_address_detail: '상세주소',
    };
    const shipperOrg = {
      address_english: 'Org English Address',
      address: '조직 주소',
    };
    const result = resolveShipperStreet(order, shipperOrg);
    expect(result).toBe('123 Test Street Suite 100');
  });

  it('order.shipper_address_english가 없으면 shipperOrg.address_english 사용', () => {
    const order = {
      shipper_address: '테스트 주소',
      shipper_address_detail: '상세주소',
    };
    const shipperOrg = {
      address_english: 'Org English Address',
      address: '조직 주소',
    };
    const result = resolveShipperStreet(order, shipperOrg);
    expect(result).toContain('Org English Address');
  });

  it('영문 주소가 모두 없으면 한글 주소로 폴백', () => {
    const order = {
      shipper_address: '테스트 주소',
      shipper_address_detail: '상세주소',
    };
    const shipperOrg = {
      address: '조직 주소',
    };
    const result = resolveShipperStreet(order, shipperOrg);
    expect(result).toContain('조직 주소');
  });

  it('shipperOrg가 없으면 order 한글 주소 사용', () => {
    const order = {
      shipper_address: '테스트 주소',
      shipper_address_detail: '상세주소',
    };
    const result = resolveShipperStreet(order, undefined);
    expect(result).toContain('테스트 주소');
  });

  it('모든 값이 없으면 빈 문자열 반환', () => {
    const order = {};
    const result = resolveShipperStreet(order, undefined);
    expect(result).toBe('');
  });
});

describe('TC-DEF-B059-02: 마이그레이션 DB 검증', () => {
  it('zen_orders에 shipper_address_english 컬럼이 존재한다', () => {
    const output = queryDB("SELECT column_name FROM information_schema.columns WHERE table_name = 'zen_orders' AND column_name = 'shipper_address_english';");
    expect(output).toContain('shipper_address_english');
  });

  it('zen_orders에 shipper_address_detail_english 컬럼이 존재한다', () => {
    const output = queryDB("SELECT column_name FROM information_schema.columns WHERE table_name = 'zen_orders' AND column_name = 'shipper_address_detail_english';");
    expect(output).toContain('shipper_address_detail_english');
  });

  it('create_order_atomic 함수가 shipper_address_english를 포함한다', () => {
    const output = queryDB("SELECT prosrc FROM pg_proc WHERE proname = 'create_order_atomic';");
    expect(output).toContain('shipper_address_english');
    expect(output).toContain('shipper_address_detail_english');
  });
});

describe('TC-DEF-B059-03: 되돌리기 검증', () => {
  it('기존 코드는 order-level english를 무시했다', () => {
    // 기존 로직: shipperOrg.address_english > shipperOrg.address > order.shipper_address
    const order = {
      shipper_address_english: '123 Test Street',
      shipper_address: '테스트 주소',
    };
    const shipperOrg = {
      address: '조직 주소',
    };
    
    const buggyResult = (shipperOrg?.address_english as string) || (shipperOrg?.address as string) || (order.shipper_address as string) || '';
    expect(buggyResult).toBe('조직 주소'); // order.shipper_address_english가 무시됨
  });

  it('수정 후 코드는 order-level english를 우선 사용한다', () => {
    const order = {
      shipper_address_english: '123 Test Street',
      shipper_address: '테스트 주소',
    };
    const shipperOrg = {
      address: '조직 주소',
    };
    const result = resolveShipperStreet(order, shipperOrg);
    expect(result).toBe('123 Test Street');
  });
});
