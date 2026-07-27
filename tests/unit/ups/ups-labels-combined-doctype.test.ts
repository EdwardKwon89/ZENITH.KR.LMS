import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/shxk/client', () => ({ callShxk: vi.fn() }));

const mockGetnewlabel = vi.fn();
vi.mock('@/lib/shxk/order', () => ({
  createorder: vi.fn(),
  getnewlabel: (...args: any[]) => mockGetnewlabel(...args),
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
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: (...args: any[]) => mockValidateUserAction(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
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
  mockGetnewlabel.mockResolvedValue({ success: 1, data: { label_url: 'https://example.com/label.pdf' } });
  mockValidateUserAction.mockResolvedValue({
    supabase: mockSupabase(),
    profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
  });
});

describe('TASK-B-179: DOC_TYPE_CONTENT_MAP COMBINED 추가', () => {
  it('DOC_TYPE_CONTENT_MAP에 COMBINED가 포함됨', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');
    expect(src).toContain("COMBINED: '6'");
  });

  it('fetchAndIssueUpsLabel이 COMBINED docType을 허용', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');
    expect(src).toContain("'WAYBILL' | 'INVOICE' | 'CUSTOMS' | 'COMBINED'");
  });
});

describe('TASK-B-179: fetchAndIssueUpsLabel WAYBILL', () => {
  it('WAYBILL docType으로 호출 시 getnewlabel에 lable_content_type: "1"을 전달', async () => {
    const mockLabel = {
      id: 'label-1',
      reference_no: 'REF-001',
      tracking_number: '1Z999',
      is_voided: false,
    };

    const chain = mockSupabase();
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: mockLabel, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: mockLabel, error: null });

    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    });

    const { fetchAndIssueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    await fetchAndIssueUpsLabel('order-1', 'WAYBILL');

    expect(mockGetnewlabel).toHaveBeenCalledWith(
      expect.objectContaining({
        lable_content_type: '1',
      }),
      expect.any(Array)
    );
  });
});

describe('TASK-B-179: fetchAndIssueUpsLabel COMBINED', () => {
  it('COMBINED docType으로 호출 시 getnewlabel에 lable_content_type: "6"을 전달', async () => {
    const mockLabel = {
      id: 'label-1',
      reference_no: 'REF-001',
      tracking_number: '1Z999',
      is_voided: false,
    };

    const chain = mockSupabase();
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: mockLabel, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: mockLabel, error: null });

    mockValidateUserAction.mockResolvedValue({
      supabase: chain,
      profile: { id: 'user-1', role: 'ADMIN', org_id: 'org-1' },
    });

    const { fetchAndIssueUpsLabel } = await import('@/app/actions/operations/ups-labels');
    await fetchAndIssueUpsLabel('order-1', 'COMBINED');

    expect(mockGetnewlabel).toHaveBeenCalledWith(
      expect.objectContaining({
        lable_content_type: '6',
      }),
      expect.any(Array)
    );
  });
});
