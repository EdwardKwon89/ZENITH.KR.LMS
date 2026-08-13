import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// TASK-B-295 (Issue #1100): OrderRegistrationForm "내 정보 사용/수기입력" 토글 회귀 테스트.
//
// 실제 컴포넌트를 RTL로 렌더링해 토글 동작·shipper_name 입력값 반영을 검증한다.

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = { shipper_label: 'Shipper', submit: 'Submit' };
    return map[key] ?? key;
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));
vi.mock('framer-motion', () => ({ motion: { div: ({ children }: any) => <div>{children}</div> }, AnimatePresence: ({ children }: any) => <>{children}</> }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/app/actions/master', () => ({
  getCurrentUserAffiliation: vi.fn().mockResolvedValue({
    userId: 'u', userName: 'Individual User', userEmail: 'x@x.kr', role: 'SHIPPER',
    orgId: '550e8400-e29b-41d4-a716-446655440001', orgName: 'MASTER AIR', orgAddress: 'S',
    orgBizNo: '1', orgCountryCode: 'KR', orgStateProvince: '', orgCity: '', orgAddressStreet: '',
    orgAddressDetail: '', orgZipcode: '', isIndividual: false, dummyIndividualId: '1',
  }),
}));
vi.mock('@/app/actions/agency/shipper-link', () => ({ getAgencyOrgIdByShipper: vi.fn().mockResolvedValue(null) }));
vi.mock('@/app/actions/ups/rates', () => ({ getUpsProducts: vi.fn().mockResolvedValue([]) }));
vi.mock('@/app/actions/ups/freight', () => ({ estimateUpsFreight: vi.fn().mockResolvedValue({}) }));
vi.mock('@/app/actions/operations/order-services', () => ({ createOrderServices: vi.fn().mockResolvedValue({}) }));
vi.mock('@/app/actions/operations/address-book', () => ({ createAddressBookEntry: vi.fn().mockResolvedValue({}) }));
vi.mock('@/app/actions/operations/service-rates', () => ({ getAvailableServiceRates: vi.fn().mockResolvedValue({ rates: {}, combinations: [] }), getUsdKrwRate: vi.fn().mockResolvedValue(1350), getBaseCurrency: vi.fn().mockResolvedValue('KRW') }));
vi.mock('@/app/actions/orders', () => ({ createOrder: vi.fn().mockResolvedValue({ id: 'x', order_no: 'Z' }) }));
vi.mock('@/app/actions/operations/orders', () => ({ updateOrder: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock('@/components/orders/UpsServiceSelector', () => ({ UpsServiceSelector: () => <div /> }));
vi.mock('@/components/orders/UpsFreightEstimateSection', () => ({ UpsFreightEstimateSection: () => <div /> }));
vi.mock('@/components/address-book/AddressBookSelector', () => ({ default: () => <div /> }));
vi.mock('@/components/common/AddressInput', () => ({ AddressInput: () => <div /> }));

import { OrderRegistrationForm } from '@/components/orders/OrderRegistrationForm';

const SHIPPER_ORG = '550e8400-e29b-41d4-a716-446655440001';

function validDefaults(overrides: Record<string, unknown> = {}) {
  return {
    order_type: 'B2B' as const,
    shipper_id: SHIPPER_ORG,
    shipper_contact_name: 'Kim',
    recipient_name: 'John',
    recipient_address: '123 St',
    recipient_phone: '010-2',
    transport_mode: 'AIR' as const,
    packages: [{
      packing_unit: 'BOX', packing_count: 1, physical_box_count: 1, length: 0, width: 0, height: 0,
      gross_weight: 5, special_cargo_type: 'NONE', content_type: 'GENERAL',
      items: [{ item_name: 'W', quantity: 1, unit_price: 1, currency: 'USD', item_packing_unit: 'EA' }],
    }],
    ...overrides,
  };
}

afterEach(() => cleanup());

describe('TASK-B-295: 화주명 토글 (Issue #1100)', () => {
  it('TC-295-04: 기본 "내 정보 사용" — shipper_name 입력란이 disabled이고 affiliation orgName과 일치', async () => {
    const { container } = render(
      <OrderRegistrationForm shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]} ports={[]} defaultValues={validDefaults()} />
    );
    const input = container.querySelector('input[name="shipper_name"]') as HTMLInputElement;
    await waitFor(() => {
      expect(input).toBeTruthy();
    });
    // 내 정보 사용 모드(기본) → disabled
    expect(input.disabled).toBe(true);
    // affiliation.orgName('MASTER AIR') 자동 반영
    expect(input.value).toBe('MASTER AIR');
  });

  it('TC-295-05: "수기입력" 클릭 → 입력란 활성화 + 자유 텍스트가 폼 상태에 반영', async () => {
    const { container } = render(
      <OrderRegistrationForm shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]} ports={[]} defaultValues={validDefaults()} />
    );
    const input = container.querySelector('input[name="shipper_name"]') as HTMLInputElement;
    await waitFor(() => expect(input).toBeTruthy());

    const manualBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '수기입력');
    expect(manualBtn).toBeTruthy();
    fireEvent.click(manualBtn!);

    expect(input.disabled).toBe(false);
    fireEvent.change(input, { target: { value: 'Test Shipper ABC' } });
    expect(input.value).toBe('Test Shipper ABC');
  });

  it('TC-295-06: "수기입력" → "내 정보 사용" 재전환 시 조직명으로 복원', async () => {
    const { container } = render(
      <OrderRegistrationForm shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]} ports={[]} defaultValues={validDefaults()} />
    );
    const input = container.querySelector('input[name="shipper_name"]') as HTMLInputElement;
    await waitFor(() => expect(input).toBeTruthy());

    fireEvent.click(Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '수기입력')!);
    fireEvent.change(input, { target: { value: 'Test Shipper ABC' } });
    expect(input.value).toBe('Test Shipper ABC');

    fireEvent.click(Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '내 정보 사용')!);
    expect(input.disabled).toBe(true);
    expect(input.value).toBe('MASTER AIR'); // 조직명 복원
  });

  it('TC-295-07: 수정 모드 — 기존 저장 shipper_name이 조직명과 다르면 "수기입력"으로 시작 + 값 유지', async () => {
    const { container } = render(
      <OrderRegistrationForm
        shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]}
        ports={[]}
        orderId="order-edit-1"
        defaultValues={validDefaults({ shipper_name: 'Saved Custom Shipper' })}
      />
    );
    const input = container.querySelector('input[name="shipper_name"]') as HTMLInputElement;
    await waitFor(() => expect(input).toBeTruthy());

    // 저장값이 조직명('MASTER AIR')과 다르므로 수기입력 모드로 시작 → enabled + 값 유지
    expect(input.disabled).toBe(false);
    expect(input.value).toBe('Saved Custom Shipper');
  });
});
