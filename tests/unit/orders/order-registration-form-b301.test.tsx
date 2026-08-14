// TASK-B-301 (Issue #1121): ③ 오더 등록/수정 폼 필수표시 감사
// - UPS 모드: shipper_contact (Phone) 라벨 + recipient AddressInput 국가/우편번호/도시에 `*`
// - CN 국가: recipient 시/도 라벨에 `*`
// - 비UPS·비CN: 해당 `*` 미표시 (조건부 정확성) — AddressInput 실제 렌더링
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

const h = vi.hoisted(() => ({
  mockGetCurrentUserAffiliation: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      shipper_label: 'Shipper',
      submit: 'Submit',
      shipper_biz_no: 'Biz No',
      shipper_contact: 'Shipper Contact',
      form_address: 'Address',
      form_address_detail: 'Detail Address',
      form_country: 'Country',
      form_zipcode: 'Zip Code',
      form_state_province: 'State / Province',
      form_city: 'City',
      form_address_search: 'Search',
    };
    return map[key] ?? key;
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));
vi.mock('framer-motion', () => ({ motion: { div: ({ children }: any) => <div>{children}</div> }, AnimatePresence: ({ children }: any) => <>{children}</> }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/app/actions/master', () => ({
  getCurrentUserAffiliation: (...args: any[]) => h.mockGetCurrentUserAffiliation(...args),
}));
vi.mock('@/app/actions/agency/shipper-link', () => ({ getAgencyOrgIdByShipper: vi.fn().mockResolvedValue(null) }));
vi.mock('@/app/actions/ups/rates', () => ({ getUpsProducts: vi.fn().mockResolvedValue([]) }));
vi.mock('@/app/actions/ups/freight', () => ({ estimateUpsFreight: vi.fn().mockResolvedValue({}) }));
vi.mock('@/app/actions/operations/order-services', () => ({ createOrderServices: vi.fn().mockResolvedValue({}) }));
vi.mock('@/app/actions/operations/address-book', () => ({ createAddressBookEntry: vi.fn().mockResolvedValue({}) }));
vi.mock('@/app/actions/operations/service-rates', () => ({ getAvailableServiceRates: vi.fn().mockResolvedValue({ rates: {}, combinations: [] }), getUsdKrwRate: vi.fn().mockResolvedValue(1350), getBaseCurrency: vi.fn().mockResolvedValue('KRW') }));
vi.mock('@/app/actions/orders', () => ({ createOrder: vi.fn().mockResolvedValue({}) }));
vi.mock('@/app/actions/operations/orders', () => ({ updateOrder: vi.fn().mockResolvedValue({}) }));
vi.mock('@/components/orders/UpsServiceSelector', () => ({ UpsServiceSelector: () => <div /> }));
vi.mock('@/components/orders/UpsFreightEstimateSection', () => {
  function MockEstimate(props: any) {
    React.useEffect(() => { props.onProductChange?.('prod-1', 'WW_EXPEDITED'); }, []);
    return <div />;
  }
  return { UpsFreightEstimateSection: MockEstimate };
});
vi.mock('@/components/address-book/AddressBookSelector', () => ({ default: () => <div /> }));
// NOTE: AddressInput은 mock 금지 — 실제 컴포넌트 렌더링

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
    recipient_country_code: 'US',
    recipient_zipcode: '90001',
    recipient_city: 'LA',
    shipper_contact_phone: '010-0000-0000',
    transport_mode: 'AIR' as const,
    origin_port_id: '550e8400-e29b-41d4-a716-446655440002',
    dest_port_id: '550e8400-e29b-41d4-a716-446655440003',
    packages: [{
      packing_unit: 'BOX', packing_count: 1, physical_box_count: 1, length: 0, width: 0, height: 0,
      gross_weight: 5, special_cargo_type: 'NONE', content_type: 'GENERAL',
      items: [{ item_name: 'W', quantity: 1, unit_price: 1, currency: 'USD', item_packing_unit: 'EA' }],
    }],
    ...overrides,
  };
}

function renderForm(overrides: Record<string, unknown> = {}) {
  const view = render(
    <OrderRegistrationForm shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]} ports={[]} defaultValues={validDefaults(overrides)} />
  );
  return view;
}

function labelTexts(container: HTMLElement) {
  return Array.from(container.querySelectorAll('label')).map((l) => l.textContent?.trim() ?? '');
}

function openConsigneeTab(container: HTMLElement) {
  const btn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '수하인 정보');
  expect(btn).toBeTruthy();
  fireEvent.click(btn!);
}

afterEach(() => cleanup());

describe('TASK-B-301 ③-1: shipper_contact (Phone) 필수표시 (UPS 모드 전용)', () => {
  beforeEach(() => {
    h.mockGetCurrentUserAffiliation.mockResolvedValue({
      userId: 'u', userName: 'User Kim', userEmail: 'kim@test.kr', userPhone: '010-9999-9999', role: 'SHIPPER',
      orgId: SHIPPER_ORG, orgName: 'MASTER AIR', orgAddress: 'Seoul HQ',
      orgBizNo: '111-11-22222', orgCountryCode: 'KR', orgStateProvince: '41', orgCity: 'Seongnam-si',
      orgAddressStreet: 'Street 1', orgAddressDetail: 'Bldg 2', orgZipcode: '04515',
      isIndividual: false, dummyIndividualId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('transport_mode=UPS → "Shipper Contact (Phone) *" 표시', () => {
    const { container } = renderForm({ transport_mode: 'UPS' });
    expect(container.textContent).toContain('Shipper Contact (Phone) *');
  });

  it('transport_mode=AIR → "*" 미표시', () => {
    const { container } = renderForm({ transport_mode: 'AIR' });
    expect(container.textContent).toContain('Shipper Contact (Phone)');
    expect(container.textContent).not.toContain('Shipper Contact (Phone) *');
  });
});

describe('TASK-B-301 ③-2: recipient AddressInput 하위 필드 필수표시 (UPS 모드 전용)', () => {
  beforeEach(() => {
    h.mockGetCurrentUserAffiliation.mockResolvedValue({
      userId: 'u', userName: 'User Kim', userEmail: 'kim@test.kr', userPhone: '010-9999-9999', role: 'SHIPPER',
      orgId: SHIPPER_ORG, orgName: 'MASTER AIR', orgAddress: 'Seoul HQ',
      orgBizNo: '111-11-22222', orgCountryCode: 'KR', orgStateProvince: '41', orgCity: 'Seongnam-si',
      orgAddressStreet: 'Street 1', orgAddressDetail: 'Bldg 2', orgZipcode: '04515',
      isIndividual: false, dummyIndividualId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('UPS + US(비CN) → 국가/우편번호/도시에 "*", 시/도는 미표시', () => {
    const { container } = renderForm({ transport_mode: 'UPS', recipient_country_code: 'US' });
    openConsigneeTab(container);

    const labels = labelTexts(container);
    expect(labels).toContain('Country *');
    expect(labels).toContain('Zip Code *');
    expect(labels).toContain('City *');
    expect(labels).toContain('State / Province');
    expect(labels).not.toContain('State / Province *');
  });

  it('AIR + US → 국가/우편번호/도시에 "*" 미표시', () => {
    const { container } = renderForm({ transport_mode: 'AIR', recipient_country_code: 'US' });
    openConsigneeTab(container);

    const labels = labelTexts(container);
    expect(labels).toContain('Country');
    expect(labels).not.toContain('Country *');
    expect(labels).not.toContain('Zip Code *');
    expect(labels).not.toContain('City *');
    expect(labels).not.toContain('State / Province *');
  });

  it('UPS + CN → 시/도에도 "*" 표시 (국가/우편번호/도시 포함)', () => {
    const { container } = renderForm({ transport_mode: 'UPS', recipient_country_code: 'CN' });
    openConsigneeTab(container);

    const labels = labelTexts(container);
    expect(labels).toContain('State / Province *');
    expect(labels).toContain('Country *');
    expect(labels).toContain('Zip Code *');
    expect(labels).toContain('City *');
  });

  it('AIR + CN → 국가/우편번호/도시 미표시지만 시/도만 "*" (DEF-B-044 조건)', () => {
    const { container } = renderForm({ transport_mode: 'AIR', recipient_country_code: 'CN' });
    openConsigneeTab(container);

    const labels = labelTexts(container);
    expect(labels).toContain('State / Province *');
    expect(labels).toContain('Country');
    expect(labels).not.toContain('Country *');
    expect(labels).not.toContain('Zip Code *');
    expect(labels).not.toContain('City *');
  });
});
