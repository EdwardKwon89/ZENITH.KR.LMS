// TASK-B-303 (Issue #1125): 오더 등록/수정 이력용 핵심 필드 화이트리스트
//
// zen_order_edit_log의 old_data/new_data에 담을 "핵심 필드만의 부분 스냅샷" 필드 목록.
// rate_card_logs의 부분 스냅샷(pricing-schedule.ts) 패턴을 이식한 것으로,
// 전체 row가 아니라 화이트리스트 필드만 추출한다.
//
// 명시적 제외:
// - packages/items — 별도 관심사(패키지·품목 배열). 창고 실측/포장 흐름에 자체 이력 성격이 있음.
// - estimated_cost — 사용자가 직접 수정하는 값이 아니라 요율 재계산 시 자동 변경되는 파생값.
//   포함 시 무변경 재계산마다 로그가 쌓여 이력이 오염됨.
// - origin_port_id / dest_port_id — 이번 1차 범위 제외(필요시 후속 추가).

export const ORDER_EDIT_LOG_CORE_FIELDS = [
  // 화주
  'shipper_id', 'shipper_name', 'shipper_contact_name', 'shipper_contact_phone', 'shipper_contact_email',
  'shipper_address', 'shipper_address_detail', 'shipper_country_code', 'shipper_state_province', 'shipper_city', 'shipper_zipcode', 'shipper_biz_no',
  // 수하인
  'recipient_name', 'recipient_phone', 'recipient_email', 'recipient_address', 'recipient_address_detail',
  'recipient_country_code', 'recipient_state_province', 'recipient_city', 'recipient_zipcode', 'recipient_pccc',
  // 배송
  'transport_mode', 'delivery_method', 'incoterms', 'ups_product_code', 'ups_service_family',
  'pickup_location', 'pickup_contact_name', 'pickup_contact_tel', 'pickup_address',
  // 기타
  'description', 'delivery_notes',
] as const;

export type OrderEditLogCoreField = (typeof ORDER_EDIT_LOG_CORE_FIELDS)[number];

// 핵심 필드만 추출한 부분 스냅샷 (rate_card_logs 부분 스냅샷 패턴 이식)
export function extractOrderEditLogSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    ORDER_EDIT_LOG_CORE_FIELDS.map((f) => [f, (row as any)[f] ?? null])
  );
}

// 필드 key → 한글 라벨 매핑 (UI diff 표시용. 새 i18n 네임스페이스는 만들지 않는다 — TASK-B-303 과설계 금지)
export const ORDER_EDIT_LOG_FIELD_LABELS: Record<string, string> = {
  // 화주
  shipper_id: '화주',
  shipper_name: '화주명',
  shipper_contact_name: '화주 담당자',
  shipper_contact_phone: '화주 연락처',
  shipper_contact_email: '화주 이메일',
  shipper_address: '화주 주소',
  shipper_address_detail: '화주 상세주소',
  shipper_country_code: '화주 국가',
  shipper_state_province: '화주 시/도',
  shipper_city: '화주 시/군/구',
  shipper_zipcode: '화주 우편번호',
  shipper_biz_no: '화주 사업자번호',
  // 수하인
  recipient_name: '수하인명',
  recipient_phone: '수하인 연락처',
  recipient_email: '수하인 이메일',
  recipient_address: '수하인 주소',
  recipient_address_detail: '수하인 상세주소',
  recipient_country_code: '수하인 국가',
  recipient_state_province: '수하인 시/도',
  recipient_city: '수하인 시/군/구',
  recipient_zipcode: '수하인 우편번호',
  recipient_pccc: '수하인 PCCC',
  // 배송
  transport_mode: '운송 수단',
  delivery_method: '배송 방식',
  incoterms: '거래 조건',
  ups_product_code: 'UPS 상품',
  ups_service_family: 'UPS 서비스',
  pickup_location: '픽업 장소',
  pickup_contact_name: '픽업 담당자',
  pickup_contact_tel: '픽업 연락처',
  pickup_address: '픽업 주소',
  // 기타
  description: '비고',
  delivery_notes: '배송 메모',
};
