import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

// TASK-B-293 v2 (Issue #1091): zen_hs_code_lookups INSERT RLS 정책 회귀 테스트.
//
// PR#1093 반려 사유: 마이그레이션이 SELECT 정책만 만들고 INSERT 정책이 없어, authenticated
// 세션이 /api/hs-lookup의 캐시 저장(upsert)을 RLS로 전면 차단당함(GRANT만으로는 우회 불가).
//
// 이 테스트는 실제 DB에서 SET ROLE authenticated + request.jwt.claims로 authenticated 세션을
// 시뮬레이션해 INSERT(및 SELECT)가 실제 RLS를 통과하는지 직접 검증한다. (mock 아님)
//
// 되돌리기: INSERT 정책 제거 시 아래 INSERT가 42501로 실패함을 확인할 수 있어야 한다.

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

// authenticated 롤 + JWT sub 시뮬레이션으로 INSERT 실행 → 성공 여부
function insertAsAuthenticated(userId: string, name: string): { ok: boolean; err: string } {
  try {
    psql(`
      SET ROLE authenticated;
      SET request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}';
      INSERT INTO public.zen_hs_code_lookups (item_name_normalized, hs_code, confidence)
      VALUES ('${name}', '123456', 'high');
      RESET ROLE;
    `);
    return { ok: true, err: '' };
  } catch (e: any) {
    return { ok: false, err: String(e?.message ?? e) };
  }
}

const USER = '29300000-0000-4000-8000-000000000001';

describe('TASK-B-293 v2: zen_hs_code_lookups INSERT RLS (Issue #1091)', () => {
  beforeAll(() => {
    psql(`DELETE FROM public.zen_hs_code_lookups WHERE item_name_normalized IN ('rls-test-item-1','rls-test-item-2');`);
  });
  afterAll(() => {
    psql(`DELETE FROM public.zen_hs_code_lookups WHERE item_name_normalized IN ('rls-test-item-1','rls-test-item-2');`);
  });

  it('TC-293-09: authenticated INSERT 성공 (캐시 저장 — PR#1093 반려 사유 검증)', () => {
    const r = insertAsAuthenticated(USER, 'rls-test-item-1');
    expect(r.ok).toBe(true);
    // 실제로 저장됐는지 확인
    const cnt = psql(`SELECT count(*) FROM public.zen_hs_code_lookups WHERE item_name_normalized='rls-test-item-1'`);
    expect(cnt).toBe('1');
  });

  it('TC-293-10: authenticated SELECT 성공 (캐시 조회 — 기존 정책)', () => {
    // TC-293-09에서 저장한 행을 authenticated로 조회
    const r = psql(`
      SET ROLE authenticated;
      SET request.jwt.claims = '{"sub":"${USER}","role":"authenticated"}';
      SELECT count(*) FROM public.zen_hs_code_lookups WHERE item_name_normalized='rls-test-item-1';
      RESET ROLE;
    `);
    expect(r).toBe('1');
  });
});
