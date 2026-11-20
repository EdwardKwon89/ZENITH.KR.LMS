import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/**
 * TASK-1166 / DEF-153 (Issue #1386)
 * zen_rate_cards 화주 계열 세션 원가·마진 접근 차단 회귀 테스트
 *
 * - 정적 검증: 마이그레이션 2건의 구조(뷰 컬럼 화이트리스트·정책 role 목록·GRANT)
 * - 실DB 검증: 로컬 Supabase 컨테이너에서 역할별 행 범위 단언
 *   (데이터가 없는 CI 최초 리셋 상태에서도 성립하도록 기대값을 동적으로 계산한다)
 */

const VIEW_MIGRATION = 'supabase/migrations/20261118100000_task1166_def153_rate_cards_safe_view.sql';
const POLICY_MIGRATION = 'supabase/migrations/20261118100100_task1166_def153_rate_cards_rls_policy.sql';
const DB_CONTAINER = 'supabase_db_ZENITH_LMS_001';

/** `--` 주석 라인을 제거해 실제 SQL 문만 남긴다(롤백 주석 블록 오탐 방지). */
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

function psql(sql: string): string {
  return execSync(`docker exec -i ${DB_CONTAINER} psql -U postgres -d postgres -t -A -f -`, {
    input: sql,
    encoding: 'utf-8',
  });
}

/** SET LOCAL ROLE/SET LOCAL 은 트랜잭션 안에서만 유효하므로 BEGIN/ROLLBACK 으로 감싼다. */
function asRole(claims: Record<string, unknown>, body: string, setup = ''): string[] {
  const out = psql(
    [
      'BEGIN;',
      setup,
      'SET LOCAL ROLE authenticated;',
      `SET LOCAL request.jwt.claims = '${JSON.stringify(claims)}';`,
      body,
      'ROLLBACK;',
    ].join('\n')
  );
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !['BEGIN', 'SET', 'ROLLBACK'].includes(line));
}

function scalar(sql: string): string {
  const lines = psql(sql)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines[lines.length - 1] ?? '';
}

describe('TASK-1166 / DEF-153 — zen_rate_cards 화주 원가·마진 차단', () => {
  describe('정적 검증 — 안전 뷰 마이그레이션', () => {
    let sql: string;
    let selectList: string;

    beforeAll(() => {
      sql = stripSqlComments(readFileSync(VIEW_MIGRATION, 'utf-8'));
      const start = sql.indexOf('CREATE OR REPLACE VIEW public.zen_rate_cards_safe AS');
      const end = sql.indexOf('FROM public.zen_rate_cards AS rc');
      selectList = sql.slice(start, end);
    });

    it('TC-1166-01: zen_rate_cards_safe 뷰를 생성한다', () => {
      expect(sql).toContain('CREATE OR REPLACE VIEW public.zen_rate_cards_safe AS');
      expect(sql).toContain('FROM public.zen_rate_cards AS rc');
    });

    it('TC-1166-02: 뷰 SELECT 목록에 원가·마진 3개 컬럼이 없다', () => {
      expect(selectList).not.toContain('carrier_cost');
      expect(selectList).not.toContain('margin_rate');
      expect(selectList).not.toContain('platform_fee_rate');
      expect(selectList).toContain('rc.tiers');
      expect(selectList).toContain('rc.currency');
    });

    it('TC-1166-03: 뷰가 auth.uid() → zen_profiles 역할로 행 범위를 고정한다', () => {
      expect(sql).toContain('public.zen_profiles AS p');
      expect(sql).toContain('p.id = auth.uid()');
      for (const role of [
        'ADMIN',
        'ZENITH_SUPER_ADMIN',
        'MANAGER',
        'SHIPPER',
        'CORPORATE',
        'INDIVIDUAL',
        'CARRIER',
      ]) {
        expect(sql).toContain(`'${role}'`);
      }
    });

    it('TC-1166-04: anon/PUBLIC/authenticated 권한을 회수하고 SELECT 만 재부여한다', () => {
      expect(sql).toContain('REVOKE ALL ON public.zen_rate_cards_safe FROM PUBLIC');
      expect(sql).toContain('REVOKE ALL ON public.zen_rate_cards_safe FROM anon');
      expect(sql).toContain('REVOKE ALL ON public.zen_rate_cards_safe FROM authenticated');
      expect(sql).toContain('GRANT SELECT ON public.zen_rate_cards_safe TO authenticated');
    });
  });

  describe('정적 검증 — RLS 정책 마이그레이션', () => {
    let sql: string;

    beforeAll(() => {
      sql = stripSqlComments(readFileSync(POLICY_MIGRATION, 'utf-8'));
    });

    it('TC-1166-05: zen_rate_cards_select 정책을 교체한다', () => {
      expect(sql).toContain('DROP POLICY IF EXISTS zen_rate_cards_select ON public.zen_rate_cards');
      expect(sql).toContain('CREATE POLICY zen_rate_cards_select ON public.zen_rate_cards');
    });

    it('TC-1166-06: base 테이블 정책 role 목록에 화주 계열이 없다', () => {
      expect(sql).not.toContain("'SHIPPER'");
      expect(sql).not.toContain("'CORPORATE'");
      expect(sql).not.toContain("'INDIVIDUAL'");
      expect(sql).toContain("ARRAY['ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER']");
    });

    it('TC-1166-07: CARRIER 는 자기 운송사 행만 조회한다', () => {
      expect(sql).toContain("(auth.jwt() -> 'app_metadata' ->> 'role') = 'CARRIER'");
      expect(sql).toContain("c.org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid");
    });

    it('TC-1166-08: zen_rate_cards_public 을 security_invoker 로 전환하고 anon 권한을 회수한다', () => {
      expect(sql).toContain('ALTER VIEW public.zen_rate_cards_public SET (security_invoker = on)');
      expect(sql).toContain('REVOKE ALL ON public.zen_rate_cards_public FROM anon');
      expect(sql).toContain('GRANT SELECT ON public.zen_rate_cards_public TO authenticated');
    });

    it('TC-1166-09: 롤백 SQL 을 주석으로 수록한다', () => {
      const raw = readFileSync(POLICY_MIGRATION, 'utf-8');
      expect(raw).toContain('롤백 SQL');
      expect(raw).toContain('RESET (security_invoker)');
    });
  });

  describe.skipIf(!dbAvailable())('실DB 검증 — 역할별 행 범위', () => {
    const has = (table: string, column: string): boolean =>
      scalar(
        `SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name='${column}';`
      ) !== '0';

    let total: number;
    let shipper: { id: string; org_id: string } | null;
    let admin: { id: string } | null;
    let carrierOrgId: string | null;

    beforeAll(() => {
      total = Number(scalar('SELECT count(*) FROM public.zen_rate_cards;'));

      const shipperRow = scalar(
        `SELECT id || '|' || org_id::text FROM public.zen_profiles WHERE role IN ('SHIPPER','CORPORATE','INDIVIDUAL') AND org_id IS NOT NULL ORDER BY email LIMIT 1;`
      );
      shipper = shipperRow ? { id: shipperRow.split('|')[0], org_id: shipperRow.split('|')[1] } : null;

      const adminRow = scalar(
        `SELECT id FROM public.zen_profiles WHERE role IN ('ADMIN','ZENITH_SUPER_ADMIN','MANAGER') ORDER BY email LIMIT 1;`
      );
      admin = adminRow ? { id: adminRow } : null;

      carrierOrgId =
        scalar(
          `SELECT c.org_id FROM public.zen_carriers c WHERE c.org_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.zen_rate_cards rc WHERE rc.carrier_id = c.id) ORDER BY c.name LIMIT 1;`
        ) || null;
    });

    it('TC-1166-10: 안전 뷰 컬럼 화이트리스트 — 원가·마진 3종 부재', () => {
      expect(has('zen_rate_cards_safe', 'carrier_cost')).toBe(false);
      expect(has('zen_rate_cards_safe', 'margin_rate')).toBe(false);
      expect(has('zen_rate_cards_safe', 'platform_fee_rate')).toBe(false);
      expect(has('zen_rate_cards_safe', 'tiers')).toBe(true);
    });

    it('TC-1166-11: 미인증(anon) 롤은 안전 뷰·공개 뷰 SELECT 권한이 없다', () => {
      expect(
        scalar(`SELECT has_table_privilege('anon','public.zen_rate_cards_safe','SELECT');`)
      ).toBe('f');
      expect(
        scalar(`SELECT has_table_privilege('anon','public.zen_rate_cards_public','SELECT');`)
      ).toBe('f');
      expect(
        scalar(`SELECT has_table_privilege('authenticated','public.zen_rate_cards_safe','SELECT');`)
      ).toBe('t');
    });

    it('TC-1166-12: zen_rate_cards_public 은 security_invoker 로 설정된다', () => {
      const reloptions = scalar(
        `SELECT coalesce(array_to_string(reloptions, ','), '') FROM pg_class WHERE relname = 'zen_rate_cards_public';`
      );
      expect(reloptions).toContain('security_invoker=on');
    });

    it('TC-1166-13: 화주 세션은 base 테이블에서 0행', () => {
      const rows = asRole(
        {
          sub: shipper?.id ?? '00000000-0000-0000-0000-000000000000',
          app_metadata: { role: 'CORPORATE', org_id: shipper?.org_id ?? null },
        },
        'SELECT count(*) FROM public.zen_rate_cards;'
      );
      expect(rows[rows.length - 1]).toBe('0');
    });

    it('TC-1166-14: 화주 세션은 안전 뷰에서 전 행을 조회한다', () => {
      const rows = asRole(
        {
          sub: shipper?.id ?? '00000000-0000-0000-0000-000000000000',
          app_metadata: { role: 'CORPORATE', org_id: shipper?.org_id ?? null },
        },
        'SELECT count(*) FROM public.zen_rate_cards_safe;'
      );
      expect(rows[rows.length - 1]).toBe(String(shipper ? total : 0));
    });

    it('TC-1166-15: 관리자 세션은 base 테이블에서 전 행(불변)', () => {
      const rows = asRole({ sub: admin?.id ?? '00000000-0000-0000-0000-000000000000' }, 'SELECT count(*) FROM public.zen_rate_cards;');
      expect(rows[rows.length - 1]).toBe(String(admin ? total : 0));
    });

    it('TC-1166-16: CARRIER 세션은 자기 운송사 행만 조회한다', () => {
      if (!carrierOrgId) {
        // 시드 데이터가 없는 상태(CI 최초 리셋)에서는 비교 기준이 0건이다.
        const rows = asRole(
          {
            sub: '00000000-0000-0000-0000-000000000000',
            app_metadata: { role: 'CARRIER', org_id: '00000000-0000-0000-0000-000000000000' },
          },
          'SELECT count(*) FROM public.zen_rate_cards;'
        );
        expect(rows[rows.length - 1]).toBe('0');
        return;
      }

      const expected = scalar(
        `SELECT count(*) FROM public.zen_rate_cards rc WHERE rc.carrier_id IN (SELECT id FROM public.zen_carriers WHERE org_id = '${carrierOrgId}');`
      );
      // zen_carriers_select 정책이 zen_profiles 를 참조하므로, 트랜잭션 안에서만
      // 유효한 CARRIER 프로필을 만들어 실제 CARRIER 세션과 동일한 조건을 재현한다(ROLLBACK 으로 제거).
      const tempSub = '11111111-1111-1111-1111-111111111111';
      const setup = `INSERT INTO public.zen_profiles (id, email, role, org_id) VALUES ('${tempSub}', 'rls-test-carrier@example.invalid', 'CARRIER', '${carrierOrgId}') ON CONFLICT (id) DO UPDATE SET role = 'CARRIER', org_id = EXCLUDED.org_id;`;
      const rows = asRole(
        {
          sub: tempSub,
          app_metadata: { role: 'CARRIER', org_id: carrierOrgId },
        },
        'SELECT count(*) FROM public.zen_rate_cards;',
        setup
      );
      expect(rows[rows.length - 1]).toBe(expected);
      expect(Number(expected)).toBeLessThanOrEqual(total);
    });

    it('TC-1166-17: DB 에 반영된 정책 role 목록에 화주 계열이 없다', () => {
      const qual = scalar(
        `SELECT replace(coalesce(pg_get_expr(polqual, polrelid), ''), E'\\n', ' ') FROM pg_policy WHERE polrelid = 'public.zen_rate_cards'::regclass AND polname = 'zen_rate_cards_select';`
      );
      expect(qual).not.toContain('SHIPPER');
      expect(qual).not.toContain('CORPORATE');
      expect(qual).not.toContain('INDIVIDUAL');
      expect(qual).toContain('CARRIER');
    });
  });
});
