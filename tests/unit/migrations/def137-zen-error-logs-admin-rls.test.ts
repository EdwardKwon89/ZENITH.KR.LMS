import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

// TASK-1142 (Issue #1211, DEF-137): zen_error_logs Admin RLS 복구 검증
// - 전부 behavioral: 실제 로컬 DB에 RLS 세션 시뮬레이션
//   (SET LOCAL role + request.jwt.claims)으로 SELECT/INSERT/UPDATE 동작을 검증한다.
//   소스 문자열 검사(toContain)는 사용하지 않는다 (DoD vacuous 금지).
// - def117-agency-rls-v2.test.ts 패턴을 따른다.

function psql(sql: string): string {
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' },
  );
  return result.trim();
}

function lastLine(out: string): string {
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines[lines.length - 1];
}

const ADMIN_CLAIMS = `{"sub": "00000000-0000-0000-0000-0000000000a1", "app_metadata": {"role": "ADMIN"}}`;
const SUPER_ADMIN_CLAIMS = `{"sub": "00000000-0000-0000-0000-0000000000a2", "app_metadata": {"role": "ZENITH_SUPER_ADMIN"}}`;
const USER_CLAIMS = `{"sub": "00000000-0000-0000-0000-0000000000a3", "app_metadata": {"role": "USER"}}`;

function seedMarker(message: string): void {
  psql(
    `INSERT INTO zen_error_logs (error_type, message, severity) VALUES ('SERVER', '${message}', 'ERROR');`,
  );
}

function cleanupMarkers(): void {
  psql(`DELETE FROM zen_error_logs WHERE message LIKE 'DEF137-RT-%';`);
}

describe('TASK-1142: DEF-137 zen_error_logs Admin RLS', () => {
  beforeAll(() => {
    cleanupMarkers();
  });

  afterAll(() => {
    cleanupMarkers();
  });

  it('TC-DEF137-01: [Success] ADMIN 세션에서 로그 SELECT가 가능해야 함', () => {
    // Given
    seedMarker('DEF137-RT-01');

    // When — 실제 RLS 세션 시뮬레이션으로 조회
    const out = psql(`
      SET LOCAL role TO authenticated;
      SET LOCAL request.jwt.claims TO '${ADMIN_CLAIMS}';
      SELECT COUNT(*) FROM zen_error_logs WHERE message = 'DEF137-RT-01';
    `);

    // Then
    expect(out).not.toContain('permission denied');
    expect(lastLine(out)).toBe('1');
  });

  it('TC-DEF137-02: [Success] ADMIN 세션에서 해결(UPDATE resolved) 처리가 가능해야 함', () => {
    // Given
    seedMarker('DEF137-RT-02');

    // When
    const out = psql(`
      SET LOCAL role TO authenticated;
      SET LOCAL request.jwt.claims TO '${ADMIN_CLAIMS}';
      UPDATE zen_error_logs SET resolved = true WHERE message = 'DEF137-RT-02';
      SELECT COUNT(*) FROM zen_error_logs WHERE message = 'DEF137-RT-02' AND resolved = true;
    `);

    // Then
    expect(out).not.toContain('permission denied');
    expect(out).toContain('UPDATE 1');
    expect(lastLine(out)).toBe('1');
  });

  it('TC-DEF137-03: [Guard] 非-ADMIN 세션에서는 로그 SELECT가 차단되어야 함', () => {
    // Given
    seedMarker('DEF137-RT-03');

    // When
    const out = psql(`
      SET LOCAL role TO authenticated;
      SET LOCAL request.jwt.claims TO '${USER_CLAIMS}';
      SELECT COUNT(*) FROM zen_error_logs WHERE message = 'DEF137-RT-03';
    `);

    // Then — 에러가 아니라 RLS 필터로 0건 (정보 노출 없음)
    expect(out).not.toContain('permission denied');
    expect(lastLine(out)).toBe('0');
  });

  it('TC-DEF137-04: [Guard] 非-ADMIN 세션에서는 해결(UPDATE) 처리가 차단되어야 함', () => {
    // Given
    seedMarker('DEF137-RT-04');

    // When
    const out = psql(`
      SET LOCAL role TO authenticated;
      SET LOCAL request.jwt.claims TO '${USER_CLAIMS}';
      UPDATE zen_error_logs SET resolved = true WHERE message = 'DEF137-RT-04';
      SELECT COUNT(*) FROM zen_error_logs WHERE message = 'DEF137-RT-04' AND resolved = true;
    `);

    // Then
    expect(out).not.toContain('permission denied');
    expect(out).toContain('UPDATE 0');
    expect(lastLine(out)).toBe('0');
  });

  it('TC-DEF137-05: [Success] 인증 사용자의 로그 INSERT 경로가 유지되어야 함', () => {
    // When — 일반 인증 세션으로 INSERT (클라이언트 오류 보고 경로)
    const out = psql(`
      SET LOCAL role TO authenticated;
      SET LOCAL request.jwt.claims TO '${USER_CLAIMS}';
      INSERT INTO zen_error_logs (error_type, message, severity) VALUES ('CLIENT', 'DEF137-RT-05', 'WARNING');
    `);

    // Then — GRANT + WITH CHECK true 정책으로 적재 성공
    expect(out).not.toContain('permission denied');
    expect(out).toContain('INSERT 0 1');

    // And — ADMIN 세션에서는 해당 행이 조회됨
    const readBack = psql(`
      SET LOCAL role TO authenticated;
      SET LOCAL request.jwt.claims TO '${ADMIN_CLAIMS}';
      SELECT COUNT(*) FROM zen_error_logs WHERE message = 'DEF137-RT-05';
    `);
    expect(lastLine(readBack)).toBe('1');
  });

  it('TC-DEF137-06: [Success] ZENITH_SUPER_ADMIN 세션에서도 로그 SELECT가 가능해야 함', () => {
    // Given
    seedMarker('DEF137-RT-06');

    // When
    const out = psql(`
      SET LOCAL role TO authenticated;
      SET LOCAL request.jwt.claims TO '${SUPER_ADMIN_CLAIMS}';
      SELECT COUNT(*) FROM zen_error_logs WHERE message = 'DEF137-RT-06';
    `);

    // Then
    expect(out).not.toContain('permission denied');
    expect(lastLine(out)).toBe('1');
  });
});
