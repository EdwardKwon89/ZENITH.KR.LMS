import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// TASK-B-303 (Issue #1125): 오더 등록/수정 이력 — 회귀 테스트 (unit)
//
// ① edit-log-fields: 화이트리스트 부분 스냅샷 추출/제외
// ② UpsOrderEditHistoryPanel: CREATE 전체 표시 / UPDATE diff만 표시 / 시간 역순 / 빈 이력 미표시
// ③ createOrder: zen_order_edit_log에 action=CREATE 기록 (mock supabase)

// ── mocks ────────────────────────────────────────────────────────
const mockValidateUserAction = vi.hoisted(() => vi.fn());
const mockCreateAdminClient = vi.hoisted(() => vi.fn());
const mockOrderRepository = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: mockValidateUserAction,
  requireAuth: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock('@/lib/repositories', () => ({
  OrderRepository: mockOrderRepository,
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (fn: any) => fn,
}));

// ── imports ──────────────────────────────────────────────────────
import {
  ORDER_EDIT_LOG_CORE_FIELDS,
  extractOrderEditLogSnapshot,
} from '@/lib/orders/edit-log-fields';
import UpsOrderEditHistoryPanel from '@/components/ups/UpsOrderEditHistoryPanel';

const ORDER_ID = '30300000-0000-4000-8000-000000000010';

function buildSupabaseMock(insertCalls: any[]) {
  return {
    from: (table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn((data: unknown) => {
        if (table === 'zen_order_edit_log') insertCalls.push(data);
        return { error: null };
      }),
      update: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }),
  };
}

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    order_type: 'B2B' as const,
    shipper_id: '30300000-0000-4000-8000-000000000002',
    recipient_name: 'Recipient A',
    recipient_address: '123 Main St',
    recipient_phone: '010-1234-5678',
    recipient_country_code: 'US',
    recipient_zipcode: '90001',
    recipient_city: 'Los Angeles',
    shipper_contact_phone: '010-0000-0000',
    transport_mode: 'UPS' as const,
    ups_product_code: 'WW_EXPEDITED',
    packages: [
      {
        packing_unit: 'BOX',
        packing_count: 1,
        physical_box_count: 1,
        length: 10,
        width: 10,
        height: 10,
        gross_weight: 1,
        special_cargo_type: 'NONE',
        content_type: 'NONDOC',
        items: [{ item_name: 'Item', quantity: 1, unit_price: 10, currency: 'USD' }],
      },
    ],
    ...overrides,
  };
}

describe('① edit-log-fields — 화이트리스트 부분 스냅샷', () => {
  it('TC-B303-01: 화이트리스트 필드만 추출하고 값이 없는 필드는 null로 채움', () => {
    const row = {
      shipper_id: 'org-1',
      recipient_name: 'Recipient A',
      recipient_phone: '010-1',
      estimated_cost: 1234, // 제외 대상
      packages: [], // 제외 대상
      random_field: 'x',
    };
    const snap = extractOrderEditLogSnapshot(row as any);

    // 화이트리스트 필드는 포함
    expect(snap.shipper_id).toBe('org-1');
    expect(snap.recipient_name).toBe('Recipient A');
    expect(snap.recipient_phone).toBe('010-1');
    // 제외 대상(estimated_cost/packages/items/origin_port_id/dest_port_id)은 없음
    expect(snap.estimated_cost).toBeUndefined();
    expect(snap.packages).toBeUndefined();
    expect(snap.items).toBeUndefined();
    expect(snap.origin_port_id).toBeUndefined();
    expect(snap.dest_port_id).toBeUndefined();
    // 화이트리스트 밖 필드는 없음
    expect(snap.random_field).toBeUndefined();
    // 빈 필드는 null
    expect(snap.recipient_email).toBeNull();
    expect(snap.delivery_notes).toBeNull();
  });

  it('TC-B303-02: 화이트리스트 필드가 추출되는지 상수 목록과 일치', () => {
    const keys = Object.keys(extractOrderEditLogSnapshot({}));
    expect(keys.sort()).toEqual([...ORDER_EDIT_LOG_CORE_FIELDS].sort());
  });
});

describe('② UpsOrderEditHistoryPanel — 등록/수정 이력 렌더', () => {
  it('TC-B303-03: 빈 이력이면 패널을 렌더하지 않음', () => {
    const { container } = render(<UpsOrderEditHistoryPanel history={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('TC-B303-04: CREATE 이력은 new_data 전체를 등록값으로 표시', () => {
    render(
      <UpsOrderEditHistoryPanel
        history={[
          {
            id: '1',
            action: 'CREATE',
            old_data: null,
            new_data: { recipient_name: 'Recipient A', recipient_phone: '010-1', recipient_email: null },
            order_status_at_edit: 'REGISTERED',
            edited_at: '2026-08-14T00:00:00Z',
            operator: { full_name: 'Test Operator' },
          },
        ]}
      />
    );
    expect(screen.getByText('CREATE')).toBeTruthy();
    expect(screen.getByText('등록/수정 이력 (1건)')).toBeTruthy();
    expect(screen.getByText('Test Operator')).toBeTruthy();
    // 등록값 표시 (전체 필드)
    expect(screen.getByText('Recipient A')).toBeTruthy();
    expect(screen.getByText('010-1')).toBeTruthy();
    // 변경사항 없음 라벨은 미표시
    expect(screen.queryByText('변경사항 없음')).toBeNull();
  });

  it('TC-B303-05: UPDATE 이력은 실제로 바뀐 필드만 old→new diff로 표시', () => {
    render(
      <UpsOrderEditHistoryPanel
        history={[
          {
            id: '2',
            action: 'UPDATE',
            old_data: { recipient_name: 'Recipient A', recipient_phone: '010-1', recipient_email: 'a@b.c' },
            new_data: { recipient_name: 'Recipient A', recipient_phone: '010-9999', recipient_email: 'a@b.c' },
            order_status_at_edit: 'REGISTERED',
            edited_at: '2026-08-14T01:00:00Z',
            operator: { full_name: 'Operator B' },
          },
        ]}
      />
    );
    // 변경된 필드만 — 수하인 연락처 diff 노출
    expect(screen.getByText(/010-1/)).toBeTruthy();
    expect(screen.getByText(/010-9999/)).toBeTruthy();
    // 변경되지 않은 필드(수하인명)는 diff에 미노출
    expect(screen.queryByText(/수하인명/)).toBeNull();
    expect(screen.queryByText(/a@b\.c/)).toBeNull();
  });

  it('TC-B303-06: 이력은 시간 역순(배열 순서)으로 렌더', () => {
    const { container } = render(
      <UpsOrderEditHistoryPanel
        history={[
          {
            id: '2', action: 'UPDATE', old_data: { recipient_phone: '010-1' }, new_data: { recipient_phone: '010-2' },
            order_status_at_edit: 'REGISTERED', edited_at: '2026-08-14T02:00:00Z', operator: { full_name: 'A' },
          },
          {
            id: '1', action: 'CREATE', old_data: null, new_data: { recipient_phone: '010-1' },
            order_status_at_edit: 'REGISTERED', edited_at: '2026-08-14T00:00:00Z', operator: { full_name: 'B' },
          },
        ]}
      />
    );
    const badges = container.querySelectorAll('span.font-bold');
    const firstBadge = badges[0]?.textContent ?? '';
    expect(firstBadge).toBe('UPDATE');
  });
});

describe('③ createOrder — CREATE 이력 기록 (mock supabase)', () => {
  const insertCalls: any[] = [];

  beforeEach(async () => {
    insertCalls.length = 0;
    mockValidateUserAction.mockResolvedValue({
      supabase: buildSupabaseMock(insertCalls),
      user: { id: '30300000-0000-4000-8000-000000000001' },
      profile: { id: '30300000-0000-4000-8000-000000000001', role: 'ADMIN', org_id: '30300000-0000-4000-8000-000000000002' },
    });
    mockCreateAdminClient.mockResolvedValue({
      from: () => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockOrderRepository.mockImplementation(function () {
      return {
        createOrderViaRpc: vi.fn().mockResolvedValue({ data: { id: ORDER_ID }, error: null }),
      };
    });
  });

  it('TC-B303-07: createOrder가 edit_log에 action=CREATE + old_data=null + new_data 스냅샷을 기록', async () => {
    const { createOrder } = await import('@/app/actions/operations/orders');
    await createOrder(buildPayload() as any);

    expect(insertCalls.length).toBe(1);
    const log = insertCalls[0];
    expect(log.order_id).toBe(ORDER_ID);
    expect(log.action).toBe('CREATE');
    expect(log.old_data).toBeNull();
    expect(log.order_status_at_edit).toBe('REGISTERED');
    // new_data에 핵심 필드 스냅샷
    expect(log.new_data.recipient_name).toBe('Recipient A');
    expect(log.new_data.recipient_phone).toBe('010-1234-5678');
    expect(log.new_data.shipper_contact_phone).toBe('010-0000-0000');
    expect(log.new_data.transport_mode).toBe('UPS');
  });
});
