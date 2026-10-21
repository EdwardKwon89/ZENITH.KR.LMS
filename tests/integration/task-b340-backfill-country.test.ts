// TASK-B-340 (Issue #1256): 기존 데이터 정정 마이그레이션 실DB 검증 (R-14).
// 소스 문자열 toContain 금지 — 마이그레이션 SQL 파일을 실제 읽어 로컬 Supabase에 실행하고 결과 행을 검증한다.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

const MIGRATION_FILE = 'supabase/migrations/20261021090000_task_b340_backfill_shipper_country_code.sql';

const ID_KEEP = '34000000-0000-4000-8000-000000000101';   // '' + 주소 있음 → KR로 정정
const ID_NO_ADDR = '34000000-0000-4000-8000-000000000102'; // '' + 주소 없음 → 불변
const ID_NULL = '34000000-0000-4000-8000-000000000103';    // NULL → 불변
const ID_JP = '34000000-0000-4000-8000-000000000104';      // 'JP' → 불변

function psql(sql: string, quiet = true): string {
  // sh -c 큰따옴표 안에서도 백틱은 명령 치환되므로 반드시 이스케이프한다
  // (마이그레이션 주석의 `??`/`||` 표기가 실제로 명령 치환을 유발했다).
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
  const q = quiet ? '-q ' : '';
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres ${q}-t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

function cleanupFixture() {
  psql(`
    DELETE FROM public.zen_orders WHERE id IN ('${ID_KEEP}','${ID_NO_ADDR}','${ID_NULL}','${ID_JP}');
  `);
}

function setupFixture() {
  cleanupFixture();
  psql(`
    INSERT INTO public.zen_orders (id, order_no, cargo_details, transport_mode, status, shipper_country_code, shipper_address) VALUES
      ('${ID_KEEP}',    'ZEN-340-MIG-1', '{}'::jsonb, 'UPS', 'WAREHOUSED', '',   '경기 성남시 수정구 수정남로326번길 4-6'),
      ('${ID_NO_ADDR}', 'ZEN-340-MIG-2', '{}'::jsonb, 'UPS', 'WAREHOUSED', '',   ''),
      ('${ID_NULL}',    'ZEN-340-MIG-3', '{}'::jsonb, 'UPS', 'WAREHOUSED', NULL, 'Some Address'),
      ('${ID_JP}',      'ZEN-340-MIG-4', '{}'::jsonb, 'UPS', 'WAREHOUSED', 'JP', 'Tokyo Address')
  `);
}

function countryCodeOf(id: string): string {
  return psql(`SELECT coalesce(shipper_country_code, '<NULL>') FROM public.zen_orders WHERE id='${id}'`);
}

function runMigrationFile(): string {
  const sql = readFileSync(path.join(process.cwd(), MIGRATION_FILE), 'utf-8');
  return psql(sql, false); // quiet=false → "UPDATE n" 출력
}

describe('TASK-B-340 (Issue #1256): shipper_country_code 백필 마이그레이션 (실DB)', () => {
  beforeEach(() => setupFixture());
  afterAll(() => cleanupFixture());

  it('TC-340-MIG-①: "" + 주소 있음 → KR, 나머지(NULL/주소없음/다른 국가) 불변', () => {
    // 로컬 DB에 이미 같은 조건('' + 주소)의 실제 행이 있을 수 있으므로 대상 건수를 먼저 센 뒤 비교한다.
    const expected = Number(
      psql(`SELECT count(*) FROM public.zen_orders WHERE shipper_country_code='' AND COALESCE(shipper_address,'') <> ''`)
    );
    expect(expected).toBeGreaterThanOrEqual(1);

    const output = runMigrationFile();
    expect(output).toContain(`UPDATE ${expected}`);

    expect(countryCodeOf(ID_KEEP)).toBe('KR');
    expect(countryCodeOf(ID_NO_ADDR)).toBe('');   // 주소 없음 → 불변
    expect(countryCodeOf(ID_NULL)).toBe('<NULL>'); // NULL → 불변
    expect(countryCodeOf(ID_JP)).toBe('JP');       // 다른 국가 → 불변
  });

  it('TC-340-MIG-②: 재실행 시 0행 (멱등)', () => {
    runMigrationFile(); // 1차: ID_KEEP 정정
    const rerun = runMigrationFile();
    expect(rerun).toContain('UPDATE 0');
    expect(countryCodeOf(ID_KEEP)).toBe('KR');
  });
});
