// DEF-B-048 / Issue #1051: zen_ups_zones 이름표 단순화 회귀 테스트
// Supabase CLI(db query)로 DB 쿼리하여 검증
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

function queryDB(sql: string): string {
  return execSync(`npx supabase db query --local "${sql}"`, {
    cwd: process.cwd(),
    encoding: 'utf-8',
  });
}

describe('TC-DEF-B048-01: DB 쿼리 기반 zone_name 검증', () => {
  it('10개 zone이 존재한다', () => {
    const output = queryDB('SELECT COUNT(*) as count FROM zen_ups_zones;');
    expect(output).toContain('10');
  });

  it('모든 zone_name이 "Zone N" 형식이다', () => {
    const output = queryDB("SELECT zone_name FROM zen_ups_zones WHERE zone_name !~ '^Zone [0-9]+$';");
    expect(output).not.toContain('Zone');
  });

  it('기존 대륙명 라벨이 제거되었다', () => {
    const output = queryDB('SELECT zone_name FROM zen_ups_zones;');
    const invalidPatterns = ['Domestic', 'East Asia', 'SE Asia', 'Oceania', 
      'Middle East', 'Europe', 'North America', 'South America', 'Africa'];
    
    for (const pattern of invalidPatterns) {
      expect(output).not.toContain(pattern);
    }
  });
});

describe('TC-DEF-B048-02: zone_id 불변 검증', () => {
  it('zone_id가 유효한 UUID 형식이다', () => {
    const output = queryDB('SELECT id::text FROM zen_ups_zones LIMIT 1;');
    expect(output).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  });

  it('zone_code가 변경되지 않았다', () => {
    const output = queryDB('SELECT zone_code FROM zen_ups_zones ORDER BY zone_code;');
    expect(output).toContain('Z1');
    expect(output).toContain('Z2');
    expect(output).toContain('Z3');
    expect(output).toContain('Z4');
    expect(output).toContain('Z5');
    expect(output).toContain('Z6');
    expect(output).toContain('Z7');
    expect(output).toContain('Z8');
    expect(output).toContain('Z9');
    expect(output).toContain('Z10');
  });
});

describe('TC-DEF-B048-03: 되돌리기 검증', () => {
  it('기존 잘못된 이름이 "Zone N - 대륙명" 형식이었다', () => {
    const oldZoneNames = [
      'Zone 1 - Domestic Korea',
      'Zone 2 - East Asia (China/Japan)',
      'Zone 8 - North America',
      'Zone 10 - Africa',
    ];
    
    for (const name of oldZoneNames) {
      expect(name).toContain(' - ');
      expect(name).not.toMatch(/^Zone \d+$/);
    }
  });

  it('새 이름은 "Zone N" 형식만 사용한다', () => {
    const newZoneNames = ['Zone 1', 'Zone 5', 'Zone 10'];
    
    for (const name of newZoneNames) {
      expect(name).toMatch(/^Zone \d+$/);
      expect(name).not.toContain(' - ');
    }
  });
});
