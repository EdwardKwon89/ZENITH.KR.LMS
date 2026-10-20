import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasActiveUpsLabel } from '@/lib/orders/ups-registration';

// TASK-B-339 (Issue #1254): UPS 등록 사실(활성 라벨 행) 조회.
//   mock은 입력에 무관하게 항상 같은 값을 주면 안 된다 — eq()에 전달된 인자를 캡처해 실제 비교한다.
//   (인자를 무시하는 mock은 "어떤 orderId가 와도 true"가 되어 가드가 무력화되는 위양성 테스트가 된다)

const ORDER_ID = '33900000-0000-4000-8000-000000000010';

function createCapturingSupabase(result: { data: unknown; error?: { message: string } | null }) {
  const calls: { table: string; args: Array<[string, unknown]> }[] = [];
  let current: { table: string; args: Array<[string, unknown]> } | null = null;

  const builder: any = {
    select: (columns?: string) => {
      current!.args.push(['select', columns]);
      return builder;
    },
    eq: (column: string, value: unknown) => {
      current!.args.push(['eq', [column, value]]);
      return builder;
    },
    limit: (count: number) => {
      current!.args.push(['limit', count]);
      return builder;
    },
    maybeSingle: async () => ({ data: result.data, error: result.error ?? null }),
  };

  return {
    calls,
    supabase: {
      from: (table: string) => {
        current = { table, args: [] };
        calls.push(current);
        return builder;
      },
    },
  };
}

describe('TASK-B-339: hasActiveUpsLabel (Issue #1254)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-LBL-01: 활성 라벨 행이 있으면 true', async () => {
    const { supabase } = createCapturingSupabase({ data: { id: 'label-1' } });
    await expect(hasActiveUpsLabel(supabase, ORDER_ID)).resolves.toBe(true);
  });

  it('TC-LBL-02: 행이 없으면 false (maybeSingle이 null 반환)', async () => {
    const { supabase } = createCapturingSupabase({ data: null });
    await expect(hasActiveUpsLabel(supabase, ORDER_ID)).resolves.toBe(false);
  });

  it('TC-LBL-03: DB error가 있으면 false로 취급하지 않고 throw', async () => {
    const { supabase } = createCapturingSupabase({
      data: null,
      error: { message: 'permission denied for table zen_ups_labels' },
    });
    await expect(hasActiveUpsLabel(supabase, ORDER_ID)).rejects.toThrow(/zen_ups_labels/);
  });

  it('TC-LBL-04: 실제 비교 — zen_ups_labels 테이블 + order_id + is_voided=false + limit(1)로 조회', async () => {
    const { supabase, calls } = createCapturingSupabase({ data: null });
    await hasActiveUpsLabel(supabase, ORDER_ID);

    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('zen_ups_labels');

    const eqPairs = calls[0].args.filter(([method]) => method === 'eq').map(([, value]) => value);
    expect(eqPairs).toContainEqual(['order_id', ORDER_ID]);
    expect(eqPairs).toContainEqual(['is_voided', false]);
    expect(calls[0].args).toContainEqual(['limit', 1]);
  });

  it('TC-LBL-05: mock이 인자를 캡처하는지 검증 — 다른 orderId는 다른 인자로 조회된다 (인자 무시 mock 금지)', async () => {
    const { supabase, calls } = createCapturingSupabase({ data: { id: 'label-1' } });
    await hasActiveUpsLabel(supabase, 'another-order-id');

    const orderEq = calls[0].args.find(([method, value]) => method === 'eq' && (value as any[])[0] === 'order_id');
    expect(orderEq).toBeDefined();
    expect((orderEq![1] as any[])[1]).toBe('another-order-id');
  });

  it('TC-LBL-06: voided 라벨만 있는 경우(= 등록취소됨) is_voided=false 조건으로 잡히지 않음을 조건으로 검증', async () => {
    const { supabase, calls } = createCapturingSupabase({ data: null });
    await hasActiveUpsLabel(supabase, ORDER_ID);

    const isVoidedEq = calls[0].args.find(
      ([method, value]) => method === 'eq' && (value as any[])[0] === 'is_voided'
    );
    expect(isVoidedEq).toBeDefined();
    expect((isVoidedEq![1] as any[])[1]).toBe(false);
  });
});
