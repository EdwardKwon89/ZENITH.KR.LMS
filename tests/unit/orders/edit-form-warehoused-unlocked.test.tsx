import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// TASK-B-339 (Issue #1254): WAREHOUSED+UPS가 fullEditable이 되면서 OrderRegistrationForm의
//   잠금 UI(부분 수정 배너 · 운송수단 잠금 · 실측 패키지 입력 잠금)가 자동 해제되는지 렌더로 확인한다.
//
//   editScope는 **실제 getOrderEditScope('WAREHOUSED','UPS')** 를 사용한다 — REGISTERED 스코프로
//   바꿔도 통과하는(=WAREHOUSED 고유 판정을 검증하지 못하는) 테스트가 되지 않도록 measuredPackageIds도
//   WAREHOUSED에서만 등장하는 실측 패키지 id를 전달한다.

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, Toaster: () => null }));
vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div> },
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
import { getOrderEditScope } from '@/lib/logistics/status-machine';
import { OrderStatus } from '@/types/orders';

const SHIPPER_ORG = '550e8400-e29b-41d4-a716-446655440001';
const ORIGIN_PORT = '550e8400-e29b-41d4-a716-446655440002';
const DEST_PORT = '550e8400-e29b-41d4-a716-446655440003';
const MEASURED_PKG_ID = '33900000-0000-4000-8000-000000000020';

const shippers = [{ id: SHIPPER_ORG, name: 'MASTER AIR', address: 'Seoul' }];
const ports: any[] = [];

const baseDefaultValues = {
  order_type: 'B2B',
  shipper_id: SHIPPER_ORG,
  recipient_name: 'John',
  recipient_address: '123 St',
  recipient_phone: '01000000000',
  origin_port_id: ORIGIN_PORT,
  dest_port_id: DEST_PORT,
  // 다음 단계(패키지)로 진입하기 위한 운송수단 — editScope와는 별개(스코프가 잠금을 결정)
  transport_mode: 'AIR',
  packages: [
    {
      id: MEASURED_PKG_ID,
      packing_unit: 'BOX',
      packing_count: 1,
      physical_box_count: 1,
      length: 30,
      width: 20,
      height: 10,
      gross_weight: 12.5,
      special_cargo_type: 'NONE',
      content_type: 'GENERAL',
      items: [{ item_name: 'W', quantity: 1, unit_price: 1, currency: 'USD', item_packing_unit: 'EA' }],
    },
  ],
};

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

async function renderWarehousedUpsForm() {
  const editScope = getOrderEditScope(OrderStatus.WAREHOUSED, 'UPS');
  render(
    <OrderRegistrationForm
      shippers={shippers}
      ports={ports}
      orderId="order-339"
      defaultValues={baseDefaultValues as any}
      editScope={editScope}
      measuredPackageIds={[MEASURED_PKG_ID]}
    />
  );
  // 패키지 단계로 이동 (AIR는 다음 단계 버튼으로 진입 — 상단/하단 액션 바에 동일 버튼이 있어 첫 번째 사용)
  fireEvent.click(screen.getAllByText('다음 단계 (서비스 선택)')[0]);
  await waitFor(() => {
    expect(screen.getByText('PKG #1')).toBeTruthy();
  });
  return editScope;
}

describe('TASK-B-339: WAREHOUSED+UPS 잠금 자동 해제 (Issue #1254)', () => {
  it('TC-FRM-①: getOrderEditScope(WAREHOUSED, UPS)는 잠금 3종이 모두 해제된 스코프를 준다', async () => {
    const editScope = await renderWarehousedUpsForm();
    expect(editScope.fullEditable).toBe(true);
    expect(editScope.lockShipperId).toBe(false);
    expect(editScope.lockTransportMode).toBe(false);
    expect(editScope.lockMeasuredPackageDims).toBe(false);
    expect(editScope.auditEdit).toBe(true);
  });

  it('TC-FRM-②: 부분 수정 배너("창고에서 입고 확정된 오더입니다")가 표시되지 않는다', async () => {
    await renderWarehousedUpsForm();
    expect(screen.queryByText(/창고에서 입고 확정된 오더입니다/)).toBeNull();
  });

  it('TC-FRM-③: 운송수단 버튼이 disabled가 아니다', async () => {
    await renderWarehousedUpsForm();
    const airButton = screen.getAllByText('항공')[0].closest('button') as HTMLButtonElement;
    expect(airButton).toBeTruthy();
    expect(airButton.disabled).toBe(false);
  });

  it('TC-FRM-④: 실측 패키지의 치수/무게/포장수 입력이 disabled가 아니다 + "실측 완료" 배지 미표시', async () => {
    await renderWarehousedUpsForm();

    const lengthInput = document.querySelector('input[name="packages.0.length"]') as HTMLInputElement;
    const widthInput = document.querySelector('input[name="packages.0.width"]') as HTMLInputElement;
    const heightInput = document.querySelector('input[name="packages.0.height"]') as HTMLInputElement;
    const weightInput = document.querySelector('input[name="packages.0.gross_weight"]') as HTMLInputElement;
    const countInput = document.querySelector('input[name="packages.0.packing_count"]') as HTMLInputElement;

    expect(lengthInput).toBeTruthy();
    expect(lengthInput.disabled).toBe(false);
    expect(widthInput.disabled).toBe(false);
    expect(heightInput.disabled).toBe(false);
    expect(weightInput.disabled).toBe(false);
    expect(countInput.disabled).toBe(false);

    expect(screen.queryByText(/실측 완료/)).toBeNull();
  });
});
