// DEF-B-047 / Issue #1050: UPS 오더 도착국 결정 유틸리티

/**
 * UPS 오더의 도착국 코드를 결정합니다.
 *优先순위: recipient_country_code > dest_port.country_code > 'US' (폴백)
 */
export function resolveDestCountryCode(order: {
  recipient_country_code?: string | null;
  dest_port?: { country_code?: string | null } | null;
}): string {
  return order.recipient_country_code || order.dest_port?.country_code || 'US';
}
