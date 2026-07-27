import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

function psql(sql: string): string {
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );
  return result.trim().split('\n')[0];
}

describe('DEF-B-002: zen_invoices RLS AGENCY 검증', () => {
  let migration: string;

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260726000000_defb002_invoices_agency_rls.sql',
      'utf-8'
    );
  });

  describe('마이그레이션 구조 검증', () => {
    it('AGENCY SELECT 정책 포함', () => {
      expect(migration).toContain('Agency can view invoices for shipper orders');
      expect(migration).toContain('zen_invoices FOR SELECT');
    });

    it('AGENCY는 zen_agency_shippers를 통해 접근', () => {
      expect(migration).toContain('zen_agency_shippers');
      expect(migration).toContain('shipper_org_id = zen_invoices.shipper_id');
      expect(migration).toContain('is_active = true');
    });

    it('CI 환경 GRANT 문 포함', () => {
      expect(migration).toContain('GRANT SELECT ON public.zen_invoices TO authenticated');
    });

    it('DROP POLICY IF EXISTS로 충돌 방지', () => {
      expect(migration).toContain('DROP POLICY IF EXISTS');
    });
  });

  describe('실제 DB 검증 (AGENCY 세션 시뮬레이션)', () => {
    it('AGENCY 세션으로 zen_invoices SELECT가 permission-denied 없이 성공', () => {
      const result = psql(`
        SET LOCAL role TO authenticated;
        SET LOCAL request.jwt.claims TO '{"sub": "005b8048-f072-4971-90b4-3dd5ecddd3c6"}';
        SELECT COUNT(*) FROM zen_invoices WHERE shipper_id IN (
          SELECT shipper_org_id FROM zen_agency_shippers
          WHERE agency_org_id = '48bfa40d-5314-4a9d-9c61-ded32ad0251a' AND is_active = true
        );
      `);
      expect(result).not.toContain('permission denied');
    });
  });
});
