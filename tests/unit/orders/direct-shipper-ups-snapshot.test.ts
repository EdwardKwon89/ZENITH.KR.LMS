import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrder } from '@/app/actions/orders';
import { validateUserAction } from '@/lib/auth/guards';
import { generateOrderNo } from '@/app/actions/master';
import { revalidatePath } from 'next/cache';
import { estimateUpsFreightCore } from '@/lib/ups/estimate-core';

// ─── TASK-B-258 / Issue #1007 / DEF-B-035 회귀 테스트 ────────────────────────
//
// 기존 결함: createOrder()의 예상운임 스냅샷 생성(saveOrderRateSnapshot)이
// `profile.role === AGENCY_SHIPPER`일 때만 호출되어, 대리점과 무관한 직접 화주
// (SHIPPER/CORPORATE/INDIVIDUAL 등)가 등록한 UPS 오더는 스냅샷이 전혀 생성되지
// 않았다. → 정산(calculateOrderCosts)·인보이스 발행·매입/매출 집계가 전부 실패.
//
// 검증 방식: saveOrderRateSnapshot 내부에서만 호출되는 estimateUpsFreight를 mock한
// 뒤 실제 createOrder() 서버 액션을 호출해, 그 함수가 호출됐는지(=스냅샷 생성 경로가
// 실행됐는지)를 직접 assert한다. 로컬 재구현 함수가 아니라 프로덕션 createOrder()를
// 거치는 실경로 검증이다.

const mockAdminEq = vi.fn().mockResolvedValue({ error: null });
const mockAdminUpdate = vi.fn().mockReturnValue({ eq: mockAdminEq });
const mockAdminInsert = vi.fn().mockResolvedValue({ error: null });
const mockAdminFrom = vi.fn().mockReturnValue({ update: mockAdminUpdate, insert: mockAdminInsert });
const mockCreateAdminClient = vi.fn().mockResolvedValue({ from: mockAdminFrom });

vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: (...args: any[]) => mockCreateAdminClient(...args),
}));

vi.mock('@/lib/auth/guards', () => ({
  validateAdminAction: vi.fn(),
  validateUserAction: vi.fn(),
}));

vi.mock('@/app/actions/master', () => ({
  generateOrderNo: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/ups/estimate-core', () => ({
  estimateUpsFreightCore: vi.fn(),
}));

const MOCK_ORDER_ID = 'new-order-id';

function buildSupabaseMock(options: { agencyLink?: { agency_org_id: string } | null; ownerShipperId?: string }) {
  const { agencyLink = null, ownerShipperId = 'org-shipper-1' } = options;

  const snapshotInsert = mockAdminInsert;

  const upsProduct = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'prod-1' }, error: null }),
  };
  const ports = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { country_code: 'US' }, error: null }),
  };
  const agencyShippers = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(
      agencyLink ? { data: agencyLink, error: null } : { data: null, error: null }
    ),
  };
  const snapshots = { insert: snapshotInsert };
  const orderOwner = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { shipper_id: ownerShipperId, agency_org_id: agencyLink?.agency_org_id ?? null },
      error: null,
    }),
  };
  const orders = {
    select: vi.fn().mockReturnValue(orderOwner),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  };

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'zen_ups_products':
        return upsProduct;
      case 'zen_ports':
        return ports;
      case 'zen_agency_shippers':
        return agencyShippers;
      case 'zen_order_rate_snapshots':
        return snapshots;
      case 'zen_orders':
        return orders;
      default:
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
    }
  });

  const supabase = {
    from,
    rpc: vi.fn().mockResolvedValue({ data: { id: MOCK_ORDER_ID, order_no: 'ZEN-2026-000001' }, error: null }),
  };
  return { supabase, snapshotInsert, from };
}

function makeUpsPayload() {
  return {
    order_type: 'B2C_ECOM',
    shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
    recipient_name: 'John Doe',
    recipient_address: '456 Oak St',
    recipient_phone: '01055556666',
    recipient_country_code: 'US',
    recipient_zipcode: '90001',
    recipient_city: 'Los Angeles',
    shipper_contact_phone: '01000000000',
    transport_mode: 'UPS',
    ups_product_code: 'WW_EXPEDITED',
    incoterms: 'DDP',
    packages: [
      {
        packing_unit: 'BOX',
        packing_count: 1,
        gross_weight: 5,
        items: [{ item_name: 'Widget', quantity: 1, unit_price: 50, currency: 'USD', item_packing_unit: 'UNIT', hs_code: '8471300000' }],
      },
    ],
  };
}

function makeAirPayload() {
  return {
    order_type: 'B2B',
    shipper_id: '4bd7d15a-9042-4b72-8822-68c13000b001',
    origin_port_id: '550e8400-e29b-41d4-a716-446655440001',
    dest_port_id: '550e8400-e29b-41d4-a716-446655440002',
    recipient_name: 'Jane',
    recipient_address: '789 Pine St',
    recipient_phone: '01077778888',
    transport_mode: 'AIR',
    packages: [
      {
        packing_unit: 'BOX',
        packing_count: 1,
        gross_weight: 5,
        items: [{ item_name: 'Widget', quantity: 1, unit_price: 50, currency: 'USD', item_packing_unit: 'UNIT', hs_code: '8471300000' }],
      },
    ],
  };
}

describe('TASK-B-258: 비대리점 직접 화주 UPS 오더 → 예상운임 스냅샷 생성 (Issue #1007 / DEF-B-035)', () => {
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    (estimateUpsFreightCore as any).mockResolvedValue({
      platform: { totalSellingPrice: 100, currency: 'USD' },
      agency: null,
      shipper: null,
    });
    (generateOrderNo as any).mockResolvedValue('ZEN-2026-000001');
    (revalidatePath as any).mockResolvedValue(undefined);
  });

  it('TC-258-01: 비대리점 직접 화주(role=SHIPPER, zen_agency_shippers 미소속) UPS 오더 → saveOrderRateSnapshot 실행(estimateUpsFreight 호출)', async () => {
    const { supabase } = buildSupabaseMock({ agencyLink: null, ownerShipperId: 'org-shipper-1' });
    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: { id: 'user-123', org_id: 'org-shipper-1', role: 'SHIPPER' },
      supabase,
    });

    await createOrder(makeUpsPayload() as any);

    expect(estimateUpsFreightCore).toHaveBeenCalled();
    expect(mockAdminFrom).toHaveBeenCalledWith('zen_order_rate_snapshots');
    expect(mockAdminInsert).toHaveBeenCalledTimes(1);
  });

  it('TC-258-02: 비대리점 직접 화주(role=CORPORATE, zen_agency_shippers 미소속) UPS 오더 → 스냅샷 생성 + agency_org_id 미설정', async () => {
    const { supabase } = buildSupabaseMock({ agencyLink: null, ownerShipperId: 'org-corp-1' });
    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: { id: 'user-123', org_id: 'org-corp-1', role: 'CORPORATE' },
      supabase,
    });

    await createOrder(makeUpsPayload() as any);

    expect(estimateUpsFreightCore).toHaveBeenCalled();
    expect(mockAdminFrom).toHaveBeenCalledWith('zen_order_rate_snapshots');
    expect(mockAdminInsert).toHaveBeenCalledTimes(1);
  });

  it('TC-258-03: 대리점 소속 직접 화주(role=CORPORATE, zen_agency_shippers 활성 행) UPS 오더 → agency_org_id 설정 + 스냅샷 생성', async () => {
    const { supabase } = buildSupabaseMock({ agencyLink: { agency_org_id: 'agency-org-1' }, ownerShipperId: 'org-corp-2' });
    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: { id: 'user-123', org_id: 'org-corp-2', role: 'CORPORATE' },
      supabase,
    });

    await createOrder(makeUpsPayload() as any);

    expect(estimateUpsFreightCore).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: 'agency-org-1' }), expect.anything());
    expect(mockAdminFrom).toHaveBeenCalledWith('zen_order_rate_snapshots');
    expect(mockAdminInsert).toHaveBeenCalledTimes(1);
  });

  it('TC-258-04: 기존 AGENCY_SHIPPER 케이스 회귀 방지 — agency_org_id 설정 + 스냅샷 생성 그대로 동작', async () => {
    const { supabase } = buildSupabaseMock({ agencyLink: { agency_org_id: 'agency-org-2' }, ownerShipperId: 'org-agency-1' });
    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: { id: 'user-123', org_id: 'org-agency-1', role: 'AGENCY_SHIPPER' },
      supabase,
    });

    await createOrder(makeUpsPayload() as any);

    expect(estimateUpsFreightCore).toHaveBeenCalledWith(expect.objectContaining({ agencyOrgId: 'agency-org-2' }), expect.anything());
    expect(mockAdminFrom).toHaveBeenCalledWith('zen_order_rate_snapshots');
    expect(mockAdminInsert).toHaveBeenCalledTimes(1);
  });

  it('TC-258-05: 비-UPS(AIR) 오더는 스냅샷을 생성하지 않는다 (회귀 방지)', async () => {
    const { supabase } = buildSupabaseMock({ agencyLink: null });
    (validateUserAction as any).mockResolvedValue({
      user: mockUser,
      profile: { id: 'user-123', org_id: 'org-corp-3', role: 'CORPORATE' },
      supabase,
    });

    await createOrder(makeAirPayload() as any);

    expect(estimateUpsFreightCore).not.toHaveBeenCalled();
    expect(mockAdminFrom).not.toHaveBeenCalledWith('zen_order_rate_snapshots');
  });
});
