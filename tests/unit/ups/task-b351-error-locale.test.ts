// TASK-B-351 (Issue #1299): `ups-labels.ts` 사용자 반환 오류가 로케일 문장이며
// SHXK/DB/예외 **원문을 포함하지 않는지** 검증한다(원문은 logger 에만).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createorder, removeorder } from '@/lib/shxk/order';
import { validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { buildCreateOrderPayload } from '@/lib/ups/label-mapping';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/shxk/order', () => ({ createorder: vi.fn(), getnewlabel: vi.fn(), removeorder: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({ validateUserAction: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: vi.fn(), createClient: vi.fn() }));
vi.mock('@/lib/ups/label-mapping', () => ({
  buildCreateOrderPayload: vi.fn().mockReturnValue({
    reference_no: 'TEST001',
    shipper: { shipper_name: 'SNTL', shipper_countrycode: 'KR', shipper_street: '123 St', shipper_telephone: '01011112222' },
    consignee: { consignee_name: 'John', consignee_countrycode: 'US', consignee_street: '456 Oak St', consignee_city: 'Los Angeles', consignee_postcode: '90001', consignee_telephone: '01033334444' },
    cargovolume: [],
    invoice: [{ invoice_enname: 'Widget', invoice_quantity: '1', invoice_unitcharge: '10', hs_code: '8471300000' }],
  }),
  determineOrderCargotype: vi.fn().mockReturnValue({ cargotype: 'W', mailCargoType: '4' }),
  buildCargovolume: vi.fn().mockReturnValue([]),
  buildInvoiceFromItems: vi.fn().mockReturnValue([]),
}));

const ORDER_ID = 'order-uuid-351';
const REF_NO = 'ZEN-2026-000351';

const ORDER_ROW = {
  id: ORDER_ID,
  order_no: REF_NO,
  recipient_country_code: 'US',
  recipient_city: 'Los Angeles',
  ups_product_code: 'WPX',
  incoterms: 'DDP',
  dest_port_id: null,
};

function makeChain(result: any) {
  const chain: any = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete', 'is', 'in']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

function makeSupabase(tableResults: Record<string, any>) {
  return {
    from: vi.fn((table: string) => {
      const result = tableResults[table];
      if (!result) return makeChain({ data: null, error: null });
      return makeChain(result);
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.test/label.pdf' } }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  };
}

function mockOrderLookup(overrides: Record<string, any> = {}) {
  const supabase = makeSupabase({
    zen_orders: { data: { ...ORDER_ROW, ...overrides.order }, error: null },
    zen_order_packages: {
      data: [{ id: 'pkg-1', items: [{ item_name: 'Widget', quantity: 1, unit_price: 10, hs_code: '8471300000' }] }],
      error: null,
    },
    zen_ups_shxk_country_map: { data: { shxk_code: 'SHP-CODE' }, error: null },
    ...overrides.tables,
  });
  vi.mocked(validateUserAction).mockResolvedValue({
    supabase: supabase as any,
    profile: { id: 'test', role: 'ADMIN' } as any,
  } as any);
  return supabase;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createorder).mockResolvedValue({
    success: 1,
    data: { order_id: 'shxk-order-1', shipping_method_no: 'TK123', refrence_no: REF_NO },
    message: 'OK',
  } as any);
  vi.mocked(removeorder).mockResolvedValue({ success: 1, message: 'OK' } as any);
});

describe('registerUpsOrder — SHXK 원문 은닉 + 로케일 문장 (TASK-B-351)', () => {
  it('실측 중문 오류(未找到订单信息) → ko 번역 문장, 원문 미포함', async () => {
    mockOrderLookup();
    vi.mocked(createorder).mockResolvedValue({ success: 0, data: null, message: '未找到订单信息' } as any);

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder(ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('주문 정보를 찾을 수 없습니다');
    expect(result.error).not.toContain('未找到订单信息');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('未找到订单信息'));
  });

  it('미매칭 SHXK 원문 → 일반문구(코드 포함), 원문 미포함', async () => {
    mockOrderLookup();
    vi.mocked(createorder).mockResolvedValue({ success: 0, data: null, message: 'RAW_SERVER_DETAIL_9f3' } as any);

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder(ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      '택배사 시스템에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: CREATEORDER)',
    );
    expect(result.error).not.toContain('RAW_SERVER_DETAIL_9f3');
  });

  it('SHXK 사전검증 실패 → shxk_validation_failed({fields}) 문장', async () => {
    mockOrderLookup();
    vi.mocked(buildCreateOrderPayload).mockReturnValueOnce({} as any);

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder(ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('SHXK 사전검증에 실패했습니다:');
    expect(createorder).not.toHaveBeenCalled();
  });

  it('예외 원문(내부 토큰) 미노출 + logger.error 가 Error 객체로 호출됨', async () => {
    const secret = new Error('INTERNAL_SECRET_TOKEN_abc123');
    vi.mocked(validateUserAction).mockRejectedValueOnce(secret);

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder(ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: UNEXPECTED)');
    expect(result.error).not.toContain('INTERNAL_SECRET_TOKEN_abc123');
    expect(logger.error).toHaveBeenCalledWith('registerUpsOrder error:', secret);
  });
});

describe('cancelUpsRegistration — DB/SHXK 원문 은닉 (TASK-B-351)', () => {
  it('DB 조회 오류 원문(labelsErr.message) 미노출', async () => {
    const supabase = makeSupabase({
      zen_ups_labels: { data: null, error: { message: 'DB_SECRET_MESSAGE_xyz' } },
    });
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: supabase as any,
      profile: { id: 'test', role: 'ADMIN' } as any,
    } as any);

    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const result = await cancelUpsRegistration(ORDER_ID);

    expect(result.error).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. (코드: LABEL_LOOKUP)');
    expect(result.error).not.toContain('DB_SECRET_MESSAGE_xyz');
    expect(logger.error).toHaveBeenCalledWith('zen_ups_labels select error:', expect.anything());
  });

  it('removeorder 중문 오류 → ko 번역 문장, 원문 미포함', async () => {
    const supabase = makeSupabase({
      zen_ups_labels: { data: [{ id: 'lbl-1', reference_no: REF_NO, tracking_number: 'TK123' }], error: null },
      zen_ups_label_documents: { data: [], error: null },
    });
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: supabase as any,
      profile: { id: 'test', role: 'ADMIN' } as any,
    } as any);
    vi.mocked(removeorder).mockResolvedValue({ success: 0, message: '未找到订单信息' } as any);

    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const result = await cancelUpsRegistration(ORDER_ID);

    expect(result.error).toBe('주문 정보를 찾을 수 없습니다');
    expect(result.error).not.toContain('未找到订单信息');
  });
});
