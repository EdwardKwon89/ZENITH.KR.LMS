import { describe, it, expect, vi, beforeEach } from 'vitest';
import { confirmOutbound } from '@/app/actions/warehouse';
import { validateUserAction } from '@/lib/auth/guards';
import { OrderStatus } from '@/types/orders';

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: vi.fn() }));
vi.mock('@/app/actions/operations/orders', () => ({ updateOrderStatus: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

function makeDb() {
  const c: any = {};
  c.from = () => c; c.select = () => c; c.eq = () => c;
  c.order = () => c; c.insert = () => c;
  c.single = () => Promise.resolve({ data: null, error: null });
  return c;
}

describe('TC-UPS-WH: 창고 출고 UPS 연계', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDb();
    (validateUserAction as any).mockResolvedValue({
      user: { id: 'u1' }, profile: { id: 'u1', role: 'ADMIN', org_id: 'o1' }, supabase: db,
    });
  });

  it('TC-UPS-WH-01: intl_ref_no 있는 PKG → 정상 출고', async () => {
    db.single = () => Promise.resolve({
      data: { id: 'o1', status: OrderStatus.WAREHOUSED, order_no: 'Z-1',
        order_packages: [{ id: 'p1', intl_ref_no: '1Z999', packing_count: 1 }] },
      error: null,
    });
    const r = await confirmOutbound('o1');
    expect(r.success).toBe(true); expect(r.pkgsWithoutIntlRef).toBe(0);
  });

  it('TC-UPS-WH-02: intl_ref_no 없는 PKG → pkgsWithoutIntlRef > 0', async () => {
    db.single = () => Promise.resolve({
      data: { id: 'o2', status: OrderStatus.WAREHOUSED, order_no: 'Z-2',
        order_packages: [
          { id: 'p2', intl_ref_no: '1Z999', packing_count: 1 },
          { id: 'p3', intl_ref_no: null, packing_count: 1 },
        ] },
      error: null,
    });
    const r = await confirmOutbound('o2');
    expect(r.success).toBe(true); expect(r.pkgsWithoutIntlRef).toBe(1);
  });

  it('TC-UPS-WH-03: 상태 전이 정상 유지', async () => {
    db.single = () => Promise.resolve({
      data: { id: 'o3', status: OrderStatus.WAREHOUSED, order_no: 'Z-3',
        order_packages: [{ id: 'p4', intl_ref_no: '1Z999', packing_count: 2 }] },
      error: null,
    });
    const { updateOrderStatus } = await import('@/app/actions/operations/orders');
    const r = await confirmOutbound('o3');
    expect(r.success).toBe(true);
    expect(updateOrderStatus).toHaveBeenCalledWith('o3', OrderStatus.RELEASED, '[출고확정]');
  });
});
