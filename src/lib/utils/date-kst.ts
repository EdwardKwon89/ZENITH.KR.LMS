/**
 * KST 기준 오늘 날짜를 YYYY-MM-DD 포맷으로 반환
 * en-CA 로케일은 YYYY-MM-DD 포맷을 사용
 */
export function getKstToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}
