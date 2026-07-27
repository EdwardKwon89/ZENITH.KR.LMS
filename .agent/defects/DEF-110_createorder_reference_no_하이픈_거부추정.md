# DEF-110: createorder reference_no 하이픈 미제거 — SHXK 운송장 생성 실패 원인 추정

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-19 |
| **발견자** | JSJung (createorder 테스트 버튼 팝업에서 직접 확인) |
| **긴급도** | 즉시 (P1) |
| **관련 DEF** | DEF-107(cargovolume child_number), DEF-108(getnewlabel/removeorder reference_no) — 동일 하이픈 거부 패턴의 세 번째 사례 |

## 현상

createorder 테스트 버튼 클릭 시 표시되는 SHXK 요청 페이로드 미리보기에서 `reference_no` 필드에 하이픈 포함 `order_no`(예: `ZEN-2026-000001`)가 그대로 전달되는 것을 확인.

## 배경 — 기존 분석과의 차이

DEF-108 배정 당시(Issue #586) 분석에서는 "`createorder`에 전달되는 reference_no는 이미 하이픈 포함 상태로 정상 동작 중이므로 절대 건드리지 마세요"라고 명시해 `buildCreateOrderPayload`의 `reference_no`는 수정 범위에서 제외했었음.

JSJung 재검토 결과: **createorder 자체도 하이픈 포함 reference_no 때문에 SHXK 측에서 운송장 등 생성이 실패하는 것으로 추정** — 기존 "정상 동작 중" 판단이 실제로는 틀렸을 가능성. DEF-107(cargovolume child_number)·DEF-108(getnewlabel/removeorder)과 동일한 "SHXK API가 하이픈 포함 reference_no를 거부한다"는 근본 원인이 createorder 경로에도 동일하게 적용되는 것으로 판단됨.

## 원인 코드

`src/lib/ups/label-mapping.ts` `buildCreateOrderPayload()` 78행:

```ts
reference_no: order.order_no as string,
```

`order.order_no`가 하이픈 포함 형식(`ZEN-2026-000001`)을 그대로 SHXK createorder 페이로드에 전달함.

## 권장 조치

DEF-107·DEF-108과 동일한 패턴으로 수정:

```ts
reference_no: (order.order_no as string).replace(/-/g, ''),
```

**주의**: `buildCreateOrderPayload` 내부의 `cargovolume` (DEF-107에서 이미 수정됨, `child_number`)와 `reference_no`(이번 건) 외에 추가로 하이픈 포함 필드가 이 함수 안에 더 있는지(예: 다른 참조번호류 필드) 전체 재검토 필요.

## 영향 범위

`buildCreateOrderPayload`는 실제 오더 등록(`placeShxkOrder`) 및 createorder 테스트 버튼(`triggerCreateOrderTest`/`previewShxkPayload` CREATEORDER 액션) 양쪽에서 호출됨 — 만약 이 추정이 맞다면 **UPS 특송으로 등록된 기존 오더들이 SHXK 측 운송장 생성에 전부 실패했을 가능성**이 있어 즉시 확인 필요.

## 검증 방법

수정 후 실제 SHXK 서버로 createorder 테스트 버튼을 눌러 운송장 생성 성공 여부로 최종 검증(로컬 mock/unit test만으로는 SHXK 실제 응답 확인 불가 — Phase 8 UPS 테스트 제약 참조).
