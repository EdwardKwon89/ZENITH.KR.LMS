import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCreateOrderPayload } from '@/lib/ups/label-mapping';

// TASK-B-341 (Issue #1261): SHXK createorder 페이로드의 shipper_name·shipper_company를
// 화면 "화주명"(zen_orders.shipper_name)으로 통일 (JSJung 2026-10-21 결정).
//
// ⚠️ TASK-B-342 (Issue #1263, JSJung 2026-10-22 결정) — **B-341 결정 번복**
//   shipper_company는 더 이상 화주명이 아니라 회사 기본값(shipperDefaults.name = SHXK_SHIPPER_NAME) 고정.
//   아래 TC-341-*의 shipper_company 기대값은 TASK-B-342 사양으로 갱신되었다.
//   (shipper_name은 화면 "화주명" 그대로 — 폴백 order.shipper_name → shipper_org.name → shipperDefaults.name)
//
// 검증 원칙(DoD): 실제 buildCreateOrderPayload()를 호출해 payload.shipper를 toBe로 단언한다.
// toContain·문자열 소스 검사(mock)로 대체하지 않는다.
//
// 담당자명(order.shipper_contact_name)은 SHXK payload 어디에도 전송되지 않는다.

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/shxk/client', () => ({ callShxk: vi.fn() }));

const mockCreateorder = vi.fn();
vi.mock('@/lib/shxk/order', () => ({
  createorder: (...args: any[]) => mockCreateorder(...args),
  getnewlabel: vi.fn(),
  removeorder: vi.fn(),
}));

const mockValidateUserAction = vi.fn();
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: (...args: any[]) => mockValidateUserAction(...args),
}));

const defaults = { name: 'SNTL Korea Co Ltd', country: 'KR' };

const baseOrder = {
  order_no: 'ORD-341',
  shipper_contact_name: 'Kim',
  shipper_country_code: 'KR',
  shipper_state_province: 'Seoul',
  shipper_city: 'Mapo-gu',
  shipper_zipcode: '04515',
  shipper_contact_phone: '0212345678',
  recipient_name: 'John Doe',
  recipient_country_code: 'US',
  recipient_state_province: 'CA',
  recipient_city: 'Los Angeles',
  recipient_address: '123 Main St',
  recipient_address_local: '',
  recipient_zipcode: '90001',
  recipient_phone: '2135550100',
  recipient_email: 'john@example.com',
  recipient_pccc: '123456',
};

describe('TASK-B-341 → TASK-B-342: SHXK createorder shipper_name = 화면 "화주명", shipper_company = 기본값 (Issue #1261/#1263)', () => {
  describe('buildCreateOrderPayload() — 실제 호출 검증', () => {
    it('TC-341-1: 화주명(shipper_name)이 있으면 shipper_name은 그 값이고 shipper_company는 기본값이다 (TASK-B-342 갱신)', () => {
      const order = { ...baseOrder, shipper_name: 'ABC Trading', shipper_org: { name: 'MASTER AIR' } };

      const result = buildCreateOrderPayload('FXUPS', order as any, 'US', [], defaults);
      const shipper = result.shipper as Record<string, unknown>;

      expect(shipper.shipper_name).toBe('ABC Trading');
      expect(shipper.shipper_company).toBe('SNTL Korea Co Ltd');
    });

    it('TC-341-2: 화주명이 비면 조직명(shipper_org.name)으로 shipper_name이 폴백하고 shipper_company는 기본값이다 (TASK-B-342 갱신)', () => {
      const order = { ...baseOrder, shipper_name: '', shipper_org: { name: 'MASTER AIR' } };

      const result = buildCreateOrderPayload('FXUPS', order as any, 'US', [], defaults);
      const shipper = result.shipper as Record<string, unknown>;

      expect(shipper.shipper_name).toBe('MASTER AIR');
      expect(shipper.shipper_company).toBe('SNTL Korea Co Ltd');
    });

    it('TC-341-3: 화주명·조직명이 모두 없으면 기본값(shipperDefaults.name)으로 두 필드가 함께 폴백한다', () => {
      const order = { ...baseOrder, shipper_name: '', shipper_org: null };

      const result = buildCreateOrderPayload('FXUPS', order as any, 'US', [], defaults);
      const shipper = result.shipper as Record<string, unknown>;

      expect(shipper.shipper_name).toBe('SNTL Korea Co Ltd');
      expect(shipper.shipper_company).toBe('SNTL Korea Co Ltd');
    });

    it('TC-341-4: 담당자명(shipper_contact_name) 값은 payload shipper의 어느 필드에도 실리지 않는다', () => {
      const order = { ...baseOrder, shipper_name: 'ABC Trading', shipper_org: { name: 'MASTER AIR' } };

      const result = buildCreateOrderPayload('FXUPS', order as any, 'US', [], defaults);
      const shipper = result.shipper as Record<string, unknown>;

      expect(Object.values(shipper)).not.toContain('Kim');
      expect(shipper.shipper_name).not.toBe('Kim');
      expect(shipper.shipper_company).not.toBe('Kim');
    });

    it('TC-341-5: shipper 나머지 필드는 TASK-B-341 변경 전과 동일하다', () => {
      const order = { ...baseOrder, shipper_name: 'ABC Trading', shipper_org: { name: 'MASTER AIR', address: 'Seoul St' } };

      const result = buildCreateOrderPayload('FXUPS', order as any, 'US', [], defaults);
      const shipper = result.shipper as Record<string, unknown>;

      expect(shipper.shipper_countrycode).toBe('KR');
      expect(shipper.shipper_province).toBe('Seoul');
      expect(shipper.shipper_city).toBe('Mapo-gu');
      expect(shipper.shipper_postcode).toBe('04515');
      expect(shipper.shipper_telephone).toBe('0212345678');
      expect(shipper.shipper_street).toBe('Seoul St');
    });

    it('TC-341-6: 화주명이 한국어여도 shipper_name에 그대로 실리고 shipper_company는 기본값이다 (TASK-B-342 갱신)', () => {
      const order = { ...baseOrder, shipper_name: '한국무역', shipper_org: { name: 'MASTER AIR' } };

      const result = buildCreateOrderPayload('FXUPS', order as any, 'US', [], defaults);
      const shipper = result.shipper as Record<string, unknown>;

      expect(shipper.shipper_name).toBe('한국무역');
      expect(shipper.shipper_company).toBe('SNTL Korea Co Ltd');
    });
  });
});

const baseOrderRow = {
  id: 'order-341',
  order_no: 'ORD-341',
  recipient_name: 'John Doe',
  recipient_country_code: 'US',
  recipient_state_province: 'CA',
  recipient_city: 'Los Angeles',
  recipient_address: '123 Main St',
  recipient_address_local: '',
  recipient_zipcode: '90001',
  recipient_phone: '2135550100',
  recipient_email: 'john@example.com',
  dest_port_id: 'port-1',
  ups_product_code: 'STD',
  incoterms: 'DAP',
  shipper_id: 'org-341',
  shipper_contact_name: 'Kim',
  shipper_country_code: 'KR',
  shipper_state_province: 'Seoul',
  shipper_city: 'Mapo-gu',
  shipper_zipcode: '04515',
  shipper_contact_phone: '0212345678',
  shipper_org: {
    id: 'org-341',
    name: 'MASTER AIR',
    address: 'Seoul',
    address_english: 'Seoul St',
    country_code: 'KR',
    state_province: 'Seoul',
    city: 'Mapo-gu',
    zipcode: '04515',
  },
};

function createMockSupabase(orderOverrides: Record<string, unknown> = {}) {
  const orderRow = { ...baseOrderRow, ...orderOverrides };

  const orderTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: orderRow, error: null }),
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
              id: 'pkg-341',
              order_id: 'order-341',
              length: 30, width: 20, height: 10,
              gross_weight: 5,
              physical_box_count: 1,
              content_type: 'NONDOC',
              items: [{ item_name: 'Widget', quantity: 1, unit_price: 100, hs_code: '8471300000' }],
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
            data: { id: 'label-341', reference_no: 'REF-341', tracking_number: null, is_voided: false },
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
        insert: vi.fn().mockResolvedValue({ error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      };
    }),
  };

  return { chain };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateorder.mockResolvedValue({
    success: 1,
    data: { order_id: 'SHXK-341', shipping_method_no: '1Z341AAA00000000000', reference_no: 'REF-341' },
  });
});

describe('TASK-B-341 → TASK-B-342: 실제 서버 액션 경로 — createorder payload', () => {
  it('TC-341-7: registerUpsOrder()가 SHXK createorder로 보내는 shipper_name은 화주명이고 shipper_company는 SHXK_SHIPPER_NAME이다 (TASK-B-342 갱신)', async () => {
    const { chain } = createMockSupabase({ shipper_name: 'ABC Trading' });
    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-341' },
    });

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder('order-341');

    expect(result.success).toBe(true);
    expect(mockCreateorder).toHaveBeenCalledTimes(1);
    const payload = mockCreateorder.mock.calls[0][0];
    expect(payload.shipper.shipper_name).toBe('ABC Trading');
    expect(payload.shipper.shipper_company).toBe('SNTL');
  });

  it('TC-341-8: previewShxkPayload(CREATEORDER) 미리보기 payload의 shipper_name은 화주명이고 shipper_company는 SHXK_SHIPPER_NAME이다 (TASK-B-342 갱신)', async () => {
    const { chain } = createMockSupabase({ shipper_name: 'ABC Trading' });
    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-341' },
    });

    const { previewShxkPayload } = await import('@/app/actions/operations/ups-labels');
    const result = await previewShxkPayload('order-341', 'CREATEORDER');

    expect(result.success).toBe(true);
    const shipper = (result.payload!.shipper as Record<string, unknown>);
    expect(shipper.shipper_name).toBe('ABC Trading');
    expect(shipper.shipper_company).toBe('SNTL');
  });

  it('TC-341-9: 레거시 오더(shipper_name 없음)는 shipper_name이 조직명이고 shipper_company는 SHXK_SHIPPER_NAME이다 (TASK-B-342 갱신)', async () => {
    const { chain } = createMockSupabase({ shipper_name: null });
    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-341' },
    });

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    await registerUpsOrder('order-341');

    expect(mockCreateorder).toHaveBeenCalledTimes(1);
    const payload = mockCreateorder.mock.calls[0][0];
    expect(payload.shipper.shipper_name).toBe('MASTER AIR');
    expect(payload.shipper.shipper_company).toBe('SNTL');
  });
});
