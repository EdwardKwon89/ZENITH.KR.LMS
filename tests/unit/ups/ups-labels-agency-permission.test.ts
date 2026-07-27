import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/shxk/client', () => ({ callShxk: vi.fn() }));
vi.mock('@/lib/shxk/order', () => ({
  createorder: vi.fn(),
  getnewlabel: vi.fn(),
  removeorder: vi.fn(),
}));
vi.mock('@/lib/ups/label-mapping', () => ({
  buildCreateOrderPayload: vi.fn().mockReturnValue({ reference_no: 'TEST001', shipper: {}, consignee: {}, cargovolume: [], invoice: [] }),
  determineOrderCargotype: vi.fn().mockReturnValue({ cargotype: 'W', mailCargoType: '4' }),
  buildCargovolume: vi.fn().mockReturnValue([]),
  buildInvoiceFromItems: vi.fn().mockReturnValue([]),
  resolveShipperStreet: vi.fn().mockReturnValue(''),
}));

const mockValidateUserAction = vi.fn();
const mockCallShxk = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: (...args: any[]) => mockValidateUserAction(...args),
}));

vi.mock('@/lib/shxk/client', () => ({
  callShxk: (...args: any[]) => mockCallShxk(...args),
}));

function mockSupabase() {
  const chain: any = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn(() => chain),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve: any, reject: any) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCallShxk.mockResolvedValue({ success: 0, message: 'mock error' });
});

describe('DEF-116: checkLabelPermission AGENCY 추가', () => {
  it('AGENCY 역할이 registerUpsOrder에서 checkLabelPermission을 통과한다', async () => {
    mockValidateUserAction.mockResolvedValue({
      supabase: mockSupabase(),
      profile: { id: 'agency-user', role: 'AGENCY', org_id: 'org-1' },
    });

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder('order-1');

    expect(result.success).toBe(false);
    expect(result.error).not.toContain('권한이 없습니다');
  });

  it('AGENCY 역할이 fetchAndIssueUpsLabel에서 checkLabelPermission을 통과한다', async () => {
    mockValidateUserAction.mockResolvedValue({
      supabase: mockSupabase(),
      profile: { id: 'agency-user', role: 'AGENCY', org_id: 'org-1' },
    });

    const { fetchAndIssueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const result = await fetchAndIssueUpsLabel('order-1');

    expect(result.success).toBe(false);
    expect(result.error).not.toContain('권한이 없습니다');
  });

  it('AGENCY 역할이 cancelUpsRegistration에서 checkLabelPermission을 통과한다', async () => {
    mockValidateUserAction.mockResolvedValue({
      supabase: mockSupabase(),
      profile: { id: 'agency-user', role: 'AGENCY', org_id: 'org-1' },
    });

    const { cancelUpsRegistration } = await import('@/app/actions/operations/ups-labels');
    const result = await cancelUpsRegistration('order-1');

    expect(result.success).toBe(false);
    expect(result.error).not.toContain('권한이 없습니다');
  });

  it('권한 없는 역할(CORPORATE)은 registerUpsOrder에서 checkLabelPermission에 거부된다', async () => {
    mockValidateUserAction.mockResolvedValue({
      supabase: mockSupabase(),
      profile: { id: 'corp-user', role: 'CORPORATE', org_id: 'org-1' },
    });

    const { registerUpsOrder } = await import('@/app/actions/operations/ups-labels');
    const result = await registerUpsOrder('order-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('권한이 없습니다');
  });

  it('권한 없는 역할(CORPORATE)은 fetchAndIssueUpsLabel에서 checkLabelPermission에 거부된다', async () => {
    mockValidateUserAction.mockResolvedValue({
      supabase: mockSupabase(),
      profile: { id: 'corp-user', role: 'CORPORATE', org_id: 'org-1' },
    });

    const { fetchAndIssueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const result = await fetchAndIssueUpsLabel('order-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('권한이 없습니다');
  });
});
