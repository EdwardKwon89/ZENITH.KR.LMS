/**
 * SHXK/UPS 규격 사전검증 한도 상수 (TASK-B-332 / Issue #1239)
 *
 * 한도 변경 시 이 파일의 상수 한 줄만 수정하면 폼(zod) 스키마와
 * 서버 payload 사전검증(`validate-payload.ts`)이 동시에 반영된다.
 *
 * 근거:
 * - HS_CODE_MAX=30: SHXK 명세 `invoice[].hs_code` byte/char 상한.
 * - ITEM_NAME_MAX=35: UPS 실측 오류 "Valid range is 0 to 35"
 *   (SHXK 명세는 500자지만 UPS가 더 엄격).
 * - PHONE_MAX_DIGITS=15: 국제 전화 E.164 상한 (SHXK 명세 100자 대비 UPS 하류 한도 기준).
 */

export const HS_CODE_MAX = 30;
export const ITEM_NAME_MAX = 35;
export const PHONE_MAX_DIGITS = 15;

/**
 * 문자열에서 비숫자를 모두 제거한다. 전화번호 입력 정제용.
 * - 기존 저장 데이터(하이픈 포함) 보호: label-mapping 전송 전에도 적용.
 */
export function stripNonDigits(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

/**
 * 전화 필드 서버측 정규화 (TASK-B-347 / Issue #1279):
 * 비숫자 제거 후 E.164 상한(PHONE_MAX_DIGITS) 초과분절단.
 *
 * 거부(reject)가 아니라 정규화하는 이유: 레거시 저장분(하이픈·괄호 포함)이
 * 다른 필드와 함께 재저장될 때 전체 저장을 막지 않으면서 전화 필드만 정제하기 위함
 * (예: 조직 정보 수정 시 기존 `02-1234-5678` 형식 contact_phone).
 */
export function normalizePhoneDigits(value: string): string {
  return stripNonDigits(value).slice(0, PHONE_MAX_DIGITS);
}