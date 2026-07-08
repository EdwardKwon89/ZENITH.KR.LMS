import { logger } from '@/lib/logger';
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

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

/**
 * [REQ-06] 아이템명 → HS Code 자동 추출 (Claude Haiku 4.5)
 * POST /api/hs-lookup
 */
export async function POST(req: Request) {
  try {
    const body: HsLookupRequest = await req.json();
    const itemName = body.item_name?.trim() ?? '';

    if (itemName.length < 2) {
      return NextResponse.json<HsLookupResponse>({ hs_code: null, confidence: 'low' });
    }

    const destCountry = body.dest_country_code?.trim();

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      system:
        'You are a customs HS code expert. Given an item name, return the most appropriate 6-digit HS code for international shipping. Respond ONLY with valid JSON: {"hs_code": "XXXXXX", "confidence": "high|medium|low"}. If uncertain, return {"hs_code": null, "confidence": "low"}.',
      messages: [
        {
          role: 'user',
          content: `Item name: "${itemName}"${destCountry ? `, destination: ${destCountry}` : ''}`,
        },
      ],
    });

    const text = extractTextContent(message.content);
    const parsed = parseHsLookupJson(text);

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
