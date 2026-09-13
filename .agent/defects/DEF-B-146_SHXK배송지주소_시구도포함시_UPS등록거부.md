# DEF-B-146: SHXK(UPS) createorder shipper_street에 시/구/도 포함 시 UPS AddressLine 초과로 등록 거부 — DEF-B-145 수정으로 불충분

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung — TASK-B-325(DEF-B-145) 병합·배포 후에도 오더 `ZEN-2026-000015`에서 동일 오류 재발 보고 → Jaison이 실제 SHXK API 직접 호출로 재현·검증 |
| **긴급도** | High (DEF-B-145 수정으로도 여전히 UPS 실등록이 막힘) |
| **발견일** | 2026-09-13 |
| **선행 결함** | [DEF-B-145](DEF-B-145_SHXK배송지주소_국가명중복포함_AddressLine거부.md) / [TASK-B-325](../tasks/TASK-B-325_260913_Issue1192_ShxkShipperStreetCountryDuplication.md) — 병합됐으나 **근본 원인을 완전히 해소하지 못함** |

## 현상

TASK-B-325(국가명 제거 + 상세주소 앞 정렬) 병합·배포 후에도 오더 `ZEN-2026-000015`의 SHXK `createorder`가 동일하게 실패:

```json
{"success": 0, "enmessage": "API创建并预报订单失败：创建预报失败!Invalid ShipFrom AddressLine3"}
```

실제 전송된 `shipper_street`(TASK-B-325 수정 반영, 국가명 제거·순서 교정 확인됨):
```
"6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do"  (88자)
```

## DEF-B-145 진단이 틀렸음을 보여주는 반증

`zen_shxk_api_logs`에서 **과거 실제 성공한** createorder 호출을 발견:
```
shipper_street: "461-5 Gonghang-daero, Gangseo-gu, Seoul, Republic of Korea"  (61자)  → 성공(success=1)
```
이 성공 사례는 **"Republic of Korea"(국가명)를 포함하고 있는데도 정상 통과**함 — DEF-B-145의 "국가명 중복이 원인" 진단이 틀렸음을 직접 반증.

## 재검증 (실제 SHXK API 직접 호출로 가설 확인, 2026-09-13)

Jaison이 동일 오더 데이터로 `shipper_street`만 도로명+상세주소로 축약(구/시/도 제거)해 실제 SHXK `createorder`를 직접 호출:

| 시도 | shipper_street | 길이 | 결과 |
|---|---|---|---|
| DEF-B-145 수정 후(구/시/도 포함) | `6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do` | 88자 | **실패** (Invalid ShipFrom AddressLine3) |
| **진단 재검증**(구/시/도 제거) | `6 floor, 601 room, 6 Daewangpangyo-ro 351beon-gil` | 49자 | **성공** (`order_id=785179`, 실 트래킹 `1ZJ443D30406066155` 발급 확인, 즉시 `removeorder`로 정리 완료) |

## 실제 원인

UPS(SHXK 경유)는 ShipFrom 주소를 AddressLine 1~2줄(줄당 약 35자, 총 약 70자)까지만 지원하고, **ShipFrom에는 3번째 줄(AddressLine3) 자체를 허용하지 않는** 것으로 강하게 추정됨(정확한 문자수 임계값은 SHXK 응답만으로 확정 불가 — 61자 성공/88자 실패 사례로 대략적 경계만 추정). 국가명 포함 여부와 무관하게, **전체 길이가 2줄 분량을 넘어 3번째 줄이 필요한 순간 내용과 무관하게 거부**됨.

`shipper_city`/`shipper_province`가 이미 별도 필드로 SHXK에 전달되는데(`buildCreateOrderPayload()` 참조), `shipper_street`에도 시/구/도를 중복 포함시키는 것이 길이 초과의 주요 원인.

## 영향 범위

- DEF-B-145와 동일: `resolveShipperStreet()`/`resolveConsigneeStreet()`/`buildCreateOrderPayload()`의 `shipper_street`·`consignee_street`
- 도로명 주소가 짧거나 상세주소가 없는 경우(예: 성공 사례처럼 시/구/도만 포함, 상세주소 없음)는 우연히 2줄 안에 들어가 문제가 드러나지 않을 수 있음 — 상세주소(층/호수 등)가 있는 주소에서 특히 취약

## 권장 조치

`shipper_street`/`consignee_street`를 **도로명 주소 + 상세주소로만 구성**하고, 시/구/도는 포함하지 않도록 수정(이미 별도 필드로 전달되므로 정보 손실 없음). DEF-B-145에서 신설한 `stripCountryToken()` 방식을 확장해 시/구/도 세그먼트까지 제거하는 방향 검토 필요 — 다만 "도로명" 자체에 쉼표가 포함된 케이스(드묾)나 시/구/도 판별 방법(값 매칭 vs 세그먼트 개수 기준)에 대한 설계 결정 필요.
