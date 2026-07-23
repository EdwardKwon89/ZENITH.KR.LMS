import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

describe('TASK-B-192: DEF-120 RLS AGENCY 검증', () => {
  let migration: string;

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260723060000_def120_tracking_configs_agency_rls.sql',
      'utf-8'
    );
  });

  describe('마이그레이션 구조 검증', () => {
    it('AGENCY SELECT 정책 포함', () => {
      expect(migration).toContain('Agency can view tracking configs for shipper orders');
      expect(migration).toContain('zen_tracking_configs FOR SELECT');
    });

    it('DEF-114 패턴(agency_org_id) 사용', () => {
      expect(migration).toContain('zen_orders.agency_org_id');
      expect(migration).toContain('(SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())');
    });

    it('CI 환경 GRANT 문 포함', () => {
      expect(migration).toContain('GRANT SELECT ON public.zen_tracking_configs TO authenticated');
    });

    it('DROP POLICY IF EXISTS로 충돌 방지', () => {
      expect(migration).toContain('DROP POLICY IF EXISTS');
    });
  });
});
