/**
 * TASK-B-372 (Issue #1356 / DEF-150 §1.2): 오더 출고확정(RELEASED) 일자 조회.
 *
 * 기존에는 `'use server'` 파일(`ups-actual-cost.ts`)에서 인증 가드 없이 export되어
 * 비동기 서버 액션 규칙(DEF-B-162)과 인증 경계 문제가 있었다. 내부 헬퍼로 이동한다.
 */
export async function getOrderReleasedDate(
  supabase: any,
  orderId: string,
  fallbackCreatedAt?: string,
): Promise<string> {
  const { data } = await supabase
    .from('order_status_history')
    .select('created_at')
    .eq('order_id', orderId)
    .eq('next_status', 'RELEASED')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const ts = data?.created_at || fallbackCreatedAt;
  if (!ts) return new Date().toISOString().slice(0, 10);
  return String(ts).slice(0, 10);
}
