// TASK-B-360 ⒝-2 (Issue #1366) — Excel 출력 데이터 로더 단위 검증
// PR #1411 수정 요청 대응:
//  🔴1 부동소수 `===` 오탐 → 정수 분(1/100) 단위 비교
//  🟠3 조회 실패 조용한 삼킴 → 500 전파 / order 임베드 null → 500 / PostgREST 1,000행 잘림 → 페이징+상한 500
//
// 원칙: **실제 `loadStatementExport` 함수를 호출**하고 DB만 모의. 소스 문자열 toContain 단언 금지.
import { describe, it, expect, vi } from 'vitest';

type Result = { data: any; error: any };

/** Supabase 쿼리 체인 모의 — `.range(from,to)`의 from을 기록해 페이징을 재현한다 */
function makeSupabase(handlers: Record<string, (from: number) => Result>) {
  const state = { from: 0 };
  return {
    from: vi.fn((table: string) => {
      const handle = handlers[table] ?? (() => ({ data: null, error: null }));
      const chain: any = {};
      for (const m of ['select', 'in', 'eq', 'order', 'maybeSingle']) {
        chain[m] = vi.fn(() => chain);
      }
      chain.range = vi.fn((from: number) => {
        state.from = from;
        return chain;
      });
      chain.then = (resolve: any, reject: any) =>
        Promise.resolve(handle(state.from)).then(resolve, reject);
      return chain;
    }),
  };
}

const HEADER = {
  id: 'stmt-1',
  statement_no: 'ST-202611-01-0001',
  tier: 'AGENCY_TO_SHIPPER',
  status: 'ISSUED',
  period_year: 2026,
  period_month: 11,
  round_no: 1,
  period_from: '2026-11-01',
  period_to: '2026-11-30',
  total_amount: 30.3,
  issued_at: '2026-11-30T00:00:00+09:00',
  paid_date: null,
  paid_amount: null,
  billed_party_type: 'ORG',
  billed_name: null,
  billed_biz_no: null,
  issuer: { name: '발행대리점', biz_no: '111', rep_name: null, address: null, address_detail: null, contact_name: null, contact_phone: null },
  billed: { name: '청구화주', biz_no: '222' },
};

function itemRow(id: string, base: number, fuel: number, weight: number, withOrder = true): any {
  return {
    order_id: id,
    charge_weight_kg: weight,
    base_freight: base,
    fuel_surcharge: fuel,
    surge_fee: 0,
    other_charges: 0,
    line_total: Math.round((base + fuel) * 100) / 100,
    order: withOrder
      ? {
          order_no: `ZEN-DEC-${id}`,
          recipient_name: '수하인',
          recipient_country_code: 'US',
          shipper_name: null,
          shipper: { name: '화주org' },
        }
      : null,
  };
}

const HANDLERS_BASE: Record<string, (from: number) => Result> = {
  zen_billing_statements: () => ({ data: HEADER, error: null }),
  zen_billing_statement_items: () => ({ data: [itemRow('a', 10.1, 0, 0.1), itemRow('b', 0, 20.2, 0.2)], error: null }),
  zen_ups_labels: () => ({ data: [], error: null }),
  order_status_history: () => ({
    data: [
      { order_id: 'a', next_status: 'DELIVERED', created_at: '2026-11-10T00:00:00Z' },
      { order_id: 'b', next_status: 'DELIVERED', created_at: '2026-11-10T00:00:00Z' },
    ],
    error: null,
  }),
};

const withHandler = (table: string, fn: (from: number) => Result) => ({
  ...HANDLERS_BASE,
  [table]: fn,
});

describe('소수 금액 합산 (PR #1411 🔴1) — 정수 분 단위', () => {
  it('10.10+20.20 두 줄(합 30.30)은 부동소수 노이즈와 무관하게 헤더와 일치한다', async () => {
    const { loadStatementExport } = await import('@/lib/finance/billing/statement-excel-data');
    const res = await loadStatementExport(makeSupabase(HANDLERS_BASE), 'stmt-1');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // 10.10 + 20.20 = 30.299999999999997 — float 비교였다면 헤더 30.30과 어긋나 500이 된다
    expect(res.data.totals.lineTotal).toBe(30.3);
    expect(res.data.totals.chargeWeightKg).toBe(0.3); // 0.1 + 0.2 = 0.30000000000000004
    expect(res.data.totals.baseFreight).toBe(10.1);
    expect(res.data.totals.fuelSurcharge).toBe(20.2);
  });

  it('헤더가 0.01이라도 어긋면 TOTAL_MISMATCH (분 단위 정밀도 유지)', async () => {
    const { loadStatementExport } = await import('@/lib/finance/billing/statement-excel-data');
    const sb = makeSupabase({
      ...HANDLERS_BASE,
      zen_billing_statements: () => ({ data: { ...HEADER, total_amount: 30.31 }, error: null }),
    });
    const res = await loadStatementExport(sb, 'stmt-1');
    expect(res).toMatchObject({ ok: false, status: 500, reason: 'TOTAL_MISMATCH' });
  });
});

describe('조회 실패의 조용한 삼킴 차단 (PR #1411 🟠3)', () => {
  it('운송장 조회 오류 → 500 LABELS_LOOKUP (빈 Map으로 위장하지 않는다)', async () => {
    const { loadStatementExport } = await import('@/lib/finance/billing/statement-excel-data');
    const sb = makeSupabase(withHandler('zen_ups_labels', () => ({ data: null, error: { message: 'boom' } })));
    const res = await loadStatementExport(sb, 'stmt-1');
    expect(res).toMatchObject({ ok: false, status: 500, reason: 'LABELS_LOOKUP' });
  });

  it('기준일 이력 조회 오류 → 500 HISTORY_LOOKUP', async () => {
    const { loadStatementExport } = await import('@/lib/finance/billing/statement-excel-data');
    const sb = makeSupabase(withHandler('order_status_history', () => ({ data: null, error: { message: 'boom' } })));
    const res = await loadStatementExport(sb, 'stmt-1');
    expect(res).toMatchObject({ ok: false, status: 500, reason: 'HISTORY_LOOKUP' });
  });

  it('order 임베드가 null이면 500 ORDER_EMBED_NULL (빈 칸 행 금지)', async () => {
    const { loadStatementExport } = await import('@/lib/finance/billing/statement-excel-data');
    const sb = makeSupabase(
      withHandler('zen_billing_statement_items', () => ({
        data: [itemRow('a', 10.1, 20.2, 0.1, false)],
        error: null,
      })),
    );
    const res = await loadStatementExport(sb, 'stmt-1');
    expect(res).toMatchObject({ ok: false, status: 500, reason: 'ORDER_EMBED_NULL' });
  });

  it('항목 조회 오류도 500 ITEMS_LOOKUP', async () => {
    const { loadStatementExport } = await import('@/lib/finance/billing/statement-excel-data');
    const sb = makeSupabase(
      withHandler('zen_billing_statement_items', () => ({ data: null, error: { message: 'boom' } })),
    );
    const res = await loadStatementExport(sb, 'stmt-1');
    expect(res).toMatchObject({ ok: false, status: 500, reason: 'ITEMS_LOOKUP' });
  });
});

describe('PostgREST 1,000행 잘림 방지 (PR #1411 🟠3 페이징·상한)', () => {
  it('페이지가 계속 full이면 상한(10,000행)에서 500 LABELS_LIMIT으로 실패한다', async () => {
    const { loadStatementExport } = await import('@/lib/finance/billing/statement-excel-data');
    const rows = Array.from({ length: 500 }, (_, i) => ({ order_id: `o${i}`, tracking_number: `1Z${i}` }));
    const sb = makeSupabase(withHandler('zen_ups_labels', () => ({ data: rows, error: null })));
    const res = await loadStatementExport(sb, 'stmt-1');
    expect(res).toMatchObject({ ok: false, status: 500, reason: 'LABELS_LOOKUP_LIMIT' });
  });

  it('페이지가 상한 전에 끝나면 여러 페이지를 이어 받아 정상 완료한다', async () => {
    const { loadStatementExport } = await import('@/lib/finance/billing/statement-excel-data');
    const page = (from: number): Result => ({
      data: Array.from({ length: from === 0 ? 500 : 3 }, (_, i) => ({
        order_id: `o${from + i}`,
        tracking_number: `1Z${from + i}`,
      })),
      error: null,
    });
    const sb = makeSupabase(withHandler('zen_ups_labels', page));
    const res = await loadStatementExport(sb, 'stmt-1');
    expect(res.ok).toBe(true); // 500(1페이지) + 3(2페이지) = 503행 수집 후 종료
  });
});

describe('TASK-B-402 (B-377): 조정·부가운임 필드의 매핑과 행합 정합 (설계 §5 — 저장값 사용·역산 금지)', () => {
  it('행의 구성요소 합(base+fuel+surge+other+부가합+조정)이 line_total과 일치하고 totals에도 반영된다', async () => {
    const rows = [
      {
        ...itemRow('a', 10, 20, 0.1),
        freight_adjustment: -1.5,
        charge_details: [{ line_no: 1, name: '긴급할증', amount: 1.5, currency: 'KRW' }],
        line_total: 30, // 10 + 20 + 0 + 0 + 1.5(부가합) + (-1.5)(조정)
      },
      {
        ...itemRow('b', 0, 0, 0.2),
        freight_adjustment: 0,
        charge_details: [],
        line_total: 0,
      },
    ];
    const sb = makeSupabase({
      ...HANDLERS_BASE,
      zen_billing_statement_items: () => ({ data: rows, error: null }),
      zen_billing_statements: () => ({ data: { ...HEADER, total_amount: 30 }, error: null }),
    });
    const { loadStatementExport } = await import('@/lib/finance/billing/statement-excel-data');
    const res = await loadStatementExport(sb, 'stmt-1');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const [r0, r1] = res.data.rows;
    expect(r0.freightAdjustment).toBe(-1.5);
    expect(r0.additionalCharges).toBe(1.5); // Σ charge_details
    expect(r0.chargeDetails).toHaveLength(1);
    expect(r0.chargeDetails[0].name).toBe('긴급할증');
    expect(r1.freightAdjustment).toBe(0);
    expect(r1.additionalCharges).toBe(0);

    // 행합 = line_total (표시 구성요소의 합이 저장 합계와 일치 — 역산하지 않는 근거)
    const sum = Math.round((r0.baseFreight + r0.fuelSurcharge + r0.surgeFee + r0.otherCharges + r0.additionalCharges + r0.freightAdjustment) * 100) / 100;
    expect(sum).toBe(r0.lineTotal);

    expect(res.data.totals.additionalCharges).toBe(1.5);
    expect(res.data.totals.freightAdjustment).toBe(-1.5);
    // §1-1 검증 유지: 항목 line_total 합 = 헤더 total_amount
    expect(res.data.totals.lineTotal).toBe(30);
  });
});
