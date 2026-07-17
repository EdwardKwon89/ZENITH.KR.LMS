import { describe, it, expect, vi } from 'vitest';

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

describe('Issue #565: previewShxkPayload + triggerCreateOrderTest', () => {
  it('previewShxkPayload와 triggerCreateOrderTest가 소스에 존재하는지 검증', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

    expect(src).toContain('export async function previewShxkPayload');
    expect(src).toContain("action: 'CREATEORDER' | 'WAYBILL' | 'INVOICE' | 'CUSTOMS' | 'VOID'");
    expect(src).toContain('export async function triggerCreateOrderTest');
    expect(src).toContain('placeShxkOrder');
  });

  it('buildCreateOrderPayload가 label-mapping.ts에 존재하고 placeShxkOrder에서 사용되는지 검증', async () => {
    const fs = await import('fs');
    const mappingSrc = fs.readFileSync('src/lib/ups/label-mapping.ts', 'utf-8');
    const actionsSrc = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

    expect(mappingSrc).toContain('export function buildCreateOrderPayload');
    expect(mappingSrc).toContain('shipperDefaults: { name: string; country: string }');
    expect(actionsSrc).toContain('buildCreateOrderPayload(shxkCode, order, countryCode, packages');
  });

  it('UpsTradeDocumentActions.tsx에 previewShxkPayload와 triggerCreateOrderTest 임포트가 있는지 검증', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/orders/UpsTradeDocumentActions.tsx', 'utf-8');

    expect(src).toContain('previewShxkPayload');
    expect(src).toContain('triggerCreateOrderTest');
    expect(src).toContain('CREATEORDER');
    expect(src).toContain('PreviewPopup');
  });
});
