// TASK-B-399 (Issue #1566) PR1 — 정적 보조 테스트 (Jaison·Aiden 검토 반영).
// 이 파일은 파일 내용을 읽는 **정적 검사보조**이며 DB 동작을 증명하지 않는다.
// DB 동작(컬럼 생성·RPC 저장·공백 정규화·시그니처)은
// tests/integration/task-b399-shipper-company-db.test.ts의 실DB 값 단언이 근거다.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const COLUMN_MIGRATION = 'supabase/migrations/20261127090000_task_b399_shipper_company.sql';
const RPC_MIGRATION = 'supabase/migrations/20261127090100_task_b399_create_order_atomic_v8.sql';
const TYPES = 'src/types/supabase.ts';
const DS11 = 'docs/02_Analysis/ds11/Ds_11_03_Orders_Warehouse.md';

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

/** 줄·인라인·블록 주석을 제거해 헤더/인라인 주석이 DDL 단언을 통과시키는 허점을 막는다(Aiden 재검토 권고 5). */
function stripComments(sql: string): string {
  let out = '';
  let quote: string | null = null;
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === quote) {
        if (quote === "'" && sql[i + 1] === "'") {
          out += sql[i + 1];
          i += 2;
          continue;
        }
        quote = null;
      }
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i += 1;
      i += 2;
      out += ' ';
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** 괄호 깊이와 따옴표를 고려해 최상위 콤마로 분리(Aiden 필수 1-②: 목록 위치 고정). */
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  for (const ch of text) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

describe('TASK-B-399 PR1 — 정적 보조 검사(실DB 검증은 별도 테스트)', () => {
  it('TC-B399-01: 주석 제거 본문의 nullable 컬럼 정의 전체에 NOT NULL·DEFAULT가 없고 COMMENT·백필 없음', () => {
    const sql = stripComments(read(COLUMN_MIGRATION));
    const def = sql.match(/ADD COLUMN IF NOT EXISTS shipper_company text[^;]*;/i)?.[0] ?? '';
    expect(def).toBe('ADD COLUMN IF NOT EXISTS shipper_company text;');
    expect(sql.includes('COMMENT ON COLUMN public.zen_orders.shipper_company')).toBe(true);
    expect(/UPDATE\s+public\.zen_orders/i.test(sql)).toBe(false);
  });

  it('TC-B399-02: 주석 제거 본문에서 시그니처·RETURNS·SECURITY DEFINER·search_path 불변', () => {
    const body = stripComments(read(RPC_MIGRATION));
    expect(
      /CREATE OR REPLACE FUNCTION public\.create_order_atomic\(\s*p_payload jsonb,\s*p_user_id uuid,\s*p_org_id uuid\s*\)/.test(
        body
      )
    ).toBe(true);
    expect(body.includes('RETURNS jsonb')).toBe(true);
    expect(body.includes('SECURITY DEFINER')).toBe(true);
    expect(body.includes("SET search_path TO 'public', 'auth'")).toBe(true);
  });

  it('TC-B399-03: INSERT 컬럼 목록과 VALUES 목록의 개수·인덱스가 일치하고 공백 확장 정규화 적용', () => {
    const body = stripComments(read(RPC_MIGRATION));
    const block = body.match(
      /INSERT INTO public\.zen_orders \(([\s\S]*?)\) VALUES \(([\s\S]*?)\) RETURNING id INTO v_order_id;/
    );
    expect(block).toBeTruthy();
    const columns = splitTopLevel(block![1]);
    const values = splitTopLevel(block![2]);
    expect(columns.length).toBe(values.length);
    expect(columns[3]).toBe('shipper_name');
    expect(values[3]).toBe("p_payload->>'shipper_name'");
    expect(columns[4]).toBe('shipper_company');
    expect(values[4]).toBe(
      String.raw`NULLIF(BTRIM(p_payload->>'shipper_company', E' \t\n\r\u00A0\u3000'), '')`
    );
    // 단순 p_payload 참조는 항상 같은 인덱스의 컬럼에 들어가야 한다(위치 어긋남 방지).
    for (let i = 0; i < values.length; i += 1) {
      const direct = values[i].match(/^p_payload->>'([a-z_]+)'$/);
      if (direct) expect(columns[i]).toBe(direct[1]);
    }
    const recipientIdx = columns.indexOf('recipient_company');
    expect(recipientIdx).toBeGreaterThan(-1);
    expect(values[recipientIdx]).toBe("p_payload->>'recipient_company'");
  });

  it('TC-B399-04: v8 롤백 주석 + 컬럼 롤백 3단계(앱 → v7 복구 → DROP COLUMN) 순서를 명시', () => {
    const rpcSql = read(RPC_MIGRATION);
    expect(rpcSql.includes('-- ROLLBACK')).toBe(true);
    expect(rpcSql.includes('20261113090100_task_b346_create_order_atomic_v7.sql')).toBe(true);
    expect(rpcSql.includes('컬럼 잔존')).toBe(true);
    const columnSql = read(COLUMN_MIGRATION);
    const app = columnSql.indexOf('1) 앱을 이전 버전으로 되돌린다');
    const v7 = columnSql.indexOf('2) create_order_atomic v8 → v7 복구');
    const drop = columnSql.indexOf(
      '3) ALTER TABLE public.zen_orders DROP COLUMN IF EXISTS shipper_company;'
    );
    // 문구가 지워져 -1이 되면 통과하는 거짓 양성 방지: 각 단계 존재를 먼저 확인.
    expect(app).toBeGreaterThan(-1);
    expect(v7).toBeGreaterThan(-1);
    expect(drop).toBeGreaterThan(-1);
    expect(app).toBeLessThan(v7);
    expect(v7).toBeLessThan(drop);
  });

  it('TC-B399-05: Row는 필수·Insert/Update는 선택적 shipper_company를 각각 1건씩 보유', () => {
    const types = read(TYPES);
    const start = types.indexOf('      zen_orders: {');
    expect(start).toBeGreaterThan(-1);
    const end = types.indexOf('        Relationships: [', start);
    const block = types.slice(start, end);
    const row = block.slice(block.indexOf('Row: {'), block.indexOf('Insert: {'));
    const insert = block.slice(block.indexOf('Insert: {'), block.indexOf('Update: {'));
    const update = block.slice(block.indexOf('Update: {'));
    expect((row.match(/^\s+shipper_company: string \| null$/gm) ?? []).length).toBe(1);
    expect((row.match(/^\s+shipper_company\?: string \| null$/gm) ?? []).length).toBe(0);
    expect((insert.match(/^\s+shipper_company\?: string \| null$/gm) ?? []).length).toBe(1);
    expect((update.match(/^\s+shipper_company\?: string \| null$/gm) ?? []).length).toBe(1);
  });

  it('TC-B399-06: Ds-11에 PR1 현행/PR2 적용 시 구분·구조 방어 이관·v8 경로가 기재', () => {
    const ds11 = read(DS11);
    expect(ds11.includes('zen_orders.shipper_company')).toBe(true);
    expect(ds11.includes('shipper_company_mode')).toBe(true);
    expect(ds11.includes('create_order_atomic` v8')).toBe(true);
    expect(ds11.includes('PR1 현행')).toBe(true);
    expect(ds11.includes('PR2 적용 시')).toBe(true);
    expect(ds11.includes('구조 방어(공백·길이) 이관')).toBe(true);
    expect(ds11.includes('**PR1 현행**: 환경변수 `SHXK_SHIPPER_COMPANY` 주입')).toBe(true);
  });
});
