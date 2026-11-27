// TASK-B-399 (Issue #1566) PR1 — 발송인 회사명 컬럼·create_order_atomic v8 정적 회귀 (R-09).
// 값 단언만 사용(doc 문자열 toContain 단독 단언 금지). 구현 전 이 테스트가 실패함을 확인한 뒤 작성했다.
// 실DB 호출 검증은 PR3 로컬 Supabase 실호출 1회에서 수행한다(R-14).
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

function has(text: string, needle: string): boolean {
  return text.includes(needle);
}

describe('TASK-B-399 PR1 — shipper_company 마이그레이션·RPC v8·타입·Ds-11', () => {
  it('TC-B399-01: nullable 컬럼 추가 + COMMENT, 백필/DEFAULT 없음', () => {
    const sql = read(COLUMN_MIGRATION);
    expect(has(sql, 'ADD COLUMN IF NOT EXISTS shipper_company text')).toBe(true);
    expect(has(sql, 'COMMENT ON COLUMN public.zen_orders.shipper_company')).toBe(true);
    expect(/ADD COLUMN[^;]*shipper_company[^;]*DEFAULT/i.test(sql)).toBe(false);
    expect(/UPDATE\s+public\.zen_orders/i.test(sql)).toBe(false);
  });

  it('TC-B399-02: v8 함수 시그니처 불변 — p_payload jsonb / p_user_id uuid / p_org_id uuid', () => {
    const sql = read(RPC_MIGRATION);
    expect(has(sql, 'CREATE OR REPLACE FUNCTION public.create_order_atomic(')).toBe(true);
    expect(/p_payload jsonb,\s*p_user_id uuid,\s*p_org_id uuid\s*\)/.test(sql)).toBe(true);
    expect(has(sql, 'RETURNS jsonb')).toBe(true);
    expect(has(sql, 'SECURITY DEFINER')).toBe(true);
  });

  it('TC-B399-03: RPC가 shipper_company를 저장하고 공백은 NULL로 정규화', () => {
    const sql = read(RPC_MIGRATION);
    expect(has(sql, "    shipper_company,\n")).toBe(true);
    expect(has(sql, "NULLIF(BTRIM(p_payload->>'shipper_company'), '')")).toBe(true);
    expect(has(sql, 'p_payload->>\'recipient_company\'')).toBe(true);
  });

  it('TC-B399-04: v8 롤백 지시가 v7 복구·컬럼 잔존을 명시', () => {
    const sql = read(RPC_MIGRATION);
    expect(has(sql, '-- ROLLBACK')).toBe(true);
    expect(has(sql, '20261113090100_task_b346_create_order_atomic_v7.sql')).toBe(true);
    expect(has(sql, '컬럼 잔존')).toBe(true);
  });

  it('TC-B399-05: 생성 타입 Row·Insert·Update에 shipper_company가 각각 1건씩 존재', () => {
    const types = read(TYPES);
    const start = types.indexOf('      zen_orders: {');
    expect(start).toBeGreaterThan(-1);
    const end = types.indexOf('        Relationships: [', start);
    const block = types.slice(start, end);
    const matches = block.match(/^\s+shipper_company\??: string \| null$/gm) ?? [];
    expect(matches.length).toBe(3);
  });

  it('TC-B399-06: Ds-11에 신규 컬럼·모드 전달·v8 저장 경로가 기재', () => {
    const ds11 = read(DS11);
    expect(has(ds11, 'zen_orders.shipper_company')).toBe(true);
    expect(has(ds11, 'shipper_company_mode')).toBe(true);
    expect(has(ds11, 'create_order_atomic` v8')).toBe(true);
    expect(has(ds11, '환경변수 `SHXK_SHIPPER_COMPANY`에서 주입')).toBe(false);
  });
});
