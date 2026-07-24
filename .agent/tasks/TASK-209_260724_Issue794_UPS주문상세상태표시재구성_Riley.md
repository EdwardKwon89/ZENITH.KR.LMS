# TASK-209 — UPS Order Detail: order.status 중심 상태 표시로 재구성

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-209 |
| **GitHub Issue** | [#794](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/794) |
| **생성일** | 2026-07-24 |
| **할당 Agent** | Riley |
| **우선순위** | P2 |
| **전제조건** | 없음 |
| **커밋 태그** | `[Riley]` |
| **상태** | ⬜ |

---

## [배경]

Issue #607(TASK-189, Riley 원 구현)로 만든 UPS 전용 Order Detail 화면 트래킹 구조를 검토(Edward 지시)한 결과:
- 오더 내부 상태(`order.status`)는 `REGISTERED→SCHEDULED→WAREHOUSED→PACKED→RELEASED→IN_TRANSIT`까지 전부 내부 운영자 액션(픽업/입고/UPS등록/출고확정)으로 정확히 전환되는 신뢰할 수 있는 백본
- 반면 현재 화면은 이 신뢰할 수 있는 상태를 작은 배지로만 표시하고, 상대적으로 약한 두 섹션(구식 `TrackingTimeline` — UPS 오더는 provider_type이 VIRTUAL 고정이라 항상 비어있음 / `UpsTrackingEventsList` — 하루 1번만 갱신)을 주요 섹션으로 크게 배치

## [결정 사항] (Edward, 2026-07-24)

1. **order.status를 화면의 중심 상태 표시로 승격** — 디자인은 Fancy해도 되나, 가독성 있고 간편하게 구성할 것
2. IN_TRANSIT→DELIVERED 자동전환 신뢰성 개선은 IMP-156으로 별도 분리, **이번 Task 범위 아님**

## [작업 범위]

1. `order.status`의 7단계(REGISTERED→SCHEDULED→WAREHOUSED→PACKED→RELEASED→IN_TRANSIT→DELIVERED)를 시각적으로 보여주는 상태 표시 UI 신설 — 스텝퍼/프로그레스바 형태 권장, 현재 상태를 명확히 강조. ZenUI 컴포넌트 재사용(신규 디자인 시스템 도입 금지)
2. 항상 비어있는 구식 `TrackingTimeline`(zen_tracking_events 기반) 섹션 제거
3. `UpsTrackingEventsList`(zen_ups_tracking_events)는 보조 상세 정보로 유지 — 삭제 금지, 다만 주(主) 상태 표시로 취급하지 않음(레이아웃상 하단/보조 위치로 재배치 권장)
4. 기존 `orders/[orderId]/page.tsx`(범용 화면)는 이번 Task 범위 아님 — `ups-detail/page.tsx`만 수정

## [발견 이슈]

없음

---

## DoD

- [ ] `order.status` 7단계 스텝퍼/프로그레스 UI 구현
- [ ] 구식 `TrackingTimeline` 섹션 제거 확인(diff에 해당 import/렌더링 제거 확인)
- [ ] `UpsTrackingEventsList` 유지 확인(삭제 안 됨)
- [ ] `orders/[orderId]/page.tsx`(범용 화면) 무수정 확인
- [ ] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인
- [ ] R-10 스크린샷 (7단계 각 상태 예시 또는 최소 1개 실제 화면)
- [ ] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

_(Riley 작성 예정)_
