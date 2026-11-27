import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { psql } from './helpers/db';

/**
 * TASK-B-399 (Issue #1566) PR1 — create_order_atomic v8 실DB 값 단언 회귀 (R-09/R-14).
 *
 * 정적 검사(tests/unit/migrations/taskb399-shipper-company.test.ts)는 보조일 뿐이며,
 * 아래 테스트가 마이그레이션의 실제 DB 동작을 증명한다. 로컬 Supabase 전용(원격 호출 없음).
 * 픽스처는 런타임 난수 UUID를 사용하고 단일 psql 세션의 BEGIN…ROLLBACK으로 잔여 행을 남기지 않으며,
 * afterAll에서 방어적 정리를 수행한다. skipIf 없음( CI는 supabase db reset 직후 실행 ).
 * 결과는 jsonb_agg 한 줄 JSON으로 받아 저장값에 개행이 들어가도 행이 쪼개지지 않게 한다(Aiden 재검토 권고 6).
 *
 * 케이스:
 *   TC-B399-DB-01 컬럼 nullable, 함수 네임스페이스·시그니처·DEFINER·반환형·search_path, 본문 반영
 *   TC-B399-DB-02 앞뒤 공백 제거 + 가운데 공백 보존
 *   TC-B399-DB-03 공백만(ASCII·TAB·LF·CR·NBSP·전각 공백·chr(160)·chr(12288)) → NULL
 *   TC-B399-DB-04 키 없음 / JSON null → NULL
 *   TC-B399-DB-05 기존 컬럼(shipper_name·recipient_company·shipper_contact_email) 값 보존 + 부속 행 생성
 */

const USER_ID = randomUUID();
const ORG_ID = randomUUID();
const EMAIL = `b399-${randomUUID().slice(0, 8)}@test.invalid`;

type DbRow = {
  caseId: string;
  storedCompany: string;
  isNull: boolean;
  storedName: string;
  storedRecipient: string;
  storedEmail: string;
  pkgs: number;
  items: number;
  tracking: number;
  history: number;
};

type JsonRow = {
  case_id: string;
  company: string | null;
  is_null: boolean | null;
  name: string;
  recipient: string;
  email: string;
  pkgs: number;
  items: number;
  tracking: number;
  history: number;
};

function fixtureSql(): string {
  return `
\\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users (id, email)
VALUES ('${USER_ID}', '${EMAIL}');

INSERT INTO public.zen_organizations (id, name, type, status)
VALUES ('${ORG_ID}', 'B399 Regression Org', 'SHIPPER', 'ACTIVE');

INSERT INTO public.zen_profiles (id, org_id, email, role, status)
VALUES ('${USER_ID}', '${ORG_ID}', '${EMAIL}', 'SHIPPER', 'ACTIVE')
ON CONFLICT (id) DO UPDATE
  SET org_id = EXCLUDED.org_id, role = EXCLUDED.role, status = EXCLUDED.status;

CREATE TEMP TABLE tb399_results (
  case_id text, order_id uuid, input_key text,
  stored_company text, is_null boolean,
  stored_name text, stored_recipient text, stored_email text,
  pkgs bigint, items bigint, tracking bigint, history bigint
) ON COMMIT DROP;

DO $b399$
DECLARE
  v_user uuid := '${USER_ID}';
  v_org uuid := '${ORG_ID}';
  v_origin uuid;
  v_dest uuid;
  v_base jsonb;
  v_res jsonb;
BEGIN
  SELECT id INTO v_origin FROM public.zen_ports WHERE type = 'AIR' ORDER BY code LIMIT 1;
  SELECT id INTO v_dest FROM public.zen_ports WHERE type = 'AIR' ORDER BY code DESC LIMIT 1;

  v_base := jsonb_build_object(
    'order_type', 'B2B',
    'shipper_id', v_org,
    'shipper_name', 'B399 Shipper Name',
    'shipper_contact_email', 'b399-shipper@test.invalid',
    'origin_port_id', v_origin,
    'dest_port_id', v_dest,
    'recipient_name', 'Recv B399',
    'recipient_company', 'B399 Recipient Co',
    'recipient_country_code', 'US',
    'transport_mode', 'AIR',
    'packages', jsonb_build_array(jsonb_build_object(
      'packing_unit', 'BOX', 'packing_count', 1,
      'gross_weight', 5, 'special_cargo_type', 'NONE', 'content_type', 'GENERAL',
      'items', jsonb_build_array(jsonb_build_object(
        'item_name', 'Item B399', 'quantity', 1, 'unit_price', 10,
        'currency', 'USD', 'item_packing_unit', 'PCE'))
    ))
  );

  -- (a) 앞뒤 공백은 제거, 가운데 공백은 유지
  v_res := public.create_order_atomic(v_base || jsonb_build_object('shipper_company', E'  B399  Manual  Co  '), v_user, v_org);
  INSERT INTO tb399_results (case_id, order_id, input_key) VALUES ('a', (v_res->>'id')::uuid, '(앞뒤+가운데 공백)');

  -- (b1~b8) 공백만 — ASCII / TAB / LF / CR / NBSP(이스케이프) / 전각(이스케이프) / chr(160) / chr(12288)
  v_res := public.create_order_atomic(v_base || jsonb_build_object('shipper_company', E'   '), v_user, v_org);
  INSERT INTO tb399_results (case_id, order_id, input_key) VALUES ('b1', (v_res->>'id')::uuid, 'ASCII');
  v_res := public.create_order_atomic(v_base || jsonb_build_object('shipper_company', E'\\t'), v_user, v_org);
  INSERT INTO tb399_results (case_id, order_id, input_key) VALUES ('b2', (v_res->>'id')::uuid, 'TAB');
  v_res := public.create_order_atomic(v_base || jsonb_build_object('shipper_company', E'\\n'), v_user, v_org);
  INSERT INTO tb399_results (case_id, order_id, input_key) VALUES ('b3', (v_res->>'id')::uuid, 'LF');
  v_res := public.create_order_atomic(v_base || jsonb_build_object('shipper_company', E'\\r'), v_user, v_org);
  INSERT INTO tb399_results (case_id, order_id, input_key) VALUES ('b6', (v_res->>'id')::uuid, 'CR');
  v_res := public.create_order_atomic(v_base || jsonb_build_object('shipper_company', E'\\u00A0'), v_user, v_org);
  INSERT INTO tb399_results (case_id, order_id, input_key) VALUES ('b4', (v_res->>'id')::uuid, 'NBSP escape');
  v_res := public.create_order_atomic(v_base || jsonb_build_object('shipper_company', E'\\u3000'), v_user, v_org);
  INSERT INTO tb399_results (case_id, order_id, input_key) VALUES ('b5', (v_res->>'id')::uuid, 'FULLWIDTH escape');
  v_res := public.create_order_atomic(v_base || jsonb_build_object('shipper_company', chr(160)), v_user, v_org);
  INSERT INTO tb399_results (case_id, order_id, input_key) VALUES ('b7', (v_res->>'id')::uuid, 'chr(160)');
  v_res := public.create_order_atomic(v_base || jsonb_build_object('shipper_company', chr(12288)), v_user, v_org);
  INSERT INTO tb399_results (case_id, order_id, input_key) VALUES ('b8', (v_res->>'id')::uuid, 'chr(12288)');

  -- (c) 키 없음 / (d) JSON null
  v_res := public.create_order_atomic(v_base, v_user, v_org);
  INSERT INTO tb399_results (case_id, order_id, input_key) VALUES ('c', (v_res->>'id')::uuid, '(키 없음)');
  v_res := public.create_order_atomic(v_base || jsonb_build_object('shipper_company', 'null'::jsonb), v_user, v_org);
  INSERT INTO tb399_results (case_id, order_id, input_key) VALUES ('d', (v_res->>'id')::uuid, 'JSON null');
END $b399$;

UPDATE tb399_results r
SET stored_company = o.shipper_company,
    is_null = o.shipper_company IS NULL,
    stored_name = o.shipper_name,
    stored_recipient = o.recipient_company,
    stored_email = o.shipper_contact_email,
    pkgs = (SELECT count(*) FROM public.zen_order_packages p WHERE p.order_id = r.order_id),
    items = (SELECT count(*) FROM public.zen_order_items i WHERE i.order_id = r.order_id),
    tracking = (SELECT count(*) FROM public.zen_tracking_configs t WHERE t.order_id = r.order_id),
    history = (SELECT count(*) FROM public.order_status_history h WHERE h.order_id = r.order_id)
FROM public.zen_orders o
WHERE o.id = r.order_id;

SELECT jsonb_agg(jsonb_build_object(
  'case_id', case_id,
  'company', stored_company,
  'is_null', is_null,
  'name', stored_name,
  'recipient', stored_recipient,
  'email', stored_email,
  'pkgs', pkgs,
  'items', items,
  'tracking', tracking,
  'history', history
) ORDER BY case_id)::text
FROM tb399_results;

ROLLBACK;
`;
}

function cleanup(): void {
  try {
    psql(`
      DELETE FROM public.zen_order_edit_log WHERE order_id IN (SELECT id FROM public.zen_orders WHERE created_by='${USER_ID}');
      DELETE FROM public.zen_inventory_history WHERE reference_id IN (SELECT id FROM public.zen_orders WHERE created_by='${USER_ID}');
      DELETE FROM public.zen_order_items WHERE order_id IN (SELECT id FROM public.zen_orders WHERE created_by='${USER_ID}');
      DELETE FROM public.zen_order_packages WHERE order_id IN (SELECT id FROM public.zen_orders WHERE created_by='${USER_ID}');
      DELETE FROM public.zen_tracking_configs WHERE order_id IN (SELECT id FROM public.zen_orders WHERE created_by='${USER_ID}');
      DELETE FROM public.order_status_history WHERE order_id IN (SELECT id FROM public.zen_orders WHERE created_by='${USER_ID}');
      DELETE FROM public.zen_orders WHERE created_by='${USER_ID}';
      DELETE FROM public.zen_profiles WHERE id='${USER_ID}';
      DELETE FROM auth.users WHERE id='${USER_ID}';
      DELETE FROM public.zen_organizations WHERE id='${ORG_ID}';
    `);
  } catch {
    // 트랜잭션 롤백으로 이미 정리된 경우 무시(방어적 정리).
  }
}

describe('TASK-B-399 PR1 — create_order_atomic v8 실DB 값 단언 (Issue #1566)', () => {
  let rows: DbRow[] = [];
  let signature = '';
  let securityDefiner = '';
  let pronamespace = '';
  let prorettype = '';
  let proconfig = '';
  let columnNullable = '';
  let bodyHasColumn = '';

  beforeAll(() => {
    const raw = psql(fixtureSql());
    // |/개행 구분 대신 jsonb_agg 한 줄 JSON — 값에 개행이 들어가도 파싱이 깨지지 않는다.
    const parsed = JSON.parse(raw || '[]') as JsonRow[];
    rows = parsed.map((r) => ({
      caseId: r.case_id,
      storedCompany: r.company === null ? '<NULL>' : r.company,
      isNull: r.is_null === true,
      storedName: r.name,
      storedRecipient: r.recipient,
      storedEmail: r.email,
      pkgs: r.pkgs,
      items: r.items,
      tracking: r.tracking,
      history: r.history,
    }));
    const fn = `FROM pg_proc p WHERE p.proname = 'create_order_atomic' AND p.pronamespace = 'public'::regnamespace`;
    signature = psql(`SELECT p.oid::regprocedure::text ${fn};`);
    securityDefiner = psql(`SELECT p.prosecdef::text ${fn};`);
    pronamespace = psql(`SELECT p.pronamespace::regnamespace::text ${fn};`);
    prorettype = psql(`SELECT p.prorettype::regtype::text ${fn};`);
    proconfig = psql(`SELECT p.proconfig::text ${fn};`);
    columnNullable = psql(
      `SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='zen_orders' AND column_name='shipper_company';`
    );
    // 헤더 주석의 shipper_company 언급으로 참이 되는 것을 막기 위해 실제 NULLIF(BTRIM(...)) 식까지 확인.
    bodyHasColumn = psql(
      `SELECT (replace(pg_get_functiondef(p.oid), '''', '') LIKE '%NULLIF(BTRIM(p_payload->>shipper_company%')::text ${fn};`
    );
  });

  afterAll(() => cleanup());

  it('TC-B399-DB-01: 컬럼 nullable, 함수 네임스페이스·시그니처·DEFINER·반환형·search_path, 본문 반영', () => {
    expect(columnNullable).toBe('YES');
    expect(pronamespace).toBe('public');
    expect(signature).toBe('create_order_atomic(jsonb,uuid,uuid)');
    expect(securityDefiner).toBe('true');
    expect(prorettype).toBe('jsonb');
    expect(proconfig).toBe('{"search_path=public, auth"}');
    expect(bodyHasColumn).toBe('true');
  });

  it('TC-B399-DB-02: 앞뒤 공백은 제거하고 가운데 공백은 보존', () => {
    const row = rows.find((r) => r.caseId === 'a');
    expect(row).toBeTruthy();
    expect(row!.storedCompany).toBe('B399  Manual  Co');
    expect(row!.isNull).toBe(false);
  });

  it('TC-B399-DB-03: 공백만(ASCII·TAB·LF·CR·NBSP·전각·chr(160)·chr(12288))은 모두 NULL', () => {
    for (const id of ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8']) {
      const row = rows.find((r) => r.caseId === id);
      expect(row).toBeTruthy();
      expect(row!.isNull).toBe(true);
      expect(row!.storedCompany).toBe('<NULL>');
    }
  });

  it('TC-B399-DB-04: 키 없음·JSON null은 NULL', () => {
    for (const id of ['c', 'd']) {
      const row = rows.find((r) => r.caseId === id);
      expect(row).toBeTruthy();
      expect(row!.isNull).toBe(true);
      expect(row!.storedCompany).toBe('<NULL>');
    }
  });

  it('TC-B399-DB-05: 기존 컬럼 값이 위치 어긋남 없이 보존되고 부속 행이 생성', () => {
    for (const row of rows) {
      expect(row.storedName).toBe('B399 Shipper Name');
      expect(row.storedRecipient).toBe('B399 Recipient Co');
      expect(row.storedEmail).toBe('b399-shipper@test.invalid');
      expect(row.pkgs).toBe(1);
      expect(row.items).toBe(1);
      expect(row.tracking).toBe(1);
      expect(row.history).toBe(1);
    }
    expect(rows.length).toBe(11);
  });
});
