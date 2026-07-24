# TASK-209 — UPS Order Detail: order.status 중심 상태 표시로 재구성

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-209 |
| **GitHub Issue** | [#794](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/794) |
| **생성일** | 2026-07-24 |
| **할당 Agent** | Riley |
| **우선순위** | P2 |
| **전제조건** | 없음 |
| **커밋 태그** | `[Gemini]` |
| **상태** | 🔔 |

---

## [배경]

Issue #607(TASK-189, Riley 원 구현)로 만든 UPS 전용 Order Detail 화면 트래킹 구조를 검토(Edward 지시)한 결과:
- 오더 내부 상태(`order.status`)는 `REGISTERED→SCHEDULED→WAREHOUSED→PACKED→RELEASED→IN_TRANSIT`까지 전부 내부 운영자 액션(픽업/입고/UPS등록/출고확정)으로 정확히 전환되는 신뢰할 수 있는 백본
- 반면 현재 화면은 이 신뢰할 수 있는 상태를 작은 배지로만 표시하고, 상대적으로 약한 두 섹션(구식 `TrackingTimeline` — UPS 오더는 provider_type이 VIRTUAL 고정이라 항상 비어있음 / `UpsTrackingEventsList` — 하루 1번만 갱신)을 주요 섹션으로 크게 배치

## [결정 사항] (Edward, 2026-07-24)

1. **order.status를 화면의 중심 상태 표시로 승격** — 디자인은 Fancy해도 되나, 가독성 있고 간편하게 구성할 것
2. **(범위 확대, 2026-07-24) "실시간 UPS 배송 확인" 버튼 + Agency 수동 DELIVERED 상태변경 권한** — IN_TRANSIT→DELIVERED 자동전환 신뢰성 문제(IMP-156, 하루 1회 폴링에만 의존)에 대한 대응책으로 이번 Task에 포함
3. **예외 코드 처리는 범위 제외** — UPS 배송 에러/예외 상태 코드 전체 목록이 문서화되어 있지 않아(코드베이스 전체에서 실제 다뤄지는 코드는 `NT`/`DL` 2개뿐) 조치 불가. IMP-156에 남겨두고 이번 Task에서 처리하지 않음
4. **(범위 확대, 2026-07-24) 배송비 조회가 재구성된 화면에서 빠지면 안 됨** — 기존 `UpsOrderBreakdownCard`(예상 운임 breakdown)·`UpsActualAdjustmentForm`(실제 사후청구)·`OrderFinanceSummary`(정산 요약)는 계속 화면에 표시되어야 함 — 삭제·은닉 금지, 재배치는 가능
5. **(범위 확대, 2026-07-24) 배송 상품(품목) 정보를 화면에서 확인 가능하도록 추가** — `UpsPackageItemsModal` 팝업 표출 방식 추가 (품명/HS코드/수량/단가/금액)

---

## DoD

- [x] `order.status` 7단계 스텝퍼/프로그레스 UI 구현 (`UpsOrderStatusStepper.tsx`)
- [x] 구식 `TrackingTimeline` 섹션 제거 확인(diff에 해당 import/렌더링 제거 확인)
- [x] `UpsTrackingEventsList` 유지 확인(삭제 안 됨)
- [x] "실시간 UPS 배송 확인" 버튼 구현 — 크론과 로직 공유(중복 구현 없음) 확인 (`checkRealtimeUpsTrackingAction`)
- [x] Agency 수동 DELIVERED 권한 — 소속 오더 스코프 제한 확인 + 사유 필수 입력 확인 (`manuallySetOrderDeliveredAction`)
- [x] 예외 코드 처리는 범위 제외 확인(IMP-156에 그대로 남김)
- [x] 배송비 조회 섹션(UpsOrderBreakdownCard/UpsActualAdjustmentForm/OrderFinanceSummary) 재구성 후에도 화면에 그대로 표시되는지 확인
- [x] 품목 정보 Popup 구현 — order.packages[].items[] 재사용, 신규 조회 로직 없음 확인 (`UpsPackageItemsModal.tsx`)
- [x] 기존 `orders/[orderId]/page.tsx`(범용 화면) 무수정 확인
- [x] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인 — 신규 테스트 6건 추가 (`tests/unit/ups/ups-order-detail-status.test.ts`)
- [x] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [x] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `dbff7641fe423728dbed6c0215a1f69f2de6a517` |
| 회귀 결과 | Vitest unit & regression tests 100% PASS (`rtk npm run test:regression` 검증 완수) |
| 빌드 | 빌드 성공 (`npx tsc --noEmit` 0 error in src/) |
| 특이사항 | Issue #794 요구사항 및 2차 범위 확대 완수 — 7단계 스텝퍼 UI (`UpsOrderStatusStepper.tsx`), 실시간 SHXK 배송확인 버튼, Agency 소속화주 수동 DELIVERED 전환(사유 필수), 화물 품목 상세 팝업 (`UpsPackageItemsModal.tsx`) 구축 완료. 구식 빈 TrackingTimeline 제거 완료. |
