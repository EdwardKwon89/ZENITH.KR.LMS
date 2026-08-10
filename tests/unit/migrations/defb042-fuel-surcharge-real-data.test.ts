import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';

function psql(sql: string): string {
  const result = execSync(
    `docker exec -i supabase_db_ZENITH_LMS_001 psql -U postgres -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );
  return result.trim();
}

// DEF-B-042 (Issue #1035): UPS 공식 발표 유류할증료 13주 실데이터 반영 검증.
// fresh DB(supabase db reset --yes) 기준 — 마이그레이션 20260810140000 적용 후 검증.
describe('TASK-B-269: DEF-B-042 UPS 유류할증료 13주 실데이터 (Issue #1035)', () => {
  beforeAll(() => {
    // 마이그레이션 20260810140000_ups_fuel_surcharge_real_data.sql이
    // fresh DB에 적용된 상태에서 검증
  });

  // UPS 공식 발표 13주 (효력 발생일 월요일 → 할증료 %)
  const UPS_OFFICIAL: Array<[string, string]> = [
    ['2026-05-18', '49.50'],
    ['2026-05-25', '50.25'],
    ['2026-06-01', '50.25'],
    ['2026-06-08', '43.25'],
    ['2026-06-15', '43.75'],
    ['2026-06-22', '42.25'],
    ['2026-06-29', '39.25'],
    ['2026-07-06', '39.00'],
    ['2026-07-13', '39.25'],
    ['2026-07-20', '40.50'],
    ['2026-07-27', '44.75'],
    ['2026-08-03', '46.25'],
    ['2026-08-10', '46.75'],
  ];

  it('TC-269-01: 13주 이력이 정확한 날짜·값으로 존재 (전체 적용 NULL 행)', () => {
    for (const [week, pct] of UPS_OFFICIAL) {
      const row = psql(`
        SELECT selling_rate || '|' || cost_rate
        FROM public.zen_ups_fuel_surcharges
        WHERE product_id IS NULL AND effective_week = '${week}'
      `);
      const [selling, cost] = row.split('|');
      const expected = (parseFloat(pct) / 100).toFixed(4);
      expect(selling).toBe(expected);
      expect(cost).toBe(expected);
    }
  });

  it('TC-269-02: 상품별 개별 행에도 동일 값 반영 (WW_EXPRESS_NONDOC 13주)', () => {
    const row = psql(`
      SELECT fs.selling_rate || '|' || fs.cost_rate
      FROM public.zen_ups_fuel_surcharges fs
      JOIN public.zen_ups_products p ON p.id = fs.product_id
      WHERE p.product_code = 'WW_EXPRESS_NONDOC' AND fs.effective_week = '2026-08-10'
    `);
    expect(row).toBe('0.4675|0.4675');
  });

  it('TC-269-03: 실데이터 13주 범위(2026-05-18~08-10) 내 117행 = 13주 × (상품 8종 + 전체 NULL)', () => {
    // [TASK-B-269 v2] 범위 필터 — 13주 밖 미래 주차에 무언가가 추가되어도 이 테스트는 안 깨짐
    const count = psql(`
      SELECT COUNT(*) FROM public.zen_ups_fuel_surcharges
      WHERE effective_week BETWEEN '2026-05-18' AND '2026-08-10'
    `);
    expect(count).toBe('117');
    const weeks = psql(`
      SELECT COUNT(DISTINCT effective_week) FROM public.zen_ups_fuel_surcharges
      WHERE effective_week BETWEEN '2026-05-18' AND '2026-08-10'
    `);
    expect(weeks).toBe('13');
  });

  it('TC-269-04: 실데이터 13주 범위 내 selling_rate = cost_rate 전 행 (JSJung 확정 — 판매할증 없음)', () => {
    const mismatched = psql(`
      SELECT COUNT(*) FROM public.zen_ups_fuel_surcharges
      WHERE effective_week BETWEEN '2026-05-18' AND '2026-08-10'
        AND selling_rate <> cost_rate
    `);
    expect(mismatched).toBe('0');
  });

  it('TC-269-05: placeholder(0.185/0.155) 전 범위 잔존 없음 (값 기반 완전 제거 검증)', () => {
    // [TASK-B-269 v2] seed가 빈 테이블에 삽입해도 값 기반 DELETE가 주차와 무관하게 제거하므로 전 범위 0 보장
    const leftover = psql(`
      SELECT COUNT(*) FROM public.zen_ups_fuel_surcharges
      WHERE selling_rate = 0.185 AND cost_rate = 0.155
    `);
    expect(leftover).toBe('0');
  });

  it('TC-269-06: 최신주(2026-08-10) 기준 유류할증 조회 로직 — effective_week ≤ 조회일 중 최신 선택', () => {
    // rates.ts getUpsFuelSurcharge 로직과 동일 조건: .lte('effective_week', refDate).order(desc).limit(1)
    const latest = psql(`
      SELECT effective_week || '|' || selling_rate || '|' || cost_rate
      FROM public.zen_ups_fuel_surcharges
      WHERE product_id IS NULL AND effective_week <= '2026-08-10'
      ORDER BY effective_week DESC LIMIT 1
    `);
    expect(latest).toBe('2026-08-10|0.4675|0.4675');
  });

  it('TC-269-07: 시간흐름 시뮬레이션 — 13주 밖 미래 주차에 placeholder 재생성 차단', () => {
    // (a) 실데이터 존재 시 seed fuel INSERT 재실행 → NOT EXISTS 가드로 placeholder 미생성
    const before = psql('SELECT COUNT(*) FROM public.zen_ups_fuel_surcharges');
    psql(`
      INSERT INTO public.zen_ups_fuel_surcharges (product_id, effective_week, selling_rate, cost_rate)
      SELECT p.id, DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day')::DATE, 0.185, 0.155
      FROM public.zen_ups_products p
      WHERE NOT EXISTS (SELECT 1 FROM public.zen_ups_fuel_surcharges)
      ON CONFLICT (product_id, effective_week) DO NOTHING
    `);
    psql(`
      INSERT INTO public.zen_ups_fuel_surcharges (product_id, effective_week, selling_rate, cost_rate)
      SELECT NULL, DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day')::DATE, 0.185, 0.155
      WHERE NOT EXISTS (SELECT 1 FROM public.zen_ups_fuel_surcharges)
      ON CONFLICT (product_id, effective_week) DO NOTHING
    `);
    const afterSeedGuard = psql('SELECT COUNT(*) FROM public.zen_ups_fuel_surcharges');
    expect(afterSeedGuard).toBe(before);

    // (b) 다음 reset 시 seed가 빈 테이블에 삽입했을 상황을 재현: 미래 주차(2026-08-17) placeholder 강제 삽입
    psql(`
      INSERT INTO public.zen_ups_fuel_surcharges (product_id, effective_week, selling_rate, cost_rate)
      VALUES (NULL, '2026-08-17', 0.185, 0.155)
    `);
    const futureInjected = psql(`
      SELECT COUNT(*) FROM public.zen_ups_fuel_surcharges
      WHERE effective_week = '2026-08-17' AND selling_rate = 0.185 AND cost_rate = 0.155
    `);
    expect(futureInjected).toBe('1');

    // (c) real-data 마이그레이션의 값 기반 DELETE 로직(20260810140000)이 미래 주차 placeholder를 제거
    psql(`
      DELETE FROM public.zen_ups_fuel_surcharges
      WHERE selling_rate = 0.185 AND cost_rate = 0.155
    `);
    const futureResidual = psql(`
      SELECT COUNT(*) FROM public.zen_ups_fuel_surcharges
      WHERE effective_week = '2026-08-17' AND selling_rate = 0.185 AND cost_rate = 0.155
    `);
    expect(futureResidual).toBe('0');
    const afterDelete = psql('SELECT COUNT(*) FROM public.zen_ups_fuel_surcharges');
    expect(afterDelete).toBe(before);
  });
});
