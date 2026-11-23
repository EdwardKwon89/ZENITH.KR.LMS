import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/**
 * TASK-1168 / DEF-157 (Issue #1406)
 * zen_order_rate_snapshots_safe 화이트리스트 안전 뷰 회귀 테스트
 *
 * - 정적 검증: 화이트리스트 12개 컬럼, 제외 컬럼/원가 키 미포함, metadata.platform 키 화이트리스트, GRANT/REVOKE, 롤백 SQL
 * - 실DB 검증: 로컬 Supabase 컨테이너에서 컬럼 목록, ACL, metadata 원가 키 차단, 역할별 행 범위 검증
 */

const VIEW_MIGRATION = 'supabase/migrations/20261122100000_task1168_def157_order_rate_snapshots_safe_view.sql';
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

function psql(sql: string): string {
  return execSync(`docker exec -i ${DB_CONTAINER} psql -U postgres -d postgres -t -A -f -`, {
    input: sql,
    encoding: 'utf-8',
  });
}

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

describe('TASK-1168 / DEF-157 — zen_order_rate_snapshots_safe 안전 뷰', () => {
  describe('정적 검증 — 안전 뷰 마이그레이션', () => {
    let rawSql: string;
    let sql: string;
    let selectList: string;

    beforeAll(() => {
      rawSql = readFileSync(VIEW_MIGRATION, 'utf-8');
      sql = stripSqlComments(rawSql);
      const start = sql.indexOf('CREATE OR REPLACE VIEW public.zen_order_rate_snapshots_safe AS');
      const end = sql.indexOf('FROM public.zen_order_rate_snapshots AS s');
      selectList = sql.slice(start, end);
    });

    it('TC-1168-01: zen_order_rate_snapshots_safe 뷰를 생성한다', () => {
      expect(sql).toContain('CREATE OR REPLACE VIEW public.zen_order_rate_snapshots_safe AS');
      expect(sql).toContain('FROM public.zen_order_rate_snapshots AS s');
    });

    it('TC-1168-02: 뷰 SELECT 목록은 화이트리스트 컬럼만 포함하고 원가·내부계산 컬럼을 제외한다', () => {
      const excludedColumns = [
        'carrier_cost_amount',
        'platform_fee_amount',
        'applied_weight_cost',
        'applied_cbm_cost',
        'tiers_snapshot',
        'applied_weight_slab_min',
        'applied_weight_unit_price',
        'applied_cbm_slab_min',
        'applied_cbm_price',
        'applied_pricing_basis',
      ];
      for (const col of excludedColumns) {
        expect(selectList).not.toContain(col);
      }

      const whitelistedColumns = [
        's.id',
        's.order_id',
        's.rate_card_id',
        's.applied_unit_price',
        's.applied_currency',
        's.applied_rule',
        's.snapshot_at',
        's.is_manual',
        's.override_reason',
        's.version_no',
        's.priority',
      ];
      for (const col of whitelistedColumns) {
        expect(selectList).toContain(col);
      }
    });

    it('TC-1168-03: metadata 투영에서 원가 키(*Cost*)와 agency/shipper 키를 제외하고 platform 판매 키만 허용한다', () => {
      const excludedMetaKeys = [
        'baseCostPrice',
        'totalCostPrice',
        'fuelSurchargeCostAmount',
        'surgeFeeCostAmount',
        'otherChargesCostTotal',
        "'agency'",
        "'shipper'",
      ];
      for (const key of excludedMetaKeys) {
        expect(selectList).not.toContain(key);
      }

      const allowedPlatformKeys = [
        'totalSellingPrice',
        'baseSellingPrice',
        'fuelSurchargeSellingAmount',
        'surgeFeeSellingAmount',
        'otherChargesSellingTotal',
        'currency',
        'billingWeightKg',
        'chargeableWeightKg',
        'breakdown',
      ];
      for (const key of allowedPlatformKeys) {
        expect(selectList).toContain(`'${key}'`);
      }
    });

    it('TC-1168-04: PUBLIC/anon/authenticated 권한 회수 후 authenticated SELECT 만 부여한다', () => {
      expect(sql).toContain('REVOKE ALL ON public.zen_order_rate_snapshots_safe FROM PUBLIC');
      expect(sql).toContain('REVOKE ALL ON public.zen_order_rate_snapshots_safe FROM anon');
      expect(sql).toContain('REVOKE ALL ON public.zen_order_rate_snapshots_safe FROM authenticated');
      expect(sql).toContain('GRANT SELECT ON public.zen_order_rate_snapshots_safe TO authenticated');
    });

    it('TC-1168-05: 롤백 SQL 을 주석으로 수록한다', () => {
      expect(rawSql).toContain('롤백 SQL');
      expect(rawSql).toContain('DROP VIEW IF EXISTS public.zen_order_rate_snapshots_safe');
    });
  });

  describe.skipIf(!dbAvailable())('실DB 검증 — 컬럼 화이트리스트 · metadata 정제 · 역할별 행 범위', () => {
    const shipperOrgId = '11111111-1168-4000-8000-000000000001';
    const otherShipperOrgId = '11111111-1168-4000-8000-000000000002';
    const agencyOrgId = '11111111-1168-4000-8000-000000000003';
    const shipperUserId = '22222222-1168-4000-8000-000000000001';
    const agencyUserId = '22222222-1168-4000-8000-000000000002';
    const adminUserId = '22222222-1168-4000-8000-000000000003';
    const orderOwnId = '33333333-1168-4000-8000-000000000001';
    const orderOtherId = '33333333-1168-4000-8000-000000000002';

    const hasView = (): boolean =>
      scalar(
        `SELECT count(*) FROM information_schema.views WHERE table_schema='public' AND table_name='zen_order_rate_snapshots_safe';`
      ) === '1';

    beforeAll(() => {
      if (!hasView()) return;
      psql(`
        INSERT INTO public.zen_organizations (id, name, type) VALUES
          ('${shipperOrgId}', 'Test Shipper 1168', 'SHIPPER'),
          ('${otherShipperOrgId}', 'Other Shipper 1168', 'SHIPPER'),
          ('${agencyOrgId}', 'Test Agency 1168', 'AGENCY')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES
          ('${shipperUserId}', 'shipper-1168@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated'),
          ('${agencyUserId}', 'agency-1168@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated'),
          ('${adminUserId}', 'admin-1168@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.zen_profiles (id, email, full_name, role, org_id, status) VALUES
          ('${shipperUserId}', 'shipper-1168@test.local', 'Shipper 1168', 'SHIPPER', '${shipperOrgId}', 'ACTIVE'),
          ('${agencyUserId}', 'agency-1168@test.local', 'Agency 1168', 'AGENCY', '${agencyOrgId}', 'ACTIVE'),
          ('${adminUserId}', 'admin-1168@test.local', 'Admin 1168', 'ADMIN', NULL, 'ACTIVE')
        ON CONFLICT (id) DO UPDATE SET
          role = EXCLUDED.role,
          org_id = EXCLUDED.org_id,
          status = EXCLUDED.status;

        INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, status, transport_mode, cargo_details) VALUES
          ('${orderOwnId}', 'ORD-1168-OWN', '${shipperOrgId}', '${agencyOrgId}', 'REGISTERED', 'UPS', '{}'::jsonb),
          ('${orderOtherId}', 'ORD-1168-OTHER', '${otherShipperOrgId}', NULL, 'REGISTERED', 'UPS', '{}'::jsonb)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.zen_order_rate_snapshots (
          order_id, applied_unit_price, applied_currency, applied_rule,
          carrier_cost_amount, platform_fee_amount, applied_weight_cost, applied_cbm_cost,
          tiers_snapshot, metadata
        ) VALUES
          (
            '${orderOwnId}', 150000, 'KRW', 'UPS_3TIER',
            90000, 15000, 80000, 70000,
            '[{"min": 0, "price": 1000}]'::jsonb,
            '{
              "platform": {
                "totalSellingPrice": 150000,
                "baseSellingPrice": 120000,
                "totalCostPrice": 90000,
                "baseCostPrice": 80000,
                "fuelSurchargeCostAmount": 5000,
                "surgeFeeCostAmount": 2000,
                "otherChargesCostTotal": 3000,
                "currency": "KRW",
                "breakdown": {"baseFreight": 120000}
              },
              "agency": {"agencyCostPrice": 135000}
            }'::jsonb
          ),
          (
            '${orderOtherId}', 200000, 'KRW', 'UPS_3TIER',
            120000, 20000, NULL, NULL, NULL,
            '{"platform": {"totalSellingPrice": 200000, "totalCostPrice": 120000}}'::jsonb
          )
        ON CONFLICT (order_id) DO UPDATE SET
          metadata = EXCLUDED.metadata,
          carrier_cost_amount = EXCLUDED.carrier_cost_amount,
          platform_fee_amount = EXCLUDED.platform_fee_amount;
      `);
    });

    afterAll(() => {
      if (!hasView()) return;
      psql(`
        DELETE FROM public.zen_order_rate_snapshots WHERE order_id IN ('${orderOwnId}', '${orderOtherId}');
        DELETE FROM public.zen_orders WHERE id IN ('${orderOwnId}', '${orderOtherId}');
        DELETE FROM public.zen_profiles WHERE id IN ('${shipperUserId}', '${agencyUserId}', '${adminUserId}');
        DELETE FROM auth.users WHERE id IN ('${shipperUserId}', '${agencyUserId}', '${adminUserId}');
        DELETE FROM public.zen_organizations WHERE id IN ('${shipperOrgId}', '${otherShipperOrgId}', '${agencyOrgId}');
      `);
    });

    it('TC-1168-06: 뷰 실제 컬럼에 원가·내부계산 10개 컬럼이 존재하지 않는다', () => {
      if (!hasView()) return;
      const cols = scalar(`
        SELECT string_agg(column_name, ',' ORDER BY ordinal_position)
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name='zen_order_rate_snapshots_safe';
      `);
      expect(cols).toBe(
        'id,order_id,rate_card_id,applied_unit_price,applied_currency,applied_rule,snapshot_at,is_manual,override_reason,version_no,priority,metadata'
      );
    });

    it('TC-1168-07: anon 역할은 안전 뷰 조회 권한이 없다', () => {
      if (!hasView()) return;
      expect(scalar(`SELECT has_table_privilege('anon', 'public.zen_order_rate_snapshots_safe', 'SELECT');`)).toBe('f');
      expect(scalar(`SELECT has_table_privilege('authenticated', 'public.zen_order_rate_snapshots_safe', 'SELECT');`)).toBe('t');
      expect(scalar(`SELECT has_table_privilege('authenticated', 'public.zen_order_rate_snapshots_safe', 'INSERT');`)).toBe('f');
    });

    it('TC-1168-08: 화주 세션은 자사 오더만 조회하며 metadata 내 원가·agency 키가 제거된다', () => {
      if (!hasView()) return;
      const rows = asRole(
        { sub: shipperUserId, role: 'authenticated' },
        `SELECT order_id::text, (metadata->'platform'->>'totalSellingPrice'), (metadata->'platform' ? 'totalCostPrice')::text, (metadata ? 'agency')::text FROM public.zen_order_rate_snapshots_safe WHERE order_id IN ('${orderOwnId}', '${orderOtherId}');`
      );
      expect(rows).toEqual([`${orderOwnId}|150000|false|false`]);
    });

    it('TC-1168-09: 대리점 세션은 배정된 오더만 조회한다', () => {
      if (!hasView()) return;
      const rows = asRole(
        { sub: agencyUserId, role: 'authenticated' },
        `SELECT order_id::text FROM public.zen_order_rate_snapshots_safe WHERE order_id IN ('${orderOwnId}', '${orderOtherId}');`
      );
      expect(rows).toEqual([orderOwnId]);
    });

    it('TC-1168-10: 관리자 세션은 안전 뷰에서 양쪽 오더를 모두 조회한다', () => {
      if (!hasView()) return;
      const rows = asRole(
        { sub: adminUserId, role: 'authenticated' },
        `SELECT count(*)::text FROM public.zen_order_rate_snapshots_safe WHERE order_id IN ('${orderOwnId}', '${orderOtherId}');`
      );
      expect(rows).toEqual(['2']);
    });
  });
});
