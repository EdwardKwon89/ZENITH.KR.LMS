// PostgREST 기본 1,000행 제한 대비 페이지네이션 헬퍼 (DEF-B-041 / Issue #1034)
//
// zen_ups_base_rates처럼 1,000행이 넘는 테이블을 상품 필터 없이 전체 조회할 때
// PostgREST는 `.range()` 미지정 시 기본 1,000행만 반환하고 나머지는 에러 없이
// 조용히 잘라낸다. 이 헬퍼는 동일 필터 조건으로 `.range(from, to)`를 반복 호출해
// 전체 행을 병합 반환한다.

export const POSTGREST_MAX_ROWS = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAllRows<T = any>(
  buildQuery: (from: number, to: number) => Promise<{ data: unknown[] | null; error: unknown }>
): Promise<T[]> {
  const PAGE_SIZE = POSTGREST_MAX_ROWS;
  const allRows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw new Error((error as { message?: string })?.message ?? 'query failed');
    if (!data || data.length === 0) break;
    allRows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}
