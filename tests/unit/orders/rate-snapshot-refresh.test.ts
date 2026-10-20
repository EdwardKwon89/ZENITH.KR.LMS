import { describe, it, expect, vi, beforeEach } from 'vitest';
import { refreshUpsRateSnapshot } from '@/lib/orders/rate-snapshot-refresh';

// TASK-B-339 (Issue #1254 / 결함 ③): UPS 오더 수정 후 운임 스냅샷 갱신.
//   zen_order_rate_snapshots에는 unique_order_snapshot(order_id) 유일 인덱스가 있어
//   insert만 하면 실패하므로 update-or-insert가 필수다.

const ORDER_ID = '33900000-0000-4000-8000-000000000020';

const FULL_ORDER = {
  id: ORDER_ID,
  shipper_id: 'org-shipper',
  agency_org_id: 'org-agency',
  recipient_country_code: 'US',
  recipient_state_province: 'CA',
  dest_port_id: null,
  ups_product_code: 'WW_EXPEDITED',
  incoterms: 'DDP',
};

function ok(data: unknown) {
  return Promise.resolve({ data, error: null });
}

/**
 * 테이블별 결과를 주입하는 supabase mock.
 * `.update()/.insert()` 호출은 `writes`에 기록해 실제 비교한다.
 */
function createSupabaseMock(tables: Record<string, any>) {
  const writes: Array<{ method: string; table: string; payload: any; filters: Array<[string, unknown]> }> = [];

  function builderFor(table: string) {
    const filters: Array<[string, unknown]> = [];
    let pending: { method: string; payload: any } | null = null;
    const result = tables[table];

    const resolve = () => {
      if (Array.isArray(result)) return ok(result);
      return ok(result ?? null);
    };

    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => resolve(),
      update: (payload: any) => {
        pending = { method: 'update', payload };
        writes.push({ method: 'update', table, payload, filters });
        return builder;
      },
      insert: (payload: any) => {
        writes.push({ method: 'insert', table, payload, filters });
        return Promise.resolve({ data: null, error: null });
      },
      then: (resolveFn: any, rejectFn?: any) => resolve().then(resolveFn, rejectFn),
    };
    return builder;
  }

  return {
    writes,
    supabase: { from: (table: string) => builderFor(table) },
  };
}

const ESTIMATE = {
  platform: { totalSellingPrice: 123.45, currency: 'USD' },
  carrier: { totalCost: 100 },
};

describe('TASK-B-339: refreshUpsRateSnapshot (Issue #1254)', () => {
  let estimateFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    estimateFn = vi.fn().mockResolvedValue(ESTIMATE);
  });

  it('TC-SNAP-01: 기존 스냅샷이 있으면 update (insert 0회) — 유일 인덱스 우회', async () => {
    const { supabase, writes } = createSupabaseMock({
      zen_orders: FULL_ORDER,
      zen_order_packages: [{ length: 30, width: 20, height: 10, gross_weight: 12.5 }],
      zen_ups_products: { id: 'product-1' },
      zen_order_rate_snapshots: { id: 'snap-1', is_manual: false },
    });

    await refreshUpsRateSnapshot({ supabase, orderId: ORDER_ID, estimateFn });

    const snapshotWrites = writes.filter((w) => w.table === 'zen_order_rate_snapshots');
    expect(snapshotWrites).toHaveLength(1);
    expect(snapshotWrites[0].method).toBe('update');
    expect(snapshotWrites[0].payload.applied_unit_price).toBe(123.45);
    expect(snapshotWrites[0].payload.applied_currency).toBe('USD');
    expect(snapshotWrites[0].payload.applied_rule).toBe('UPS_3TIER');
  });

  it('TC-SNAP-02: 기존 스냅샷이 없으면 insert (update 0회)', async () => {
    const { supabase, writes } = createSupabaseMock({
      zen_orders: FULL_ORDER,
      zen_order_packages: [{ length: 30, width: 20, height: 10, gross_weight: 12.5 }],
      zen_ups_products: { id: 'product-1' },
      zen_order_rate_snapshots: null,
    });

    await refreshUpsRateSnapshot({ supabase, orderId: ORDER_ID, estimateFn });

    const snapshotWrites = writes.filter((w) => w.table === 'zen_order_rate_snapshots');
    expect(snapshotWrites).toHaveLength(1);
    expect(snapshotWrites[0].method).toBe('insert');
    expect(snapshotWrites[0].payload.order_id).toBe(ORDER_ID);
  });

  it('TC-SNAP-03: is_manual=true(관리자 수동 확정)면 update·insert 0회 + warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { supabase, writes } = createSupabaseMock({
      zen_orders: FULL_ORDER,
      zen_order_packages: [{ length: 30, width: 20, height: 10, gross_weight: 12.5 }],
      zen_ups_products: { id: 'product-1' },
      zen_order_rate_snapshots: { id: 'snap-manual', is_manual: true },
    });

    await refreshUpsRateSnapshot({ supabase, orderId: ORDER_ID, estimateFn });

    expect(writes.filter((w) => w.table === 'zen_order_rate_snapshots')).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it.each([
    ['중량 0(패키지 없음)', { zen_order_packages: [] }],
    [
      '상품 코드 없음',
      {
        zen_orders: { ...FULL_ORDER, ups_product_code: null },
        zen_order_packages: [{ length: 30, width: 20, height: 10, gross_weight: 12.5 }],
      },
    ],
    [
      '목적지 국가 없음',
      {
        zen_orders: { ...FULL_ORDER, recipient_country_code: null, dest_port_id: null },
        zen_order_packages: [{ length: 30, width: 20, height: 10, gross_weight: 12.5 }],
      },
    ],
  ])('TC-SNAP-04: 계산 불가(%s) → 스냅샷 불변 + warn + 추정 함수 미호출', async (_label, tables) => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { supabase, writes } = createSupabaseMock({
      zen_orders: FULL_ORDER,
      zen_order_packages: [{ length: 30, width: 20, height: 10, gross_weight: 12.5 }],
      zen_ups_products: { id: 'product-1' },
      zen_order_rate_snapshots: null,
      ...tables,
    });

    await refreshUpsRateSnapshot({ supabase, orderId: ORDER_ID, estimateFn });

    expect(writes.filter((w) => w.table === 'zen_order_rate_snapshots')).toHaveLength(0);
    expect(estimateFn).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('TC-SNAP-05: 추정 함수가 throw하면 전파한다 — 호출자가 잡도록 (스냅샷 불변)', async () => {
    const { supabase, writes } = createSupabaseMock({
      zen_orders: FULL_ORDER,
      zen_order_packages: [{ length: 30, width: 20, height: 10, gross_weight: 12.5 }],
      zen_ups_products: { id: 'product-1' },
      zen_order_rate_snapshots: { id: 'snap-1', is_manual: false },
    });
    estimateFn.mockRejectedValue(new Error('zone not found'));

    await expect(
      refreshUpsRateSnapshot({ supabase, orderId: ORDER_ID, estimateFn })
    ).rejects.toThrow('zone not found');

    expect(writes.filter((w) => w.table === 'zen_order_rate_snapshots')).toHaveLength(0);
  });

  it('TC-SNAP-06: 추정 함수에 DB값(중량 합계·첫 패키지 치수·국가·상품·인코텀즈·화주·대리점)을 전달한다', async () => {
    const { supabase } = createSupabaseMock({
      zen_orders: FULL_ORDER,
      zen_order_packages: [
        { length: 30, width: 20, height: 10, gross_weight: '12.5' },
        { length: 40, width: 30, height: 20, gross_weight: '7.5' },
      ],
      zen_ups_products: { id: 'product-1' },
      zen_order_rate_snapshots: null,
    });

    await refreshUpsRateSnapshot({ supabase, orderId: ORDER_ID, estimateFn });

    expect(estimateFn).toHaveBeenCalledWith({
      productId: 'product-1',
      destCountryCode: 'US',
      actualWeightKg: 20,
      dimL: 30,
      dimW: 20,
      dimH: 10,
      incoterms: 'DDP',
      agencyOrgId: 'org-agency',
      shipperOrgId: 'org-shipper',
      destStateProvince: 'CA',
    });
  });

  it('TC-SNAP-07: recipient_country_code가 없으면 dest_port의 country_code로 대체한다', async () => {
    const { supabase } = createSupabaseMock({
      zen_orders: { ...FULL_ORDER, recipient_country_code: null, dest_port_id: 'port-1' },
      zen_order_packages: [{ length: 30, width: 20, height: 10, gross_weight: 12.5 }],
      zen_ups_products: { id: 'product-1' },
      zen_ports: { country_code: 'JP' },
      zen_order_rate_snapshots: null,
    });

    await refreshUpsRateSnapshot({ supabase, orderId: ORDER_ID, estimateFn });

    expect(estimateFn.mock.calls[0][0].destCountryCode).toBe('JP');
  });
});
