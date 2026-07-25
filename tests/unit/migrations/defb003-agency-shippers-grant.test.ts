import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

describe('DEF-B-003: zen_agency_shippers GRANT 검증', () => {
  let migration: string;

  beforeAll(() => {
    migration = readFileSync(
      'supabase/migrations/20260726100000_defb003_agency_shippers_grant.sql',
      'utf-8'
    );
  });

  it('authenticated 롤에 SELECT GRANT 포함', () => {
    expect(migration).toContain('GRANT SELECT ON public.zen_agency_shippers TO authenticated');
  });
});
