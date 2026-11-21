import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { psql } from './helpers/db';

/**
 * TASK-1169 (Issue #1407) — create_order_atomic v7 구버전 payload 호환 회귀 테스트
 *
 * 배경: v7(`20261113090100`)이 `recipient_company` 컬럼 매핑을 추가했다.
 * 운영 적용 전에 구버전 payload(해당 키 없음)로 호출해도 정상 동작하는지 확인해야 한다.
 *
 * 케이스:
 *   TC-1169-01 정적 — v7 마이그레이션이 recipient_company 를 payload→컬럼으로 매핑
 *   TC-1169-02 실DB — 함수 시그니처(jsonb,uuid,uuid)·SECURITY DEFINER 불변, 컬럼 nullable
 *   TC-1169-03 실DB — (a) 구버전 payload(키 없음) → 주문 생성 + recipient_company NULL + 부속 행 정상
 *   TC-1169-04 실DB — (b) 신버전 payload(값) → 값 그대로 저장
 *   TC-1169-05 실DB — (c) null / 빈 문자열 → NULL / '' 로 구분 저장
 *
 * 실DB 검증은 단일 psql 세션의 `BEGIN … ROLLBACK` 안에서 수행하므로 잔여 행이 남지 않는다.
 * (CI 는 `supabase db reset` 직후라 시드 org/user 가 없다 → 픽스처를 트랜잭션 안에서 생성한다.)
 */

const V7_MIGRATION = 'supabase/migrations/20261113090100_task_b346_create_order_atomic_v7.sql';

function dbAvailable(): boolean {
  try {
    execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf-8' });
    psql('SELECT 1;');
    return true;
  } catch {
    return false;
  }
}

type CaseResult = {
  caseId: string;
  payloadKey: string;
  stored: string;
  isNull: boolean;
  pkgs: number;
  items: number;
  tracking: number;
  history: number;
};

const FIXTURE_SQL = `
BEGIN;
\\set ON_ERROR_STOP on

CREATE TEMP TABLE t1169_results (
  case_id        text,
  order_id       uuid,
  payload_key    text,
  stored_company text
) ON COMMIT DROP;

INSERT INTO auth.users (id, email)
VALUES ('11690000-0000-4000-8000-000000000001', 't1169-regression@test.invalid');

INSERT INTO public.zen_organizations (id, name, type, status)
VALUES ('11690000-0000-4000-8000-000000000002', 'T1169 Regression Org', 'SHIPPER', 'ACTIVE');

-- auth.users 트리거가 zen_profiles 를 자동 생성하므로 upsert 로 보정한다.
INSERT INTO public.zen_profiles (id, org_id, email, role, status)
VALUES ('11690000-0000-4000-8000-000000000001', '11690000-0000-4000-8000-000000000002',
        't1169-regression@test.invalid', 'SHIPPER', 'ACTIVE')
ON CONFLICT (id) DO UPDATE
  SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;

DO $t1169$
DECLARE
  v_user   uuid := '11690000-0000-4000-8000-000000000001';
  v_org    uuid := '11690000-0000-4000-8000-000000000002';
  v_origin uuid;
  v_dest   uuid;
  v_base   jsonb;
  v_part   jsonb;
  v_res    jsonb;
  v_id     uuid;
BEGIN
  SELECT id INTO v_origin FROM public.zen_ports WHERE type = 'AIR' ORDER BY code LIMIT 1;
  SELECT id INTO v_dest   FROM public.zen_ports WHERE type = 'AIR' ORDER BY code DESC LIMIT 1;

  v_base := jsonb_build_object(
    'order_type', 'B2B',
    'shipper_id', v_org,
    'shipper_name', 'T1169 Regression Org',
    'origin_port_id', v_origin,
    'dest_port_id', v_dest,
    'recipient_name', 'Recv T1169',
    'recipient_country_code', 'US',
    'transport_mode', 'AIR',
    'packages', jsonb_build_array(jsonb_build_object(
      'packing_unit', 'BOX', 'packing_count', 1,
      'gross_weight', 5, 'special_cargo_type', 'NONE', 'content_type', 'GENERAL',
      'items', jsonb_build_array(jsonb_build_object(
        'item_name', 'Item A', 'quantity', 1, 'unit_price', 10,
        'currency', 'USD', 'item_packing_unit', 'PCE'))
    ))
  );

  -- (a) 구버전 payload — recipient_company 키를 넣지 않는다
  v_res := public.create_order_atomic(v_base, v_user, v_org);
  INSERT INTO t1169_results (case_id, order_id, payload_key)
  VALUES ('a', (v_res->>'id')::uuid, '(키 없음)');

  -- (b) 신버전 payload — 값 전달
  v_res := public.create_order_atomic(v_base || jsonb_build_object('recipient_company', 'ACME Logistics'), v_user, v_org);
  INSERT INTO t1169_results (case_id, order_id, payload_key)
  VALUES ('b', (v_res->>'id')::uuid, 'ACME Logistics');

  -- (c1) JSON null
  v_res := public.create_order_atomic(v_base || jsonb_build_object('recipient_company', 'null'::jsonb), v_user, v_org);
  INSERT INTO t1169_results (case_id, order_id, payload_key)
  VALUES ('c1', (v_res->>'id')::uuid, 'null');

  -- (c2) 빈 문자열
  v_res := public.create_order_atomic(v_base || jsonb_build_object('recipient_company', to_jsonb(''::text)), v_user, v_org);
  INSERT INTO t1169_results (case_id, order_id, payload_key)
  VALUES ('c2', (v_res->>'id')::uuid, '(빈 문자열)');
END $t1169$;

UPDATE t1169_results r
SET stored_company = o.recipient_company
FROM public.zen_orders o
WHERE o.id = r.order_id;

SELECT r.case_id || '|' || r.payload_key || '|' ||
       coalesce(r.stored_company, '<NULL>') || '|' ||
       (r.stored_company IS NULL)::text || '|' ||
       (SELECT count(*) FROM public.zen_order_packages p WHERE p.order_id = r.order_id) || '|' ||
       (SELECT count(*) FROM public.zen_order_items i WHERE i.order_id = r.order_id) || '|' ||
       (SELECT count(*) FROM public.zen_tracking_configs t WHERE t.order_id = r.order_id) || '|' ||
       (SELECT count(*) FROM public.order_status_history h WHERE h.order_id = r.order_id)
FROM t1169_results r
ORDER BY r.case_id;

ROLLBACK;
`;

describe('TASK-1169 / Issue #1407 — create_order_atomic v7 구버전 payload 호환', () => {
  let rows: CaseResult[] = [];
  let signature = '';
  let columnNullable = '';
  let securityDefiner = '';

  beforeAll(() => {
    if (!dbAvailable()) return;

    const raw = psql(FIXTURE_SQL);
    rows = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [caseId, payloadKey, stored, isNull, pkgs, items, tracking, history] = line.split('|');
        return {
          caseId,
          payloadKey,
          stored,
          isNull: isNull === 'true',
          pkgs: Number(pkgs),
          items: Number(items),
          tracking: Number(tracking),
          history: Number(history),
        };
      });

    signature = psql(
      `SELECT p.oid::regprocedure::text FROM pg_proc p WHERE p.proname = 'create_order_atomic';`
    );
    securityDefiner = psql(
      `SELECT p.prosecdef::text FROM pg_proc p WHERE p.proname = 'create_order_atomic';`
    );
    columnNullable = psql(
      `SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='zen_orders' AND column_name='recipient_company';`
    );
  });

  it('TC-1169-01: v7 마이그레이션이 recipient_company 를 payload→컬럼으로 매핑한다', () => {
    const sql = readFileSync(path.resolve(process.cwd(), V7_MIGRATION), 'utf-8');
    // INSERT 컬럼 목록과 VALUES 목록 양쪽에 매핑이 있어야 한다.
    expect(sql).toMatch(/recipient_company,/);
    expect(sql).toMatch(/p_payload->>'recipient_company'/);
  });

  it.skipIf(!dbAvailable())('TC-1169-02: 함수 시그니처·DEFINER 불변, 컬럼은 nullable', () => {
    expect(signature).toBe('create_order_atomic(jsonb,uuid,uuid)');
    expect(securityDefiner).toBe('true');
    expect(columnNullable).toBe('YES');
  });

  it.skipIf(!dbAvailable())('TC-1169-03: (a) 구버전 payload — 주문 생성 성공 + recipient_company NULL + 부속 행 정상', () => {
    const row = rows.find((r) => r.caseId === 'a');
    expect(row).toBeTruthy();
    expect(row!.payloadKey).toBe('(키 없음)');
    expect(row!.isNull).toBe(true);
    expect(row!.stored).toBe('<NULL>');
    // payload 경로 전체가 실행됐는지(패키지·아이템·트래킹·상태이력)
    expect(row!.pkgs).toBe(1);
    expect(row!.items).toBe(1);
    expect(row!.tracking).toBe(1);
    expect(row!.history).toBe(1);
  });

  it.skipIf(!dbAvailable())('TC-1169-04: (b) 신버전 payload — 값이 그대로 저장', () => {
    const row = rows.find((r) => r.caseId === 'b');
    expect(row).toBeTruthy();
    expect(row!.isNull).toBe(false);
    expect(row!.stored).toBe('ACME Logistics');
  });

  it.skipIf(!dbAvailable())('TC-1169-05: (c) null → NULL, 빈 문자열 → 빈 문자열로 구분 저장', () => {
    const c1 = rows.find((r) => r.caseId === 'c1');
    const c2 = rows.find((r) => r.caseId === 'c2');
    expect(c1).toBeTruthy();
    expect(c2).toBeTruthy();
    expect(c1!.isNull).toBe(true);
    expect(c2!.isNull).toBe(false);
    expect(c2!.stored).toBe('');
  });
});
