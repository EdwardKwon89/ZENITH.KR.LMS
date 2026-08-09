import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

import { fetchKoreaEximRate, POST } from '@/app/api/cron/exchange-rate-sync/route';

describe('TASK-B-257: 환율 수집 Cron / KoreaExim 파싱 (Issue #999)', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    global.fetch = realFetch;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    global.fetch = realFetch;
  });

  it('TC-999-EXR-C1: deal_bas_r 콤마 제거 후 수치 파싱', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        { cur_unit: 'USD', deal_bas_r: '1,382.50' },
        { cur_unit: 'JPY(100)', deal_bas_r: '900.00' },
      ]),
    });

    const rate = await fetchKoreaEximRate('test-key', '2026-08-09');
    expect(rate).toBe(1382.5);
  });

  it('TC-999-EXR-C2: USD 행 없음 → null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ cur_unit: 'JPY(100)', deal_bas_r: '900.00' }]),
    });

    const rate = await fetchKoreaEximRate('test-key', '2026-08-09');
    expect(rate).toBeNull();
  });

  it('TC-999-EXR-C3: result=2 (고시 없음) → null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ cur_unit: 'USD', result: 2, deal_bas_r: '0' }]),
    });

    const rate = await fetchKoreaEximRate('test-key', '2026-08-09');
    expect(rate).toBeNull();
  });

  it('TC-999-EXR-C4: 비정상 응답(비배열) → null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ error: 'NODATA' }),
    });

    const rate = await fetchKoreaEximRate('test-key', '2026-08-09');
    expect(rate).toBeNull();
  });

  it('TC-999-EXR-C5: searchdate 하이픈 제거 (YYYYMMDD)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ cur_unit: 'USD', deal_bas_r: '1,380' }]),
    });

    await fetchKoreaEximRate('test-key', '2026-08-09');
    const calledUrl = (global.fetch as any).mock.calls[0][0] as string;
    expect(calledUrl).toContain('searchdate=20260809');
    expect(calledUrl).toContain('authkey=test-key');
    expect(calledUrl).toContain('data=AP01');
  });

  it('TC-999-EXR-C6: 인증 헤더 없으면 401', async () => {
    const req = new Request('http://localhost/api/cron/exchange-rate-sync', { method: 'POST' });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('TC-999-EXR-C7: 키 미설정 시 스킵 200', async () => {
    vi.stubEnv('KOREAEXIM_API_KEY', '');
    const req = new Request('http://localhost/api/cron/exchange-rate-sync', {
      method: 'POST',
      headers: { 'x-vercel-cron': '1' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toContain('KOREAEXIM_API_KEY');
  });
});
