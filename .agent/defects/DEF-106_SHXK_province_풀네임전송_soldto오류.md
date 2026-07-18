# DEF-106: `resolveProvinceEnglishName`의 province 풀네임 변환이 SHXK "Sold To" 주/성 코드 길이 제약(0~5 영숫자)과 충돌

## 발견 경위
JSJung이 `SHXK_TEST_MOCK=false`로 오더 ZEN-2026-000001 실제 createorder 재시도 중 발견(DEF-104 unit_code 수정 이후 네 번째 오류):
```
API创建并预报订单失败：创建预报失败!Invalid sold to state province code. Valid length is 0 to 5 alphanumeric
```
→ "Sold To(구매자) 주/성 코드가 잘못됨. 0~5자 영숫자여야 함"

## 근본 원인
`buildCreateOrderPayload()`(`src/lib/ups/label-mapping.ts`)가 `shipper_province`/`consignee_province`를 `resolveProvinceEnglishName()`으로 **전체 영문명**으로 변환해서 전송합니다:
```
resolveProvinceEnglishName('28', 'JP') → "Hyōgo Prefecture" (16자, 비ASCII 'ō' 포함)
```
"0~5자 영숫자" 제약과 정확히 충돌합니다. 이 오더의 화주(KR, "Seoul"=5자)는 마침 경계값이라 안 걸렸을 가능성이 있으나, 수취인(JP, "Hyōgo Prefecture")은 명백히 위반.

이 변환 로직은 원래 JSJung의 명시적 요청(Issue #551 원문 요청 2번: "consignee_province는 코드값이 아닌 영문 full name으로 대입")에 따라 PR#556(Baker)에서 도입되었고, PR#572에서 `shipper_province`에도 동일 패턴이 확장 적용됐습니다(Issue #571 재설계). 즉 **의도적 설계였으나, 이번 실제 SHXK 응답으로 그 가정(전체 영문명을 원한다)이 최소한 "Sold To" 검증 기준에서는 틀렸음이 확인됨** — Mock 모드에서는 이 검증이 없어 지금까지 발견 안 됨(DEF-103/104/105와 동일 패턴).

## 영향 범위
- 수취인 국가의 주/성 영문명이 5자를 초과하거나 비ASCII 문자를 포함하는 모든 오더의 실제 SHXK createorder (예: 일본 대부분 현, 미국 일부 주 등)
- 화주(한국) 쪽도 "Seoul"은 우연히 5자로 통과했으나 "Gyeonggi Province"(17자) 등은 동일하게 실패할 것으로 추정

## 긴급도
High — SHXK 실연동 createorder가 이 오류로 막힘(DEF-104 해결 직후 곧바로 발견된 네 번째 순차 오류).

## 권장 조치
`shipper_province`/`consignee_province` 모두 `resolveProvinceEnglishName()` 변환을 제거하고, DB에 저장된 원본 코드값(ISO 코드, 이미 코드 형태로 저장 중 — DEF-103/Issue #571 재설계 이후 표준)을 그대로 전송. 상세 설계는 Issue #577 참조.

## 관련 파일
`src/lib/ups/label-mapping.ts`

## 보고
JSJung 직접 지시("수정해야지")로 착수. Issue #551/552(원 설계 요청)를 실제 API 응답 근거로 뒤집는 결정 — JSJung 승인 하에 진행.
