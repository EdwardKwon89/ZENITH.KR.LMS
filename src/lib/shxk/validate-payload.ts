// SHXK createorder 호출 직전 payload 사전 검증 (TASK-B-277 / Issue #1052)
//
// 폼(zod) 검증을 우회할 수 있는 경로(벌크 오더 임포트 등)까지 방어하기 위해,
// buildCreateOrderPayload() 결과물을 SHXK createorder 호출 직전에 한 번 더 검증한다.
// 에러가 있으면 SHXK API 호출 자체를 하지 않고 명확한 한글 에러로 즉시 실패시킨다.
//
// 필수 필드 기준: docs/80_RawData/Phase8_UPS_API_리서치_결과.md (SHXK createorder 공식 필드 스펙)

export interface ShxkPayloadShape {
  shipper?: Record<string, unknown>;
  consignee?: Record<string, unknown>;
  invoice?: Record<string, unknown>[];
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || String(v).trim() === '';
}

export function validateShxkPayload(payload: ShxkPayloadShape): string[] {
  const errors: string[] = [];
  const shipper = payload.shipper as Record<string, unknown> | undefined;
  const consignee = payload.consignee as Record<string, unknown> | undefined;
  const invoice = payload.invoice as Record<string, unknown>[] | undefined;

  if (isEmpty(shipper?.shipper_name)) errors.push('발송인 성명 누락');
  if (isEmpty(shipper?.shipper_countrycode)) errors.push('발송인 국가코드 누락');
  if (isEmpty(shipper?.shipper_street)) errors.push('발송인 주소 누락');
  if (isEmpty(shipper?.shipper_telephone) && isEmpty(shipper?.shipper_mobile)) {
    errors.push('발송인 연락처 누락 (전화/휴대폰 중 1개 이상)');
  }

  if (isEmpty(consignee?.consignee_name)) errors.push('수취인 성명 누락');
  if (isEmpty(consignee?.consignee_countrycode)) errors.push('수취인 국가코드 누락');
  if (isEmpty(consignee?.consignee_street)) errors.push('수취인 주소 누락');
  if (isEmpty(consignee?.consignee_postcode)) errors.push('수취인 우편번호 누락');
  if (isEmpty(consignee?.consignee_telephone) && isEmpty(consignee?.consignee_mobile)) {
    errors.push('수취인 연락처 누락 (전화/휴대폰 중 1개 이상)');
  }

  if (!invoice || invoice.length === 0) {
    errors.push('통관 신고 품목 누락');
  } else {
    invoice.forEach((item, i) => {
      const idx = i + 1;
      if (isEmpty(item.invoice_enname)) errors.push(`품목 ${idx}: 영문 품명 누락`);
      if (isEmpty(item.invoice_quantity)) errors.push(`품목 ${idx}: 수량 누락`);
      if (isEmpty(item.invoice_unitcharge)) errors.push(`품목 ${idx}: 단가 누락`);
    });
  }

  return errors;
}
