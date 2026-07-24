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
2. **(범위 확대, 2026-07-24) "실시간 UPS 배송 확인" 버튼 + Agency 수동 DELIVERED 상태변경 권한** — IN_TRANSIT→DELIVERED 자동전환 신뢰성 문제(IMP-156, 하루 1회 폴링에만 의존)에 대한 대응책으로 이번 Task에 포함
3. **예외 코드 처리는 범위 제외** — UPS 배송 에러/예외 상태 코드 전체 목록이 문서화되어 있지 않아(코드베이스 전체에서 실제 다뤄지는 코드는 `NT`/`DL` 2개뿐) 조치 불가. IMP-156에 남겨두고 이번 Task에서 처리하지 않음
4. **(범위 확대, 2026-07-24) 배송비 조회가 재구성된 화면에서 빠지면 안 됨** — Aiden이 제시한 미리보기(디자인 참고 섹션)는 상태 표시 영역만 시연한 것이라 배송비 정보가 빠져 있었음. 기존 `UpsOrderBreakdownCard`(예상 운임 breakdown)·`UpsActualAdjustmentForm`(실제 사후청구)·`OrderFinanceSummary`(정산 요약)는 계속 화면에 표시되어야 함 — 삭제·은닉 금지, 재배치는 가능
5. **(범위 확대, 2026-07-24) 배송 상품(품목) 정보를 화면에서 확인 가능하도록 추가** — 현재 `order.packages[].items[]`(품명·HS코드·수량·단가, `getOrderDetails()`에서 이미 조회됨)가 무역서류 PDF 생성에만 쓰이고 화면에는 전혀 노출되지 않음. **Popup(모달) 표출 방식 고려** — 예: 패키지/화물 정보 카드에 "품목 보기" 버튼 추가 → 클릭 시 모달로 품목 테이블(품명/HS코드/수량/단가/금액) 표시. 신규 데이터 조회 로직 불필요(이미 있는 `order.packages[].items[]` 재사용)

## [디자인 참고] (Edward 승인, 2026-07-24)

Aiden이 사전 제작한 미리보기: https://claude.ai/code/artifact/db347c94-6b26-4d26-a661-b9d387ef44e6
- 7단계 스텝퍼(등록→픽업→입고→포장/라벨→출고→배송중→배송완료), 완료=초록 체크/현재=amber 펄스/예정=흐림
- "실시간 UPS 배송 확인" 버튼 + 로딩 상태 표현
- Agency 수동 전환 링크는 배송완료 전까지만 노출
- 기존 트래킹 이벤트는 보조 섹션으로 축소, 발송 전 빈 상태는 안내 문구로 처리
- 색상은 기존 ZenUI 토큰(amber=트래킹 포인트, indigo=라이브 액션) 그대로 사용 — 신규 컬러 도입 금지, 위 미리보기 참고해 실제 ZenCard/ZenBadge 컴포넌트로 구현할 것

## [작업 범위]

1. `order.status`의 7단계(REGISTERED→SCHEDULED→WAREHOUSED→PACKED→RELEASED→IN_TRANSIT→DELIVERED)를 시각적으로 보여주는 상태 표시 UI 신설 — 스텝퍼/프로그레스바 형태 권장, 현재 상태를 명확히 강조. ZenUI 컴포넌트 재사용(신규 디자인 시스템 도입 금지)
2. 항상 비어있는 구식 `TrackingTimeline`(zen_tracking_events 기반) 섹션 제거
3. `UpsTrackingEventsList`(zen_ups_tracking_events)는 보조 상세 정보로 유지 — 삭제 금지, 다만 주(主) 상태 표시로 취급하지 않음(레이아웃상 하단/보조 위치로 재배치 권장)
4. **"실시간 UPS 배송 확인" 버튼 신규 추가** — 클릭 시 해당 오더의 `pollTracking()`(`src/lib/shxk/tracking.ts`)을 즉시 호출 + `storeTrackingEvents()`로 저장 — **크론(`/api/cron/ups-tracking-poll`)과 동일 로직 재사용, 중복 구현 금지**(가능하면 공통 함수로 추출해 크론과 버튼 양쪽에서 호출). 응답이 DL이면 시스템이 자동으로 오더 상태를 DELIVERED로 전환(크론의 3-1/3-2 로직과 동일하게 order_status_history 기록 포함)
5. **Agency 역할에 소속 오더 한정 수동 DELIVERED 상태변경 권한 부여** — `src/lib/logistics/status-machine.ts`의 `ROLE_PERMISSIONS[USER_ROLES.AGENCY]`에 `OrderStatus.DELIVERED` 추가. 단, 반드시 **해당 Agency가 관리하는 오더로 스코프 제한**(agencyOrgId 일치 검증 — TASK-B-102/Issue #351의 IDOR 방지 패턴 참고) + **사유 필수 입력**(기존 범용 상태변경 UI의 사유가 선택사항인 것과 다르게, DELIVERED로의 수동 전환은 필수화)
6. **배송비 조회 섹션(`UpsOrderBreakdownCard`/`UpsActualAdjustmentForm`/`OrderFinanceSummary`) 유지 확인** — 재배치는 가능하나 삭제·은닉 금지
7. **품목 정보 Popup 신규 추가** — 화물/패키지 카드에 "품목 보기" 버튼 → 모달로 `order.packages[].items[]` 기반 품목 테이블(품명/HS코드/수량/단가/금액) 표시. 기존 `ciData`(상업송장용 items 가공 로직)와 동일한 필드 재사용 가능
8. 기존 `orders/[orderId]/page.tsx`(범용 화면)는 이번 Task 범위 아님 — `ups-detail/page.tsx`만 수정

## [발견 이슈]

없음

---

## DoD

- [ ] `order.status` 7단계 스텝퍼/프로그레스 UI 구현
- [ ] 구식 `TrackingTimeline` 섹션 제거 확인(diff에 해당 import/렌더링 제거 확인)
- [ ] `UpsTrackingEventsList` 유지 확인(삭제 안 됨)
- [ ] "실시간 UPS 배송 확인" 버튼 구현 — 크론과 로직 공유(중복 구현 없음) 확인
- [ ] Agency 수동 DELIVERED 권한 — 소속 오더 스코프 제한 확인 + 사유 필수 입력 확인
- [ ] 예외 코드 처리는 범위 제외 확인(IMP-156에 그대로 남김)
- [ ] 배송비 조회 섹션(UpsOrderBreakdownCard/UpsActualAdjustmentForm/OrderFinanceSummary) 재구성 후에도 화면에 그대로 표시되는지 확인
- [ ] 품목 정보 Popup 구현 — order.packages[].items[] 재사용, 신규 조회 로직 없음 확인
- [ ] 기존 `orders/[orderId]/page.tsx`(범용 화면) 무수정 확인
- [ ] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인 — 신규 테스트 추가(버튼 클릭→DELIVERED 전환, Agency 권한 스코프 검증, 품목 팝업 렌더링 등)
- [ ] R-10 스크린샷 (7단계 각 상태 예시, 실시간 확인 버튼, Agency 수동 전환 UI, 품목 팝업 최소 1개씩)
- [ ] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [ ] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

_(Riley 작성 예정)_
