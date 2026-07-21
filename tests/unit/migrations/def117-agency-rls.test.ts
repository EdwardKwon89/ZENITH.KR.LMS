import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

describe('DEF-117: zen_order_packages·zen_ups_labels RLS AGENCY 추가', () => {
  let migration: string;

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260722000003_def117_order_packages_agency_rls.sql',
      'utf-8'
    );
  });

  describe('zen_order_packages 정책', () => {
    it('AGENCY SELECT 정책 포함', () => {
      expect(migration).toContain('Agency can view shipper order packages');
      expect(migration).toContain('zen_order_packages FOR SELECT');
    });

    it('AGENCY UPDATE 정책 포함', () => {
      expect(migration).toContain('Agency can update shipper order packages');
      expect(migration).toContain('zen_order_packages FOR UPDATE');
    });
  });

  describe('zen_ups_labels 정책', () => {
    it('AGENCY SELECT 정책 포함', () => {
      expect(migration).toContain('Agency can view shipper ups labels');
      expect(migration).toContain('zen_ups_labels FOR SELECT');
    });

    it('AGENCY INSERT 정책 포함 (saveInitialLabel 필요)', () => {
      expect(migration).toContain('Agency can insert shipper ups labels');
      expect(migration).toContain('zen_ups_labels FOR INSERT');
    });

    it('AGENCY UPDATE 정책 포함', () => {
      expect(migration).toContain('Agency can update shipper ups labels');
      expect(migration).toContain('zen_ups_labels FOR UPDATE');
    });
  });

  describe('zen_ups_label_errors 정책', () => {
    it('AGENCY INSERT 정책 포함 (감사 기록)', () => {
      expect(migration).toContain('Agency can insert shipper ups label errors');
      expect(migration).toContain('zen_ups_label_errors FOR INSERT');
    });
  });

  describe('DEF-114 패턴 일관성', () => {
    it('agency_org_id 패턴 사용', () => {
      expect(migration).toContain('zen_orders.agency_org_id');
      expect(migration).toContain('(SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())');
    });

    it('DROP POLICY IF EXISTS로 충돌 방지', () => {
      expect(migration).toContain('DROP POLICY IF EXISTS');
    });

    it('총 6개 정책 생성 (packages 2 + labels 3 + errors 1)', () => {
      const policyCount = (migration.match(/CREATE POLICY/g) || []).length;
      expect(policyCount).toBe(6);
    });
  });
});
