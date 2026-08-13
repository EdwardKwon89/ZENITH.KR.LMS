import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// TASK-B-293 (Issue #1091): handleItemNameBlur() 영문 전용 사전 필터 회귀 테스트
// 실제 OrderRegistrationForm 컴포넌트를 import해 RTL로 렌더링한다 (그림자 테스트 금지).
// - 한글 등 비영문 품명 blur → fetch(/api/hs-lookup) 호출 금지 (AI API 비용 절감)
// - 영문 품명 blur → 기존대로 fetch 호출 (회귀 방지)

// ── mocks ────────────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      shipper_label: 'Shipper', submit: 'Submit', title_edit: 'Edit Order',
      contact_person: 'Contact', shipper_contact: 'Phone',
      item_name: 'Item Name',
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
const mockFetch = vi.fn();

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

function renderForm() {
  render(
    <OrderRegistrationForm
      shippers={defaultShippers}
      ports={defaultPorts}
      defaultValues={{
        order_type: 'B2B',
        shipper_id: SHIPPER_ORG,
        recipient_name: 'John',
        recipient_address: '123 St',
        recipient_phone: '010-0000-0000',
        transport_mode: 'AIR',
        packages: [{ packing_unit: 'BOX', packing_count: 1, physical_box_count: 1, gross_weight: 5, special_cargo_type: 'NONE', content_type: 'GENERAL', items: [{ item_name: '', quantity: 1, unit_price: 1, currency: 'USD', item_packing_unit: 'EA' }] }],
      }}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ hs_code: '847130', confidence: 'high' }),
  });
  vi.stubGlobal('fetch', mockFetch);
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
  vi.unstubAllGlobals();
});

describe('TASK-B-293: handleItemNameBlur() 영문 전용 사전 필터 (Issue #1091)', () => {
  it('TC-IS1091-C01: 한글 등 비영문 품명 blur — /api/hs-lookup fetch 호출 안 함 (AI 비용 절감)', async () => {
    renderForm();
    await waitFor(() => {
      expect(mockGetCurrentUserAffiliation).toHaveBeenCalled();
    });

    const nameInput = screen.getByPlaceholderText('Item Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '전자제품' } });
    fireEvent.blur(nameInput);

    // blur 이후 충분한 대기 — fetch가 호출됐다면 이 시간 안에 발생해야 함
    await new Promise((r) => setTimeout(r, 150));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('TC-IS1091-C02: 영문 품명 blur — 기존대로 /api/hs-lookup fetch 호출 (회귀 방지)', async () => {
    renderForm();
    await waitFor(() => {
      expect(mockGetCurrentUserAffiliation).toHaveBeenCalled();
    });

    const nameInput = screen.getByPlaceholderText('Item Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Smartphone Case' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    const [url, init] = mockFetch.mock.calls[0] as [string, any];
    expect(url).toBe('/api/hs-lookup');
    const body = JSON.parse(init.body);
    expect(body.item_name).toBe('Smartphone Case');
  });
});
