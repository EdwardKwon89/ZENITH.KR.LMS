import { describe, it, expect } from 'vitest';
import { OrderStatus } from '@/types/orders';
import { isOrderEditable } from '@/lib/logistics/status-machine';
import {
  getUpsEditAvailability,
  UPS_REGISTERED_EDIT_BLOCK_MESSAGE,
  UPS_STATUS_EDIT_BLOCK_MESSAGE,
  UPS_WAREHOUSED_EDIT_NOTICE,
} from '@/lib/orders/ups-edit-availability';

// TASK-B-339 (Issue #1254): UPS 오더 수정 가능 판정 — 등록 사실(활성 라벨)이 상태보다 우선한다.
//   결함 ①: HELD/RETURNED/CLAIMED는 PACKED·IN_TRANSIT 이후에도 전이 가능하므로 상태만으로는
//   "UPS 등록 전"을 보장하지 못한다.

describe('TASK-B-339: getUpsEditAvailability (Issue #1254)', () => {
  it('TC-AVL-01: (REGISTERED, 라벨 없음) → 수정 가능, message 없음', () => {
    const result = getUpsEditAvailability(OrderStatus.REGISTERED, false);
    expect(result.editable).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.message).toBeUndefined();
  });

  it('TC-AVL-02: (SCHEDULED, 라벨 없음) → 수정 가능', () => {
    const result = getUpsEditAvailability(OrderStatus.SCHEDULED, false);
    expect(result.editable).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('TC-AVL-03: (WAREHOUSED, 라벨 없음) → 수정 가능 + 재실측 안내 message 포함', () => {
    const result = getUpsEditAvailability(OrderStatus.WAREHOUSED, false);
    expect(result.editable).toBe(true);
    expect(result.message).toContain('재실측');
    expect(result.message).toBe(UPS_WAREHOUSED_EDIT_NOTICE);
  });

  it.each([
    [OrderStatus.PACKED, 'PACKED'],
    [OrderStatus.RELEASED, 'RELEASED'],
    [OrderStatus.IN_TRANSIT, 'IN_TRANSIT'],
    [OrderStatus.DELIVERED, 'DELIVERED'],
    [OrderStatus.CANCELED, 'CANCELED'],
    [OrderStatus.DISPOSED, 'DISPOSED'],
    [OrderStatus.MASTERED, 'MASTERED'],
  ] as [OrderStatus, string][])(
    'TC-AVL-04: (%s, 라벨 없음) → 수정 불가 + reason=STATUS',
    (status) => {
      const result = getUpsEditAvailability(status, false);
      expect(result.editable).toBe(false);
      expect(result.reason).toBe('STATUS');
      expect(result.message).toBe(UPS_STATUS_EDIT_BLOCK_MESSAGE);
    }
  );

  // 결함 ① 회귀 — 등록 후에도 갈 수 있는 상태에서의 수정 차단
  it.each([
    [OrderStatus.HELD, 'HELD'],
    [OrderStatus.RETURNED, 'RETURNED'],
    [OrderStatus.CLAIMED, 'CLAIMED'],
  ] as [OrderStatus, string][])(
    'TC-AVL-05: (%s, 활성 라벨 있음) → 수정 불가 + reason=UPS_REGISTERED (상태와 무관 최우선)',
    (status) => {
      const result = getUpsEditAvailability(status, true);
      expect(result.editable).toBe(false);
      expect(result.reason).toBe('UPS_REGISTERED');
      expect(result.message).toBe(UPS_REGISTERED_EDIT_BLOCK_MESSAGE);
      expect(result.message).toContain('UPS 등록취소');
    }
  );

  it('TC-AVL-06: (REGISTERED, 활성 라벨 있음) → 등록 사실이 상태보다 우선해 수정 불가', () => {
    const result = getUpsEditAvailability(OrderStatus.REGISTERED, true);
    expect(result.editable).toBe(false);
    expect(result.reason).toBe('UPS_REGISTERED');
  });

  it('TC-AVL-07: (WAREHOUSED, 활성 라벨 있음) → 입고 단계라도 등록됐으면 수정 불가', () => {
    const result = getUpsEditAvailability(OrderStatus.WAREHOUSED, true);
    expect(result.editable).toBe(false);
    expect(result.reason).toBe('UPS_REGISTERED');
    expect(result.message).not.toBe(UPS_WAREHOUSED_EDIT_NOTICE);
  });

  it('TC-AVL-08: OrderStatus 전체 순회 — 라벨 있으면 어떤 상태에서도 수정 불가', () => {
    // isOrderEditable은 HELD/RETURNED/CLAIMED를 "수정 가능"으로 본다(결함 ①).
    // getUpsEditAvailability는 내부에서 항상 transportMode='UPS'로 스코프를 조회하므로,
    // 라벨 없음의 기대값은 isOrderEditable과 동일하다 (WAREHOUSED+비UPS 불가는 별개 판정).
    for (const status of Object.values(OrderStatus)) {
      const withLabel = getUpsEditAvailability(status, true);
      expect(withLabel.editable).toBe(false);
      expect(withLabel.reason).toBe('UPS_REGISTERED');

      const withoutLabel = getUpsEditAvailability(status, false);
      expect(withoutLabel.editable).toBe(isOrderEditable(status));
      if (!isOrderEditable(status)) expect(withoutLabel.reason).toBe('STATUS');
    }
  });
});
