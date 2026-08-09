import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('@/app/actions/operations/orders', () => ({
  createOrder: vi.fn(),
}));

import { validateUserAction } from '@/lib/auth/guards';
import { createOrder } from '@/app/actions/operations/orders';
import { bulkCreateOrders } from '@/app/actions/operations/bulk-orders';
import { generateBulkOrderTemplate } from '@/lib/excel/bulk-order-template';

const UUID_ADMIN = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const UUID_SHIPPER = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';
const UUID_EVIL = '00000000-0000-0000-0000-000000000099';
const UUID_AGENCY = '11111111-2222-4333-8444-555555555555';

function makeOrderSeq(n: number) { return { order_seq: n }; }
function makePackageSeq(n: number, orderSeq: number) {
  return { package_seq: n, order_seq: orderSeq, packing_unit: 'BOX', gross_weight: 10, packing_count: 1 };
}
function makeItemSeq(n: number, packageSeq: number) {
  return { item_seq: n, package_seq: packageSeq, item_name: 'Item' + n, quantity: 1 };
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
    recipient_phone: '010-1',
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
        { ...makeOrderSeq(1), order_type: 'B2B', transport_mode: 'UPS', ups_product_code: 'WWE', incoterms: 'DDU', recipient_name: 'A', recipient_address: 'Addr1', recipient_phone: '010-1' },
        { ...makeOrderSeq(2), order_type: 'B2C_ECOM', transport_mode: 'UPS', ups_product_code: 'WWE', incoterms: 'DDU', recipient_name: 'B', recipient_address: 'Addr2', recipient_phone: '010-2' },
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
        { ...makeOrderSeq(1), order_type: 'B2B', transport_mode: 'UPS', ups_product_code: 'WWE', incoterms: 'DDU', recipient_name: 'A', recipient_address: 'Addr1', recipient_phone: '010-1' },
        { ...makeOrderSeq(2), order_type: 'B2B', transport_mode: 'UPS', ups_product_code: 'WWE', incoterms: 'DDU', recipient_name: 'B', recipient_address: 'Addr2', recipient_phone: '010-2' },
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
        { ...makeOrderSeq(1), shipper_id: UUID_EVIL, order_type: 'B2B', transport_mode: 'UPS', ups_product_code: 'WWE', incoterms: 'DDU', recipient_name: 'A', recipient_address: 'Addr1', recipient_phone: '010-1' },
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
});

describe('generateBulkOrderTemplate', () => {
  it('정상적인 base64 엑셀 문자열 반환', () => {
    const result = generateBulkOrderTemplate();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });
});
