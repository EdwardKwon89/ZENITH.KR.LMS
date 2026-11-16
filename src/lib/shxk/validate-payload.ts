// SHXK createorder 호출 직전 payload 사전 검증 (TASK-B-277 / Issue #1052)
//
// 폼(zod) 검증을 우회할 수 있는 경로(벌크 오더 임포트 등)까지 방어하기 위해,
// buildCreateOrderPayload() 결과물을 SHXK createorder 호출 직전에 한 번 더 검증한다.
// 에러가 있으면 SHXK API 호출 자체를 하지 않고 명확한 한글 에러로 즉시 실패시킨다.
//
// 필수 필드 기준: docs/80_RawData/Phase8_UPS_API_리서치_결과.md (SHXK createorder 공식 필드 스펙)

import { HS_CODE_MAX, ITEM_NAME_MAX, PHONE_MAX_DIGITS, RECIPIENT_COMPANY_MAX, SHIPPER_STREET_MAX, CONSIGNEE_STREET_MAX, CONSIGNEE_NAME_MAX, CONSIGNEE_COUNTRYCODE_MAX, CONSIGNEE_PROVINCE_MAX, CONSIGNEE_CITY_MAX, CONSIGNEE_POSTCODE_MAX, CONSIGNEE_EMAIL_MAX, CONSIGNEE_TARIFF_MAX, stripNonDigits } from '@/lib/validation/shxk-limits';
import { isShxkDeclareUnit } from '@/lib/shxk/declare-units';

export interface ShxkPayloadShape {
  shipper?: Record<string, unknown>;
  consignee?: Record<string, unknown>;
  invoice?: Record<string, unknown>[];
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || String(v).trim() === '';
}

// TASK-B-332 (Issue #1239): SHXK·UPS 규격 사전검증 — 전화번호 숫자만 + 15자리(E.164)
// 기존 저장분(하이픈 포함)이 이 지점을 통과하면 SHXK 호출 실패 대신 명확한 한글 에러로 즉시 차단한다.
function checkPhone(prefix: string, value: unknown, errors: string[]): void {
  if (isEmpty(value)) return;
  const s = String(value);
  if (!/^\d+$/.test(s)) errors.push(`${prefix} 전화번호는 숫자만 사용할 수 있습니다`);
  if (stripNonDigits(s).length > PHONE_MAX_DIGITS) {
    errors.push(`${prefix} 전화번호는 ${PHONE_MAX_DIGITS}자리 이하여야 합니다`);
  }
}

// TASK-B-344 (Issue #1270): UPS AddressLine 길이 사전검증 — checkPhone과 같은 패턴의小型 헬퍼.
// 길이는 **최종 전송 문자열의 .length** 기준(buildCreateOrderPayload가 조립·쉼표 치환한 뒤).
// 빈 값은 위의 '주소 누락' 검사가 처리하므로 길이 검사에서는 중복 오류를 만들지 않는다.
function checkStreetLength(prefix: string, value: unknown, max: number, errors: string[]): void {
  if (isEmpty(value)) return;
  const len = String(value).length;
  if (len > max) {
    errors.push(`${prefix} 주소가 너무 깁니다(현재 ${len}자, 최대 ${max}자) — 상세주소를 줄여 주세요`);
  }
}

// TASK-B-346 PR③ (Issue #1278): SHXK 명세 `consignee.*` 상한 사전검증 — checkStreetLength와 동일 패턴.
// 빈 값은 각 필드의 '누락' 검사가 처리하므로 여기서는 중복 오류를 만들지 않는다(경계 초과 시 단일 오류).
function checkMaxLength(label: string, value: unknown, max: number, errors: string[]): void {
  if (isEmpty(value)) return;
  if (String(value).length > max) errors.push(`${label} ${max}자 초과`);
}

// TASK-B-346 PR③ (Issue #1278): SHXK createorder `consignee.*` 명세 상한 일괄 검사.
// 명세 행 근거는 shxk-limits.ts 상수 주석 참조. street·telephone은 별도(더 엄격한) 한도로 검사한다.
const CONSIGNEE_MAX_LENGTHS: ReadonlyArray<readonly [key: string, label: string, max: number]> = [
  ['consignee_name', '수취인 성명', CONSIGNEE_NAME_MAX],
  ['consignee_countrycode', '수취인 국가코드', CONSIGNEE_COUNTRYCODE_MAX],
  ['consignee_province', '수취인 주/도', CONSIGNEE_PROVINCE_MAX],
  ['consignee_city', '수취인 도시', CONSIGNEE_CITY_MAX],
  ['consignee_postcode', '수취인 우편번호', CONSIGNEE_POSTCODE_MAX],
  ['consignee_email', '수취인 이메일', CONSIGNEE_EMAIL_MAX],
  ['consignee_tariff', '수취인 통관부호', CONSIGNEE_TARIFF_MAX],
];

function checkConsigneeMaxLengths(consignee: Record<string, unknown> | undefined, errors: string[]): void {
  for (const [key, label, max] of CONSIGNEE_MAX_LENGTHS) {
    checkMaxLength(label, consignee?.[key], max, errors);
  }
}

// TASK-B-332 (Issue #1239) / TASK-B-337 (Issue #1251): 통관 신고 품목(invoice[]) 사전검증.
function checkInvoiceItems(invoice: Record<string, unknown>[] | undefined, errors: string[]): void {
  if (!invoice || invoice.length === 0) {
    errors.push('통관 신고 품목 누락');
    return;
  }
  invoice.forEach((item, i) => {
    const idx = i + 1;
    if (isEmpty(item.invoice_enname)) errors.push(`품목 ${idx}: 영문 품명 누락`);
    else if (String(item.invoice_enname).length > ITEM_NAME_MAX) errors.push(`품목 ${idx}: 품명 ${ITEM_NAME_MAX}자 초과`);
    if (isEmpty(item.invoice_quantity)) errors.push(`품목 ${idx}: 수량 누락`);
    if (isEmpty(item.invoice_unitcharge)) errors.push(`품목 ${idx}: 단가 누락`);
    if (isEmpty(item.hs_code)) errors.push(`품목 ${idx}: HS 코드 누락`);
    else if (String(item.hs_code).trim().length > HS_CODE_MAX) errors.push(`품목 ${idx}: HS 코드 ${HS_CODE_MAX}자 초과`);
    // TASK-B-337 (Issue #1251): unit_code가 있으면 SHXK 허용 단위인지 검사.
    // 매핑(resolveShxkUnitCode)을 거치므로 정상 경로에서는 발생하지 않는 방어선이다.
    if (!isEmpty(item.unit_code) && !isShxkDeclareUnit(String(item.unit_code))) {
      errors.push(`품목 ${idx}: 단위 코드 ${String(item.unit_code)}은(는) SHXK 허용 단위가 아닙니다`);
    }
  });
}

export function validateShxkPayload(payload: ShxkPayloadShape): string[] {
  const errors: string[] = [];
  const shipper = payload.shipper as Record<string, unknown> | undefined;
  const consignee = payload.consignee as Record<string, unknown> | undefined;
  const invoice = payload.invoice as Record<string, unknown>[] | undefined;

  if (isEmpty(shipper?.shipper_name)) errors.push('발송인 성명 누락');
  if (isEmpty(shipper?.shipper_countrycode)) errors.push('발송인 국가코드 누락');
  if (isEmpty(shipper?.shipper_street)) errors.push('발송인 주소 누락');
  else checkStreetLength('발송인', shipper?.shipper_street, SHIPPER_STREET_MAX, errors); // TASK-B-344 (Issue #1270)
  if (isEmpty(shipper?.shipper_telephone) && isEmpty(shipper?.shipper_mobile)) {
    errors.push('발송인 연락처 누락 (전화/휴대폰 중 1개 이상)');
  }
  checkPhone('발송인', shipper?.shipper_telephone, errors);

  if (isEmpty(consignee?.consignee_name)) errors.push('수취인 성명 누락');
  // TASK-B-346 (Issue #1278): 수하인 회사명은 선택. 값이 있으면 SHXK 상한(200자)을 넘지 않아야 한다.
  if (!isEmpty(consignee?.consignee_company) && String(consignee?.consignee_company).length > RECIPIENT_COMPANY_MAX) {
    errors.push(`수취인 회사명 ${RECIPIENT_COMPANY_MAX}자 초과`);
  }
  if (isEmpty(consignee?.consignee_countrycode)) errors.push('수취인 국가코드 누락');
  if (isEmpty(consignee?.consignee_street)) errors.push('수취인 주소 누락');
  else checkStreetLength('수취인', consignee?.consignee_street, CONSIGNEE_STREET_MAX, errors); // TASK-B-344 (Issue #1270)
  if (isEmpty(consignee?.consignee_city)) errors.push('수취인 도시 누락'); // TASK-B-283 (Issue #1069 / DEF-B-055)
  if (isEmpty(consignee?.consignee_postcode)) errors.push('수취인 우편번호 누락');
  if (isEmpty(consignee?.consignee_telephone) && isEmpty(consignee?.consignee_mobile)) {
    errors.push('수취인 연락처 누락 (전화/휴대폰 중 1개 이상)');
  }
  checkPhone('수취인', consignee?.consignee_telephone, errors);
  checkConsigneeMaxLengths(consignee, errors); // TASK-B-346 PR③ (Issue #1278)

  checkInvoiceItems(invoice, errors); // TASK-B-332 (Issue #1239) / TASK-B-337 (Issue #1251)

  return errors;
}
