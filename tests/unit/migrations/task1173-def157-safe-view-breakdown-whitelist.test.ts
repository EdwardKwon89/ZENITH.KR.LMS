import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

/**
 * TASK-1173 / DEF-157 마무리 (Issue #1466, DEF-160)
 * zen_order_rate_snapshots_safe 뷰의 metadata.platform.breakdown 화이트리스트 회귀 테스트
 *
 * 배경: TASK-1168 테스트의 시료는 breakdown 에 원가 계열 키가 없는 형태였다.
 *       이 테스트는 **실제 운영 형태**(원가 계열 키·내부 ID·요율·중첩 객체의 내부 필드 포함)의
 *       breakdown 으로 화주·대리점·관리자 세션을 검증한다.
 */

const MIGRATION = 'supabase/migrations/20261122100100_task1173_def157_safe_view_breakdown_whitelist.sql';
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

function asRole(claims: Record<string, unknown>, body: string): string[] {
  const out = psql(
    [
      'BEGIN;',
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

// 원가 계열 키(JSON 키 이름에 cost 포함)가 어디에든 있는지 — 값이 아니라 **키**만 본다
const COST_KEY_PRESENT = `(metadata::text ~* '"[^"]*cost[^"]*"[[:space:]]*:')::text`;

// 허용 키 — 마이그레이션 헤더와 동일해야 한다
const ALLOWED_BREAKDOWN_KEYS = [
  'actualWeightKg',
  'baseSellingPrice',
  'billingWeightKg',
  'chargeableWeightKg',
  'fuelSurchargeSellingAmount',
  'otherChargeItems',
  'otherChargesSellingTotal',
  'product',
  'surgeFeeSellingAmount',
  'volumetricWeightKg',
  'zone',
].join(',');

describe('TASK-1173 / DEF-157 — 안전 뷰 breakdown 화이트리스트', () => {
  describe('정적 검증 — 마이그레이션', () => {
    let rawSql: string;
    let sql: string;
    let selectList: string;

    beforeAll(() => {
      rawSql = readFileSync(MIGRATION, 'utf-8');
      sql = stripSqlComments(rawSql);
      const start = sql.indexOf('CREATE OR REPLACE VIEW public.zen_order_rate_snapshots_safe AS');
      const end = sql.indexOf('FROM public.zen_order_rate_snapshots AS s');
      selectList = sql.slice(start, end);
    });

    it('TC-1173-01: breakdown 을 통째로 복사하지 않는다(하위 키 단위 구성)', () => {
      expect(selectList).not.toContain("s.metadata -> 'platform' -> 'breakdown'\n");
      expect(selectList).not.toMatch(/'breakdown',\s*s\.metadata\s*->\s*'platform'\s*->\s*'breakdown'/);
      expect(sql).toContain("jsonb_typeof(bd.b) = 'object'");
    });

    it('TC-1173-02: 허용 키만 나열하고 원가 계열 키를 포함하지 않는다', () => {
      for (const key of [
        'baseSellingPrice',
        'fuelSurchargeSellingAmount',
        'surgeFeeSellingAmount',
        'otherChargesSellingTotal',
        'billingWeightKg',
        'chargeableWeightKg',
        'actualWeightKg',
        'volumetricWeightKg',
        'product_code',
        'product_name',
        'zone_code',
        'zone_name',
        'chargeCode',
        'chargeName',
        'sellingBase',
      ]) {
        expect(selectList).toContain(`'${key}'`);
      }
      // 키 문자열 리터럴 중 cost 를 포함하는 것이 없다(주석 제외한 SQL 본문 기준)
      const literals = selectList.match(/'[A-Za-z_]+'/g) ?? [];
      expect(literals.filter((l) => /cost/i.test(l))).toEqual([]);
    });

    it('TC-1173-03: 컬럼 목록·권한은 TASK-1168 과 동일하게 재부여하고 롤백 SQL 을 수록한다', () => {
      expect(sql).toContain('REVOKE ALL ON public.zen_order_rate_snapshots_safe FROM authenticated');
      expect(sql).toContain('GRANT SELECT ON public.zen_order_rate_snapshots_safe TO authenticated');
      expect(rawSql).toContain('롤백 SQL');
      expect(rawSql).toContain("s.metadata -> 'platform' -> 'breakdown')))");
    });
  });

  describe.skipIf(!dbAvailable())('실DB 검증 — 운영 형태 시료, 역할별 세션', () => {
    const shipperOrgId = '11111111-1173-4000-8000-000000000001';
    const agencyOrgId = '11111111-1173-4000-8000-000000000002';
    const shipperUserId = '22222222-1173-4000-8000-000000000001';
    const agencyUserId = '22222222-1173-4000-8000-000000000002';
    const adminUserId = '22222222-1173-4000-8000-000000000003';
    const orderFullId = '33333333-1173-4000-8000-000000000001'; // 운영 형태(신규) breakdown
    const orderLegacyId = '33333333-1173-4000-8000-000000000002'; // 레거시 4키 breakdown
    const orderNoBdId = '33333333-1173-4000-8000-000000000003'; // breakdown 없음

    const hasView = (): boolean =>
      psql(
        `SELECT count(*) FROM information_schema.views WHERE table_schema='public' AND table_name='zen_order_rate_snapshots_safe';`
      ).trim() === '1';

    const fullBreakdown = `{
      "baseSellingPrice": 120000, "fuelSurchargeSellingAmount": 20000, "surgeFeeSellingAmount": 5000,
      "otherChargesSellingTotal": 1000, "billingWeightKg": 5, "chargeableWeightKg": 4.78,
      "actualWeightKg": 4.5, "volumetricWeightKg": 4.78,
      "baseCostPrice": 80000, "costSurchargeRate": 0.07, "fuelSurchargeCostAmount": 5000,
      "surgeFeeCostAmount": 2000, "otherChargesCostTotal": 3000,
      "baseRateId": "rate-1", "fuelSurchargeId": "fuel-1", "surgeFeeId": "surge-1",
      "fuelSurchargeRate": 0.2, "surgeFeeSellingRatePerKg": 100, "volumetricDivisor": 5000,
      "fallbackApplied": false, "nonDocRateApplied": true, "oversizeApplied": false,
      "product": {"product_code": "EXP", "product_name": "Express", "cargo_type": "NON_DOC", "internal_cost_note": "secret"},
      "zone": {"zone_code": "Z1", "zone_name": "Zone 1", "zone_cost_factor": 1.2},
      "otherChargeItems": [
        {"chargeCode": "CF", "chargeName": "Customs", "costBase": 700, "sellingBase": 1000, "unit": "PER_ORDER"}
      ]
    }`;

    beforeAll(() => {
      if (!hasView()) return;
      psql(`
        INSERT INTO public.zen_organizations (id, name, type) VALUES
          ('${shipperOrgId}', 'Test Shipper 1173', 'SHIPPER'),
          ('${agencyOrgId}', 'Test Agency 1173', 'AGENCY')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES
          ('${shipperUserId}', 'shipper-1173@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated'),
          ('${agencyUserId}', 'agency-1173@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated'),
          ('${adminUserId}', 'admin-1173@test.local', 'x', now(), '{}', '{}', now(), now(), 'authenticated', 'authenticated')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.zen_profiles (id, email, full_name, role, org_id, status) VALUES
          ('${shipperUserId}', 'shipper-1173@test.local', 'Shipper 1173', 'SHIPPER', '${shipperOrgId}', 'ACTIVE'),
          ('${agencyUserId}', 'agency-1173@test.local', 'Agency 1173', 'AGENCY', '${agencyOrgId}', 'ACTIVE'),
          ('${adminUserId}', 'admin-1173@test.local', 'Admin 1173', 'ADMIN', NULL, 'ACTIVE')
        ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, org_id = EXCLUDED.org_id, status = EXCLUDED.status;

        INSERT INTO public.zen_orders (id, order_no, shipper_id, agency_org_id, status, transport_mode, cargo_details) VALUES
          ('${orderFullId}', 'ORD-1173-FULL', '${shipperOrgId}', '${agencyOrgId}', 'REGISTERED', 'UPS', '{}'::jsonb),
          ('${orderLegacyId}', 'ORD-1173-LEGACY', '${shipperOrgId}', '${agencyOrgId}', 'REGISTERED', 'UPS', '{}'::jsonb),
          ('${orderNoBdId}', 'ORD-1173-NOBD', '${shipperOrgId}', '${agencyOrgId}', 'REGISTERED', 'UPS', '{}'::jsonb)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.zen_order_rate_snapshots (order_id, applied_unit_price, applied_currency, applied_rule, metadata) VALUES
          ('${orderFullId}', 146000, 'KRW', 'UPS_3TIER',
           '{"platform": {"totalSellingPrice": 146000, "totalCostPrice": 90000, "baseCostPrice": 80000,
             "baseSellingPrice": 120000, "currency": "KRW", "billingWeightKg": 5, "chargeableWeightKg": 4.78,
             "breakdown": ${fullBreakdown}}, "agency": {"agencyCostPrice": 135000}}'::jsonb),
          ('${orderLegacyId}', 249577, 'KRW', 'UPS_3TIER',
           '{"platform": {"totalSellingPrice": 249577, "totalCostPrice": 189577, "currency": "KRW",
             "breakdown": {"baseFreight": 200000, "fuelSurcharge": 30000, "surgeFee": 10000, "extraCharges": 9577}}}'::jsonb),
          ('${orderNoBdId}', 100000, 'KRW', 'UPS_3TIER',
           '{"platform": {"totalSellingPrice": 100000, "totalCostPrice": 70000, "currency": "KRW"}}'::jsonb)
        ON CONFLICT (order_id) DO UPDATE SET metadata = EXCLUDED.metadata;
      `);
    });

    afterAll(() => {
      if (!hasView()) return;
      psql(`
        DELETE FROM public.zen_order_rate_snapshots WHERE order_id IN ('${orderFullId}', '${orderLegacyId}', '${orderNoBdId}');
        DELETE FROM public.zen_orders WHERE id IN ('${orderFullId}', '${orderLegacyId}', '${orderNoBdId}');
        DELETE FROM public.zen_profiles WHERE id IN ('${shipperUserId}', '${agencyUserId}', '${adminUserId}');
        DELETE FROM auth.users WHERE id IN ('${shipperUserId}', '${agencyUserId}', '${adminUserId}');
        DELETE FROM public.zen_organizations WHERE id IN ('${shipperOrgId}', '${agencyOrgId}');
      `);
    });

    const sessions: Array<[string, () => Record<string, unknown>]> = [
      ['화주', () => ({ sub: shipperUserId, role: 'authenticated' })],
      ['대리점', () => ({ sub: agencyUserId, role: 'authenticated' })],
      ['관리자', () => ({ sub: adminUserId, role: 'authenticated' })],
    ];

    for (const [label, claims] of sessions) {
      it(`TC-1173-04(${label}): 운영 형태 시료 — metadata 어디에도 원가 계열 키가 없다`, () => {
        if (!hasView()) return;
        const rows = asRole(
          claims(),
          `SELECT order_id::text || '|' || ${COST_KEY_PRESENT} FROM public.zen_order_rate_snapshots_safe
             WHERE order_id IN ('${orderFullId}', '${orderLegacyId}', '${orderNoBdId}') ORDER BY order_id;`
        );
        expect(rows).toEqual([
          `${orderFullId}|false`,
          `${orderLegacyId}|false`,
          `${orderNoBdId}|false`,
        ]);
      });
    }

    it('TC-1173-05: breakdown 하위 키가 허용 목록과 정확히 일치한다(화주 세션)', () => {
      if (!hasView()) return;
      const rows = asRole(
        { sub: shipperUserId, role: 'authenticated' },
        `SELECT string_agg(k, ',' ORDER BY k) FROM public.zen_order_rate_snapshots_safe v,
           LATERAL jsonb_object_keys(v.metadata->'platform'->'breakdown') k WHERE v.order_id = '${orderFullId}';`
      );
      expect(rows).toEqual([ALLOWED_BREAKDOWN_KEYS]);
    });

    it('TC-1173-06: 중첩 객체(product·zone·otherChargeItems)는 허용 하위 키만 남는다', () => {
      if (!hasView()) return;
      const rows = asRole(
        { sub: agencyUserId, role: 'authenticated' },
        `SELECT
           (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(v.metadata->'platform'->'breakdown'->'product') k),
           (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(v.metadata->'platform'->'breakdown'->'zone') k),
           (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(v.metadata->'platform'->'breakdown'->'otherChargeItems'->0) k)
         FROM public.zen_order_rate_snapshots_safe v WHERE v.order_id = '${orderFullId}';`
      );
      expect(rows).toEqual([
        'cargo_type,product_code,product_name|zone_code,zone_name|chargeCode,chargeName,sellingBase,unit',
      ]);
    });

    it('TC-1173-07: 판매 키·중량 키 값은 보존된다(소비 경로 무회귀)', () => {
      if (!hasView()) return;
      const rows = asRole(
        { sub: shipperUserId, role: 'authenticated' },
        `SELECT (metadata->'platform'->'breakdown'->>'baseSellingPrice') || '|' ||
                (metadata->'platform'->'breakdown'->>'fuelSurchargeSellingAmount') || '|' ||
                (metadata->'platform'->'breakdown'->>'surgeFeeSellingAmount') || '|' ||
                (metadata->'platform'->'breakdown'->>'otherChargesSellingTotal') || '|' ||
                (metadata->'platform'->'breakdown'->>'billingWeightKg') || '|' ||
                (metadata->'platform'->'breakdown'->'product'->>'product_name') || '|' ||
                (metadata->'platform'->'breakdown'->'zone'->>'zone_name') || '|' ||
                (metadata->'platform'->'breakdown'->'otherChargeItems'->0->>'sellingBase')
         FROM public.zen_order_rate_snapshots_safe WHERE order_id = '${orderFullId}';`
      );
      expect(rows).toEqual(['120000|20000|5000|1000|5|Express|Zone 1|1000']);
    });

    it('TC-1173-08: 레거시 판매 키 4개는 보존되고, breakdown 이 없는 스냅샷은 키가 생기지 않는다', () => {
      if (!hasView()) return;
      const rows = asRole(
        { sub: shipperUserId, role: 'authenticated' },
        `SELECT order_id::text || '|' ||
                coalesce((metadata->'platform'->'breakdown')::text, 'NONE')
         FROM public.zen_order_rate_snapshots_safe
         WHERE order_id IN ('${orderLegacyId}', '${orderNoBdId}') ORDER BY order_id;`
      );
      expect(rows).toEqual([
        `${orderLegacyId}|{"surgeFee": 10000, "baseFreight": 200000, "extraCharges": 9577, "fuelSurcharge": 30000}`,
        `${orderNoBdId}|NONE`,
      ]);
    });

    it('TC-1173-09: 뷰 컬럼 목록·권한은 TASK-1168 과 동일하다', () => {
      if (!hasView()) return;
      const cols = psql(
        `SELECT string_agg(column_name, ',' ORDER BY ordinal_position) FROM information_schema.columns
         WHERE table_schema='public' AND table_name='zen_order_rate_snapshots_safe';`
      ).trim();
      expect(cols).toBe(
        'id,order_id,rate_card_id,applied_unit_price,applied_currency,applied_rule,snapshot_at,is_manual,override_reason,version_no,priority,metadata'
      );
      expect(psql(`SELECT has_table_privilege('anon','public.zen_order_rate_snapshots_safe','SELECT');`).trim()).toBe('f');
      expect(psql(`SELECT has_table_privilege('authenticated','public.zen_order_rate_snapshots_safe','SELECT');`).trim()).toBe('t');
    });
  });
});
