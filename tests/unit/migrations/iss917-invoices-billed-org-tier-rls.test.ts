import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

function psql(sql: string): string {
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );
  return result.trim().split('\n')[0];
}

function psqlMulti(sql: string): string[] {
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );
  return result.trim().split('\n').filter((line: string) => {
    const trimmed = line.trim();
    return trimmed !== '' && !trimmed.startsWith('SET') && !trimmed.startsWith('UPDATE') && !trimmed.startsWith('INSERT') && !trimmed.startsWith('DELETE');
  });
}

describe('Issue #917: zen_invoices billed_org_id / invoice_tier 마이그레이션', () => {
  let migration: string;

  const AGENCY_ORG_ID = randomUUID();
  const AGENCY_USER_ID = randomUUID();
  const SHIPPER_ORG_ID = randomUUID();
  const OTHER_AGENCY_ORG_ID = randomUUID();
  const OTHER_USER_ID = randomUUID();
  const INV_OWN_ID = randomUUID();
  const INV_OTHER_ID = randomUUID();

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260728100000_iss917_invoices_billed_org_id_tier.sql',
      'utf-8'
    );

    // 테스트 조직 생성
    psql(`INSERT INTO zen_organizations (id, name, type, created_at) VALUES ('${AGENCY_ORG_ID}', 'Test Agency Own', 'AGENCY', NOW())`);
    psql(`INSERT INTO zen_organizations (id, name, type, created_at) VALUES ('${SHIPPER_ORG_ID}', 'Test Shipper', 'INDIVIDUAL', NOW())`);
    psql(`INSERT INTO zen_organizations (id, name, type, created_at) VALUES ('${OTHER_AGENCY_ORG_ID}', 'Test Agency Other', 'AGENCY', NOW())`);

    // 테스트 사용자 프로필
    psql(`INSERT INTO zen_profiles (id, org_id, role, email, created_at) VALUES ('${AGENCY_USER_ID}', '${AGENCY_ORG_ID}', 'AGENCY', 'test-own-${AGENCY_ORG_ID.substring(0,8)}@test.com', NOW())`);
    psql(`INSERT INTO zen_profiles (id, org_id, role, email, created_at) VALUES ('${OTHER_USER_ID}', '${OTHER_AGENCY_ORG_ID}', 'AGENCY', 'test-other-${OTHER_AGENCY_ORG_ID.substring(0,8)}@test.com', NOW())`);

    // 본인 소속 인보이스 (billed_org_id = AGENCY_ORG_ID)
    psql(`INSERT INTO zen_invoices (id, invoice_no, shipper_id, total_amount, currency, due_date, status, billed_org_id, invoice_tier, created_at) VALUES ('${INV_OWN_ID}', 'INV-TEST-OWN-${INV_OWN_ID.substring(0,8)}', '${SHIPPER_ORG_ID}', 100.00, 'USD', CURRENT_DATE, 'UNPAID', '${AGENCY_ORG_ID}', 'AGENCY_TO_SHIPPER', NOW())`);

    // 타 조직 인보이스 (billed_org_id = OTHER_AGENCY_ORG_ID)
    psql(`INSERT INTO zen_invoices (id, invoice_no, shipper_id, total_amount, currency, due_date, status, billed_org_id, invoice_tier, created_at) VALUES ('${INV_OTHER_ID}', 'INV-TEST-OTHER-${INV_OTHER_ID.substring(0,8)}', '${SHIPPER_ORG_ID}', 200.00, 'USD', CURRENT_DATE, 'UNPAID', '${OTHER_AGENCY_ORG_ID}', 'ADMIN_TO_SHIPPER', NOW())`);
  });

  afterAll(() => {
    psql(`DELETE FROM zen_invoices WHERE id IN ('${INV_OWN_ID}', '${INV_OTHER_ID}')`);
    psql(`DELETE FROM zen_profiles WHERE id IN ('${AGENCY_USER_ID}', '${OTHER_USER_ID}')`);
    psql(`DELETE FROM zen_organizations WHERE id IN ('${AGENCY_ORG_ID}', '${SHIPPER_ORG_ID}', '${OTHER_AGENCY_ORG_ID}')`);
  });

  describe('마이그레이션 구조 검증', () => {
    it('billed_org_id 컬럼 추가 포함', () => {
      expect(migration).toContain('billed_org_id');
      expect(migration).toContain('UUID REFERENCES');
    });

    it('invoice_tier 컬럼 추가 포함', () => {
      expect(migration).toContain('invoice_tier');
      expect(migration).toContain('ADMIN_TO_AGENCY');
      expect(migration).toContain('AGENCY_TO_SHIPPER');
      expect(migration).toContain('ADMIN_TO_SHIPPER');
    });

    it('인덱스 2개 생성 포함', () => {
      expect(migration).toContain('idx_zen_invoices_billed_org');
      expect(migration).toContain('idx_zen_invoices_tier');
    });

    it('AGENCY SELECT RLS 정책 포함 (billed_org_id)', () => {
      expect(migration).toContain('Agency can view billed invoices');
      expect(migration).toContain('billed_org_id');
    });

    it('백필 SQL 포함', () => {
      expect(migration).toContain('AGENCY_TO_SHIPPER');
      expect(migration).toContain('ADMIN_TO_SHIPPER');
      expect(migration).toContain('source_order_id');
    });
  });

  describe('컬럼·인덱스 존재 확인', () => {
    it('billed_org_id 컬럼 존재', () => {
      const result = psql(`SELECT column_name FROM information_schema.columns WHERE table_name='zen_invoices' AND column_name='billed_org_id'`);
      expect(result).toBe('billed_org_id');
    });

    it('invoice_tier 컬럼 존재', () => {
      const result = psql(`SELECT column_name FROM information_schema.columns WHERE table_name='zen_invoices' AND column_name='invoice_tier'`);
      expect(result).toBe('invoice_tier');
    });

    it('billed_org 인덱스 존재', () => {
      const result = psql(`SELECT indexname FROM pg_indexes WHERE tablename='zen_invoices' AND indexname='idx_zen_invoices_billed_org'`);
      expect(result).toBe('idx_zen_invoices_billed_org');
    });

    it('tier 인덱스 존재', () => {
      const result = psql(`SELECT indexname FROM pg_indexes WHERE tablename='zen_invoices' AND indexname='idx_zen_invoices_tier'`);
      expect(result).toBe('idx_zen_invoices_tier');
    });
  });

  describe('실제 DB 검증 (AGENCY 세션 billed_org_id RLS)', () => {
    it('AGENCY 세션에서 본인 billed_org_id 인보이스 조회 성공', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_invoices WHERE billed_org_id = '${AGENCY_ORG_ID}';
      `);
      const count = parseInt(lines[lines.length - 1], 10);
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('AGENCY 세션에서 타 org billed_org_id 인보이스 조회 불가 (0건)', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_invoices WHERE billed_org_id = '${OTHER_AGENCY_ORG_ID}';
      `);
      const count = parseInt(lines[lines.length - 1], 10);
      expect(count).toBe(0);
    });

    it('AGENCY 세션에서 본인 인보이스의 invoice_tier 확인', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
        SELECT invoice_tier FROM zen_invoices WHERE id = '${INV_OWN_ID}';
      `);
      expect(lines[lines.length - 1]).toBe('AGENCY_TO_SHIPPER');
    });

    it('AGENCY 세션에서 본인 인보이스의 billed_org_id 확인', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
        SELECT billed_org_id::text FROM zen_invoices WHERE id = '${INV_OWN_ID}';
      `);
      expect(lines[lines.length - 1]).toBe(AGENCY_ORG_ID);
    });

    it('AGENCY 세션이 본인 billed_org_id 인보이스는 조회 가능 (permission-denied 없음)', () => {
      const result = psql(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "${AGENCY_USER_ID}", "role": "authenticated"}';
        SELECT COUNT(*) FROM zen_invoices WHERE billed_org_id = '${AGENCY_ORG_ID}';
      `);
      expect(result).not.toContain('permission denied');
    });
  });
});
