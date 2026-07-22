import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

describe('TASK-B-188: DEF-117 RLS AGENCY 검증', () => {
  let migration: string;

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260722130000_def117_order_packages_agency_rls_v2.sql',
      'utf-8'
    );
  });

  describe('마이그레이션 구조 검증', () => {
    it('zen_order_packages SELECT 정책 포함', () => {
      expect(migration).toContain('Agency can view shipper order packages');
      expect(migration).toContain('zen_order_packages FOR SELECT');
    });

    it('zen_order_packages UPDATE 정책 포함', () => {
      expect(migration).toContain('Agency can update shipper order packages');
      expect(migration).toContain('zen_order_packages FOR UPDATE');
    });

    it('zen_ups_labels SELECT 정책 포함', () => {
      expect(migration).toContain('Agency can view shipper ups labels');
      expect(migration).toContain('zen_ups_labels FOR SELECT');
    });

    it('zen_ups_labels INSERT 정책 포함', () => {
      expect(migration).toContain('Agency can insert shipper ups labels');
      expect(migration).toContain('zen_ups_labels FOR INSERT');
    });

    it('zen_ups_labels UPDATE 정책 포함', () => {
      expect(migration).toContain('Agency can update shipper ups labels');
      expect(migration).toContain('zen_ups_labels FOR UPDATE');
    });

    it('zen_ups_label_errors INSERT 정책 포함', () => {
      expect(migration).toContain('Agency can insert shipper ups label errors');
      expect(migration).toContain('zen_ups_label_errors FOR INSERT');
    });

    it('총 6개 정책 생성', () => {
      const policyCount = (migration.match(/CREATE POLICY/g) || []).length;
      expect(policyCount).toBe(6);
    });

    it('DEF-114 패턴(agency_org_id) 사용', () => {
      expect(migration).toContain('zen_orders.agency_org_id');
      expect(migration).toContain('(SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())');
    });
  });

  describe('실제 DB 검증 (로컬 Supabase)', () => {
    it('zen_order_packages SELECT가 AGENCY 세션에서 데이터 반환', () => {
      const result = execSync(
        `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -c "
          SET LOCAL role TO authenticated;
          SET LOCAL request.jwt.claims TO '{\\"sub\\": \\"005b8048-f072-4971-90b4-3dd5ecddd3c6\\"}';
          SELECT COUNT(*) FROM zen_order_packages WHERE order_id IN (
            SELECT id FROM zen_orders WHERE agency_org_id = '48bfa40d-5314-4a9d-9c61-ded32ad0251a'
          );
        "`,
        { encoding: 'utf-8' }
      );
      expect(result).toContain('2');
    });

    it('zen_ups_labels SELECT가 AGENCY 세션에서 데이터 반환', () => {
      const result = execSync(
        `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -c "
          SET LOCAL role TO authenticated;
          SET LOCAL request.jwt.claims TO '{\\"sub\\": \\"005b8048-f072-4971-90b4-3dd5ecddd3c6\\"}';
          SELECT COUNT(*) FROM zen_ups_labels WHERE order_id IN (
            SELECT id FROM zen_orders WHERE agency_org_id = '48bfa40d-5314-4a9d-9c61-ded32ad0251a'
          );
        "`,
        { encoding: 'utf-8' }
      );
      expect(result).toContain('4');
    });
  });
});
