/**
 * TASK-B-339 (Issue #1254): 오더 상세 화면 경로 결정.
 *
 * UPS 오더의 상세는 `/orders/{id}/ups-detail`, 그 외에는 `/orders/{id}`다.
 * 리다이렉트·돌아가기 경로 곳곳에서 하드코딩하지 않고 이 함수를 사용해 경로를 단일화한다.
 */
export function getOrderDetailPath(orderId: string, transportMode?: string | null): string {
  return transportMode === 'UPS' ? `/orders/${orderId}/ups-detail` : `/orders/${orderId}`;
}
