import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/hs-lookup/route';

// TASK-B-293 (Issue #1091): /api/hs-lookup 캐시 우선 조회 회귀 테스트
// 실제 POST 함수를 직접 호출하고, Anthropic client·Supabase client를 mock하여
// "AI 호출 횟수"와 "캐시 테이블 저장 여부"를 실제 호출 기반으로 검증한다.
// (정적 문자열 검사·로직 재구현 금지 — R-09/R-17 위반 이력 참고)

const mockMessagesCreate = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: mockFrom,
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...args: any[]) => mockMessagesCreate(...args) };
  },
}));

const lookupChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  insert: vi.fn().mockResolvedValue({ error: null }),
};

mockFrom.mockReturnValue(lookupChain);

function callPost(itemName: string, destCountry?: string) {
  return POST(
    new Request('http://localhost/api/hs-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name: itemName, dest_country_code: destCountry }),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
  lookupChain.maybeSingle.mockResolvedValue({ data: null, error: null });
});

describe('TC-IS1091-A: /api/hs-lookup 캐시 우선 조회', () => {
  it('캐시 히트 — Anthropic API를 호출하지 않고 캐시 값을 즉시 반환', async () => {
    lookupChain.maybeSingle.mockResolvedValue({
      data: { hs_code: '847130', confidence: 'high' },
      error: null,
    });

    const res = await callPost('Smartphone Case');
    const body = await res.json();

    expect(body).toEqual({ hs_code: '847130', confidence: 'high' });
    // AI 호출 없이 즉시 반환되어야 함 (AI API 호출 절감의 핵심)
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    // 캐시 히트는 저장이 아니라 조회이므로 INSERT도 없어야 함
    expect(lookupChain.insert).not.toHaveBeenCalled();
  });

  it('캐시 미스 — AI 호출 후 성공 결과가 정규화된 품목명으로 캐시 테이블에 저장됨', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"hs_code": "847130", "confidence": "high"}' }],
    });

    const res = await callPost('Smartphone Case');
    const body = await res.json();

    expect(body).toEqual({ hs_code: '847130', confidence: 'high' });
    // AI 호출 1회
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    // 캐시 키 정규화(trim+lowercase) + 성공 결과 저장
    expect(lookupChain.insert).toHaveBeenCalledWith({
      item_name_normalized: 'smartphone case',
      hs_code: '847130',
      confidence: 'high',
    });
  });

  it('캐시 조회는 품목명만 키로 사용(목적지 국가 제외) — eq가 정규화된 키로 호출됨', async () => {
    await callPost('  Smartphone Case ', 'JP');

    expect(lookupChain.select).toHaveBeenCalledWith('hs_code, confidence');
    expect(lookupChain.eq).toHaveBeenCalledWith('item_name_normalized', 'smartphone case');
  });

  it('실패(hs_code null) 결과는 캐시에 저장되지 않음 — 표현이 다른 재조회 기회 보존', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"hs_code": null, "confidence": "low"}' }],
    });

    const res = await callPost('Rare Item XYZ');
    const body = await res.json();

    expect(body).toEqual({ hs_code: null, confidence: 'low' });
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    expect(lookupChain.insert).not.toHaveBeenCalled();
  });

  it('인증 실패 — 401 반환, AI 호출·캐시 조회 없음 (기존 동작 회귀 방지)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'no session' },
    });

    const res = await callPost('Smartphone Case');

    expect(res.status).toBe(401);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
