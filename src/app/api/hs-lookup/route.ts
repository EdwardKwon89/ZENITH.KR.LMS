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

    // TASK-B-293 (Issue #1091): 캐시 우선 조회 — 품목명 단독 키(lower(trim)), 목적지 제외.
    // HS Code 6자리는 국제 공통표준이라 목적지 무관 — 캐시 재사용률 극대화.
    const cacheKey = truncatedName.toLowerCase().trim();
    const { data: cached } = await supabase
      .from('zen_hs_code_lookups')
      .select('hs_code, confidence')
      .eq('item_name_normalized', cacheKey)
      .maybeSingle();

    if (cached?.hs_code) {
      return NextResponse.json<HsLookupResponse>({
        hs_code: cached.hs_code,
        confidence: (['high', 'medium', 'low'].includes(cached.confidence) ? cached.confidence : 'low') as HsLookupResponse['confidence'],
      });
    }

    // 3. Haiku 4.5 API 호출
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

    const text = extractTextContent(message.content);
    const parsed = parseHsLookupJson(text);

    // TASK-B-293 (Issue #1091): 성공 결과(hs_code가 null 아닌)만 캐시에 INSERT —
    // 실패/저신뢰(null) 결과는 캐싱하지 않음(표현이 다른 재조회 기회를 막지 않기 위함).
    if (parsed.hs_code) {
      await supabase
        .from('zen_hs_code_lookups')
        .upsert({ item_name_normalized: cacheKey, hs_code: parsed.hs_code, confidence: parsed.confidence }, { onConflict: 'item_name_normalized', ignoreDuplicates: true });
    }

    return NextResponse.json<HsLookupResponse>(parsed);
  } catch (error) {
    logger.error('[HS-LOOKUP] Failed to extract HS code:', error);
    return NextResponse.json<HsLookupResponse>({ hs_code: null, confidence: 'low' });
  }
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
    const confidence = ['high', 'medium', 'low'].includes(parsed.confidence)
      ? (parsed.confidence as HsLookupResponse['confidence'])
      : 'low';

    return { hs_code: hsCode, confidence };
  } catch {
    return { hs_code: null, confidence: 'low' };
  }
}
