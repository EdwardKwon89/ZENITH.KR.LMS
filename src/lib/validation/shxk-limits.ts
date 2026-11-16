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
 * - SHIPPER_STREET_MAX=70: UPS ShipFrom AddressLine 2줄×약 35자 추정 — DEF-B-145/146 실측
 *   (실제 .length 49자·58자 성공 / 87자 실패)와 모순 없음. Jaison 확정 2026-11-13 (잠정값).
 * - CONSIGNEE_STREET_MAX=105: UPS ShipTo AddressLine 3줄×약 35자 **가정** — ShipTo 실패 실측
 *   없음. Jaison 확정 2026-11-13 (잠정값 — 실제 거부 로그가 쌓이면 값만 조정).
 * - RECIPIENT_COMPANY_MAX=200: SHXK 명세 `consignee.consignee_company` 상한 200자
 *   (docs/80_RawData/Phase8_UPS_API_리서치_결과.md).
 * - CONSIGNEE_*_MAX (TASK-B-346 PR③ / Issue #1278): SHXK 명세 `consignee.*` 상한 —
 *   명세 행 번호를 각 상수 주석에 명기한다. `consignee_street`(명세 300)는 UPS AddressLine
 *   사정으로 앱이 더 엄격한 CONSIGNEE_STREET_MAX(105), `consignee_telephone`(명세 100)은
 *   PHONE_MAX_DIGITS(15)를 적용하므로 여기 상한을 추가하지 않는다(의도적 갭 아님).
 *   ※ 이 상한들은 SHXK 명세값이며, UPS 하류 거부 실측 로그로 확정된 값이 아니다(잠정).
 */

export const HS_CODE_MAX = 30;
export const ITEM_NAME_MAX = 35;
export const PHONE_MAX_DIGITS = 15;
// TASK-B-344 (Issue #1270): UPS AddressLine 한도 — 근거는 상단 헤더 참조 (Jaison 확정 잠정값)
export const SHIPPER_STREET_MAX = 70;
export const CONSIGNEE_STREET_MAX = 105;
// TASK-B-346 (Issue #1278): 수하인 회사명(consignee_company) SHXK 명세 상한
export const RECIPIENT_COMPANY_MAX = 200;

// TASK-B-346 PR③ (Issue #1278): SHXK createorder `consignee.*` 명세 상한
// (docs/80_RawData/Phase8_UPS_API_리서치_결과.md 130~147행 — 각 주석의 행 번호 참조)
export const CONSIGNEE_NAME_MAX = 200; // 명세 130행
export const CONSIGNEE_COUNTRYCODE_MAX = 2; // 명세 132행
export const CONSIGNEE_PROVINCE_MAX = 300; // 명세 133행
export const CONSIGNEE_CITY_MAX = 300; // 명세 134행
export const CONSIGNEE_POSTCODE_MAX = 100; // 명세 137행
export const CONSIGNEE_EMAIL_MAX = 100; // 명세 142행
export const CONSIGNEE_TARIFF_MAX = 50; // 명세 147행

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