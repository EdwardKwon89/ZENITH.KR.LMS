import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

describe('DEF-126: zen_invoices RLS AGENCY 검증', () => {
  let migration: string;

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260726000000_def126_invoices_agency_rls.sql',
      'utf-8'
    );
  });

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
