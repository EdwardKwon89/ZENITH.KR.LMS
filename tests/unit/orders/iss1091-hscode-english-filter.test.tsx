import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// TASK-B-293 (Issue #1091): handleItemNameBlur 영문 전용 사전 필터 회귀 테스트.
//
// 실제 OrderRegistrationForm을 RTL로 렌더링하고, 품명 input에서 blur 이벤트를 발생시켜
// fetch 호출 여부를 검증한다 — 한글 등 비영문 입력 시 fetch 미호출, 영문 입력 시 호출.

const h = vi.hoisted(() => ({ mockFetch: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));
vi.mock('framer-motion', () => ({ motion: { div: ({ children, ...p }: any) => <div>{children}</div> }, AnimatePresence: ({ children }: any) => <>{children}</> }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/app/actions/master', () => ({ getCurrentUserAffiliation: vi.fn().mockResolvedValue({ userId: 'u', userName: 'X', userEmail: 'x@x.kr', role: 'SHIPPER', orgId: '550e8400-e29b-41d4-a716-446655440001', orgName: 'M', orgAddress: 'S', orgBizNo: '1', orgCountryCode: 'KR', orgStateProvince: '', orgCity: '', orgAddressStreet: '', orgAddressDetail: '', orgZipcode: '', isIndividual: false, dummyIndividualId: '1' }) }));
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
    shipper_contact_email: 'shipper@test.kr',
    shipper_contact_phone: '010-1',
    recipient_name: 'John',
    recipient_address: '123 St',
    recipient_phone: '010-2',
    recipient_country_code: 'US',
    recipient_city: 'LA',
    recipient_zipcode: '90001',
    delivery_method: 'DIRECT' as const,
    transport_mode: 'AIR' as const,
    origin_port_id: '550e8400-e29b-41d4-a716-446655440002',
    dest_port_id: '550e8400-e29b-41d4-a716-446655440003',
    packages: [{
      packing_unit: 'BOX', packing_count: 1, physical_box_count: 1, length: 0, width: 0, height: 0,
      gross_weight: 5, special_cargo_type: 'NONE', content_type: 'GENERAL',
      items: [{ item_name: 'Widget', quantity: 1, unit_price: 1, currency: 'USD', item_packing_unit: 'EA' }],
    }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.mockFetch.mockResolvedValue({ ok: true, json: async () => ({ hs_code: '123456', confidence: 'high' }) });
  global.fetch = h.mockFetch as any;
});

afterEach(() => {
  cleanup();
});

describe('TASK-B-293: handleItemNameBlur 영문 필터 (Issue #1091)', () => {
  it('TC-293-07: 한글 등 비영문 품명 blur → fetch 미호출 (AI 비용 방지)', async () => {
    const { container } = render(
      <OrderRegistrationForm shippers={[{ id: SHIPPER_ORG, name: 'M' }]} ports={[]} defaultValues={validDefaults()} />
    );

    // 품명 input 찾기 (packages.0.items.0.item_name)
    const itemInput = container.querySelector('input[name="packages.0.items.0.item_name"]') as HTMLInputElement;
    expect(itemInput).toBeTruthy();
    fireEvent.change(itemInput, { target: { value: '휴대폰' } });
    fireEvent.blur(itemInput);

    await new Promise((r) => setTimeout(r, 300));
    expect(h.mockFetch).not.toHaveBeenCalled();
  });

  it('TC-293-08: 영문 품명 blur → 기존대로 fetch 호출 (회귀 방지)', async () => {
    const { container } = render(
      <OrderRegistrationForm shippers={[{ id: SHIPPER_ORG, name: 'M' }]} ports={[]} defaultValues={validDefaults()} />
    );

    const itemInput = container.querySelector('input[name="packages.0.items.0.item_name"]') as HTMLInputElement;
    fireEvent.change(itemInput, { target: { value: 'Widget' } });
    fireEvent.blur(itemInput);

    await waitFor(() => {
      expect(h.mockFetch).toHaveBeenCalled();
    });
    expect(h.mockFetch.mock.calls[0][0]).toBe('/api/hs-lookup');
  });
});
