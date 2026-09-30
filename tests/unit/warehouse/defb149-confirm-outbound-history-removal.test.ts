// DEF-B-149 / Issue #1202 / TASK-B-329: confirmOutbound()의 zen_inventory_history insert 제거
// — SKU 재고 원장(ledger)은 inventory.ts 관리 영역이고 UPS 프레이트 오더는 zen_inventory 레코드와 무관하여
//   inventory_id NOT NULL 위반으로 도입 시점부터 단 한 번도 성공한 적 없는 insert였다(JSJung 확정: 제거).
// 실제 confirmOutbound()를 호출해 (1) zen_inventory_history로의 from/insert 호출 자체가 0건인지,
// (2) 기존 정상 동작(RELEASED 전환·revalidatePath·pkgsWithoutIntlRef)이 보존되는지를 반환값으로 검증한다.
// 소스 문자열 검사·함수 존재 확인 패턴 금지 — 전부 실제 mock 호출 기반.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderStatus } from '@/types/orders';

const mockValidate = vi.hoisted(() => vi.fn());
const mockUpdateStatus = vi.hoisted(() => vi.fn());
const mockRevalidate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({ validateUserAction: mockValidate }));
vi.mock('@/app/actions/operations/orders', () => ({ updateOrderStatus: mockUpdateStatus }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }));

const mockRepo = vi.hoisted(() => ({ findById: vi.fn() }));
vi.mock('@/lib/repositories', () => ({
  BaseRepository: class {},
  OrderRepository: class { constructor() { (this as any).findById = mockRepo.findById; } },
  FinanceRepository: class {},
  AdminRepository: class {},
}));

import { confirmOutbound } from '@/app/actions/operations/warehouse';

// supabase.from(table) 호출을 기록하는 mock — history insert가 발생하면 fromCalls에 잡힌다.
function makeDb(pkgData: any[]) {
  const fromCalls: string[] = [];
  const insertCalls: { table: string; payload: unknown }[] = [];
  const db = {
    fromCalls,
    insertCalls,
    from(table: string) {
      fromCalls.push(table);
      if (table === 'zen_order_packages') {
        return { select: () => ({ eq: () => Promise.resolve({ data: pkgData, error: null }) }) };
      }
      const self: any = { insert: () => self, select: () => self, eq: () => self, single: () => Promise.resolve({ data: null, error: null }) };
      return self;
    },
  };
  return db;
}

function setupAdmin(pkgData: any[], orderData: any) {
  const db = makeDb(pkgData);
  mockValidate.mockResolvedValue({
    user: { id: 'u1' },
    profile: { id: 'u1', role: 'ADMIN', org_id: 'o1' },
    supabase: db,
  });
  mockRepo.findById.mockResolvedValue({ data: orderData, error: null });
  return db;
}

describe('DEF-B-149: confirmOutbound zen_inventory_history insert 제거', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('출고확정 시 zen_inventory_history로의 from/insert 호출이 0건이다 (제거 검증)', async () => {
    const db = setupAdmin(
      [{ id: 'p1', intl_ref_no: '1Z999', packing_count: 1 }],
      { id: 'o1', status: OrderStatus.WAREHOUSED, order_no: 'Z-1', packages: [], org_id: 'o1', shipper_id: 's1' },
    );

    const r = await confirmOutbound('o1');

    expect(r.success).toBe(true);
    expect(db.fromCalls.filter((t) => t === 'zen_inventory_history')).toHaveLength(0);
    expect(db.insertCalls.filter((c) => c.table === 'zen_inventory_history')).toHaveLength(0);
    // 정상 동작: 출고 패키지 조회는 여전히 발생
    expect(db.fromCalls).toContain('zen_order_packages');
  });

  it('상태 전환(RELEASED)과 revalidatePath는 그대로 수행된다', async () => {
    setupAdmin(
      [{ id: 'p1', intl_ref_no: '1Z999', packing_count: 2 }],
      { id: 'o2', status: OrderStatus.PACKED, order_no: 'Z-2', packages: [], org_id: 'o1', shipper_id: 's1' },
    );

    const r = await confirmOutbound('o2');

    expect(r.success).toBe(true);
    expect(mockUpdateStatus).toHaveBeenCalledWith('o2', OrderStatus.RELEASED, '[출고확정]');
    expect(mockRevalidate).toHaveBeenCalled();
  });

  it('pkgsWithoutIntlRef 계산이 보존된다', async () => {
    setupAdmin(
      [
        { id: 'p1', intl_ref_no: '1Z999', packing_count: 1 },
        { id: 'p2', intl_ref_no: null, packing_count: 1 },
        { id: 'p3', intl_ref_no: null, packing_count: 1 },
      ],
      { id: 'o3', status: OrderStatus.WAREHOUSED, order_no: 'Z-3', packages: [], org_id: 'o1', shipper_id: 's1' },
    );

    const r = await confirmOutbound('o3');

    expect(r.success).toBe(true);
    expect(r.pkgsWithoutIntlRef).toBe(2);
  });

  it('WAREHOUSED/PACKED 아닌 오더는 여전히 거부된다', async () => {
    setupAdmin(
      [],
      { id: 'o4', status: OrderStatus.REGISTERED, order_no: 'Z-4', packages: [], org_id: 'o1', shipper_id: 's1' },
    );

    await expect(confirmOutbound('o4')).rejects.toThrow();
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it('이제 history insert가 없으므로 레코드가 부족해도(빈 packages) 성공한다', async () => {
    const db = setupAdmin(
      [],
      { id: 'o5', status: OrderStatus.WAREHOUSED, order_no: 'Z-5', packages: [], org_id: 'o1', shipper_id: 's1' },
    );

    const r = await confirmOutbound('o5');

    expect(r.success).toBe(true);
    expect(r.pkgsWithoutIntlRef).toBe(0);
    expect(db.fromCalls.filter((t) => t === 'zen_inventory_history')).toHaveLength(0);
  });
});