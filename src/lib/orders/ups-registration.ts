/**
 * TASK-B-339 (Issue #1254): UPS 등록 사실 판정.
 *
 * "UPS 등록 전까지 수정 가능"에서 "등록 전"은 상태(WAREHOUSED)가 아니라 **등록 사실**로 판정한다.
 * 등록(registerUpsOrder, warehouse.ts)은 SHXK createorder + zen_ups_labels 초기 행 삽입을 수반하므로,
 * 활성 라벨 행(is_voided=false)이 곧 등록의 증거다. 반대로 undoUpsRegistration은 removeorder + 라벨 행
 * 삭제를 하므로 등록 취소 후에는 다시 수정 가능해진다.
 *
 * HELD/RETURNED/CLAIMED는 PACKED·IN_TRANSIT 이후에도 전이 가능하므로 상태만으로는 "등록 전"을
 * 보장하지 못한다(이미 SHXK에 등록된 오더가 수정되어 DB↔SHXK가 어긋나는 결함 ①).
 */

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

/**
 * 오더에 "활성 UPS 라벨"이 있는지 조회한다.
 *
 * @param supabase SupabaseClient (테스트에서는 mock — `ups-product-guard.ts`와 동일한 관례로 any)
 * @throws DB 조회 error — `error`를 무시하고 false로 취급하면 가드가 항상 "없음"으로 동작해
 *   등록 후 수정 차단이 통째로 무력화되므로 반드시 throw 한다.
 */
export async function hasActiveUpsLabel(supabase: any, orderId: string): Promise<boolean> {
  const { data, error } = (await supabase
    .from('zen_ups_labels')
    .select('id')
    .eq('order_id', orderId)
    .eq('is_voided', false)
    .limit(1)
    .maybeSingle()) as QueryResult<{ id: string } | null>;

  if (error) {
    throw new Error(`UPS 라벨 조회 실패: ${error.message}`);
  }

  return !!data;
}
