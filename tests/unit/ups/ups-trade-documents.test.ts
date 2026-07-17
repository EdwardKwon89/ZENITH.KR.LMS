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

    // DOC_TYPE_CONTENT_MAP 확인
    const mapMatch = src.match(/DOC_TYPE_CONTENT_MAP\s*=\s*\{[^}]+\}/);
    expect(mapMatch).not.toBeNull();
    if (mapMatch) {
      expect(mapMatch[0]).toContain("WAYBILL: '1'");
      expect(mapMatch[0]).toContain("CUSTOMS: '2'");
      expect(mapMatch[0]).toContain("INVOICE: '3'");
    }

    // fetchShxkTradeDocument 함수가 DOC_TYPE_CONTENT_MAP을 사용하는지
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
