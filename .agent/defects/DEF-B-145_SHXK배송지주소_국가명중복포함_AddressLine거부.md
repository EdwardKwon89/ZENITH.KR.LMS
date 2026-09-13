# DEF-B-145: SHXK(UPS) createorder 시 shipper_street에 시/구/도/국가명 중복 포함 — UPS AddressLine 검증 거부

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung — 오더 `ZEN-2026-000015`(舊 000014)에서 화주정보가 정상 저장돼 있는데도 SHXK createorder가 실패하는 이유 문의 → Jaison이 실제 API 응답으로 원인 확정 |
| **긴급도** | High (UPS 실등록 자체가 막힘 — 화주 주소가 이 패턴에 걸리는 오더는 전량 등록 실패) |
| **발견일** | 2026-09-13 |
| **관련 실증적** | `zen_shxk_api_logs` id `99804d2b-2d68-45d3-b57d-b3513d768a94` (createorder, reference_no=ZEN2026000015) |

## 현상

화주명(TASK-B-324로 이미 정상화됨)·화주 조직 연결에는 문제가 없는데도, 실제 SHXK `createorder` API 호출이 다음 오류로 실패:

```json
{"success": 0, "cnmessage": "API创建并预报订单失败：创建预报失败!Invalid ShipFrom AddressLine3", "enmessage": "...Invalid ShipFrom AddressLine3"}
```

## 원인

실제 전송된 `shipper.shipper_street` 값:
```
"6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do, Republic of Korea 6 floor, 601 room"
```

- `order.shipper_address_english`에 이미 **도로명+구+시+도+국가명 전체**가 통째로 들어있음(Daum 우편번호 위젯/영문주소 변환 결과로 추정)
- [`resolveShipperStreet()`](../../src/lib/ups/label-mapping.ts#L64-L73)가 여기에 `shipper_address_detail_english`(상세주소, 예: "6 floor, 601 room")를 **단순 공백으로 이어붙임**:
  ```ts
  return [shipperAddr, shipperAddrDetail].filter(Boolean).join(' ')
  ```
- 결과적으로 국가명("Republic of Korea") 뒤에 상세주소가 붙는 비정상적인 순서의 매우 긴 단일 문자열이 만들어짐
- SHXK는 이 문자열을 UPS 라벨 규격에 맞춰 AddressLine1/2/3(줄당 약 35자 제한)으로 자동 분할하는데, 문자열이 길어 분할 시 **"Republic of Korea"가 AddressLine3 구간에 걸쳐 포함**됨
- UPS는 국가명이 `shipper_countrycode`(별도 필드)로 이미 전달되므로, AddressLine에 국가명이 중복 포함되면 형식 위반으로 거부함 — 이것이 "Invalid ShipFrom AddressLine3"의 실체

**중요**: SHXK 자체 스펙(`docs/80_RawData/Phase8_UPS_API_리서치_결과.md`)상 `shipper.shipper_street`는 최대 300자까지 허용되어 SHXK 필드 검증(`validateShxkPayload`)은 통과한다 — 이 결함은 SHXK 검증 단계가 아니라 **그 이후 UPS 라벨 생성 단계**에서만 드러나 로컬 회귀 테스트(mock 기반)로는 잡히지 않는다.

## 영향 범위

- `resolveShipperStreet()`([label-mapping.ts:64-73](../../src/lib/ups/label-mapping.ts#L64-L73))를 사용하는 `buildCreateOrderPayload()`의 `shipper.shipper_street` — 화주 주소가 "전체 주소를 한 필드에 담는" 패턴(Daum 우편번호 등)으로 저장된 모든 오더에서 재현 가능
- 동일 패턴을 쓰는 [`resolveConsigneeStreet()`](../../src/lib/ups/label-mapping.ts#L77-L89)(수하인 측)도 같은 구조적 위험 존재 — 확인 필요
- 재현에 실제 SHXK/UPS API 응답이 필요해(주소값에 따라 오류 여부가 갈림) 로컬 mock 테스트만으로는 검증이 어려움 — 재현 조건 정의가 이번 Task의 핵심 난이도

## 권장 조치

- `resolveShipperStreet()`/`resolveConsigneeStreet()`가 시/구/도/국가명을 중복 포함하지 않도록 정리 — `shipper_city`/`shipper_state_province`/`shipper_country_code`로 이미 별도 전달되는 구/시/도/국가 토큰을 `shipper_street` 조합 시 제거하거나,애초에 도로명 상세주소만 추출하는 방식 검토
- 상세주소(`_detail_english`)는 국가명 뒤가 아니라 도로명 바로 뒤(구/시/도 앞)에 오도록 순서 조정도 함께 고려
- 재현/검증 방법은 실제 SHXK 응답을 mock으로 고정해 회귀 테스트화(현재 이 문자열·오류 응답을 fixture로 사용 가능) — `docs/80_RawData/Phase8_UPS_API_리서치_결과.md`에 UPS AddressLine 분할 규칙이 명시돼 있지 않다면 SHXK 측에 문의가 필요할 수 있음
