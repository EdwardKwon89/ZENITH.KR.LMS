/**
 * KST 기준 오늘 날짜를 YYYY-MM-DD 포맷으로 반환
 * en-CA 로케일은 YYYY-MM-DD 포맷을 사용
 */
export function getKstToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

/**
 * 타임스탬프(timestamptz ISO 문자열)를 **KST 달력일**(YYYY-MM-DD)로 변환한다.
 * 청구 기간·기준일 표시는 KST 기준이다(2026-11-21 JSJung 결정 — TASK-B-360 ⒝-1).
 */
export function kstDateString(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

/**
 * KST 달력일 기준 청구 기간의 **절반 개구 구간** 경계를 만든다.
 * - start: `dateFrom 00:00:00+09:00` (포함)
 * - endExclusive: `dateTo 다음날 00:00:00+09:00` (미포함)
 *
 * `23:59:59` 종료 경계를 쓰지 않는 이유: 소수초(.500 등) 오더가 누락된다.
 * 반면 개구 구간이면 23:59:59.xxx 오더도 안전하게 포함된다.
 */
export function kstRangeBounds(
  dateFrom: string,
  dateTo: string,
): { start: string; endExclusive: string } {
  const [y, m, d] = dateTo.split('-').map(Number);
  // Date.UTC는 월·연도 오버플로를 자동 처리 (11-30 + 1일 → 12-01)
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return {
    start: `${dateFrom}T00:00:00+09:00`,
    endExclusive: `${nextDay}T00:00:00+09:00`,
  };
}
