import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockReturnValue(vi.fn((key: string) => key)),
}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/shxk/client', () => ({ callShxk: vi.fn() }));
vi.mock('@/lib/shxk/order', () => ({
  createorder: vi.fn(),
  getnewlabel: vi.fn(),
  removeorder: vi.fn(),
}));
vi.mock('@/lib/ups/label-mapping', () => ({
  buildCreateOrderPayload: vi.fn().mockReturnValue({ reference_no: 'TEST001', shipper: {}, consignee: {}, cargovolume: [], invoice: [] }),
  determineOrderCargotype: vi.fn().mockReturnValue({ cargotype: 'W', mailCargoType: '4' }),
  buildCargovolume: vi.fn().mockReturnValue([]),
  buildInvoiceFromItems: vi.fn().mockReturnValue([]),
  resolveShipperStreet: vi.fn().mockReturnValue(''),
}));

const mockUpdateOrderStatus = vi.fn().mockResolvedValue({ success: true });

const mockFindById = vi.fn().mockResolvedValue({
  data: { id: 'order-1', status: 'WAREHOUSED', shipper_id: 'org-1', order_no: 'ORD-001' },
});

class MockOrderRepository {
  findById = mockFindById;
  getStatus = vi.fn().mockResolvedValue({ data: { status: 'WAREHOUSED' } });
}

vi.mock('@/lib/repositories', () => ({
  OrderRepository: MockOrderRepository,
}));

const mockOrderQueryResult: { data: any[]; error: null } = { data: [], error: null };

const mockSupabaseFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  contains: vi.fn().mockReturnThis(),
  like: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue(mockOrderQueryResult),
  insert: vi.fn().mockResolvedValue({ error: null }),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: (resolve: any, reject: any) => Promise.resolve(mockOrderQueryResult).then(resolve, reject),
}));

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn().mockResolvedValue({
    supabase: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: mockSupabaseFrom,
    },
    user: { id: 'user-1' },
    profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
  }),
}));

vi.mock('@/app/actions/operations/orders', () => ({
  updateOrderStatus: (...args: any[]) => mockUpdateOrderStatus(...args),
  attachOperatorNames: vi.fn().mockImplementation((_supabase: any, data: any[]) => Promise.resolve(data)),
}));

vi.mock('@/app/actions/operations/ups-labels', () => ({
  registerUpsOrder: vi.fn(),
  cancelUpsRegistration: vi.fn(),
  fetchAndIssueUpsLabel: vi.fn(),
  voidUpsLabel: vi.fn(),
}));

import { registerUpsOrder, cancelUpsRegistration } from '@/app/actions/operations/ups-labels';

beforeEach(() => {
  vi.mocked(registerUpsOrder).mockReset();
  vi.mocked(cancelUpsRegistration).mockReset();
  mockUpdateOrderStatus.mockClear();
  mockFindById.mockResolvedValue({
    data: { id: 'order-1', status: 'WAREHOUSED', shipper_id: 'org-1', order_no: 'ORD-001' },
  });
});

describe('TASK-B-170: confirmOutbound guard (non-UPS 흐름 보존)', () => {
  it('WAREHOUSED 아닌 오더를 출고 시도하면 updateOrderStatus를 호출하지 않는다', async () => {
    mockFindById.mockResolvedValue({
      data: { id: 'order-x', status: 'REGISTERED', shipper_id: 'org-1' },
    });

    const { confirmOutbound } = await import('@/app/actions/operations/warehouse');
    await expect(confirmOutbound('order-x')).rejects.toThrow();
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
  });

  it('PACKED 상태 오더도 출고 확정이 가능하다', async () => {
    mockFindById.mockResolvedValue({
      data: { id: 'order-packed', status: 'PACKED', shipper_id: 'org-1', order_packages: [], order_no: 'ORD-PACKED' },
    });
    mockUpdateOrderStatus.mockResolvedValue({ success: true });

    const mod = await import('@/app/actions/operations/warehouse');
    const result = await mod.confirmOutbound('order-packed');
    expect(result.success).toBe(true);
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-packed', 'RELEASED', expect.any(String));
  });
});

describe('TASK-B-170: confirmUpsRegistration', () => {
  it('WAREHOUSED 오더에 대해 registerUpsOrder를 호출하고 PACKED로 전이한다', async () => {
    vi.mocked(registerUpsOrder).mockResolvedValue({
      success: true,
      data: { shxk_order_id: 'SHXK-001', tracking_number: '1Z999', reference_no: 'REF-001' },
    });
    mockFindById.mockResolvedValue({
      data: { id: 'order-1', status: 'WAREHOUSED', shipper_id: 'org-1', order_no: 'ORD-001' },
    });

    const { confirmUpsRegistration } = await import('@/app/actions/operations/warehouse');
    const result = await confirmUpsRegistration('order-1');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      shxk_order_id: 'SHXK-001',
      tracking_number: '1Z999',
      reference_no: 'REF-001',
    });
    expect(registerUpsOrder).toHaveBeenCalledWith('order-1');
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-1', 'PACKED', '[UPS등록]');
  });

  it('WAREHOUSED 아닌 오더에 대해 에러를 반환하고 updateOrderStatus를 호출하지 않는다', async () => {
    mockFindById.mockResolvedValue({
      data: { id: 'order-x', status: 'REGISTERED', shipper_id: 'org-1' },
    });

    const { confirmUpsRegistration } = await import('@/app/actions/operations/warehouse');
    await expect(confirmUpsRegistration('order-x')).rejects.toThrow('WAREHOUSED');
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
  });
});

describe('TASK-B-170: undoUpsRegistration', () => {
  it('PACKED 오더에 대해 cancelUpsRegistration을 호출하고 WAREHOUSED로 복구한다', async () => {
    vi.mocked(cancelUpsRegistration).mockResolvedValue({ success: true });
    mockFindById.mockResolvedValue({
      data: { id: 'order-1', status: 'PACKED', shipper_id: 'org-1' },
    });

    const { undoUpsRegistration } = await import('@/app/actions/operations/warehouse');
    const result = await undoUpsRegistration('order-1');

    expect(result.success).toBe(true);
    expect(cancelUpsRegistration).toHaveBeenCalledWith('order-1');
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-1', 'WAREHOUSED', '[UPS등록취소]');
  });

  it('PACKED 아닌 오더에 대해 에러를 반환하고 updateOrderStatus를 호출하지 않는다', async () => {
    mockFindById.mockResolvedValue({
      data: { id: 'order-x', status: 'RELEASED', shipper_id: 'org-1' },
    });

    const { undoUpsRegistration } = await import('@/app/actions/operations/warehouse');
    await expect(undoUpsRegistration('order-x')).rejects.toThrow('PACKED');
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
  });
});

describe('TASK-B-185: getTodayUpsHistory', () => {
  beforeEach(() => {
    mockOrderQueryResult.data = [];
    mockOrderQueryResult.error = null;
  });

  it('오늘의 UPS 접수 이력을 조회하여 반환한다', async () => {
    mockOrderQueryResult.data = [
      {
        id: 'hist-1',
        created_at: new Date().toISOString(),
        order: {
          id: 'order-1',
          order_no: 'ORD-001',
          status: 'PACKED',
          recipient_name: '김철수',
          shipper_id: 'org-1',
          order_packages: [
            {
              id: 'pkg-1',
              intl_ref_no: 'INTL-001',
              intl_ref_locked: false,
              packing_count: 1,
              ups_labels: [
                { id: 'lbl-1', tracking_number: '1Z999AA10123456784', label_format: 'PDF', storage_path: '/ups/label.pdf', is_voided: false, voided_at: null, reference_no: 'REF-001' },
              ],
            },
          ],
        },
      },
    ];

    const { getTodayUpsHistory } = await import('@/app/actions/operations/warehouse');
    const result = await getTodayUpsHistory();

    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].order.order_no).toBe('ORD-001');
  });

  it('결과가 없으면 빈 배열을 반환한다', async () => {
    mockOrderQueryResult.data = [];

    const { getTodayUpsHistory } = await import('@/app/actions/operations/warehouse');
    const result = await getTodayUpsHistory();

    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  it('AGENCY 역할일 때 소속 화주 오더만 반환한다', async () => {
    const { validateUserAction } = await import('@/lib/auth/guards');
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-agency' } } }) },
        from: mockSupabaseFrom,
      },
      user: { id: 'user-agency' },
      profile: { id: 'user-agency', role: 'AGENCY', org_id: 'agency-org' },
    } as any);

    mockOrderQueryResult.data = [
      {
        id: 'hist-1',
        created_at: new Date().toISOString(),
        order: { id: 'order-1', order_no: 'ORD-001', status: 'PACKED', shipper_id: 'shipper-in-scope', order_packages: [] },
      },
      {
        id: 'hist-2',
        created_at: new Date().toISOString(),
        order: { id: 'order-2', order_no: 'ORD-002', status: 'PACKED', shipper_id: 'shipper-out-of-scope', order_packages: [] },
      },
    ];

    const mockSingle = vi.fn().mockResolvedValue({
      data: { org_id: 'agency-org', role: 'AGENCY' },
      error: null,
    });
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();

    let fromCallCount = 0;
    mockSupabaseFrom.mockImplementation((table: string) => {
      fromCallCount++;
      if (table === 'zen_profiles') {
        return { select: mockSelect, eq: mockEq, single: mockSingle };
      }
      if (table === 'zen_agency_shippers') {
        const mockEq2 = vi.fn().mockResolvedValue({ data: [{ shipper_org_id: 'shipper-in-scope' }], error: null });
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
        return {
          select: vi.fn().mockReturnValue({ eq: mockEq1 }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockOrderQueryResult),
        insert: vi.fn().mockResolvedValue({ error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: any, reject: any) => Promise.resolve(mockOrderQueryResult).then(resolve, reject),
      };
    });

    const { getTodayUpsHistory } = await import('@/app/actions/operations/warehouse');
    const result = await getTodayUpsHistory();

    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].order.order_no).toBe('ORD-001');

    vi.mocked(validateUserAction).mockReset();
  });
});
