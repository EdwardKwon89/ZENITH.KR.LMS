import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/**
 * TASK-1174 / DEF-161 (Issue #1470)
 * zen_invoice_history 접근 제어(RLS·테이블 권한) 회귀 테스트
 *
 * - 정적 검증: RLS 활성화, 권한 회수, 정책 2개, 롤백 SQL
 * - 실DB 검증: 로컬 Supabase 컨테이너에서 역할별(비로그인·화주·타 화주·대리점·MANAGER·ADMIN·OPERATOR)
 *   허용/거부 매트릭스(앱이 실제로 쓰는 INSERT 경로 포함)
 */

const MIGRATION = 'supabase/migrations/20261122100200_task1174_def161_invoice_history_rls.sql';
const DB_CONTAINER = 'supabase_db_ZENITH_LMS_001';

function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

function dbAvailable(): boolean {
  try {
    execSync(`docker inspect ${DB_CONTAINER}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** psql 실행 — stdout·stderr 를 함께 돌려준다(권한 오류 문구 검사용) */
function psql(sql: string): string {
  return execSync(`docker exec -i ${DB_CONTAINER} psql -U postgres -d postgres -t -A -f - 2>&1`, {
    input: sql,
    encoding: 'utf-8',
  });
}

/** 운영 세션과 같은 형태의 JWT 클레임: 일부 RLS(zen_agency_shippers 등)가 app_metadata.role·org_id 를 읽는다 */
function runAs(
  role: 'anon' | 'authenticated',
  userId: string | null,
  body: string,
  appMeta?: { role: string; org_id: string }
): string {
  const claims = appMeta
    ? { sub: userId, role, app_metadata: appMeta }
    : { sub: userId, role };
  return psql(
    [
      'BEGIN;',
      `SET LOCAL ROLE ${role};`,
      userId ? `SET LOCAL request.jwt.claims = '${JSON.stringify(claims)}';` : '',
      body,
      'ROLLBACK;',
    ].join('\n')
  );
}

function scalar(sql: string): string {
  const lines = psql(sql)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines[lines.length - 1] ?? '';
}

describe('TASK-1174 / DEF-161 — zen_invoice_history 접근 제어', () => {
  describe('정적 검증 — 마이그레이션', () => {
    let rawSql: string;
    let sql: string;

    beforeAll(() => {
      rawSql = readFileSync(MIGRATION, 'utf-8');
      sql = stripSqlComments(rawSql);
    });

    it('TC-1174-01: RLS 를 활성화한다', () => {
      expect(sql).toContain('ALTER TABLE public.zen_invoice_history ENABLE ROW LEVEL SECURITY');
    });

    it('TC-1174-02: PUBLIC·anon·authenticated 권한을 회수하고 authenticated 에 SELECT·INSERT 만 부여한다', () => {
      expect(sql).toContain('REVOKE ALL ON public.zen_invoice_history FROM PUBLIC');
      expect(sql).toContain('REVOKE ALL ON public.zen_invoice_history FROM anon');
      expect(sql).toContain('REVOKE ALL ON public.zen_invoice_history FROM authenticated');
      expect(sql).toContain('GRANT SELECT, INSERT ON public.zen_invoice_history TO authenticated');
      expect(sql).not.toMatch(/GRANT[^;]*\b(UPDATE|DELETE|TRUNCATE)\b[^;]*zen_invoice_history/i);
    });

    it('TC-1174-03: 정책은 SELECT·INSERT 2개이고 UPDATE·DELETE 정책은 없다', () => {
      expect(sql).toContain('CREATE POLICY "invoice_history_select"');
      expect(sql).toContain('CREATE POLICY "invoice_history_insert"');
      expect(sql).toContain('FOR SELECT');
      expect(sql).toContain('FOR INSERT');
      expect(sql).not.toMatch(/FOR\s+(UPDATE|DELETE|ALL)/);
      expect(sql).toContain('changed_by = auth.uid()');
    });

    it('TC-1174-04: 롤백 SQL 을 수록한다', () => {
      expect(rawSql).toContain('롤백 SQL');
      expect(rawSql).toContain('ALTER TABLE public.zen_invoice_history DISABLE ROW LEVEL SECURITY');
      expect(rawSql).toContain('GRANT ALL ON public.zen_invoice_history TO anon');
    });
  });

  describe.skipIf(!dbAvailable())('실DB 검증 — 역할별 허용/거부 매트릭스', () => {
    const shipper1Org = '11111111-1174-4000-8000-000000000001';
    const shipper2Org = '11111111-1174-4000-8000-000000000002';
    const agencyOrg = '11111111-1174-4000-8000-000000000003';
    const shipper1User = '22222222-1174-4000-8000-000000000001';
    const shipper2User = '22222222-1174-4000-8000-000000000002';
    const agencyUser = '22222222-1174-4000-8000-000000000003';
    const managerUser = '22222222-1174-4000-8000-000000000004';
    const adminUser = '22222222-1174-4000-8000-000000000005';
    const operatorUser = '22222222-1174-4000-8000-000000000006';
    const invoice1 = '44444444-1174-4000-8000-000000000001'; // 화주1 · 대리점 담당
    const invoice2 = '44444444-1174-4000-8000-000000000002'; // 화주2
    const hist1 = '55555555-1174-4000-8000-000000000001';
    const hist2 = '55555555-1174-4000-8000-000000000002';
    const agencyMeta = { role: 'AGENCY', org_id: agencyOrg };

    const rlsEnabled = (): boolean =>
      scalar(`SELECT relrowsecurity::text FROM pg_class WHERE oid='public.zen_invoice_history'::regclass;`) === 'true';

    const insertHistory = (invoiceId: string, changedBy: string): string =>
      `INSERT INTO public.zen_invoice_history (invoice_id, prev_status, next_status, changed_by)
         VALUES ('${invoiceId}', 'UNPAID', 'UNPAID', '${changedBy}') RETURNING 'INSERT_OK';`;

    beforeAll(() => {
      psql(`
        INSERT INTO public.zen_organizations (id, name, type) VALUES
          ('${shipper1Org}', 'Shipper 1 1174', 'SHIPPER'),
          ('${shipper2Org}', 'Shipper 2 1174', 'SHIPPER'),
          ('${agencyOrg}', 'Agency 1174', 'AGENCY')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES
          ('${shipper1User}', 's1-1174@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated'),
          ('${shipper2User}', 's2-1174@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated'),
          ('${agencyUser}', 'ag-1174@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated'),
          ('${managerUser}', 'mg-1174@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated'),
          ('${adminUser}', 'ad-1174@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated'),
          ('${operatorUser}', 'op-1174@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.zen_profiles (id, email, full_name, role, org_id, status) VALUES
          ('${shipper1User}', 's1-1174@test.local', 'S1 1174', 'SHIPPER', '${shipper1Org}', 'ACTIVE'),
          ('${shipper2User}', 's2-1174@test.local', 'S2 1174', 'SHIPPER', '${shipper2Org}', 'ACTIVE'),
          ('${agencyUser}', 'ag-1174@test.local', 'AG 1174', 'AGENCY', '${agencyOrg}', 'ACTIVE'),
          ('${managerUser}', 'mg-1174@test.local', 'MG 1174', 'MANAGER', NULL, 'ACTIVE'),
          ('${adminUser}', 'ad-1174@test.local', 'AD 1174', 'ADMIN', NULL, 'ACTIVE'),
          ('${operatorUser}', 'op-1174@test.local', 'OP 1174', 'OPERATOR', NULL, 'ACTIVE')
        ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, org_id = EXCLUDED.org_id, status = EXCLUDED.status;

        INSERT INTO public.zen_agency_shippers (id, agency_org_id, shipper_org_id, shipper_type, is_active)
        VALUES (gen_random_uuid(), '${agencyOrg}', '${shipper1Org}', 'INDIVIDUAL', true)
        ON CONFLICT DO NOTHING;

        INSERT INTO public.zen_invoices (id, invoice_no, shipper_id, total_amount, paid_amount, currency, due_date, status, payment_method) VALUES
          ('${invoice1}', 'INV-1174-1', '${shipper1Org}', 100, 0, 'KRW', current_date, 'UNPAID', 'BANK_TRANSFER'),
          ('${invoice2}', 'INV-1174-2', '${shipper2Org}', 200, 0, 'KRW', current_date, 'UNPAID', 'BANK_TRANSFER')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.zen_invoice_history (id, invoice_id, prev_status, next_status, changed_by) VALUES
          ('${hist1}', '${invoice1}', NULL, 'UNPAID', '${adminUser}'),
          ('${hist2}', '${invoice2}', NULL, 'UNPAID', '${adminUser}')
        ON CONFLICT (id) DO NOTHING;
      `);
    });

    afterAll(() => {
      psql(`
        DELETE FROM public.zen_invoice_history WHERE invoice_id IN ('${invoice1}', '${invoice2}');
        DELETE FROM public.zen_invoices WHERE id IN ('${invoice1}', '${invoice2}');
        DELETE FROM public.zen_agency_shippers WHERE agency_org_id = '${agencyOrg}';
        DELETE FROM public.zen_profiles WHERE id IN ('${shipper1User}', '${shipper2User}', '${agencyUser}', '${managerUser}', '${adminUser}', '${operatorUser}');
        DELETE FROM auth.users WHERE id IN ('${shipper1User}', '${shipper2User}', '${agencyUser}', '${managerUser}', '${adminUser}', '${operatorUser}');
        DELETE FROM public.zen_organizations WHERE id IN ('${shipper1Org}', '${shipper2Org}', '${agencyOrg}');
      `);
    });

    it('TC-1174-05: 테이블 ACL — anon 권한 없음, authenticated 는 SELECT·INSERT 만, RLS 활성', () => {
      expect(scalar(`SELECT relrowsecurity::text FROM pg_class WHERE oid='public.zen_invoice_history'::regclass;`)).toBe('true');
      for (const priv of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
        expect(scalar(`SELECT has_table_privilege('anon','public.zen_invoice_history','${priv}')::text;`)).toBe('false');
      }
      expect(scalar(`SELECT has_table_privilege('authenticated','public.zen_invoice_history','SELECT')::text;`)).toBe('true');
      expect(scalar(`SELECT has_table_privilege('authenticated','public.zen_invoice_history','INSERT')::text;`)).toBe('true');
      for (const priv of ['UPDATE', 'DELETE', 'TRUNCATE']) {
        expect(scalar(`SELECT has_table_privilege('authenticated','public.zen_invoice_history','${priv}')::text;`)).toBe('false');
      }
    });

    it('TC-1174-06: 비로그인(anon)은 조회·삽입·수정·삭제가 모두 거부된다', () => {
      expect(runAs('anon', null, `SELECT count(*) FROM public.zen_invoice_history;`)).toMatch(/permission denied/);
      expect(runAs('anon', null, insertHistory(invoice1, adminUser))).toMatch(/permission denied/);
      expect(runAs('anon', null, `UPDATE public.zen_invoice_history SET notes='x' WHERE id='${hist1}';`)).toMatch(/permission denied/);
      expect(runAs('anon', null, `DELETE FROM public.zen_invoice_history WHERE id='${hist1}';`)).toMatch(/permission denied/);
    });

    it('TC-1174-07: 화주는 자기 인보이스 이력만 보고, 타 화주 인보이스에는 삽입할 수 없다', () => {
      const sel = runAs(
        'authenticated',
        shipper1User,
        `SELECT invoice_id::text FROM public.zen_invoice_history WHERE invoice_id IN ('${invoice1}','${invoice2}');`
      );
      expect(sel).toContain(invoice1);
      expect(sel).not.toContain(invoice2);
      expect(runAs('authenticated', shipper1User, insertHistory(invoice1, shipper1User))).toContain('INSERT_OK');
      expect(runAs('authenticated', shipper1User, insertHistory(invoice2, shipper1User))).toMatch(/row-level security/);
    });

    it('TC-1174-08: changed_by 를 타인으로 위조한 삽입은 거부된다(모든 역할)', () => {
      expect(runAs('authenticated', shipper1User, insertHistory(invoice1, adminUser))).toMatch(/row-level security/);
      expect(runAs('authenticated', adminUser, insertHistory(invoice1, shipper1User))).toMatch(/row-level security/);
    });

    it('TC-1174-09: 수정·삭제·TRUNCATE 는 모든 역할에서 거부된다(감사 이력 불변)', () => {
      for (const uid of [shipper1User, agencyUser, managerUser, adminUser]) {
        expect(runAs('authenticated', uid, `UPDATE public.zen_invoice_history SET notes='x' WHERE id='${hist1}';`)).toMatch(/permission denied/);
        expect(runAs('authenticated', uid, `DELETE FROM public.zen_invoice_history WHERE id='${hist1}';`)).toMatch(/permission denied/);
      }
      expect(runAs('authenticated', adminUser, `TRUNCATE public.zen_invoice_history;`)).toMatch(/permission denied/);
    });

    it('TC-1174-10: 대리점은 담당 화주 인보이스 이력을 보고 삽입할 수 있으나 타 화주 인보이스는 불가', () => {
      const sel = runAs(
        'authenticated',
        agencyUser,
        `SELECT invoice_id::text FROM public.zen_invoice_history WHERE invoice_id IN ('${invoice1}','${invoice2}');`,
        agencyMeta
      );
      expect(sel).toContain(invoice1);
      expect(sel).not.toContain(invoice2);
      expect(runAs('authenticated', agencyUser, insertHistory(invoice1, agencyUser), agencyMeta)).toContain('INSERT_OK');
      expect(runAs('authenticated', agencyUser, insertHistory(invoice2, agencyUser), agencyMeta)).toMatch(/row-level security/);
    });

    it('TC-1174-11: MANAGER·ADMIN 은 전체 이력을 보고 어느 인보이스에도 삽입할 수 있다', () => {
      for (const uid of [managerUser, adminUser]) {
        const sel = runAs(
          'authenticated',
          uid,
          `SELECT count(*)::text FROM public.zen_invoice_history WHERE invoice_id IN ('${invoice1}','${invoice2}');`
        );
        expect(sel).toMatch(/^2$/m);
        expect(runAs('authenticated', uid, insertHistory(invoice2, uid))).toContain('INSERT_OK');
      }
    });

    it('TC-1174-12: OPERATOR 는 이력을 볼 수 없고 삽입할 수 없다', () => {
      const sel = runAs(
        'authenticated',
        operatorUser,
        `SELECT count(*)::text FROM public.zen_invoice_history WHERE invoice_id IN ('${invoice1}','${invoice2}');`
      );
      expect(sel).toMatch(/^0$/m);
      expect(runAs('authenticated', operatorUser, insertHistory(invoice1, operatorUser))).toMatch(/row-level security/);
    });
  });
});
