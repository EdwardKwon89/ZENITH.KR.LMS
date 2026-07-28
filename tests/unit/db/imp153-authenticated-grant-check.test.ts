import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';

function psql(sql: string): string {
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

function psqlMulti(sql: string): string[] {
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );
  return result.trim().split('\n').filter((line: string) => {
    const trimmed = line.trim();
    return trimmed !== '' && !trimmed.startsWith('SET') && !trimmed.startsWith('UPDATE');
  });
}

describe('IMP-153: authenticated 롤 SELECT GRANT 검증', () => {
  beforeAll(() => {
    // 마이그레이션이 적용된 상태에서 검증
    // supabase db reset 시 20260728110000_imp153_authenticated_grant_일괄.sql이 실행되어야 함
  });

  describe('ALTER DEFAULT PRIVILEGES 검증', () => {
    it('ALTER DEFAULT PRIVILEGES 설정 존재', () => {
      const result = psql(`
        SELECT COUNT(*) FROM pg_default_acl
        WHERE defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
        AND defaclacl::text LIKE '%SELECT%'
      `);
      const count = parseInt(result, 10);
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('기존 테이블 GRANT 검증', () => {
    it('모든 public 테이블에 authenticated SELECT GRANT 존재', () => {
      const result = psql(`
        SELECT COUNT(*) FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND NOT EXISTS (
          SELECT 1 FROM information_schema.role_table_grants g
          WHERE g.table_name = t.table_name
          AND g.grantee = 'authenticated'
          AND g.privilege_type = 'SELECT'
          AND g.table_schema = 'public'
        )
      `);
      const missingCount = parseInt(result, 10);
      expect(missingCount).toBe(0);
    });

    it('zen_orders 테이블에 authenticated SELECT GRANT 존재', () => {
      const result = psql(`
        SELECT COUNT(*) FROM information_schema.role_table_grants
        WHERE table_name = 'zen_orders'
        AND grantee = 'authenticated'
        AND privilege_type = 'SELECT'
      `);
      const count = parseInt(result, 10);
      expect(count).toBe(1);
    });

    it('zen_profiles 테이블에 authenticated SELECT GRANT 존재', () => {
      const result = psql(`
        SELECT COUNT(*) FROM information_schema.role_table_grants
        WHERE table_name = 'zen_profiles'
        AND grantee = 'authenticated'
        AND privilege_type = 'SELECT'
      `);
      const count = parseInt(result, 10);
      expect(count).toBe(1);
    });

    it('zen_organizations 테이블에 authenticated SELECT GRANT 존재', () => {
      const result = psql(`
        SELECT COUNT(*) FROM information_schema.role_table_grants
        WHERE table_name = 'zen_organizations'
        AND grantee = 'authenticated'
        AND privilege_type = 'SELECT'
      `);
      const count = parseInt(result, 10);
      expect(count).toBe(1);
    });

    it('zen_ups_labels 테이블에 authenticated SELECT GRANT 존재', () => {
      const result = psql(`
        SELECT COUNT(*) FROM information_schema.role_table_grants
        WHERE table_name = 'zen_ups_labels'
        AND grantee = 'authenticated'
        AND privilege_type = 'SELECT'
      `);
      const count = parseInt(result, 10);
      expect(count).toBe(1);
    });
  });

  describe('실제 DB 쿼리 검증', () => {
    it('authenticated 세션으로 zen_orders SELECT 성공', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SELECT COUNT(*) FROM zen_orders;
      `);
      const countStr = lines[lines.length - 1];
      expect(countStr).not.toContain('permission denied');
      const count = parseInt(countStr, 10);
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('authenticated 세션으로 zen_profiles SELECT 성공', () => {
      const lines = psqlMulti(`
        SET LOCAL role TO authenticated;
        SELECT COUNT(*) FROM zen_profiles;
      `);
      const countStr = lines[lines.length - 1];
      expect(countStr).not.toContain('permission denied');
      const count = parseInt(countStr, 10);
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
