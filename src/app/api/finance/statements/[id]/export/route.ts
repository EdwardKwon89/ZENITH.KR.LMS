import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { contentDisposition, exportStatementXlsx } from '@/lib/finance/billing/statement-excel';

// TASK-B-360 ⒝-2 (Issue #1366) — 청구서 Excel 출력 Route Handler (WBS 4.6)
// 설계: An_17 부록 A §2(출력 경로)·§7(오류·보안) — 서버 액션은 파일을 반환하지 않는다.
//  · 접근 권한은 getBillingStatementDetail과 동일한 RLS — 안 보이면 404(존재 비노출)
//  · 합계 불일치·조회 실패는 파일을 만들지 않고 500 (부분 파일 금지)

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const result = await exportStatementXlsx(supabase, id);
    if (!result.ok) {
      const message = result.status === 404 ? 'Not Found' : 'Internal Server Error';
      return new NextResponse(message, { status: result.status });
    }
    return new NextResponse(new Uint8Array(result.body), {
      status: 200,
      headers: {
        'Content-Type': XLSX_CONTENT_TYPE,
        'Content-Disposition': contentDisposition(result.filename),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    logger.error('[statement-export] handler failed', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
