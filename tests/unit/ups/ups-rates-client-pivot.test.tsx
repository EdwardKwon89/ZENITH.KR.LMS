import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import UpsRatesClient from '@/app/[locale]/(dashboard)/admin/ups-rates/ups-rates-client';

// ─── TASK-B-264 / Issue #1023 — Part 2: AgencyPolicyTable pivot 검증 ─────────

vi.mock('@/app/actions/ups/rates-mutation', () => ({
  createUpsZone: vi.fn(), updateUpsZone: vi.fn(), deleteUpsZone: vi.fn(),
  addZoneCountry: vi.fn(), removeZoneCountry: vi.fn(),
  createUpsProduct: vi.fn(), updateUpsProduct: vi.fn(),
  upsertUpsBaseRate: vi.fn(), upsertUpsFuelSurcharge: vi.fn(),
  createUpsOtherCharge: vi.fn(), updateUpsOtherCharge: vi.fn(), deleteUpsOtherCharge: vi.fn(),
  upsertAgencyCostRate: vi.fn(), upsertAgencyPricingPolicy: vi.fn(),
  updateAgencyVolumetricDivisor: vi.fn(),
  upsertUpsWeightTierRate: vi.fn(), deleteUpsWeightTierRate: vi.fn(),
  upsertUpsFreightMinimum: vi.fn(), deleteUpsFreightMinimum: vi.fn(),
  createUpsSurgeFee: vi.fn(), updateUpsSurgeFee: vi.fn(), deleteUpsSurgeFee: vi.fn(),
}));

vi.mock('@/app/actions/ups/pricing-schedule', () => ({
  createPricingSchedule: vi.fn(),
  getScheduledPricingChanges: vi.fn().mockResolvedValue([]),
  cancelPricingSchedule: vi.fn(),
  getPricingAuditLog: vi.fn().mockResolvedValue([]),
}));

const zones = [
  { id: 'z1', zone_code: 'Z1', zone_name: 'Zone1', is_active: true, sort_order: 1, countries: [] },
  { id: 'z2', zone_code: 'Z2', zone_name: 'Zone2', is_active: true, sort_order: 2, countries: [] },
] as any[];

const agencies = [
  { id: 'a1', name: 'Agency Alpha', volumetric_divisor: 5000 },
  { id: 'a2', name: 'Agency Beta', volumetric_divisor: 5500 },
] as any[];

function makeProps(agencyPolicies: any[]) {
  return {
    zones,
    products: [] as any[],
    baseRates: [] as any[],
    fuelSurcharges: [] as any[],
    otherCharges: [] as any[],
    agencyPolicies,
    agencies,
    weightTierRates: [] as any[],
    freightMinimums: [] as any[],
    surgeFees: [] as any[],
    userRole: 'ADMIN',
  } as any;
}

describe('TC-UPS-RATES-PIVOT-01: AgencyPolicyTable (agency_org_id, cargo_type) pivot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('동일 대리점의 서로 다른 cargo_type 정책이 별도 행으로 분리된다 (ALL/DOC/NON_DOC)', async () => {
    const policies = [
      { id: 'p1', agency_org_id: 'a1', cargo_type: 'ALL', zone_id: 'z1', discount_rate: 0.1, is_active: true, agency: { name: 'Agency Alpha' } },
      { id: 'p2', agency_org_id: 'a1', cargo_type: 'ALL', zone_id: 'z2', discount_rate: 0.12, is_active: true, agency: { name: 'Agency Alpha' } },
      { id: 'p3', agency_org_id: 'a1', cargo_type: 'DOC', zone_id: 'z1', discount_rate: 0.05, is_active: true, agency: { name: 'Agency Alpha' } },
    ];
    render(<UpsRatesClient {...makeProps(policies)} />);
    fireEvent.click(screen.getByRole('button', { name: /Agency 할인율 정책/i }));

    await waitFor(() => expect(screen.getAllByText('Agency Alpha').length).toBeGreaterThan(0));

    // pivot: (a1, ALL) + (a1, DOC) → 2행
    expect(screen.getAllByText('Agency Alpha').length).toBe(2);
    // cargo_type 배지 2종
    expect(screen.getAllByText('ALL').length).toBe(1);
    expect(screen.getAllByText('DOC').length).toBe(1);
    // ALL 행: z1=10.0%, z2=12.0% (Zone 컬럼으로 펼침)
    expect(screen.getByText('10.0%')).toBeInTheDocument();
    expect(screen.getByText('12.0%')).toBeInTheDocument();
    // DOC 행: z2는 값 없음 → '-' 표시
    expect(screen.getByText('5.0%')).toBeInTheDocument();
  });

  it('적용서비스 컬럼이 cargo_type별 파생 텍스트를 표시한다', async () => {
    const policies = [
      { id: 'p1', agency_org_id: 'a1', cargo_type: 'ALL', zone_id: 'z1', discount_rate: 0.1, is_active: true, agency: { name: 'Agency Alpha' } },
      { id: 'p2', agency_org_id: 'a1', cargo_type: 'NON_DOC', zone_id: 'z1', discount_rate: 0.08, is_active: true, agency: { name: 'Agency Alpha' } },
    ];
    render(<UpsRatesClient {...makeProps(policies)} />);
    fireEvent.click(screen.getByRole('button', { name: /Agency 할인율 정책/i }));

    await waitFor(() => expect(screen.getAllByText('Agency Alpha').length).toBe(2));

    expect(screen.getByText('전체 상품(Express/Saver/Expedited/Flight)')).toBeInTheDocument();
    expect(screen.getByText('Express/Saver NON_DOC + Expedited/Flight')).toBeInTheDocument();
  });

  it('Zone 컬럼 헤더가 활성 Zone 코드로 렌더링된다', async () => {
    render(<UpsRatesClient {...makeProps([{ id: 'p1', agency_org_id: 'a1', cargo_type: 'ALL', zone_id: 'z1', discount_rate: 0.1, is_active: true, agency: { name: 'Agency Alpha' } }])} />);
    fireEvent.click(screen.getByRole('button', { name: /Agency 할인율 정책/i }));

    await waitFor(() => expect(screen.getAllByText('Agency Alpha').length).toBe(1));
    expect(screen.getAllByText('Z1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Z2').length).toBeGreaterThan(0);
  });
});

describe('TC-UPS-RATES-PIVOT-02: openEdit() cargo_type 필터 (Issue #1023 연관 버그)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('DOC 행 수정 시 cargo_type=DOC 정책만 zone_rates에 로드된다 (ALL 정책 혼입 없음)', async () => {
    const policies = [
      { id: 'p1', agency_org_id: 'a1', cargo_type: 'ALL', zone_id: 'z1', discount_rate: 0.1, is_active: true, agency: { name: 'Agency Alpha' } },
      { id: 'p2', agency_org_id: 'a1', cargo_type: 'ALL', zone_id: 'z2', discount_rate: 0.12, is_active: true, agency: { name: 'Agency Alpha' } },
      { id: 'p3', agency_org_id: 'a1', cargo_type: 'DOC', zone_id: 'z1', discount_rate: 0.05, is_active: true, agency: { name: 'Agency Alpha' } },
    ];
    render(<UpsRatesClient {...makeProps(policies)} />);
    fireEvent.click(screen.getByRole('button', { name: /Agency 할인율 정책/i }));
    await waitFor(() => expect(screen.getAllByText('Agency Alpha').length).toBe(2));

    // DOC 배지가 있는 행의 편집 버튼 클릭 — DOC 배지와 같은 <tr> 안의 edit 버튼을 찾는다
    const docBadge = screen.getByText('DOC');
    const row = docBadge.closest('tr');
    expect(row).not.toBeNull();
    const editBtn = row!.querySelector('button svg')?.closest('button');
    expect(editBtn).not.toBeNull();
    fireEvent.click(editBtn!);

    // 모달이 열리고 cargo_type select가 DOC로 설정됨
    await waitFor(() => expect(screen.getByText('수정')).toBeInTheDocument());
    // 화물 유형 select: 'DOC'/'NON_DOC'/'ALL' 옵션을 가진 select가 cargo_type select
    const cargoSelect = Array.from(document.querySelectorAll('select')).find(
      (sel) => Array.from(sel.options).some((o) => ['DOC', 'NON_DOC'].includes(o.value))
    ) as HTMLSelectElement | undefined;
    expect(cargoSelect).toBeDefined();
    expect(cargoSelect!.value).toBe('DOC');

    // zone_rates 검증 — cargo_type 필터 없으면 ALL 정책의 z2(12.0%)가 DOC 수정 폼에 혼입됨
    // AgencyPolicyForm은 active Zone(z1, z2) 각각에 number input을 렌더링한다.
    const modalNumberInputs = Array.from(document.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
    // 입력값을 Zone 라벨 순서(z1, z2)와 매칭: 첫 번째가 z1, 두 번째가 z2
    expect(modalNumberInputs.length).toBeGreaterThanOrEqual(2);
    // z1에는 DOC 정책 0.05 → 5, z2는 값 없음('' → 빈 값)
    expect(modalNumberInputs[0].value).toBe('5');
    expect(modalNumberInputs[1].value).toBe('');
  });
});
