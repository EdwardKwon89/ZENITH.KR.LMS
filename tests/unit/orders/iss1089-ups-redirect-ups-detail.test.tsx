import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
// TASK-B-292 (Issue #1089): UPS 오더 등록/수정 저장 후 ups-detail 페이지로 리다이렉션 회귀 테스트.
//
// 실제 OrderRegistrationForm 컴포넌트를 RTL로 렌더링하고, 실제 사용자 경로(오더 등록 버튼 /
// 폼 제출)로 onSubmit을 트리거해 mock router.push가 어떤 인자로 호출됐는지 검증한다.

// ── mocks ────────────────────────────────────────────────────────────────
const mockPush = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      shipper_label: 'Shipper', submit: 'Submit', success_update: 'Updated', success_create: 'Created',
    };
    return map[key] ?? key;
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: any) => <div data-testid="motion-div">{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockGetCurrentUserAffiliation = vi.fn();
const mockGetAgencyOrgIdByShipper = vi.fn();
const mockGetUpsProducts = vi.fn();
const mockEstimateUpsFreight = vi.fn();
const mockCreateOrder = vi.fn();
const mockUpdateOrder = vi.fn();

vi.mock('@/app/actions/master', () => ({
  getCurrentUserAffiliation: (...args: any[]) => mockGetCurrentUserAffiliation(...args),
}));
vi.mock('@/app/actions/agency/shipper-link', () => ({
  getAgencyOrgIdByShipper: (...args: any[]) => mockGetAgencyOrgIdByShipper(...args),
}));
vi.mock('@/app/actions/ups/rates', () => ({
  getUpsProducts: (...args: any[]) => mockGetUpsProducts(...args),
}));
vi.mock('@/app/actions/ups/freight', () => ({
  estimateUpsFreight: (...args: any[]) => mockEstimateUpsFreight(...args),
}));
vi.mock('@/app/actions/operations/order-services', () => ({
  createOrderServices: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/app/actions/operations/address-book', () => ({
  createAddressBookEntry: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/app/actions/operations/service-rates', () => ({
  getAvailableServiceRates: vi.fn().mockResolvedValue({ rates: {}, combinations: [] }),
  getUsdKrwRate: vi.fn().mockResolvedValue(1350),
  getBaseCurrency: vi.fn().mockResolvedValue('KRW'),
}));
vi.mock('@/app/actions/orders', () => ({
  createOrder: (...args: any[]) => mockCreateOrder(...args),
}));
vi.mock('@/app/actions/operations/orders', () => ({
  updateOrder: (...args: any[]) => mockUpdateOrder(...args),
}));
vi.mock('@/components/orders/UpsServiceSelector', () => ({
  UpsServiceSelector: () => <div data-testid="ups-service-selector" />,
}));
vi.mock('@/components/orders/UpsFreightEstimateSection', () => {
  function MockEstimate(props: any) {
    React.useEffect(() => {
      // 실제 UpsFreightEstimateSection은 제품 선택 시 onProductChange로 ups_product_code 설정
      props.onProductChange?.('prod-1', 'WW_EXPEDITED');
    }, []);
    return <div data-testid="ups-freight-estimate" />;
  }
  return { UpsFreightEstimateSection: MockEstimate };
});
vi.mock('@/components/address-book/AddressBookSelector', () => ({
  default: () => <div data-testid="address-book-selector" />,
}));
vi.mock('@/components/common/AddressInput', () => ({
  AddressInput: () => <div data-testid="address-input" />,
}));

import { OrderRegistrationForm } from '@/components/orders/OrderRegistrationForm';

const SHIPPER_ORG = '550e8400-e29b-41d4-a716-446655440001';

const defaultShippers = [{ id: SHIPPER_ORG, name: 'MASTER AIR', address: 'Seoul' }];
const defaultPorts: any[] = [
  { id: '550e8400-e29b-41d4-a716-446655440002', code: 'ICN', type: 'AIR', country_code: 'KR' },
  { id: '550e8400-e29b-41d4-a716-446655440003', code: 'LAX', type: 'AIR', country_code: 'US' },
];

// orderRegistrationSchema를 통과하는 유효한 기본 폼 값
function validDefaults(overrides: Record<string, unknown> = {}) {
  return {
    order_type: 'B2B' as const,
    shipper_id: SHIPPER_ORG,
    shipper_contact_name: 'Shipper Kim',
    shipper_contact_email: 'shipper@test.kr',
    shipper_contact_phone: '010-0000-0000',
    shipper_address: 'Seoul',
    shipper_country_code: 'KR',
    shipper_state_province: '',
    shipper_city: 'Seoul',
    shipper_zipcode: '04515',
    recipient_name: 'John Doe',
    recipient_address: '123 Main St',
    recipient_phone: '010-1111-2222',
    recipient_country_code: 'US',
    recipient_state_province: 'CA',
    recipient_city: 'Los Angeles',
    recipient_zipcode: '90001',
    recipient_email: 'john@example.com',
    delivery_method: 'DIRECT' as const,
    transport_mode: 'AIR' as const,
    packages: [{
      packing_unit: 'BOX',
      packing_count: 1,
      physical_box_count: 1,
      length: 0,
      width: 0,
      height: 0,
      gross_weight: 5,
      special_cargo_type: 'NONE',
      content_type: 'GENERAL',
      items: [{ item_name: 'Widget', quantity: 1, unit_price: 10, currency: 'USD', item_packing_unit: 'EA' }],
    }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPush.mockClear();
  mockGetCurrentUserAffiliation.mockResolvedValue({
    userId: 'user-1', userName: 'Login User', userEmail: 'login@test.kr', userPhone: '010-1111-2222',
    role: 'SHIPPER', orgId: SHIPPER_ORG, orgName: 'MASTER AIR',
    orgAddress: 'Seoul', orgBizNo: '111-11', orgCountryCode: 'KR', orgStateProvince: 'Seoul',
    orgCity: 'Seoul', orgAddressStreet: 'Seoul', orgAddressDetail: '', orgZipcode: '04515',
    isIndividual: false, dummyIndividualId: '11111111-1111-4111-8111-111111111111',
  });
  mockGetAgencyOrgIdByShipper.mockResolvedValue(null);
  mockGetUpsProducts.mockResolvedValue([]);
  mockEstimateUpsFreight.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

// UPS 오더: "오더 등록" 버튼 클릭 (handleUpsDirectSubmit → handleSubmit) — 실제 사용자 경로
async function submitUps(container: HTMLElement) {
  const btn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('오더 등록'));
  expect(btn).toBeDefined();
  fireEvent.click(btn!);
  // handleSubmit 비동기 validate + setTimeout(1000) 이후 router.push
  await waitFor(() => {
    expect(mockPush).toHaveBeenCalled();
  }, { timeout: 5000 });
}

// 비UPS 오더: 폼 제출 (handleSubmit) — 실제 사용자 경로
async function submitNonUps(container: HTMLElement) {
  // 마운트 시 transport_mode effect가 origin/dest_port_id를 초기화하므로,
  // 실제 사용자처럼 select에서 항구를 다시 선택한다
  const form = container.querySelector('form')!;
  const originSel = Array.from(form.querySelectorAll('select')).find((s) => s.getAttribute('name') === 'origin_port_id');
  const destSel = Array.from(form.querySelectorAll('select')).find((s) => s.getAttribute('name') === 'dest_port_id');
  if (originSel) fireEvent.change(originSel, { target: { value: '550e8400-e29b-41d4-a716-446655440002' } });
  if (destSel) fireEvent.change(destSel, { target: { value: '550e8400-e29b-41d4-a716-446655440003' } });
  fireEvent.submit(form);
  await waitFor(() => {
    expect(mockPush).toHaveBeenCalled();
  }, { timeout: 5000 });
}

describe('TASK-B-292: UPS 오더 저장 후 ups-detail 리다이렉션 (Issue #1089)', () => {
  it('TC-292-01: UPS 신규 등록 성공 → router.push(/orders/{id}/ups-detail)', async () => {
    mockCreateOrder.mockResolvedValue({ id: 'order-new-1', order_no: 'ZEN-NEW-1' });
    const { container } = render(
      <OrderRegistrationForm
        shippers={defaultShippers}
        ports={defaultPorts}
        defaultValues={validDefaults({
          transport_mode: 'UPS',
          ups_product_code: 'WW_EXPEDITED',
          incoterms: 'DDP',
        })}
      />
    );

    await submitUps(container);

    expect(mockPush).toHaveBeenCalledWith('/orders/order-new-1/ups-detail');
  });

  it('TC-292-02: UPS 오더 수정 저장 성공 → router.push(/orders/{id}/ups-detail)', async () => {
    mockUpdateOrder.mockResolvedValue({ success: true });
    const { container } = render(
      <OrderRegistrationForm
        shippers={defaultShippers}
        ports={defaultPorts}
        orderId="order-edit-1"
        defaultValues={validDefaults({
          transport_mode: 'UPS',
          ups_product_code: 'WW_EXPEDITED',
          incoterms: 'DDP',
        })}
      />
    );

    await submitUps(container);

    expect(mockPush).toHaveBeenCalledWith('/orders/order-edit-1/ups-detail');
  });

  it('TC-292-03: 비UPS(AIR) 오더 수정 저장 → 기존대로 router.push(/orders/{id}) (회귀 방지)', async () => {
    mockUpdateOrder.mockResolvedValue({ success: true });
    const { container } = render(
      <OrderRegistrationForm
        shippers={defaultShippers}
        ports={defaultPorts}
        orderId="order-air-1"
        defaultValues={validDefaults({
          transport_mode: 'AIR',
          origin_port_id: '550e8400-e29b-41d4-a716-446655440002',
          dest_port_id: '550e8400-e29b-41d4-a716-446655440003',
        })}
      />
    );

    await submitNonUps(container);

    expect(mockPush).toHaveBeenCalledWith('/orders/order-air-1');
  });

  it('TC-292-04: 비UPS(AIR) 신규 등록 성공 → 기존대로 router.push(/orders/{id}) (회귀 방지)', async () => {
    mockCreateOrder.mockResolvedValue({ id: 'order-air-new', order_no: 'ZEN-AIR-1' });
    const { container } = render(
      <OrderRegistrationForm
        shippers={defaultShippers}
        ports={defaultPorts}
        defaultValues={validDefaults({
          transport_mode: 'AIR',
          origin_port_id: '550e8400-e29b-41d4-a716-446655440002',
          dest_port_id: '550e8400-e29b-41d4-a716-446655440003',
        })}
      />
    );

    await submitNonUps(container);

    expect(mockPush).toHaveBeenCalledWith('/orders/order-air-new');
  });
});
