// TASK-B-297 (Issue #1104): DEF-B-062 — AddressInput이 "내 정보 사용/수기입력" 토글 전환에 반응하지 않는 결함 회귀 테스트.
//
// OrderRegistrationForm의 shipper AddressInput 호출부가 토글(shipperNameMode)에 따라 key/defaultValues를
// 갱신해 AddressInput이 리마운트되며 실제 주소 필드가 초기화/복원되는지 검증한다.
// (AddressInput mock 금지 — 실제 컴포넌트 렌더링)
//
// AddressInput은 rhf 모드에서 hidden input에 register 이름을 부여한다:
//   shipper_state_province / shipper_city / shipper_address / shipper_address_detail / shipper_zipcode
// 검증 시나리오:
//  TC-297-062-01: "수기입력" 클릭 → 시/도·시/군/구·도로명주소·상세주소·우편번호가 실제로 빈 값이 된다
//  TC-297-062-02: "내 정보 사용" 재전환 → 조직 주소값으로 실제 복원된다
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
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
// NOTE: AddressInput은 mock 금지 — 실제 컴포넌트 렌더링 (DEF-B-062가 AddressInput 내부 state 문제라서 필수)

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

function shipperField(container: HTMLElement, name: string): HTMLInputElement | null {
  return container.querySelector(`input[name="${name}"]`);
}

afterEach(() => cleanup());

describe('TASK-B-297 (Issue #1104) DEF-B-062: AddressInput 토글 전환 반응', () => {
  beforeEach(() => {
    // 법인 화주 — 조직 주소가 orgAddress로 내려옴 (경기도/성남시/Street 1)
    h.mockGetCurrentUserAffiliation.mockResolvedValue({
      userId: 'u', userName: 'User Kim', userEmail: 'kim@test.kr', userPhone: '010-9999-9999', role: 'SHIPPER',
      orgId: SHIPPER_ORG, orgName: 'MASTER AIR', orgAddress: 'Seoul HQ',
      orgBizNo: '111-11-22222', orgCountryCode: 'KR', orgStateProvince: '41', orgCity: 'Seongnam-si',
      orgAddressStreet: 'Street 1', orgAddressDetail: 'Bldg 2', orgZipcode: '04515',
      isIndividual: false, dummyIndividualId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('TC-297-062-01: "수기입력" 클릭 시 주소 필드가 실제로 빈 값이 된다', async () => {
    const { container } = render(
      <OrderRegistrationForm shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]} ports={[]} defaultValues={validDefaults()} />
    );

    // affiliation 로드 완료 → auto 모드에서 조직 주소가 표시됨을 먼저 확인
    await waitFor(() => {
      expect(shipperField(container, 'shipper_address')?.value).toBe('Street 1');
      expect(shipperField(container, 'shipper_state_province')?.value).toBe('41');
    });

    // "수기입력" 클릭
    const manualBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '수기입력');
    expect(manualBtn).toBeTruthy();
    fireEvent.click(manualBtn!);

    // 주소 필드들이 빈 값으로 초기화되어야 함 (시/도·시/군/구·도로명·상세·우편번호)
    await waitFor(() => {
      expect(shipperField(container, 'shipper_address')?.value ?? '').toBe('');
    });
    expect(shipperField(container, 'shipper_state_province')?.value ?? '').toBe('');
    expect(shipperField(container, 'shipper_city')?.value ?? '').toBe('');
    expect(shipperField(container, 'shipper_address_detail')?.value ?? '').toBe('');
    expect(shipperField(container, 'shipper_zipcode')?.value ?? '').toBe('');
  });

  it('TC-297-062-02: "내 정보 사용" 재전환 시 조직 주소로 복원된다', async () => {
    const { container } = render(
      <OrderRegistrationForm shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]} ports={[]} defaultValues={validDefaults()} />
    );

    // 조직 주소 로드 확인
    await waitFor(() => {
      expect(shipperField(container, 'shipper_address')?.value).toBe('Street 1');
    });

    // 수기입력으로 전환 → 초기화
    const manualBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '수기입력');
    fireEvent.click(manualBtn!);
    await waitFor(() => {
      expect(shipperField(container, 'shipper_address')?.value ?? '').toBe('');
    });

    // "내 정보 사용" 재전환 → 조직 주소 복원
    const autoBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '내 정보 사용');
    fireEvent.click(autoBtn!);

    await waitFor(() => {
      expect(shipperField(container, 'shipper_address')?.value).toBe('Street 1');
    });

    expect(shipperField(container, 'shipper_state_province')?.value).toBe('41');
    expect(shipperField(container, 'shipper_city')?.value).toBe('Seongnam-si');
    expect(shipperField(container, 'shipper_address_detail')?.value).toBe('Bldg 2');
    expect(shipperField(container, 'shipper_zipcode')?.value).toBe('04515');
  });
});
