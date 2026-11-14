import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

// TASK-1143 (Issue #1214, DEF-137 후속): profiles 뷰 참조 RLS 정책 전수 감사
// - 전부 behavioral: 실제 로컬 DB에 자체 픽스처(org·profile·invoice·file 마커행)를
//   만들고 RLS 세션 시뮬레이션(SET LOCAL role + request.jwt.claims)으로 동작 검증.
//   소스 문자열 검사(toContain)는 사용하지 않는다.
// - 픽스처는 고정 UUID 마커행 + afterAll 정리라 CI fresh-DB에서도 동작한다.

function psql(sql: string): string {
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' },
  );
  return result.trim();
}

function lastLine(out: string): string {
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines[lines.length - 1];
}

const ORG_A = 'a1111111-1111-4111-8111-111111111111';
const ORG_B = 'a2222222-2222-4222-8222-222222222222';
const SHIP_A = 'b1111111-1111-4111-8111-111111111111';
const OTHER_B = 'b2222222-2222-4222-8222-222222222222';
const ADMIN_P = 'b3333333-3333-4333-8333-333333333333';
const INV_A = 'c1111111-1111-4111-8111-111111111111';
const MARKER = 'TASK1143-AUDIT-MARKER.pdf';

const ADMIN_CLAIMS = `{"sub": "${ADMIN_P}", "app_metadata": {"role": "ADMIN"}}`;
const SHIP_A_CLAIMS = `{"sub": "${SHIP_A}", "app_metadata": {"role": "CORPORATE"}}`;
const OTHER_B_CLAIMS = `{"sub": "${OTHER_B}", "app_metadata": {"role": "CORPORATE"}}`;

function seedFixtures(): void {
  psql(`INSERT INTO zen_organizations (id, name, type) VALUES
    ('${ORG_A}', 'TASK1143 audit org A', 'SHIPPER'),
    ('${ORG_B}', 'TASK1143 audit org B', 'SHIPPER')
    ON CONFLICT (id) DO NOTHING;`);
  psql(`INSERT INTO zen_profiles (id, email, role, org_id) VALUES
    ('${SHIP_A}', 'task1143-ship-a@example.com', 'CORPORATE', '${ORG_A}'),
    ('${OTHER_B}', 'task1143-other-b@example.com', 'CORPORATE', '${ORG_B}'),
    ('${ADMIN_P}', 'task1143-admin@example.com', 'ADMIN', NULL)
    ON CONFLICT (id) DO NOTHING;`);
  psql(`INSERT INTO zen_invoices (id, invoice_no, shipper_id, due_date) VALUES
    ('${INV_A}', 'AUD-1143-001', '${ORG_A}', CURRENT_DATE + 30)
    ON CONFLICT (id) DO NOTHING;`);
  psql(`INSERT INTO zen_invoice_files (invoice_id, file_name, file_url)
    SELECT '${INV_A}', '${MARKER}', 'https://example.com/audit.pdf'
    WHERE NOT EXISTS (SELECT 1 FROM zen_invoice_files WHERE file_name = '${MARKER}');`);
}

function cleanupFixtures(): void {
  psql(`DELETE FROM zen_invoice_files WHERE file_name = '${MARKER}';`);
  psql(`DELETE FROM zen_invoices WHERE id = '${INV_A}';`);
  psql(`DELETE FROM zen_profiles WHERE id IN ('${SHIP_A}', '${OTHER_B}', '${ADMIN_P}');`);
  psql(`DELETE FROM zen_organizations WHERE id IN ('${ORG_A}', '${ORG_B}');`);
}

describe('TASK-1143: profiles 참조 RLS 전수 감사', () => {
  beforeAll(() => {
    cleanupFixtures();
    seedFixtures();
  });

  afterAll(() => {
    cleanupFixtures();
  });

  it('TC-AUD-01: [Success] ADMIN은 zen_invoice_files 마커행을 조회할 수 있어야 함 (admins_all, profiles 뷰 경유)', () => {
    // When
    const out = psql(`
      SET LOCAL role TO authenticated;
      SET LOCAL request.jwt.claims TO '${ADMIN_CLAIMS}';
      SELECT COUNT(*) FROM zen_invoice_files WHERE file_name = '${MARKER}';
    `);

    // Then
    expect(out).not.toContain('permission denied');
    expect(lastLine(out)).toBe('1');
  });

  it('TC-AUD-02: [Success] 소속 화주는 자사 invoice 파일을 조회할 수 있어야 함 (org_isolation, profiles 뷰 경유)', () => {
    // When
    const out = psql(`
      SET LOCAL role TO authenticated;
      SET LOCAL request.jwt.claims TO '${SHIP_A_CLAIMS}';
      SELECT COUNT(*) FROM zen_invoice_files WHERE file_name = '${MARKER}';
    `);

    // Then
    expect(out).not.toContain('permission denied');
    expect(lastLine(out)).toBe('1');
  });

  it('TC-AUD-03: [Guard] 타사 사용자에게는 invoice 파일이 노출되지 않아야 함', () => {
    // When
    const out = psql(`
      SET LOCAL role TO authenticated;
      SET LOCAL request.jwt.claims TO '${OTHER_B_CLAIMS}';
      SELECT COUNT(*) FROM zen_invoice_files WHERE file_name = '${MARKER}';
    `);

    // Then
    expect(out).not.toContain('permission denied');
    expect(lastLine(out)).toBe('0');
  });

  it('TC-AUD-04: [Guard] bare profiles 참조 정책은 승인된 2건(admins_all·org_isolation)만 존재해야 함', () => {
    // When — zen_profiles를 제외하고 bare profiles를 참조하는 활성 정책을 실측
    const out = psql(`
      SELECT tablename || '.' || policyname FROM pg_policies
      WHERE replace(coalesce(qual,'') || ' ' || coalesce(with_check,''), 'zen_profiles', '') LIKE '%profiles%'
      ORDER BY 1;
    `);

    // Then — TASK-1143 감사 결론과 일치 (추가 소실·추가 참조 발생 시 실패)
    expect(out).toContain('zen_invoice_files.admins_all');
    expect(out).toContain('zen_invoice_files.org_isolation');
    expect(out.split('\n').filter(Boolean)).toHaveLength(2);
  });

  it('TC-AUD-05: [Guard] TASK-1142 복구 정책(zen_error_logs Admin full access)이 유지되어야 함', () => {
    // When
    const out = psql(`
      SELECT COUNT(*) FROM pg_policies
      WHERE tablename = 'zen_error_logs' AND policyname = 'Admin full access on zen_error_logs';
    `);

    // Then
    expect(lastLine(out)).toBe('1');
  });
});
