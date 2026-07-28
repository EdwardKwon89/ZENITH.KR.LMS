import { describe, it, expect, vi, beforeEach } from 'vitest';
import { USER_ROLES } from '@/lib/auth/rbac';

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { validateUserAction } from '@/lib/auth/guards';
import { getShipperInvoices } from '@/app/actions/finance/shipper-invoices';

function createChainableMock(data: any = null) {
  const mock: any = { then: (resolve: any) => resolve({ data, error: null }) };
  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order', 'limit', 'maybeSingle', 'single', 'gte', 'lte', 'is', 'filter'].forEach(m => {
    mock[m] = vi.fn(() => mock);
  });
  return mock;
}

describe('getShipperInvoices behavioral tests', () => {
  let mockSupabase: any;

  function mockValidate(role: string, orgId?: string) {
    const supabase = {
      from: vi.fn(),
    };
    (validateUserAction as any).mockResolvedValue({
      supabase,
      user: { id: 'user-1' },
      profile: { id: 'user-1', role, org_id: orgId || 'org-1' },
    });
    return supabase;
  }

  let invoiceChain: any;

  function setupQueryMock(supabase: any, data: any[] = []) {
    invoiceChain = createChainableMock(data);
    supabase.from.mockReturnValue(invoiceChain);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const shipperRoles = [
    { role: USER_ROLES.CORPORATE, label: 'CORPORATE' },
    { role: USER_ROLES.AGENCY_SHIPPER, label: 'AGENCY_SHIPPER' },
    { role: USER_ROLES.INDIVIDUAL, label: 'INDIVIDUAL' },
    { role: USER_ROLES.SHIPPER, label: 'SHIPPER' },
  ];

  shipperRoles.forEach(({ role, label }) => {
    it(`TC-INV-${label}: ${label} → 에러 없이 성공하고 shipper_id 필터가 걸린다`, async () => {
      const supabase = mockValidate(role, 'my-org');
      setupQueryMock(supabase, [{ id: 'inv-1', invoice_no: 'INV-001' }]);

      const result = await getShipperInvoices();
      expect(Array.isArray(result)).toBe(true);

      expect(invoiceChain.eq).toHaveBeenCalledWith('shipper_id', 'my-org');
    });
  });

  it('TC-INV-ADMIN: ADMIN → 전체 조회, shipper_id 필터 없음', async () => {
    const supabase = mockValidate(USER_ROLES.ADMIN);
    setupQueryMock(supabase, [{ id: 'inv-1' }, { id: 'inv-2' }]);

    const result = await getShipperInvoices();
    expect(Array.isArray(result)).toBe(true);

    expect(invoiceChain.eq).not.toHaveBeenCalledWith('shipper_id', expect.anything());
  });

  it('TC-INV-AGENCY: AGENCY → agency_shippers 조회 후 in 필터', async () => {
    const supabase = mockValidate(USER_ROLES.AGENCY, 'agency-org');
    const agencyChain = createChainableMock([{ shipper_org_id: 'shipper-1' }, { shipper_org_id: 'shipper-2' }]);
    const invoiceChain = createChainableMock([{ id: 'inv-1', invoice_no: 'INV-001' }]);
    supabase.from.mockImplementation((table: string) => {
      if (table === 'zen_agency_shippers') return agencyChain;
      if (table === 'zen_invoices') return invoiceChain;
      return createChainableMock([]);
    });

    const result = await getShipperInvoices();
    expect(Array.isArray(result)).toBe(true);
    expect(invoiceChain.in).toHaveBeenCalledWith('shipper_id', ['shipper-1', 'shipper-2']);
  });

  it('TC-INV-BLOCKED: OPERATOR → 조회 권한 없음 에러', async () => {
    mockValidate(USER_ROLES.OPERATOR, 'org-1');
    await expect(getShipperInvoices()).rejects.toThrow('조회 권한이 없습니다.');
  });

  it('기간 필터가 전달되면 gte/lte가 호출된다', async () => {
    const supabase = mockValidate(USER_ROLES.ADMIN);
    setupQueryMock(supabase, []);

    await getShipperInvoices({ startDate: '2026-07-01', endDate: '2026-07-28' });

    expect(invoiceChain.gte).toHaveBeenCalled();
    expect(invoiceChain.lte).toHaveBeenCalled();
  });
});
