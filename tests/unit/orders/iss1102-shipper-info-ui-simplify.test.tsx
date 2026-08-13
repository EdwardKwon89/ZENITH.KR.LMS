import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// TASK-B-296 (Issue #1102): 오더 등록 화면 화주 정보 UI 단순화 회귀 테스트.
//
// ① shipper_id select 제거 ② 수기입력 시 전체 화주 필드 초기화 ③ 내정보사용 재전환 시 복원
// ④ 수정 모드(자동판정 manual) 필드 보존 ⑤ 제출 매핑 ⑥ 개인 화주도 주소 입력 렌더.

const h = vi.hoisted(() => ({
  mockCreateOrder: vi.fn(),
  mockUpdateOrder: vi.fn(),
  mockGetCurrentUserAffiliation: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = { shipper_label: 'Shipper', submit: 'Submit', shipper_biz_no: 'Biz No' };
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
vi.mock('@/app/actions/orders', () => ({ createOrder: (...a: any[]) => h.mockCreateOrder(...a) }));
vi.mock('@/app/actions/operations/orders', () => ({ updateOrder: (...a: any[]) => h.mockUpdateOrder(...a) }));
vi.mock('@/components/orders/UpsServiceSelector', () => ({ UpsServiceSelector: () => <div /> }));
vi.mock('@/components/orders/UpsFreightEstimateSection', () => {
  function MockEstimate(props: any) {
    React.useEffect(() => { props.onProductChange?.('prod-1', 'WW_EXPEDITED'); }, []);
    return <div />;
  }
  return { UpsFreightEstimateSection: MockEstimate };
});
vi.mock('@/components/address-book/AddressBookSelector', () => ({ default: () => <div /> }));
vi.mock('@/components/common/AddressInput', () => ({ AddressInput: ({ prefix }: { prefix?: string }) => <div data-testid={`address-input-${prefix ?? 'unknown'}`} /> }));

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

function findBtn(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent === text);
}

afterEach(() => cleanup());

describe('TASK-B-296: 화주 정보 UI 단순화 (Issue #1102)', () => {
  beforeEach(() => {
    // 기본(법인 화주) affiliation mock
    h.mockGetCurrentUserAffiliation.mockResolvedValue({
      userId: 'u', userName: 'User Kim', userEmail: 'kim@test.kr', userPhone: '010-9999-9999', role: 'SHIPPER',
      orgId: SHIPPER_ORG, orgName: 'MASTER AIR', orgAddress: 'Seoul HQ',
      orgBizNo: '111-11-22222', orgCountryCode: 'KR', orgStateProvince: 'Seoul', orgCity: 'Gangnam',
      orgAddressStreet: 'Street 1', orgAddressDetail: 'Bldg 2', orgZipcode: '04515',
      isIndividual: false, dummyIndividualId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('TC-296-01: shipper_id select 엘리먼트가 렌더되지 않는다', async () => {
    const { container } = render(
      <OrderRegistrationForm shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]} ports={[]} defaultValues={validDefaults()} />
    );
    await waitFor(() => expect(container.querySelector('input[name="shipper_name"]')).toBeTruthy());
    expect(container.querySelector('select[name="shipper_id"]')).toBeNull();
  });

  it('TC-296-02: "수기입력" 클릭 → 화주 정보 전체 필드가 빈 값으로 초기화 + 활성화', async () => {
    const { container } = render(
      <OrderRegistrationForm shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]} ports={[]} defaultValues={validDefaults()} />
    );
    const nameInput = container.querySelector('input[name="shipper_name"]') as HTMLInputElement;
    const contactInput = container.querySelector('input[name="shipper_contact_name"]') as HTMLInputElement;
    await waitFor(() => expect(nameInput).toBeTruthy());
    // auto 모드: affiliation 자동 반영이 안정화될 때까지 대기 후 확인
    await waitFor(() => expect(nameInput.value).toBe('MASTER AIR'));

    // auto 모드: orgName 자동 반영 + disabled
    expect(nameInput.value).toBe('MASTER AIR');
    expect(nameInput.disabled).toBe(true);
    expect(contactInput.disabled).toBe(true);

    fireEvent.click(findBtn(container, '수기입력')!);

    // 전체 필드 빈 값 + 활성화
    await waitFor(() => expect(nameInput.value).toBe(''));
    expect(nameInput.disabled).toBe(false);
    expect(contactInput.value).toBe('');
    expect(contactInput.disabled).toBe(false);
    const phoneInput = container.querySelector('input[name="shipper_contact_phone"]') as HTMLInputElement;
    const emailInput = container.querySelector('input[name="shipper_contact_email"]') as HTMLInputElement;
    const bizInput = container.querySelector('input[name="shipper_biz_no"]') as HTMLInputElement;
    expect(phoneInput.value).toBe('');
    expect(emailInput.value).toBe('');
    expect(bizInput.value).toBe('');
    expect(bizInput.readOnly).toBe(false);
  });

  it('TC-296-03: "내 정보 사용" 재전환 → affiliation 파생값 전체 복원 + 비활성화', async () => {
    const { container } = render(
      <OrderRegistrationForm shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]} ports={[]} defaultValues={validDefaults()} />
    );
    const nameInput = container.querySelector('input[name="shipper_name"]') as HTMLInputElement;
    const contactInput = container.querySelector('input[name="shipper_contact_name"]') as HTMLInputElement;
    await waitFor(() => expect(nameInput).toBeTruthy());

    fireEvent.click(findBtn(container, '수기입력')!);
    fireEvent.change(nameInput, { target: { value: 'Custom Shipper XYZ' } });
    fireEvent.change(contactInput, { target: { value: 'Hand Typed' } });
    expect(nameInput.value).toBe('Custom Shipper XYZ');

    fireEvent.click(findBtn(container, '내 정보 사용')!);

    expect(nameInput.disabled).toBe(true);
    expect(nameInput.value).toBe('MASTER AIR'); // orgName 복원
    expect(contactInput.disabled).toBe(true);
    expect(contactInput.value).toBe('User Kim'); // userName 복원
  });

  it('TC-296-04: 수정 모드(저장값이 조직명과 다름) → 자동판정 manual, 필드 초기화 없이 저장값 보존', async () => {
    const { container } = render(
      <OrderRegistrationForm
        shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]}
        ports={[]}
        orderId="order-edit-1"
        defaultValues={validDefaults({ shipper_name: 'Saved Custom Shipper', shipper_contact_name: 'Saved Contact' })}
      />
    );
    const nameInput = container.querySelector('input[name="shipper_name"]') as HTMLInputElement;
    const contactInput = container.querySelector('input[name="shipper_contact_name"]') as HTMLInputElement;
    await waitFor(() => expect(nameInput).toBeTruthy());

    // 저장값이 조직명과 다르므로 manual 시작 — 초기화 없이 저장값 유지
    expect(nameInput.value).toBe('Saved Custom Shipper');
    expect(nameInput.disabled).toBe(false);
    expect(contactInput.value).toBe('Saved Contact'); // contact도 저장값 보존 (초기화 안 됨)
  });

  it('TC-296-05: 수기입력 후 제출 → 입력값이 createOrder payload에 그대로 매핑', async () => {
    h.mockCreateOrder.mockResolvedValue({ id: 'new-1', order_no: 'ZEN-1' });
    // UPS 오더로 등록 — "오더 등록" 버튼(handleUpsDirectSubmit → handleSubmit) 경로 사용
    const { container } = render(
      <OrderRegistrationForm
        shippers={[{ id: SHIPPER_ORG, name: 'MASTER AIR' }]}
        ports={[]}
        defaultValues={validDefaults({
          transport_mode: 'UPS',
          ups_product_code: 'WW_EXPEDITED',
          incoterms: 'DDP',
        })}
      />
    );
    const nameInput = container.querySelector('input[name="shipper_name"]') as HTMLInputElement;
    await waitFor(() => expect(nameInput).toBeTruthy());

    fireEvent.click(findBtn(container, '수기입력')!);
    fireEvent.change(nameInput, { target: { value: 'Mapping Test Shipper' } });
    const contactInput = container.querySelector('input[name="shipper_contact_name"]') as HTMLInputElement;
    fireEvent.change(contactInput, { target: { value: 'Mapping Contact' } });

    const registerBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('오더 등록'));
    expect(registerBtn).toBeTruthy();
    fireEvent.click(registerBtn!);

    await waitFor(() => expect(h.mockCreateOrder).toHaveBeenCalled(), { timeout: 5000 });
    const payload = h.mockCreateOrder.mock.calls[0][0];
    expect(payload.shipper_name).toBe('Mapping Test Shipper');
    expect(payload.shipper_contact_name).toBe('Mapping Contact');
  });

  it('TC-296-06: 개인 화주(isIndividual)도 주소 입력란이 렌더된다 (회귀 방지)', async () => {
    // 실제 개인 화주 상태를 재현 — affiliation mock을 isIndividual: true로 오버라이드 (mockResolvedValueOnce가 기본값보다 우선)
    h.mockGetCurrentUserAffiliation.mockResolvedValueOnce({
      userId: 'u', userName: 'Individual User', userEmail: 'indiv@test.kr', userPhone: '010-1111-2222', role: 'SHIPPER',
      orgId: null, orgName: null, orgAddress: null,
      orgBizNo: null, orgCountryCode: 'KR', orgStateProvince: null, orgCity: null,
      orgAddressStreet: null, orgAddressDetail: null, orgZipcode: null,
      isIndividual: true, dummyIndividualId: '11111111-1111-4111-8111-111111111111',
    });
    const individualDefaults = {
      ...validDefaults(),
      order_type: 'B2C_ECOM' as const,
      shipper_id: '11111111-1111-4111-8111-111111111111',
      shipper_name: 'Individual User',
    };
    const { container } = render(
      <OrderRegistrationForm shippers={[]} ports={[]} defaultValues={individualDefaults} />
    );
    await waitFor(() => expect(container.querySelector('[data-testid="address-input-shipper"]')).toBeTruthy());
    expect(container.querySelector('[data-testid="address-input-shipper"]')).toBeTruthy();
  });
});
