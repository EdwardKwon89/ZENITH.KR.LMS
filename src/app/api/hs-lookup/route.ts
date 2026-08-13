import { logger } from '@/lib/logger';
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const client = new Anthropic();

interface HsLookupRequest {
  item_name?: string;
  dest_country_code?: string;
}

interface HsLookupResponse {
  hs_code: string | null;
  confidence: 'high' | 'medium' | 'low';
  note?: string;
}

const MAX_ITEM_NAME_LENGTH = 200;

/**
 * [REQ-06] 아이템명 → HS Code 자동 추출 (Claude Haiku 4.5)
 * POST /api/hs-lookup
 *
 * 인증 필수 — 로그인하지 않은 사용자의 외부 API 비용 발생 방지.
 * `/api/*` 경로는 middleware.ts authGuard가 스킵하므로 route 자체 인증 체크.
 */
export async function POST(req: Request) {
  try {
    // 1. 인증 체크 (finance/export/route.ts 패턴 준용)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. 입력 검증
    const body: HsLookupRequest = await req.json();
    const itemName = body.item_name?.trim() ?? '';

    if (itemName.length < 2) {
      return NextResponse.json<HsLookupResponse>({ hs_code: null, confidence: 'low' });
    }

    // 최대 길이 제한 — 과도하게 긴 입력으로 토큰 비용 증가 방지
    const truncatedName = itemName.slice(0, MAX_ITEM_NAME_LENGTH);
    const destCountry = body.dest_country_code?.trim();
    // 캐시 키 — 품목명 단독(lower(trim(item_name))). 목적지 국가 제외:
    // HS Code 6자리는 국제 공통표준이라 목적지 무관, 키에 넣으면 재사용률만 떨어짐.
    const normalizedName = itemName.toLowerCase();

    // 3. 캐시 우선 조회 (TASK-B-293 / Issue #1091) — 히트 시 AI 호출 없이 즉시 반환
    const { data: cached, error: cacheError } = await getCachedHsLookup(supabase, normalizedName);
    if (!cacheError && cached?.hs_code) {
      return NextResponse.json<HsLookupResponse>({
        hs_code: cached.hs_code,
        confidence: normalizeConfidence(cached.confidence),
      });
    }

    // 4. Haiku 4.5 API 호출 (캐시 미스 시에만)
    const text = await callHaiku(truncatedName, destCountry);
    const parsed = parseHsLookupJson(text);

    // 5. 성공 결과만 캐시에 저장 — 실패(hs_code null)는 캐싱하지 않음:
    //    표현이 다른 재조회 기회를 막지 않기 위함. insert 실패(UNIQUE 충돌 등)는 무시.
    if (parsed.hs_code) {
      await saveHsLookup(supabase, normalizedName, parsed.hs_code, parsed.confidence);
    }

    return NextResponse.json<HsLookupResponse>(parsed);
  } catch (error) {
    logger.error('[HS-LOOKUP] Failed to extract HS code:', error);
    return NextResponse.json<HsLookupResponse>({ hs_code: null, confidence: 'low' });
  }
}

async function callHaiku(truncatedName: string, destCountry?: string) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    system:
      'You are a customs HS code expert. Given an item name, return the most appropriate 6-digit HS code for international shipping. Respond ONLY with valid JSON: {"hs_code": "XXXXXX", "confidence": "high|medium|low"}. If uncertain, return {"hs_code": null, "confidence": "low"}.',
    messages: [
      {
        role: 'user',
        content: `Item name: "${truncatedName}"${destCountry ? `, destination: ${destCountry}` : ''}`,
      },
    ],
  });
  return extractTextContent(message.content);
}

async function getCachedHsLookup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemNameNormalized: string,
) {
  return supabase
    .from('zen_hs_code_lookups')
    .select('hs_code, confidence')
    .eq('item_name_normalized', itemNameNormalized)
    .maybeSingle();
}

async function saveHsLookup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemNameNormalized: string,
  hsCode: string,
  confidence: HsLookupResponse['confidence'],
) {
  await supabase
    .from('zen_hs_code_lookups')
    .insert({ item_name_normalized: itemNameNormalized, hs_code: hsCode, confidence });
}

function extractTextContent(content: Anthropic.Messages.ContentBlock[]): string {
  for (const block of content) {
    if (block.type === 'text') {
      return block.text;
    }
  }
  return '';
}

function parseHsLookupJson(text: string): HsLookupResponse {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(jsonText);

    const hsCode = typeof parsed.hs_code === 'string' ? parsed.hs_code : null;
    const confidence = normalizeConfidence(parsed.confidence);

    return { hs_code: hsCode, confidence };
  } catch {
    return { hs_code: null, confidence: 'low' };
  }
}

function normalizeConfidence(value: unknown): HsLookupResponse['confidence'] {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'low';
}
