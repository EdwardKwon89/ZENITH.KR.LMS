import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';

describe('DEF-117: zen_order_packages·zen_ups_labels RLS AGENCY 추가', () => {
  let migration: string;

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260722000003_def117_order_packages_agency_rls.sql',
      'utf-8'
    );
  });

  it('zen_order_packages에 AGENCY SELECT 정책이 포함됨', () => {
    expect(migration).toContain('Agency can view shipper order packages');
    expect(migration).toContain('zen_order_packages FOR SELECT');
    expect(migration).toContain('zen_orders.agency_org_id');
  });

  it('zen_order_packages에 AGENCY UPDATE 정책이 포함됨', () => {
    expect(migration).toContain('Agency can update shipper order packages');
    expect(migration).toContain('zen_order_packages FOR UPDATE');
  });

  it('zen_ups_labels에 AGENCY SELECT 정책이 포함됨', () => {
    expect(migration).toContain('Agency can view shipper ups labels');
    expect(migration).toContain('zen_ups_labels FOR SELECT');
  });

  it('zen_ups_labels에 AGENCY UPDATE 정책이 포함됨', () => {
    expect(migration).toContain('Agency can update shipper ups labels');
    expect(migration).toContain('zen_ups_labels FOR UPDATE');
  });

  it('DEF-114 패턴(agency_org_id)을 사용함', () => {
    expect(migration).toContain('agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())');
  });

  it('DROP POLICY IF EXISTS로 기존 정책과 충돌 방지', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS');
  });
});
