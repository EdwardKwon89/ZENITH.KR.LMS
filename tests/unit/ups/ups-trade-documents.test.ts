import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getnewlabel, removeorder } from '@/lib/shxk/order';
import { validateUserAction } from '@/lib/auth/guards';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/shxk/order', () => ({ createorder: vi.fn(), getnewlabel: vi.fn(), removeorder: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn().mockResolvedValue({
    supabase: null,
    profile: { id: 'test', role: 'ADMIN' },
  }),
}));
vi.mock('@/utils/supabase/server', () => ({ createAdminClient: vi.fn(), createClient: vi.fn() }));

describe('Issue #559: Trade document content_type mapping', () => {
  it('fetchShxkTradeDocument가 docType별 올바른 lable_content_type을 전달하는지 검증', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

    const mapMatch = src.match(/DOC_TYPE_CONTENT_MAP\s*=\s*\{[^}]+\}/);
    expect(mapMatch).not.toBeNull();
    if (mapMatch) {
      expect(mapMatch[0]).toContain("WAYBILL: '1'");
      expect(mapMatch[0]).toContain("CUSTOMS: '2'");
      expect(mapMatch[0]).toContain("INVOICE: '3'");
    }

    expect(src).toContain('DOC_TYPE_CONTENT_MAP[docType]');
    expect(src).toContain('getnewlabel');
  });

  it('getUpsLabelStatus가 fetchActiveLabelByOrder를 호출하는지 검증', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

    expect(src).toContain('export async function getUpsLabelStatus');
    expect(src).toContain('fetchActiveLabelByOrder');
  });
});

describe('Issue #565/569: previewShxkPayload + issueUpsLabel', () => {
  it('previewShxkPayload와 issueUpsLabel이 소스에 존재하는지 검증', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

    expect(src).toContain('export async function previewShxkPayload');
    expect(src).toContain("action: 'CREATEORDER' | 'WAYBILL' | 'INVOICE' | 'CUSTOMS' | 'VOID'");
    expect(src).toContain('export async function issueUpsLabel');
  });

  it('buildCreateOrderPayload가 label-mapping.ts에 존재하고 placeShxkOrder에서 사용되는지 검증', async () => {
    const fs = await import('fs');
    const mappingSrc = fs.readFileSync('src/lib/ups/label-mapping.ts', 'utf-8');
    const actionsSrc = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

    expect(mappingSrc).toContain('export function buildCreateOrderPayload');
    expect(mappingSrc).toContain('shipperDefaults: { name: string; country: string }');
    expect(actionsSrc).toContain('buildCreateOrderPayload(shxkCode, order, countryCode, packages');
  });

  it('UpsTradeDocumentActions.tsx에 previewShxkPayload와 issueUpsLabel 임포트가 있는지 검증', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/orders/UpsTradeDocumentActions.tsx', 'utf-8');

    expect(src).toContain('previewShxkPayload');
    expect(src).toContain('issueUpsLabel');
    expect(src).not.toContain('triggerCreateOrderTest');
    expect(src).toContain('CREATEORDER');
    expect(src).toContain('PreviewPopup');
  });
});

describe('Issue #582: fetchShxkTradeDocument 응답 결과 팝업', () => {
  it('ResultPopup 컴포넌트가 소스에 존재한다', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/orders/UpsTradeDocumentActions.tsx', 'utf-8');

    expect(src).toContain('function ResultPopup');
    expect(src).toContain('SHXK Response');
    expect(src).toContain('JSON.stringify(result, null, 2)');
  });

  it('resultState가 선언되어 있다', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/orders/UpsTradeDocumentActions.tsx', 'utf-8');

    expect(src).toContain('resultState');
    expect(src).toContain('setResultState');
  });

  it('fetchShxkTradeDocument 결과가 resultState에 저장된다', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/orders/UpsTradeDocumentActions.tsx', 'utf-8');

    expect(src).toContain('setResultState({ action, result: res as Record<string, unknown> })');
  });

  it('ResultPopup이 렌더링된다', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/orders/UpsTradeDocumentActions.tsx', 'utf-8');

    expect(src).toContain('{resultState && (');
    expect(src).toContain('<ResultPopup');
    expect(src).toContain('onConfirm={() => setResultState(null)}');
  });

  it('window.open이 제거되었다', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/orders/UpsTradeDocumentActions.tsx', 'utf-8');

    expect(src).not.toContain('window.open(res.url');
  });
});

describe('DEF-108: reference_no 하이픈 제거 (getnewlabel/removeorder)', () => {
  const HYPHENATED_REF = 'ZEN-2026-000001';
  const STRIPPED_REF = 'ZEN2026000001';
  const ORDER_ID = 'order-uuid-001';

  function setupSupabaseMock(labelData: { id: string; reference_no: string; tracking_number: string | null } | null) {
    const eqChain = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: labelData }),
    };
    const selectChain = {
      select: vi.fn().mockReturnValue(eqChain),
      eq: vi.fn().mockReturnValue(eqChain),
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        update: vi.fn().mockReturnValue(updateChain),
      }),
    };
    return supabase;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getnewlabel).mockResolvedValue({ success: 1, data: { label_url: 'https://test.example.com/doc' }, message: 'OK' });
    vi.mocked(removeorder).mockResolvedValue({ success: 1, message: 'OK' });
  });

  it('voidUpsLabel이 removeorder 호출 시 reference_no에서 하이픈을 제거한다', async () => {
    const { voidUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const label = { id: 'lbl-1', reference_no: HYPHENATED_REF, tracking_number: 'TK123' };
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: setupSupabaseMock(label) as any,
      profile: { id: 'test', role: 'ADMIN' },
    } as any);

    await voidUpsLabel(ORDER_ID);

    expect(removeorder).toHaveBeenCalledWith(STRIPPED_REF);
  });

  it('fetchShxkTradeDocument이 getnewlabel 호출 시 reference_no에서 하이픈을 제거한다', async () => {
    const { fetchShxkTradeDocument } = await import('@/app/actions/operations/ups-labels');
    const label = { id: 'lbl-2', reference_no: HYPHENATED_REF, tracking_number: 'TK123' };
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: setupSupabaseMock(label) as any,
      profile: { id: 'test', role: 'ADMIN' },
    } as any);

    await fetchShxkTradeDocument(ORDER_ID, 'WAYBILL');

    expect(getnewlabel).toHaveBeenCalledWith(
      expect.objectContaining({ lable_content_type: '1' }),
      [{ reference_no: STRIPPED_REF }],
    );
  });

  it('fetchShxkTradeDocument에서 INVOICE 호출 시에도 하이픈을 제거한다', async () => {
    const { fetchShxkTradeDocument } = await import('@/app/actions/operations/ups-labels');
    const label = { id: 'lbl-3', reference_no: HYPHENATED_REF, tracking_number: 'TK123' };
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: setupSupabaseMock(label) as any,
      profile: { id: 'test', role: 'ADMIN' },
    } as any);

    await fetchShxkTradeDocument(ORDER_ID, 'INVOICE');

    expect(getnewlabel).toHaveBeenCalledWith(
      expect.objectContaining({ lable_content_type: '3' }),
      [{ reference_no: STRIPPED_REF }],
    );
  });

  it('fetchShxkTradeDocument에서 CUSTOMS 호출 시에도 하이픈을 제거한다', async () => {
    const { fetchShxkTradeDocument } = await import('@/app/actions/operations/ups-labels');
    const label = { id: 'lbl-4', reference_no: HYPHENATED_REF, tracking_number: 'TK123' };
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: setupSupabaseMock(label) as any,
      profile: { id: 'test', role: 'ADMIN' },
    } as any);

    await fetchShxkTradeDocument(ORDER_ID, 'CUSTOMS');

    expect(getnewlabel).toHaveBeenCalledWith(
      expect.objectContaining({ lable_content_type: '2' }),
      [{ reference_no: STRIPPED_REF }],
    );
  });

  it('voidUpsLabel 호출 시 getnewlabel은 호출되지 않는다', async () => {
    const { voidUpsLabel } = await import('@/app/actions/operations/ups-labels');
    const label = { id: 'lbl-5', reference_no: HYPHENATED_REF, tracking_number: 'TK123' };
    vi.mocked(validateUserAction).mockResolvedValue({
      supabase: setupSupabaseMock(label) as any,
      profile: { id: 'test', role: 'ADMIN' },
    } as any);

    await voidUpsLabel(ORDER_ID);

    expect(getnewlabel).not.toHaveBeenCalled();
  });
});
