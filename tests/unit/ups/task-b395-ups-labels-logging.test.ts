// TASK-B-395 (Issue #1181): ups-labels.ts 로그 커버리지 — 잔여 실패 지점의
// 로거 **레벨(warn/error)·인자(오류 객체/원문)** 단언과 **반환값 불변**을 검증한다.
// 호출 여부만 단언하지 않는다(테스트가 실제 대상을 검증하지 못한 이력 방지).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createorder } from '@/lib/shxk/order';
import { validateUserAction } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { trError } from '@/lib/i18n/action-error';

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

const ORDER_ID = 'b395-order-0001';
const REF_NO = 'ZEN-2026-00395';

// recipient_country_code 없음 → 도착국 미확인 경로 / 있으면 shxkCode 경로
const ORDER_ROW = {
  id: ORDER_ID,
  order_no: REF_NO,
  ups_product_code: 'WPX',
  incoterms: 'DDP',
  dest_port_id: 'port-1',
};

function makeChain(result: Record<string, unknown>) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete', 'is', 'in']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

function makeSupabase(tableResults: Record<string, Record<string, unknown>>) {
  return {
    from: vi.fn((table: string) => makeChain(tableResults[table] ?? { data: null, error: null })),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.test/l.pdf' } }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  };
}

/** 오더 조회 + 패키지 1건이 정상인 공통 픽스처 (지정 테이블만 오버라이드) */
function mockLookup(tables: Record<string, Record<string, unknown>> = {}, orderOverride: Record<string, unknown> = {}) {
  const supabase = makeSupabase({
    zen_orders: { data: { ...ORDER_ROW, ...orderOverride }, error: null },
    zen_order_packages: {
      data: [{ id: 'pkg-1', items: [{ item_name: 'Widget', quantity: 1, unit_price: 10, hs_code: '8471300000' }] }],
      error: null,
    },
    ...tables,
  });
  vi.mocked(validateUserAction).mockResolvedValue({
    supabase: supabase as never,
    profile: { id: 'b395-profile', role: 'ADMIN' } as never,
  } as never);
  return supabase;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createorder).mockResolvedValue({
    success: 1,
    data: { order_id: 'shxk-395', shipping_method_no: 'TK395', refrence_no: REF_NO },
    message: 'OK',
  } as never);
});

describe('지점군 ① 매핑 누락 — logger.warn(신규 로깅 4지점) + 반환값 불변', () => {
  it('previewShxkPayload 도착국 미확인 → warn(레벨 warn·인자에 order) + 반환 불변', async () => {
    mockLookup({ zen_ports: { data: null, error: null } });

    const { previewShxkPayload } = await import('@/app/actions/operations/ups-labels');
    const result = await previewShxkPayload(ORDER_ID, 'CREATEORDER');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('previewShxkPayload: destination country code not found'),
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(ORDER_ID));
    expect(logger.error).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: await trError('destination_country_not_found') });
  });

  it('previewShxkPayload 운송방법 미매핑 → warn(레벨 warn·인자에 product·incoterms) + 반환 불변', async () => {
    mockLookup(
      { zen_ups_shxk_country_map: { data: null, error: null } },
      { recipient_country_code: 'US' },
    );

    const { previewShxkPayload } = await import('@/app/actions/operations/ups-labels');
    const result = await previewShxkPayload(ORDER_ID, 'CREATEORDER');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('previewShxkPayload: shipping method not found'),
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('WPX'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('DDP'));
    expect(logger.error).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: await trError('shipping_method_not_found') });
  });

  it('triggerCreateOrderTest 도착국 미확인 → warn + 반환 불변', async () => {
    mockLookup({ zen_ports: { data: null, error: null } });

    const { triggerCreateOrderTest } = await import('@/app/actions/operations/ups-labels');
    const result = await triggerCreateOrderTest(ORDER_ID);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('triggerCreateOrderTest: destination country code not found'),
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: await trError('destination_country_not_found') });
  });

  it('triggerCreateOrderTest 운송방법 미매핑 → warn + 반환 불변', async () => {
    mockLookup(
      { zen_ups_shxk_country_map: { data: null, error: null } },
      { recipient_country_code: 'US' },
    );

    const { triggerCreateOrderTest } = await import('@/app/actions/operations/ups-labels');
    const result = await triggerCreateOrderTest(ORDER_ID);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('triggerCreateOrderTest: shipping method not found'),
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: await trError('shipping_method_not_found') });
  });
});

describe('지점군 ② 헬퍼 DB 오류 흡수 — logger.error + 오류 객체 전달(신규 로깅 3지점)', () => {
  it('resolveCountryCode 그 외 코드 오류 → error(오류 객체 동일성) + 호출부 warn + 반환 불변', async () => {
    const portsErr = { message: 'PORTS_SELECT_FAILED_395', code: 'XX000' };  // 그 외 코드(내부 오류) — error 로깅 대상
    mockLookup({ zen_ports: { data: null, error: portsErr } });

    const { previewShxkPayload } = await import('@/app/actions/operations/ups-labels');
    const result = await previewShxkPayload(ORDER_ID, 'CREATEORDER');

    expect(logger.error).toHaveBeenCalledWith(
      'resolveCountryCode: zen_ports select failed',
      portsErr,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('previewShxkPayload: destination country code not found'),
    );
    expect(result).toEqual({ success: false, error: await trError('destination_country_not_found') });
  });

  it('resolveShxkCode 그 외 코드 오류 → error(오류 객체 동일성) + 호출부 warn + 반환 불변', async () => {
    const mapErr = { message: 'SHXK_MAP_SELECT_FAILED_395', code: '42P01' };  // 그 외 코드(테이블 미존재) — error 로깅 대상
    mockLookup(
      { zen_ups_shxk_country_map: { data: null, error: mapErr } },
      { recipient_country_code: 'US' },
    );

    const { previewShxkPayload } = await import('@/app/actions/operations/ups-labels');
    const result = await previewShxkPayload(ORDER_ID, 'CREATEORDER');

    expect(logger.error).toHaveBeenCalledWith(
      'resolveShxkCode: zen_ups_shxk_country_map select failed',
      mapErr,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('previewShxkPayload: shipping method not found'),
    );
    expect(result).toEqual({ success: false, error: await trError('shipping_method_not_found') });
  });

  it('fetchActiveLabelByOrder DB 오류 → error(오류 객체 인자) + 호출부 warn + 반환 불변', async () => {
    const labelsErr = { message: 'LABELS_SELECT_FAILED_395' };
    mockLookup({ zen_ups_labels: { data: null, error: labelsErr } });

    const { voidUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const result = await voidUpsLabel(ORDER_ID);

    expect(logger.error).toHaveBeenCalledWith(
      'fetchActiveLabelByOrder: zen_ups_labels select failed',
      labelsErr,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('voidUpsLabel: no active label'),
    );
    expect(result).toEqual({ success: false, error: await trError('label_not_found') });
  });

  it('resolveCountryCode PGRST116(행 없음) → error 미호출 + 호출부 warn 단독 + 반환 불변', async () => {
    mockLookup({
      zen_ports: { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } },
    });

    const { previewShxkPayload } = await import('@/app/actions/operations/ups-labels');
    const result = await previewShxkPayload(ORDER_ID, 'CREATEORDER');

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('previewShxkPayload: destination country code not found'),
    );
    expect(result).toEqual({ success: false, error: await trError('destination_country_not_found') });
  });

  it('resolveShxkCode PGRST116(행 없음) → error 미호출 + 호출부 warn 단독 + 반환 불변', async () => {
    mockLookup(
      { zen_ups_shxk_country_map: { data: null, error: { code: 'PGRST116', message: 'no rows returned' } } },
      { recipient_country_code: 'US' },
    );

    const { previewShxkPayload } = await import('@/app/actions/operations/ups-labels');
    const result = await previewShxkPayload(ORDER_ID, 'CREATEORDER');

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('previewShxkPayload: shipping method not found'),
    );
    expect(result).toEqual({ success: false, error: await trError('shipping_method_not_found') });
  });
});

describe('지점군 ③ SHXK 외부 API 실패 — logger.error + 원문 로그 인자 + 반환값 불변', () => {
  it('createorder 실패 → error(원문 포함 문자열 인자) + 반환은 로케일 문장', async () => {
    mockLookup(
      {
        zen_ups_shxk_country_map: { data: { shxk_code: 'SHP-395' }, error: null },
        zen_ups_label_errors: { data: null, error: null },
      },
      { recipient_country_code: 'US' },
    );
    vi.mocked(createorder).mockResolvedValue({
      success: 0, data: null, message: 'RAW_SHXK_MSG_395',
    } as never);

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder(ORDER_ID);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[SHXK] createorder failed'),
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('RAW_SHXK_MSG_395'));
    expect(result).toEqual({
      success: false,
      error: await trError('shxk_generic', { code: 'CREATEORDER' }),
    });
    expect(result.error).not.toContain('RAW_SHXK_MSG_395');
  });
});

describe('지점군 ④ catch — logger.error에 원본 err 객체 전달 + 반환값 불변', () => {
  it('validateUserAction 예외 → error(문자, 원본 Error 동일성) + 반환 불변', async () => {
    const secret = new Error('INTERNAL_TOKEN_395');
    vi.mocked(validateUserAction).mockRejectedValue(secret);

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder(ORDER_ID);

    expect(logger.error).toHaveBeenCalledWith('registerUpsOrder error:', secret);
    expect(result).toEqual({
      success: false,
      error: await trError('generic', { code: 'UNEXPECTED' }),
    });
    expect(result.error).not.toContain('INTERNAL_TOKEN_395');
  });
});

describe('지점군 ⑤ DB 쓰기 실패 — logger.error + 오류 문자 인자 + 반환값 불변', () => {
  it('zen_ups_labels insert 실패 → error(오류 메시지 인자) + 반환 불변', async () => {
    mockLookup(
      {
        zen_ups_shxk_country_map: { data: { shxk_code: 'SHP-395' }, error: null },
        zen_ups_label_errors: { data: null, error: null },
        zen_ups_labels: { data: null, error: { message: 'INSERT_FAILED_395' } },
      },
      { recipient_country_code: 'US' },
    );

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder(ORDER_ID);

    expect(logger.error).toHaveBeenCalledWith(
      'registerUpsOrder: zen_ups_labels insert failed',
      'INSERT_FAILED_395',
    );
    expect(result).toEqual({
      success: false,
      error: await trError('generic', { code: 'LABEL_RECORD_SAVE' }),
    });
  });
});
