import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('@/app/actions/operations/orders', () => ({
  createOrder: vi.fn(),
}));

import { validateUserAction } from '@/lib/auth/guards';
import { createOrder } from '@/app/actions/operations/orders';
import { bulkCreateOrders } from '@/app/actions/operations/bulk-orders';
import {
  generateBulkOrderTemplate,
  BULK_ORDER_SHEET_NAME,
  BULK_PACKAGE_SHEET_NAME,
  BULK_ITEM_SHEET_NAME,
} from '@/lib/excel/bulk-order-template';

const UUID_ADMIN = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const UUID_SHIPPER = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';
const UUID_EVIL = '00000000-0000-0000-0000-000000000099';
const UUID_AGENCY = '11111111-2222-4333-8444-555555555555';

function makeOrderSeq(n: number) { return { order_seq: n }; }
function makePackageSeq(n: number, orderSeq: number) {
  return { package_seq: n, order_seq: orderSeq, packing_unit: 'BOX', gross_weight: 10, packing_count: 1 };
}
function makeItemSeq(n: number, packageSeq: number) {
  return { item_seq: n, package_seq: packageSeq, item_name: 'Item' + n, quantity: 1, hs_code: '8471300000' };
}
function makeValidOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    order_seq: 1,
    order_type: 'B2B',
    transport_mode: 'UPS',
    ups_product_code: 'WWE',
    incoterms: 'DDU',
    recipient_name: 'A',
    recipient_address: 'Addr1',
    recipient_phone: '0101',
    recipient_country_code: 'US',
    recipient_zipcode: '90001',
    recipient_city: 'Los Angeles',
    shipper_contact_phone: '01000000000',
    ...overrides,
  };
}

function mockAgencyShipperQuery(shipperOrgIds: string[]) {
  const query: any = {
    data: shipperOrgIds.map((id) => ({ shipper_org_id: id })),
    eq: function () { return this; },
  };
  const select = vi.fn(() => query);
  const from = vi.fn(() => ({ select }));
  return { supabase: { from }, from };
}

function mockAgencyProfile() {
  const { supabase, from } = mockAgencyShipperQuery([UUID_SHIPPER]);
  (validateUserAction as any).mockResolvedValue({
    profile: { id: 'agency-usr', org_id: UUID_AGENCY, role: 'AGENCY' },
    supabase,
  });
  return { from };
}

describe('bulkCreateOrders', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (validateUserAction as any).mockResolvedValue({
      profile: { id: 'admin-usr', org_id: UUID_ADMIN, role: 'ADMIN' },
    });
  });

  it('정상 2건 오더(각 1패키지·1아이템) → createOrder 2회 호출 + 각각 성공 리포트', async () => {
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-1', order_no: 'ORD-001' });
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-2', order_no: 'ORD-002' });

    const sheets = {
      orders: [
        { ...makeOrderSeq(1), order_type: 'B2B', transport_mode: 'UPS', ups_product_code: 'WWE', incoterms: 'DDU', recipient_name: 'A', recipient_address: 'Addr1', recipient_phone: '0101', recipient_country_code: 'US', recipient_zipcode: '90001', recipient_city: 'Los Angeles', shipper_contact_phone: '01000000000' },
        { ...makeOrderSeq(2), order_type: 'B2C_ECOM', transport_mode: 'UPS', ups_product_code: 'WWE', incoterms: 'DDU', recipient_name: 'B', recipient_address: 'Addr2', recipient_phone: '0102', recipient_country_code: 'US', recipient_zipcode: '90002', recipient_city: 'Los Angeles', shipper_contact_phone: '01000000000' },
      ],
      packages: [
        makePackageSeq(1, 1),
        makePackageSeq(2, 2),
      ],
      items: [
        makeItemSeq(1, 1),
        makeItemSeq(2, 2),
      ],
    };

    const { results } = await bulkCreateOrders(sheets as any);

    if (results[0].error) console.error('ERROR[0]:', results[0].error);
    if (results[1].error) console.error('ERROR[1]:', results[1].error);
    expect(createOrder).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ orderSeq: 1, success: true, orderId: 'ord-1', orderNo: 'ORD-001' });
    expect(results[1]).toMatchObject({ orderSeq: 2, success: true, orderId: 'ord-2', orderNo: 'ORD-002' });
  });

  it('참조 무결성 오류(패키지 시트에 없는 order_seq) → 오류 리포트', async () => {
    const sheets = {
      orders: [makeOrderSeq(1) as any],
      packages: [{ package_seq: 99, order_seq: 99, packing_unit: 'BOX', gross_weight: 10 }],
      items: [{ package_seq: 99, item_name: 'X', quantity: 1 }],
    };

    const { results } = await bulkCreateOrders(sheets);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].success).toBe(false);
  });

  it('일부 오더 성공·일부 실패 혼합 케이스 → 다른 오더에 영향 없음', async () => {
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-ok', order_no: 'ORD-OK' });
    (createOrder as any).mockRejectedValueOnce(new Error('createOrder 실패'));

    const sheets = {
      orders: [
        { ...makeOrderSeq(1), order_type: 'B2B', transport_mode: 'UPS', ups_product_code: 'WWE', incoterms: 'DDU', recipient_name: 'A', recipient_address: 'Addr1', recipient_phone: '0101', recipient_country_code: 'US', recipient_zipcode: '90001', recipient_city: 'Los Angeles', shipper_contact_phone: '01000000000' },
        { ...makeOrderSeq(2), order_type: 'B2B', transport_mode: 'UPS', ups_product_code: 'WWE', incoterms: 'DDU', recipient_name: 'B', recipient_address: 'Addr2', recipient_phone: '0102', recipient_country_code: 'US', recipient_zipcode: '90002', recipient_city: 'Los Angeles', shipper_contact_phone: '01000000000' },
      ],
      packages: [
        makePackageSeq(1, 1), makePackageSeq(2, 2),
      ] as any[],
      items: [
        makeItemSeq(1, 1), makeItemSeq(2, 2),
      ] as any[],
    };

    const { results } = await bulkCreateOrders(sheets);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ orderSeq: 1, success: true, orderId: 'ord-ok' });
    expect(results[1]).toMatchObject({ orderSeq: 2, success: false });
    expect(results[1].error).toContain('createOrder 실패');
    expect(createOrder).toHaveBeenCalledTimes(2);
  });

  it('200건 초과 시 에러', async () => {
    const orders = Array.from({ length: 201 }, (_, i) => ({ ...makeOrderSeq(i + 1), order_type: 'B2B', transport_mode: 'AIR', recipient_name: 'A', recipient_address: 'Addr', recipient_phone: '010' }));
    const sheets = { orders, packages: [], items: [] };

    await expect(bulkCreateOrders(sheets)).rejects.toThrow('최대 200건');
  });

  it('SHIPPER 역할 → org_id가 shipper_id로 강제 지정됨', async () => {
    (validateUserAction as any).mockResolvedValue({
      profile: { id: 'shipper-usr', org_id: UUID_SHIPPER, role: 'SHIPPER' },
    });
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-1', order_no: 'ORD-001' });

    const sheets = {
      orders: [
        { ...makeOrderSeq(1), shipper_id: UUID_EVIL, order_type: 'B2B', transport_mode: 'UPS', ups_product_code: 'WWE', incoterms: 'DDU', recipient_name: 'A', recipient_address: 'Addr1', recipient_phone: '0101', recipient_country_code: 'US', recipient_zipcode: '90001', recipient_city: 'Los Angeles', shipper_contact_phone: '01000000000' },
      ],
      packages: [makePackageSeq(1, 1)] as any[],
      items: [makeItemSeq(1, 1)] as any[],
    };

    const { results } = await bulkCreateOrders(sheets as any);

    if (results[0].error) console.error('ERROR[0]:', results[0].error);
    expect(results[0].success).toBe(true);

    const callArg = (createOrder as any).mock.calls[0][0];
    expect(callArg.shipper_id).toBe(UUID_SHIPPER);
    expect(callArg.shipper_id).not.toBe(UUID_EVIL);
  });

  it('AGENCY 역할 → zen_agency_shippers 소속 화주 지정 시 createOrder 정상 호출·성공', async () => {
    const { from } = mockAgencyProfile();
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-1', order_no: 'ORD-001' });

    const sheets = {
      orders: [makeValidOrderRow({ shipper_id: UUID_SHIPPER })],
      packages: [makePackageSeq(1, 1)] as any[],
      items: [makeItemSeq(1, 1)] as any[],
    };

    const { results } = await bulkCreateOrders(sheets as any);

    if (results[0].error) console.error('ERROR[0]:', results[0].error);
    expect(from).toHaveBeenCalledWith('zen_agency_shippers');
    expect(results[0]).toMatchObject({ orderSeq: 1, success: true, orderId: 'ord-1', orderNo: 'ORD-001' });
    const callArg = (createOrder as any).mock.calls[0][0];
    expect(callArg.shipper_id).toBe(UUID_SHIPPER);
  });

  it('AGENCY 역할 → zen_agency_shippers 미소속 화주 지정 시 실패 리포트 + createOrder 미호출', async () => {
    const { from } = mockAgencyProfile();
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-1', order_no: 'ORD-001' });

    const sheets = {
      orders: [makeValidOrderRow({ shipper_id: UUID_EVIL })],
      packages: [makePackageSeq(1, 1)] as any[],
      items: [makeItemSeq(1, 1)] as any[],
    };

    const { results } = await bulkCreateOrders(sheets as any);

    expect(from).toHaveBeenCalledWith('zen_agency_shippers');
    expect(results[0]).toMatchObject({ orderSeq: 1, success: false });
    expect(results[0].error).toBe('소속 화주가 아닙니다.');
    expect(createOrder).not.toHaveBeenCalled();
  });

  // TASK-B-334 (Issue #1243): orderRegistrationSchema 전화 규칙(숫자만·15자리)이 엑셀 대량 등록 경로에도
  // 적용되는데 bulk-orders.ts가 정제 없이 원본을 넘겨 회귀 위험 — 하이픈/공백 전화가 정제되어 성공해야 한다.
  it('TASK-B-334: 하이픈 전화(UPS 행)가 정제되어 성공 + createOrder에 숫자만 전달', async () => {
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-1', order_no: 'ORD-001' });

    const sheets = {
      orders: [makeValidOrderRow({ recipient_phone: '010-1234-5678', shipper_contact_phone: '010-0000-0000' })],
      packages: [makePackageSeq(1, 1)] as any[],
      items: [makeItemSeq(1, 1)] as any[],
    };

    const { results } = await bulkCreateOrders(sheets as any);

    if (results[0].error) console.error('ERROR[0]:', results[0].error);
    expect(results[0]).toMatchObject({ orderSeq: 1, success: true, orderId: 'ord-1' });
    const callArg = (createOrder as any).mock.calls[0][0];
    expect(callArg.recipient_phone).toBe('01012345678');
    expect(callArg.shipper_contact_phone).toBe('01000000000');
  });

  // TASK-B-335 (Issue #1245): 비UPS는 이제 사전 거부되므로(BULK_SUPPORTED_MODE), B-334의
  // "AIR 행 전화 정제" 전제가 사라졌다. 삭제 대신 UPS 행의 '+'·공백 전화 정제 케이스로 수정한다(약화 아님 — 전제 소멸).
  it('TASK-B-335: UPS 행의 "+"/공백 포함 전화가 정제되어 성공 + createOrder에 숫자만 전달', async () => {
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-1', order_no: 'ORD-001' });

    const sheets = {
      orders: [makeValidOrderRow({
        recipient_phone: '+86 393 8302 0288',
        shipper_contact_phone: '010 1234 5678',
      })],
      packages: [makePackageSeq(1, 1)] as any[],
      items: [makeItemSeq(1, 1)] as any[],
    };

    const { results } = await bulkCreateOrders(sheets as any);

    if (results[0].error) console.error('ERROR[0]:', results[0].error);
    expect(results[0].success).toBe(true);
    const callArg = (createOrder as any).mock.calls[0][0];
    expect(callArg.recipient_phone).toBe('8639383020288');
    expect(callArg.shipper_contact_phone).toBe('01012345678');
  });

  it('TASK-B-334: 정제 후 빈 값이 되는 전화는 스키마가 거부하고 createOrder 미호출', async () => {
    const sheets = {
      orders: [makeValidOrderRow({ recipient_phone: '-- () --' })],
      packages: [makePackageSeq(1, 1)] as any[],
      items: [makeItemSeq(1, 1)] as any[],
    };

    const { results } = await bulkCreateOrders(sheets as any);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('전화번호는 숫자만');
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('TASK-B-334: 정제 후 15자리 초과 전화는 스키마가 거부', async () => {
    const sheets = {
      orders: [makeValidOrderRow({ recipient_phone: '1234567890123456' })],
      packages: [makePackageSeq(1, 1)] as any[],
      items: [makeItemSeq(1, 1)] as any[],
    };

    const { results } = await bulkCreateOrders(sheets as any);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('15자리');
    expect(createOrder).not.toHaveBeenCalled();
  });

  // === TASK-B-335 (Issue #1245, DEF-B-150): 대량 등록 UPS 전용 명문화 ===

  it('TASK-B-335: 비UPS 행은 사전 거부되고 다른 UPS 행은 계속 성공(배치 전체 차단 없음)', async () => {
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-2', order_no: 'ORD-002' });

    const sheets = {
      orders: [
        makeValidOrderRow({ order_seq: 1, transport_mode: 'AIR' }),
        makeValidOrderRow({ order_seq: 2 }),
      ],
      packages: [makePackageSeq(1, 1), makePackageSeq(2, 2)] as any[],
      items: [makeItemSeq(1, 1), makeItemSeq(2, 2)] as any[],
    };

    const { results } = await bulkCreateOrders(sheets as any);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('대량 등록은 UPS 오더만 지원합니다');
    expect(results[0].error).toContain('transport_mode=AIR');
    expect(results[1]).toMatchObject({ orderSeq: 2, success: true, orderId: 'ord-2' });
    expect(createOrder).toHaveBeenCalledTimes(1);
  });

  it('TASK-B-335: transport_mode 공란은 UPS(대문자 정규화)로 처리된다', async () => {
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-1', order_no: 'ORD-001' });

    const sheets = {
      orders: [makeValidOrderRow({ transport_mode: undefined })],
      packages: [makePackageSeq(1, 1)] as any[],
      items: [makeItemSeq(1, 1)] as any[],
    };

    const { results } = await bulkCreateOrders(sheets as any);

    expect(results[0].success).toBe(true);
    expect((createOrder as any).mock.calls[0][0].transport_mode).toBe('UPS');

    // 소문자·공백도 대문자 정규화되어 UPS로 처리
    vi.resetAllMocks();
    (validateUserAction as any).mockResolvedValue({ profile: { id: 'admin-usr', org_id: UUID_ADMIN, role: 'ADMIN' } });
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-1', order_no: 'ORD-001' });
    const sheets2 = {
      orders: [makeValidOrderRow({ transport_mode: ' ups ' })],
      packages: [makePackageSeq(1, 1)] as any[],
      items: [makeItemSeq(1, 1)] as any[],
    };
    const { results: results2 } = await bulkCreateOrders(sheets2 as any);
    expect(results2[0].success).toBe(true);
    expect((createOrder as any).mock.calls[0][0].transport_mode).toBe('UPS');
  });

  it('TASK-B-335: 패키지 content_type 공란/GENERAL → NONDOC, DOC는 유지', async () => {
    (createOrder as any).mockResolvedValue({ id: 'o', order_no: 'N' });

    const sheets = {
      orders: [
        makeValidOrderRow({ order_seq: 1 }),
        makeValidOrderRow({ order_seq: 2 }),
        makeValidOrderRow({ order_seq: 3 }),
      ],
      packages: [
        { ...makePackageSeq(1, 1), content_type: '' },
        { ...makePackageSeq(2, 2), content_type: 'GENERAL' },
        { ...makePackageSeq(3, 3), content_type: 'DOC' },
      ] as any[],
      items: [makeItemSeq(1, 1), makeItemSeq(2, 2), makeItemSeq(3, 3)] as any[],
    };

    const { results } = await bulkCreateOrders(sheets as any);
    expect(results.every((r) => r.success)).toBe(true);

    const calls = (createOrder as any).mock.calls;
    expect(calls[0][0].packages[0].content_type).toBe('NONDOC');
    expect(calls[1][0].packages[0].content_type).toBe('NONDOC');
    expect(calls[2][0].packages[0].content_type).toBe('DOC');
  });

  it('TASK-B-335: 템플릿 라운드트립 — 샘플 행이 실제 검증을 통과한다', async () => {
    (createOrder as any).mockResolvedValueOnce({ id: 'ord-tpl', order_no: 'ORD-TPL' });

    const wb = XLSX.read(generateBulkOrderTemplate(), { type: 'base64' });
    const orders = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[BULK_ORDER_SHEET_NAME]);
    const packages = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[BULK_PACKAGE_SHEET_NAME]);
    const items = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[BULK_ITEM_SHEET_NAME]);

    const { results } = await bulkCreateOrders({ orders, packages, items });

    if (results[0].error) console.error('TEMPLATE ERROR:', results[0].error);
    expect(results[0]).toMatchObject({ success: true, orderNo: 'ORD-TPL' });
    const callArg = (createOrder as any).mock.calls[0][0];
    expect(callArg.transport_mode).toBe('UPS');
    expect(callArg.packages[0].content_type).toBe('NONDOC');
    expect(callArg.packages[0].items[0].hs_code).toBeTruthy();
    expect(callArg.recipient_country_code).toBe('US');
  });

  it('TASK-B-335: Zod 오류가 JSON 문자열이 아니라 "경로: 메시지" 형식으로 노출된다', async () => {
    const sheets = {
      orders: [makeValidOrderRow()],
      packages: [makePackageSeq(1, 1)] as any[],
      items: [{ ...makeItemSeq(1, 1), hs_code: '' }] as any[],
    };

    const { results } = await bulkCreateOrders(sheets as any);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('packages.0.items.0.hs_code: UPS 배송은 품목 HS 코드가 필수입니다');
    expect(results[0].error).not.toContain('"code"');
    expect(results[0].error).not.toContain('{');
  });
});

describe('generateBulkOrderTemplate', () => {
  it('정상적인 base64 엑셀 문자열 반환', () => {
    const result = generateBulkOrderTemplate();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });
});
