// TASK-B-365 (Issue #1375): 오더정산 상태·UPS 원가 스냅샷 컬럼 마이그레이션 실DB 검증 (R-09/R-14).
// 소스 문자열 toContain 단독 단언 금지(Mike 경고: vacuous test) — 모든 단언은 실제 DB 조회 결과로 한다.
// 마이그레이션 파일은 "재실행(멱등) 대상"으로만 읽어 실행하며, 기존 행 무변경 검증에 사용한다.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const MIGRATION_FILE = 'supabase/migrations/20261118090000_task_b365_cost_settlement_columns.sql';

const ORDER_ID = randomUUID();
const PROFILE_ID = randomUUID();
const ORG_ID = randomUUID();
const COST_ID = randomUUID();

function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -q -t -A -c "${escaped}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

function psqlErr(sql: string): string {
  try {
    psql(sql);
    return '';
  } catch (err) {
    return String((err as Error).message ?? err);
  }
}

function cleanupFixture() {
  psql(`DELETE FROM public.zen_ups_actual_cost WHERE order_id='${ORDER_ID}'`);
  psql(`DELETE FROM public.zen_orders WHERE id='${ORDER_ID}'`);
  psql(`DELETE FROM public.zen_profiles WHERE id='${PROFILE_ID}'`);
  psql(`DELETE FROM public.zen_organizations WHERE id='${ORG_ID}'`);
}

function setupFixture() {
  cleanupFixture();
  psql(`INSERT INTO public.zen_organizations (id, name, type, created_at) VALUES ('${ORG_ID}', 'B365 Test Org', 'INDIVIDUAL', NOW())`);
  psql(`INSERT INTO public.zen_profiles (id, org_id, email, role, created_at) VALUES ('${PROFILE_ID}', '${ORG_ID}', 'b365-${PROFILE_ID.substring(0, 8)}@test.com', 'ADMIN', NOW())`);
  psql(`INSERT INTO public.zen_orders (id, order_no, cargo_details, transport_mode, status, created_at) VALUES ('${ORDER_ID}', 'ZEN-B365-${PROFILE_ID.substring(0, 8)}', '{}'::jsonb, 'UPS', 'WAREHOUSED', NOW())`);
}

describe('TASK-B-365 (Issue #1375): 오더정산 상태·원가 스냅샷 컬럼 마이그레이션 (실DB)', () => {
  beforeAll(() => setupFixture());
  afterAll(() => cleanupFixture());

  describe('TC-365-1~4: zen_orders 정산 상태 컬럼', () => {
    it('TC-365-1: cost_settlement_status 기본값 NOT_SETTLED (명시 없이 INSERT)', () => {
      const status = psql(`SELECT cost_settlement_status FROM public.zen_orders WHERE id='${ORDER_ID}'`);
      expect(status).toBe('NOT_SETTLED');
    });

    it('TC-365-2: 허용되지 않는 값 INSERT 거부 (CHECK 위반)', () => {
      const err = psqlErr(
        `INSERT INTO public.zen_orders (id, order_no, cargo_details, cost_settlement_status) VALUES ('${randomUUID()}', 'ZEN-B365-BAD', '{}'::jsonb, 'BOGUS_STATUS')`
      );
      expect(err).toContain('zen_orders_cost_settlement_status_check');
    });

    it('TC-365-3: SETTLED인데 cost_settled_at NULL이면 CHECK 거부', () => {
      const err = psqlErr(
        `INSERT INTO public.zen_orders (id, order_no, cargo_details, cost_settlement_status, cost_settled_at, cost_settled_by)
         VALUES ('${randomUUID()}', 'ZEN-B365-NOAT', '{}'::jsonb, 'SETTLED', NULL, '${PROFILE_ID}')`
      );
      expect(err).toContain('zen_orders_cost_settled_complete_check');
    });

    it('TC-365-3b: SETTLED인데 cost_settled_by NULL이면 CHECK 거부', () => {
      const err = psqlErr(
        `INSERT INTO public.zen_orders (id, order_no, cargo_details, cost_settlement_status, cost_settled_at, cost_settled_by)
         VALUES ('${randomUUID()}', 'ZEN-B365-NOBY', '{}'::jsonb, 'SETTLED', NOW(), NULL)`
      );
      expect(err).toContain('zen_orders_cost_settled_complete_check');
    });

    it('TC-365-4: SETTLED + at/by 모두 있으면 허용', () => {
      const settledId = randomUUID();
      psql(
        `INSERT INTO public.zen_orders (id, order_no, cargo_details, transport_mode, cost_settlement_status, cost_settled_at, cost_settled_by)
         VALUES ('${settledId}', 'ZEN-B365-SETTLED-${settledId.substring(0, 8)}', '{}'::jsonb, 'UPS', 'SETTLED', NOW(), '${PROFILE_ID}')`
      );
      expect(psql(`SELECT cost_settlement_status FROM public.zen_orders WHERE id='${settledId}'`)).toBe('SETTLED');
      psql(`DELETE FROM public.zen_orders WHERE id='${settledId}'`);
    });

    // DEF-B-158: `ON DELETE SET NULL`와 `SETTLED ⇒ settled_by NOT NULL` CHECK는 상호 모순이다.
    // 정산자 프로필을 삭제하면 SET NULL이 CHECK를 위반해 DELETE가 실패한다(명세가 두 제약을
    // 모두 확정 — 구현은 명세대로, 충돌은 DEF로 보고). 실제 삭제 시도는 하지 않는다.
    it('TC-365-4b: FK는 ON DELETE SET NULL, CHECK는 SETTLED ⇒ at/by NOT NULL (DEF-B-158 충돌 명세 확인)', () => {
      const fk = psql(
        `SELECT pg_get_constraintdef(oid) FROM pg_constraint
         WHERE conrelid='zen_orders'::regclass AND conname='zen_orders_cost_settled_by_fkey'`
      );
      expect(fk).toContain('ON DELETE SET NULL');

      const chk = psql(
        `SELECT pg_get_constraintdef(oid) FROM pg_constraint
         WHERE conrelid='zen_orders'::regclass AND conname='zen_orders_cost_settled_complete_check'`
      );
      expect(chk).toContain('cost_settled_at IS NOT NULL');
      expect(chk).toContain('cost_settled_by IS NOT NULL');
    });

    it('TC-365-5: 부분 인덱스 idx_zen_orders_cost_settlement 존재 (pg_indexes, UPS 조건부)', () => {
      const idx = psql(`SELECT indexdef FROM pg_indexes WHERE indexname='idx_zen_orders_cost_settlement'`);
      expect(idx).toContain('WHERE (transport_mode = \'UPS\'::text)');
      expect(idx).toContain('cost_settlement_status, transport_mode');
    });
  });

  describe('TC-365-6~8: zen_ups_actual_cost 신규 5컬럼', () => {
    it('TC-365-6: 신규 5컬럼 존재 + calc_version 기본값 1 (명시 없이 INSERT)', () => {
      psql(
        `INSERT INTO public.zen_ups_actual_cost (id, order_id, base_freight_hkd, fuel_surcharge_hkd, surge_fee_hkd, other_charges_hkd, total_cost_krw)
         VALUES ('${COST_ID}', '${ORDER_ID}', 100, 10, 5, 0, 21000)`
      );
      const row = psql(
        `SELECT calc_version || '|' || coalesce(cost_surcharge_rate::text,'<NULL>') || '|' || coalesce(cost_surcharge_amount_krw::text,'<NULL>')
                || '|' || coalesce(applied_exchange_rates::text,'<NULL>') || '|' || coalesce(cost_legacy_snapshot::text,'<NULL>')
         FROM public.zen_ups_actual_cost WHERE id='${COST_ID}'`
      );
      expect(row).toBe('1|<NULL>|<NULL>|<NULL>|<NULL>');
    });

    it('TC-365-7: 마이그레이션 재실행(멱등) — 기존 행 변경 0 (row count·total_cost_krw 합계 전후 동일)', () => {
      const countBefore = psql(`SELECT count(*)::text || '|' || coalesce(sum(total_cost_krw)::text,'<NULL>') FROM public.zen_ups_actual_cost`);
      const ordersBefore = psql(`SELECT count(*)::text || '|' || count(*) FILTER (WHERE cost_settled_at IS NOT NULL)::text FROM public.zen_orders`);

      const sql = readFileSync(path.join(process.cwd(), MIGRATION_FILE), 'utf-8');
      psql(sql); // 재실행 — IF NOT EXISTS/DROP IF EXISTS로 멱등

      const countAfter = psql(`SELECT count(*)::text || '|' || coalesce(sum(total_cost_krw)::text,'<NULL>') FROM public.zen_ups_actual_cost`);
      const ordersAfter = psql(`SELECT count(*)::text || '|' || count(*) FILTER (WHERE cost_settled_at IS NOT NULL)::text FROM public.zen_orders`);

      expect(countAfter).toBe(countBefore);
      expect(ordersAfter).toBe(ordersBefore);
    });

    it('TC-365-8: 기존 컬럼 의미 고정 COMMENT 존재 (other_charges_hkd = 기타부가운임 KRW 합계)', () => {
      const comment = psql(
        `SELECT col_description('zen_ups_actual_cost'::regclass, a.attnum)
         FROM pg_attribute a WHERE a.attrelid='zen_ups_actual_cost'::regclass AND a.attname='other_charges_hkd'`
      );
      expect(comment).toContain('KRW 합계');
    });
  });
});
