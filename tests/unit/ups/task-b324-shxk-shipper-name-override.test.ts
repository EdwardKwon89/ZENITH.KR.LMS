import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCreateOrderPayload } from '@/lib/ups/label-mapping';

// TASK-B-324 (Issue #1190 / DEF-B-144): 오더 화주명 수기입력값(order.shipper_name)이
// SHXK createorder payload의 shipper.shipper_company로 전달되지 않던 결함 회귀 테스트.
//
// 1. buildCreateOrderPayload() 단위 검증 — 폴백 우선순위:
//    order.shipper_name > order.shipper_org?.name > shipperDefaults.name
// 2. 실제 서버 액션 경로(registerUpsOrder / previewShxkPayload)에서
//    createorder payload로 수기입력값이 나가는지 mock SHXK 호출로 검증.
//
// 되돌리기 검증: label-mapping.ts의 `order.shipper_name ||` 폴백을 제거하면
// 아래 "수기입력값 우선" 케이스들이 정확히 FAIL한다.

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

const baseOrderRow = {
  id: 'order-324',
  order_no: 'ORD-324',
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
  shipper_id: 'org-324',
  shipper_contact_name: 'Shipper Kim',
  shipper_country_code: 'KR',
  shipper_state_province: 'Seoul',
  shipper_city: 'Mapo-gu',
  shipper_zipcode: '04515',
  shipper_contact_phone: '02-1234-5678',
  shipper_org: {
    id: 'org-324',
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
  const capturedSelectArgs: string[] = [];
  const orderRow = { ...baseOrderRow, ...orderOverrides };

  const orderTable = {
    select: (...args: any[]) => {
      capturedSelectArgs.push(String(args[0] || ''));
      return orderTable;
    },
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
              id: 'pkg-324',
              order_id: 'order-324',
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
            data: { id: 'label-324', reference_no: 'REF-324', tracking_number: null, is_voided: false },
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
  mockCreateorder.mockResolvedValue({
    success: 1,
    data: { order_id: 'SHXK-324', shipping_method_no: '1Z324AAA00000000000', reference_no: 'REF-324' },
  });
});

describe('TASK-B-324: SHXK createorder shipper_company 수기입력값 반영 (DEF-B-144)', () => {
  describe('buildCreateOrderPayload() 단위 — shipper_company 폴백 우선순위', () => {
    const defaults = { name: 'SNTL Korea Co Ltd', country: 'KR' };
    const basePayloadOrder = {
      order_no: 'ORD-324',
      shipper_contact_name: 'Shipper Kim',
      shipper_name: 'Test Shipper XYZ',
      shipper_country_code: 'KR',
      shipper_state_province: 'Seoul',
      shipper_city: 'Mapo-gu',
      shipper_zipcode: '04515',
      shipper_contact_phone: '02-1234-5678',
      recipient_name: 'John Doe',
      recipient_country_code: 'US',
      recipient_state_province: 'CA',
      recipient_city: 'Los Angeles',
      recipient_address: '123 Main St',
      recipient_address_local: '',
      recipient_zipcode: '90001',
      recipient_phone: '213-555-0100',
      recipient_email: 'john@example.com',
      recipient_pccc: '123456',
    };

    it('수기입력 화주명(shipper_name)이 있으면 조직명보다 우선해 shipper_company로 전달된다', () => {
      const order = { ...basePayloadOrder, shipper_name: 'Test Shipper XYZ', shipper_org: { name: 'MASTER AIR' } };
      const result = buildCreateOrderPayload('FXUPS', order as any, 'US', [], defaults);
      expect((result.shipper as any).shipper_company).toBe('Test Shipper XYZ');
    });

    it('수기입력 화주명이 없으면(레거시) 조직명으로 폴백한다', () => {
      const order = { ...basePayloadOrder, shipper_name: '', shipper_org: { name: 'MASTER AIR' } };
      const result = buildCreateOrderPayload('FXUPS', order as any, 'US', [], defaults);
      expect((result.shipper as any).shipper_company).toBe('MASTER AIR');
    });

    it('수기입력 화주명과 조직명이 모두 없으면 shipperDefaults.name으로 폴백한다', () => {
      const order = { ...basePayloadOrder, shipper_name: '', shipper_org: null };
      const result = buildCreateOrderPayload('FXUPS', order as any, 'US', [], defaults);
      expect((result.shipper as any).shipper_company).toBe('SNTL Korea Co Ltd');
    });

    it('수기입력 화주명은 담당자명 필드(shipper.shipper_name)를 덮어쓰지 않는다', () => {
      const order = { ...basePayloadOrder, shipper_name: 'Test Shipper XYZ', shipper_org: { name: 'MASTER AIR' } };
      const result = buildCreateOrderPayload('FXUPS', order as any, 'US', [], defaults);
      expect((result.shipper as any).shipper_company).toBe('Test Shipper XYZ');
      expect((result.shipper as any).shipper_name).toBe('Shipper Kim');
    });
  });

  describe('registerUpsOrder() 실제 등록 경로 — placeShxkOrder payload', () => {
    it('수기입력 화주명이 createorder payload의 shipper_company로 나간다', async () => {
      const { chain } = createMockSupabase({ shipper_name: 'Test Shipper XYZ' });
      mockValidateUserAction.mockResolvedValue({
        supabase: chain,
        profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-324' },
      });

      const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
      const result = await registerUpsOrder('order-324');

      expect(result.success).toBe(true);
      expect(mockCreateorder).toHaveBeenCalledTimes(1);
      const payload = mockCreateorder.mock.calls[0][0];
      expect(payload.shipper.shipper_company).toBe('Test Shipper XYZ');
      expect(payload.shipping_method).toBe('FXUPS');
    });

    it('레거시 오더(shipper_name 없음)는 조직명이 createorder payload로 나간다', async () => {
      const { chain } = createMockSupabase({ shipper_name: null });
      mockValidateUserAction.mockResolvedValue({
        supabase: chain,
        profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-324' },
      });

      const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
      await registerUpsOrder('order-324');

      expect(mockCreateorder).toHaveBeenCalledTimes(1);
      const payload = mockCreateorder.mock.calls[0][0];
      expect(payload.shipper.shipper_company).toBe('MASTER AIR');
    });
  });

  describe('previewShxkPayload() 미리보기 경로', () => {
    it('CREATEORDER 미리보기 payload의 shipper_company에 수기입력값이 반영된다', async () => {
      const { chain } = createMockSupabase({ shipper_name: 'Test Shipper XYZ' });
      mockValidateUserAction.mockResolvedValue({
        supabase: chain,
        profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-324' },
      });

      const { previewShxkPayload } = await import('@/app/actions/operations/ups-labels');
      const result = await previewShxkPayload('order-324', 'CREATEORDER');

      expect(result.success).toBe(true);
      expect((result.payload!.shipper as any).shipper_company).toBe('Test Shipper XYZ');
    });
  });
});
