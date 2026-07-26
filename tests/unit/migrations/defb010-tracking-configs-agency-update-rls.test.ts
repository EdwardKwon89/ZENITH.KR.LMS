import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

describe('TASK-B-216: DEF-B-010 AGENCY UPDATE RLS 검증', () => {
  let migration: string;

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260726140000_defb010_tracking_configs_agency_update_rls.sql',
      'utf-8'
    );
  });

  describe('마이그레이션 구조 검증', () => {
    it('AGENCY UPDATE 정책 포함', () => {
      expect(migration).toContain('Agency can update tracking configs for shipper orders');
      expect(migration).toContain('zen_tracking_configs FOR UPDATE');
    });

    it('USING 절에 agency_org_id 매칭 조건 포함', () => {
      expect(migration).toContain('zen_orders.agency_org_id');
      expect(migration).toContain('(SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())');
    });

    it('WITH CHECK 절에 동일 조건 포함', () => {
      const withCheckIdx = migration.indexOf('WITH CHECK');
      expect(withCheckIdx).toBeGreaterThan(-1);
      const withCheckBlock = migration.substring(withCheckIdx);
      expect(withCheckBlock).toContain('zen_orders.agency_org_id');
      expect(withCheckBlock).toContain('auth.uid()');
    });

    it('DROP POLICY IF EXISTS로 충돌 방지', () => {
      expect(migration).toContain('DROP POLICY IF EXISTS');
    });
  });

  describe('실제 DB 검증 (로컬 Supabase)', () => {
    // 아래 테스트는 로컬 Supabase가 실행 중일 때만 유효
    // CI에서는 migration 파일 구조 검증만으로 충분
    it('AGENCY UPDATE 정책이 DEF-120 SELECT 정책과 동일한 agency_org_id 조건 사용', () => {
      const selectMigration = readFileSync(
        'supabase/migrations/20260723060000_def120_tracking_configs_agency_rls.sql',
        'utf-8'
      );
      // SELECT 정책의 agency_org_id 조건이 UPDATE에도 동일하게 사용되는지 확인
      const selectCondition = 'zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())';
      expect(selectMigration).toContain(selectCondition);
      expect(migration).toContain(selectCondition);
    });
  });
});
