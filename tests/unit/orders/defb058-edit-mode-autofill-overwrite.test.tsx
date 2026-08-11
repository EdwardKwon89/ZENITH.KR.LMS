import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// TASK-B-287 (Issue #1078 / DEF-B-058, Critical): OrderRegistrationForm의 신규등록용 자동완성
// useEffect 2건이 edit 모드(orderId prop)에서도 마운트 시 실행되어 저장된 화주정보/DOC 패키지
// 치수를 덮어쓰는 결함 회귀 테스트.
//
// 실제 OrderRegistrationForm 컴포넌트를 import해 RTL로 렌더링한다 (그림자 테스트 금지).

// ── mocks ────────────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      shipper_label: 'Shipper', submit: 'Submit', title_edit: 'Edit Order',
      contact_person: 'Contact', shipper_contact: 'Phone',
    };
    return map[key] ?? key;
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: any) => <div data-testid="motion-div">{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockGetCurrentUserAffiliation = vi.fn();
const mockGetAgencyOrgIdByShipper = vi.fn();
const mockGetUpsProducts = vi.fn();
const mockEstimateUpsFreight = vi.fn();

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
  createOrder: vi.fn().mockResolvedValue({ id: 'new-order', order_no: 'ZEN-1' }),
}));
vi.mock('@/app/actions/operations/orders', () => ({
  updateOrder: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('@/components/orders/UpsServiceSelector', () => ({
  UpsServiceSelector: () => <div data-testid="ups-service-selector" />,
}));
vi.mock('@/components/orders/UpsFreightEstimateSection', () => ({
  UpsFreightEstimateSection: () => <div data-testid="ups-freight-estimate" />,
}));
vi.mock('@/components/address-book/AddressBookSelector', () => ({
  default: () => <div data-testid="address-book-selector" />,
}));
vi.mock('@/components/common/AddressInput', () => ({
  AddressInput: () => <div data-testid="address-input" />,
}));

import { OrderRegistrationForm } from '@/components/orders/OrderRegistrationForm';

const SHIPPER_ORG = '550e8400-e29b-41d4-a716-446655440001';

const defaultShippers = [{ id: SHIPPER_ORG, name: 'MASTER AIR', address: 'Seoul' }];
const defaultPorts: any[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUserAffiliation.mockResolvedValue({
    userId: 'user-1', userName: 'Login User', userEmail: 'login@test.kr', userPhone: '010-1111-2222',
    role: 'AGENCY', orgId: '99999999-9999-4999-8999-999999999999', orgName: 'Login Agency',
    orgAddress: 'Login Address', orgBizNo: '999-99', orgCountryCode: 'KR', orgStateProvince: 'Seoul',
    orgCity: 'Seoul', orgAddressStreet: 'Login Street', orgAddressDetail: '', orgZipcode: '04515',
    isIndividual: false, dummyIndividualId: '11111111-1111-4111-8111-111111111111',
  });
  mockGetAgencyOrgIdByShipper.mockResolvedValue(null);
  mockGetUpsProducts.mockResolvedValue([]);
  mockEstimateUpsFreight.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe('TASK-B-287: edit 모드에서 신규등록용 자동완성이 저장값을 덮어쓰지 않음 (Issue #1078 / DEF-B-058)', () => {
  it('TC-287-01: edit 모드(orderId 있음) — getCurrentUserAffiliation 미호출, shipper_contact_name이 defaultValues 유지', async () => {
    render(
      <OrderRegistrationForm
        shippers={defaultShippers}
        ports={defaultPorts}
        orderId="order-123"
        defaultValues={{
          order_type: 'B2B',
          shipper_id: SHIPPER_ORG,
          shipper_contact_name: 'Original Shipper Kim',
          shipper_contact_email: 'orig@test.kr',
          shipper_contact_phone: '010-8888-8888',
          recipient_name: 'John',
          recipient_address: '123 St',
          recipient_phone: '010-0000-0000',
          transport_mode: 'AIR',
          packages: [{ packing_unit: 'BOX', packing_count: 1, physical_box_count: 1, gross_weight: 5, special_cargo_type: 'NONE', content_type: 'GENERAL', items: [{ item_name: 'W', quantity: 1, unit_price: 1, currency: 'USD', item_packing_unit: 'EA' }] }],
        }}
      />
    );

    await waitFor(() => {
      expect(mockGetCurrentUserAffiliation).not.toHaveBeenCalled();
    });
    // 잠깐 대기 후에도 여전히 호출 안 됨 (마운트 이후 실행 시도 자체가 없어야 함)
    await new Promise((r) => setTimeout(r, 100));
    expect(mockGetCurrentUserAffiliation).not.toHaveBeenCalled();

    const nameInput = screen.getByPlaceholderText('담당자명') as HTMLInputElement;
    expect(nameInput.value).toBe('Original Shipper Kim');
  });

  it('TC-287-02: create 모드(orderId 없음) — getCurrentUserAffiliation 호출, shipper_contact_name이 로그인 계정명으로 자동완성 (회귀 방지)', async () => {
    render(
      <OrderRegistrationForm
        shippers={defaultShippers}
        ports={defaultPorts}
        defaultValues={{ packages: [{ packing_unit: 'BOX', packing_count: 1, physical_box_count: 1, gross_weight: 5, special_cargo_type: 'NONE', content_type: 'GENERAL', items: [{ item_name: 'W', quantity: 1, unit_price: 1, currency: 'USD', item_packing_unit: 'EA' }] }] }}
      />
    );

    await waitFor(() => {
      expect(mockGetCurrentUserAffiliation).toHaveBeenCalled();
    });
    const nameInput = screen.getByPlaceholderText('담당자명') as HTMLInputElement;
    expect(nameInput.value).toBe('Login User');
  });

  it('TC-287-03: edit 모드 — DOC 패키지 defaultValues 치수(length/width/height) 유지', async () => {
    render(
      <OrderRegistrationForm
        shippers={defaultShippers}
        ports={defaultPorts}
        orderId="order-123"
        defaultValues={{
          order_type: 'B2B',
          shipper_id: SHIPPER_ORG,
          shipper_contact_name: 'Orig',
          recipient_name: 'John',
          recipient_address: '123 St',
          recipient_phone: '010-0000-0000',
          transport_mode: 'AIR',
          packages: [{
            packing_unit: 'BOX', packing_count: 1, physical_box_count: 1, gross_weight: 5, special_cargo_type: 'NONE',
            length: 30, width: 20, height: 10,
            content_type: 'DOC',
            items: [{ item_name: 'W', quantity: 1, unit_price: 1, currency: 'USD', item_packing_unit: 'EA' }],
          }],
        }}
      />
    );

    // 마운트 후 DOC 치수가 지워지지 않았는지 확인
    await new Promise((r) => setTimeout(r, 100));
    const lengthInput = screen.getByPlaceholderText('L') as HTMLInputElement;
    expect(lengthInput.value).toBe('30');
  });

  it('TC-287-04: create 모드 — DOC로 content_type 변경 시 치수 초기화 여전히 동작 (TASK-B-076 의도 보존)', async () => {
    render(
      <OrderRegistrationForm
        shippers={defaultShippers}
        ports={defaultPorts}
        defaultValues={{
          order_type: 'B2B',
          shipper_id: SHIPPER_ORG,
          shipper_contact_name: 'Orig',
          recipient_name: 'John',
          recipient_address: '123 St',
          recipient_phone: '010-0000-0000',
          recipient_country_code: 'US',
          recipient_zipcode: '90001',
          recipient_city: 'LA',
          shipper_contact_phone: '010-0000-0000',
          transport_mode: 'UPS',
          packages: [{
            packing_unit: 'BOX', packing_count: 1, physical_box_count: 1, gross_weight: 5, special_cargo_type: 'NONE',
            length: 30, width: 20, height: 10,
            content_type: 'GENERAL',
            items: [{ item_name: 'W', quantity: 1, unit_price: 1, currency: 'USD', item_packing_unit: 'EA' }],
          }],
        }}
      />
    );

    // content_type select(UPS 전용 DOC/NONDOC)를 DOC로 변경
    await waitFor(() => {
      expect(mockGetCurrentUserAffiliation).toHaveBeenCalled();
    });
    const contentSelect = screen.getAllByRole('combobox').find((el) => {
      const opts = Array.from((el as HTMLSelectElement).options).map((o) => o.value);
      return opts.includes('DOC') && opts.includes('NONDOC');
    }) as HTMLSelectElement;
    expect(contentSelect).toBeDefined();
    fireEvent.change(contentSelect, { target: { value: 'DOC' } });

    // DOC 전환 시 치수가 초기화되어야 함
    await waitFor(() => {
      const lengthInput = screen.getByPlaceholderText('L') as HTMLInputElement;
      expect(lengthInput.value).toBe('');
    });
  });
});
