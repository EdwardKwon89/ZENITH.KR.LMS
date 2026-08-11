import { describe, it, expect, vi, beforeEach } from 'vitest';

// TASK-B-282 (Issue #1067 / DEF-B-054): SHXK createorder shipper_company 필드 미전달 회귀 테스트.
//
// 1. lookupOrderPackages()의 shipper_org join select에 name(조직명)이 포함되는지 확인
//    (실제 registerUpsOrder 경유 — select 문자열 캡처)
// 2. buildCreateOrderPayload()가 shipper_company를 조직명으로 채우는지 확인 (실제 함수 사용)
//
// 되돌리기 검증: name 누락 시 select 캡처 테스트가 실패하고,
// shipper_company 배선 제거 시 payload 테스트가 실패함을 보장한다.

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/shxk/client', () => ({ callShxk: vi.fn() }));

const mockPlaceShxkOrder = vi.fn();
vi.mock('@/lib/shxk/order', () => ({
  createorder: (...args: any[]) => mockPlaceShxkOrder(...args),
  getnewlabel: vi.fn(),
  removeorder: vi.fn(),
}));

const mockValidateUserAction = vi.fn();
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: (...args: any[]) => mockValidateUserAction(...args),
}));

function createMockSupabase() {
  const capturedSelectArgs: string[] = [];

  const orderTable = {
    select: (...args: any[]) => {
      capturedSelectArgs.push(String(args[0] || ''));
      return orderTable;
    },
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: 'order-282',
        order_no: 'ORD-282',
        recipient_name: 'John Doe',
        recipient_country_code: 'US',
        recipient_state_province: 'CA',
        recipient_city: 'Los Angeles',
        recipient_address: '123 Main St',
        recipient_address_local: '',
        recipient_zipcode: '90001',
        recipient_phone: '213-555-0100',
        recipient_email: 'john@example.com',
        dest_port_id: 'port-1',
        ups_product_code: 'STD',
        incoterms: 'DAP',
        shipper_id: 'org-282',
        shipper_contact_name: 'Shipper Kim',
        shipper_country_code: 'KR',
        shipper_state_province: 'Seoul',
        shipper_city: 'Mapo-gu',
        shipper_zipcode: '04515',
        shipper_contact_phone: '02-1234-5678',
        shipper_org: {
          id: 'org-282',
          name: 'MASTER AIR',
          address: 'Seoul',
          address_english: 'Seoul St',
          country_code: 'KR',
          state_province: 'Seoul',
          city: 'Mapo-gu',
          zipcode: '04515',
        },
      },
      error: null,
    }),
  };

  const chain: any = {
    from: vi.fn((table: string) => {
      if (table === 'zen_orders') return orderTable;
      if (table === 'zen_order_packages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [{
              id: 'pkg-282',
              order_id: 'order-282',
              length: 30, width: 20, height: 10,
              gross_weight: 5,
              physical_box_count: 1,
              content_type: 'NONDOC',
              items: [{ item_name: 'Widget', quantity: 1, unit_price: 100 }],
            }],
            error: null,
          }),
        };
      }
      if (table === 'zen_ports') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { country_code: 'US' }, error: null }),
        };
      }
      if (table === 'zen_ups_shxk_country_map') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { shxk_code: 'FXUPS' }, error: null }),
        };
      }
      if (table === 'zen_ups_labels') {
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: null }),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'label-282', reference_no: 'REF-282', tracking_number: null, is_voided: false },
            error: null,
          }),
        };
      }
      if (table === 'zen_tracking_configs') {
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'zen_ups_label_errors') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      };
    }),
  };

  return { chain, capturedSelectArgs };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPlaceShxkOrder.mockResolvedValue({
    success: 1,
    data: { order_id: 'SHXK-282', shipping_method_no: '1Z282AAA00000000000', reference_no: 'REF-282' },
  });
});

describe('DEF-B-054: shipper_company 필드 미전달 (Issue #1067)', () => {
  it('lookupOrderPackages()의 shipper_org join select에 name이 포함된다', async () => {
    const { chain, capturedSelectArgs } = createMockSupabase();
    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-282' },
    });

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder('order-282');

    expect(result.success).toBe(true);

    const orderSelect = capturedSelectArgs.find((s) => s.includes('shipper_org'));
    expect(orderSelect).toBeDefined();
    expect(orderSelect).toMatch(/name/);
    expect(orderSelect).toMatch(/shipper_org:zen_organizations!shipper_id/);
  });

  it('registerUpsOrder가 createorder payload의 shipper_company에 조직명(MASTER AIR)을 전달한다', async () => {
    const { chain } = createMockSupabase();
    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-282' },
    });

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    await registerUpsOrder('order-282');

    expect(mockPlaceShxkOrder).toHaveBeenCalledTimes(1);
    const payload = mockPlaceShxkOrder.mock.calls[0][0];
    expect(payload.shipper.shipper_company).toBe('MASTER AIR');
    expect(payload.shipping_method).toBe('FXUPS');
  });
});
