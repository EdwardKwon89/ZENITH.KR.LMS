import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// TASK-B-293 (Issue #1091): /api/hs-lookup 캐시 우선 조회 회귀 테스트.
//
// 실제 POST 핸들러를 import해, Anthropic SDK·supabase 클라이언트를 mock으로 주입하고
// 실제 동작을 검증한다 (그림자 함수/문자열 검사 금지).

const mockMessagesCreate = vi.fn();
const mockFromChain: any = {};

function makeChain() {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve({ data: chain._maybe, error: null })),
    upsert: vi.fn(() => Promise.resolve({ error: null })),
    _maybe: null,
  };
  chain.setMaybe = (d: any) => { chain._maybe = d; };
  return chain;
}

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class {
      messages = { create: (...args: any[]) => mockMessagesCreate(...args) };
    },
  };
});
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: (...args: any[]) => mockGetUser(...args) },
    from: (...args: any[]) => mockFrom(...args),
  }),
}));

import { POST } from '@/app/api/hs-lookup/route';

function makeReq(body: Record<string, unknown>) {
  return new Request('http://localhost/api/hs-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function aiResponse(hsCode: string | null, confidence: string) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ hs_code: hsCode, confidence }) }],
  };
}

describe('TASK-B-293: /api/hs-lookup 캐시 우선 조회 (Issue #1091)', () => {
  let cacheChain: any;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheChain = makeChain();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'zen_hs_code_lookups') return cacheChain;
      return makeChain();
    });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  it('TC-293-01: 캐시 히트 → Anthropic API 미호출 + 캐시 값 즉시 반환', async () => {
    cacheChain.setMaybe({ hs_code: '847130', confidence: 'high' });

    const res = await POST(makeReq({ item_name: 'Laptop Computer' }));
    const body = await res.json();

    expect(body.hs_code).toBe('847130');
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it('TC-293-02: 캐시 미스 → AI 호출 후 결과가 캐시 테이블에 저장됨 (item_name_normalized로 upsert)', async () => {
    cacheChain.setMaybe(null); // 캐시 미스
    mockMessagesCreate.mockResolvedValue(aiResponse('847130', 'high'));

    const res = await POST(makeReq({ item_name: 'Laptop Computer' }));
    const body = await res.json();

    expect(body.hs_code).toBe('847130');
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    // 캐시 저장 호출 검증
    expect(cacheChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ item_name_normalized: 'laptop computer', hs_code: '847130', confidence: 'high' }),
      expect.objectContaining({ onConflict: 'item_name_normalized' })
    );
  });

  it('TC-293-03: AI가 hs_code null(실패) 반환 → 캐시에 저장 안 됨', async () => {
    cacheChain.setMaybe(null);
    mockMessagesCreate.mockResolvedValue(aiResponse(null, 'low'));

    const res = await POST(makeReq({ item_name: 'Mystery Item' }));
    const body = await res.json();

    expect(body.hs_code).toBeNull();
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    expect(cacheChain.upsert).not.toHaveBeenCalled();
  });

  it('TC-293-04: 캐시 키는 lower(trim) 정규화 — 대소문자/공백 무관 매칭', async () => {
    cacheChain.setMaybe({ hs_code: '611030', confidence: 'medium' });

    // 대문자+여백으로 입력해도 정규화된 키로 히트
    const res = await POST(makeReq({ item_name: '  SWEATER  ' }));
    const body = await res.json();

    expect(body.hs_code).toBe('611030');
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    // 조회는 lower(trim)된 키로 수행
    expect(cacheChain.eq).toHaveBeenCalledWith('item_name_normalized', 'sweater');
  });

  it('TC-293-05: 2글자 미만 입력 → AI 호출 없이 null 반환', async () => {
    const res = await POST(makeReq({ item_name: 'a' }));
    const body = await res.json();
    expect(body.hs_code).toBeNull();
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it('TC-293-06: 미인증 → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no' } });
    const res = await POST(makeReq({ item_name: 'Laptop' }));
    expect(res.status).toBe(401);
  });
});
