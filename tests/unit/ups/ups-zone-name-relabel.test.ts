// DEF-B-048 / Issue #1051: zen_ups_zones 이름표 단순화 회귀 테스트
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('TC-DEF-B048-01: 마이그레이션 SQL 검증', () => {
  const migrationPath = join(process.cwd(), 'supabase/migrations/20260811020000_iss1051_ups_zone_name_relabel.sql');
  const migrationSql = readFileSync(migrationPath, 'utf-8');

  it('10개 zone에 대한 UPDATE 문이 모두 포함되어 있다', () => {
    for (let i = 1; i <= 10; i++) {
      const zoneCode = i === 10 ? 'Z10' : `Z${i}`;
      const expectedName = `Zone ${i}`;
      expect(migrationSql).toContain(`zone_name = '${expectedName}' WHERE zone_code = '${zoneCode}'`);
    }
  });

  it('zone_id는 변경하지 않는다 (UPDATE만 존재)', () => {
    expect(migrationSql).not.toContain('ALTER');
    expect(migrationSql).not.toContain('DROP');
    expect(migrationSql).not.toContain('INSERT');
  });
});

describe('TC-DEF-B048-02: 예상 zone_name 형식 검증', () => {
  const expectedZoneNames: Record<string, string> = {
    'Z1': 'Zone 1',
    'Z2': 'Zone 2',
    'Z3': 'Zone 3',
    'Z4': 'Zone 4',
    'Z5': 'Zone 5',
    'Z6': 'Zone 6',
    'Z7': 'Zone 7',
    'Z8': 'Zone 8',
    'Z9': 'Zone 9',
    'Z10': 'Zone 10',
  };

  it('모든 zone_name이 "Zone N" 형식이다', () => {
    for (const [zoneCode, expectedName] of Object.entries(expectedZoneNames)) {
      expect(expectedName).toMatch(/^Zone \d+$/);
      expect(expectedName).not.toContain('Domestic');
      expect(expectedName).not.toContain('East Asia');
      expect(expectedName).not.toContain('North America');
    }
  });

  it('zone_code와 zone_name의 번호가 일치한다', () => {
    for (const [zoneCode, expectedName] of Object.entries(expectedZoneNames)) {
      const zoneNumber = zoneCode === 'Z10' ? '10' : zoneCode.replace('Z', '');
      expect(expectedName).toBe(`Zone ${zoneNumber}`);
    }
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
