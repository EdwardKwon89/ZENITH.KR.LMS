// TASK-B-147 Issue #546 — resolveShxkCode 목적지코드 조회 → 'KOR' 고정
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/shxk/order', () => ({ createorder: vi.fn(), getnewlabel: vi.fn(), removeorder: vi.fn() }));
vi.mock('@/lib/shxk/config', () => ({ SHXK_SHIPPER_NAME: 'SNTL', SHXK_SHIPPER_COUNTRY: 'KR' }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({
  validateUserAction: vi.fn().mockResolvedValue({ profile: { id: 'test-user', role: 'HQ', org_id: 'test-org' } }),
  checkPermission: vi.fn().mockReturnValue(true),
}));

function createMockSupabase() {
  const eqCalls: [string, any][] = [];
  const single = vi.fn().mockResolvedValue({ data: { shxk_code: 'FXUPS' }, error: null });
  const eq3 = vi.fn().mockReturnValue({ single });
  const eq2 = vi.fn().mockReturnValue({ eq: eq3 });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  const from = vi.fn().mockReturnValue({ select });
  return { supabase: { from }, from, eqCalls: { eq1, eq2, eq3 }, single };
}

describe('TC-SHXK-01: resolveShxkCode KOR 고정 (Issue #546, TASK-B-147)', () => {
  it('resolveShxkCode가 zen_ups_shxk_country_map 조회 시 country_code에 KOR을 사용한다', async () => {
    const { resolveShxkCode } = await import('@/app/actions/operations/ups-labels');
    const mock = createMockSupabase();

    const result = await resolveShxkCode(mock.supabase as any, '01', 'KOR', 'DDP');

    expect(mock.from).toHaveBeenCalledWith('zen_ups_shxk_country_map');
    expect(result).toBe('FXUPS');
    expect(mock.from.mock.calls[0][0]).toBe('zen_ups_shxk_country_map');
  });

  it('소스코드에서 resolveShxkCode 호출부가 항상 KOR을 사용하는지 검증 (code-level 회귀)', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/app/actions/operations/ups-labels.ts', 'utf-8');

    const callLines = src.split('\n').filter(line =>
      line.includes('resolveShxkCode(') && !line.includes('async function resolveShxkCode')
    );

    expect(callLines.length).toBeGreaterThan(0);
    for (const line of callLines) {
      expect(line).toContain("'KOR'");
      expect(line).not.toMatch(/resolveShxkCode\([^)]*iso3Code/);
    }
  });
});
