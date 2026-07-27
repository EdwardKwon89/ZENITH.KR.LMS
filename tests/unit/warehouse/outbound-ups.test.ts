import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderStatus } from '@/types/orders';

const mockValidate = vi.hoisted(() => vi.fn());
const mockUpdateStatus = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidate }));
vi.mock('@/app/actions/operations/orders', () => ({ updateOrderStatus: mockUpdateStatus }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockRepo = vi.hoisted(() => ({ findById: vi.fn() }));
vi.mock('@/lib/repositories', () => ({
  BaseRepository: class {},
  OrderRepository: class { constructor() { (this as any).findById = mockRepo.findById; } },
  FinanceRepository: class {},
  AdminRepository: class {},
}));

import { confirmOutbound } from '@/app/actions/warehouse';

function makeDb(pkgData: any[]) {
  return {
    from(table: string) {
      if (table === 'zen_order_packages') {
        return { select: () => ({ eq: () => Promise.resolve({ data: pkgData, error: null }) }) };
      }
      const self: any = { insert: () => self, select: () => self };
      return self;
    },
  };
}

describe('TC-UPS-WH: 창고 출고 UPS 연계', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-UPS-WH-01: intl_ref_no 있는 PKG → 정상 출고', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'u1' }, profile: { id: 'u1', role: 'ADMIN', org_id: 'o1' },
      supabase: makeDb([{ id: 'p1', intl_ref_no: '1Z999', packing_count: 1 }]),
    });
    mockRepo.findById.mockResolvedValue({ data: { id: 'o1', status: OrderStatus.WAREHOUSED, order_no: 'Z-1', packages: [] }, error: null });
    const r = await confirmOutbound('o1');
    expect(r.success).toBe(true);
    expect(r.pkgsWithoutIntlRef).toBe(0);
  });

  it('TC-UPS-WH-02: intl_ref_no 없는 PKG → pkgsWithoutIntlRef > 0', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'u1' }, profile: { id: 'u1', role: 'ADMIN', org_id: 'o1' },
      supabase: makeDb([
        { id: 'p2', intl_ref_no: '1Z999', packing_count: 1 },
        { id: 'p3', intl_ref_no: null, packing_count: 1 },
      ]),
    });
    mockRepo.findById.mockResolvedValue({ data: { id: 'o2', status: OrderStatus.WAREHOUSED, order_no: 'Z-2', packages: [] }, error: null });
    const r = await confirmOutbound('o2');
    expect(r.success).toBe(true);
    expect(r.pkgsWithoutIntlRef).toBe(1);
  });

  it('TC-UPS-WH-03: 상태 전이 정상 유지', async () => {
    mockValidate.mockResolvedValue({
      user: { id: 'u1' }, profile: { id: 'u1', role: 'ADMIN', org_id: 'o1' },
      supabase: makeDb([{ id: 'p4', intl_ref_no: '1Z999', packing_count: 2 }]),
    });
    mockRepo.findById.mockResolvedValue({ data: { id: 'o3', status: OrderStatus.WAREHOUSED, order_no: 'Z-3', packages: [{ packing_count: 2 }] }, error: null });
    const r = await confirmOutbound('o3');
    expect(r.success).toBe(true);
    expect(mockUpdateStatus).toHaveBeenCalledWith('o3', OrderStatus.RELEASED, '[출고확정]');
  });
});
