# TASK-189 — [Team A] UPS 특송 전용 Order Detail 신규 화면 — Issue #607 (Riley)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-189 |
| **생성일** | 2026-07-20 |
| **할당 Agent** | ~~D_Kai~~ → **Riley** (재배정, 260720 — D_Kai/OpenCode 지속 무응답, 착수 전이라 인수 아닌 신규 착수) |
| **우선순위** | P2 |
| **전제조건** | 없음 (TASK-188 완료 — `OrderFinanceSummary`의 `canManageFinance` prop 반영된 최신 버전 재사용 가능) |
| **관련 IMP** | 없음 |
| **브랜치** | `feature/teama-task-189-ups-order-detail-screen-riley` |
| **커밋 태그** | `[Riley]` (또는 세션 표기에 따라 `[Gemini]`) |
| **상태** | 🔄 |

---

## [배경]

현재 `orders/[orderId]/page.tsx`는 해상/항공 복합운송(멀티 캐리어) 업무 기준으로 만들어진 범용 화면에 `isUpsOrder` 조건부로 UPS 요소를 끼워 넣은 구조 — Route Optimization/TISA Dashboard 등 UPS와 무관한 섹션이 무조건 렌더링되고, Zone·상품 티어·운임 breakdown 등 UPS에 필요한 정보는 없음(Issue #607 본문 및 코멘트 참조 — 필독).

**필독**: 착수 전 GitHub Issue #607의 모든 코멘트(문제 정의 + Aiden 상세 분석 + Strangler Fig 방식 확정)를 순서대로 읽을 것.

---

## [핵심 원칙 — Strangler Fig 패턴, 기존 화면 무수정]

기존 `orders/[orderId]/page.tsx`는 **전혀 수정하지 않는다.** 대신:

1. **신규 UPS 전용 Order Detail 화면을 별도 경로로 개발**(예: `/orders/[orderId]/ups-detail` 또는 별도 세그먼트 — 라우팅 구조는 재량)
2. 기존 화면은 그대로 유지 — 검증 완료 후 UPS 오더에 한해 신규 화면으로 안내할지, 기존 화면의 UPS 관련 섹션을 정리할지는 **이번 Task 범위 밖**(향후 별도 결정)

---

## [작업 범위]

### 1. 신규 화면 포함 섹션
- **Zone·상품 티어 표시**(Saver/Express/Expedited/Flight)
- **운임 breakdown**(기본운임/유류할증/급증수수료/기타요금) — `zen_order_rate_snapshots.metadata`에서 조회(주문 등록 시 `UpsFreightEstimatePanel`이 쓰는 것과 동일 데이터 소스)
- **트래킹**(기존 `TrackingTimeline` 재사용 가능)
- **사후 부가금 표시/입력**(Issue #589 완료 — `UpsActualAdjustmentForm` 컴포넌트를 그대로 import해서 재사용. 새로 만들지 말 것)
- **정산/인보이스 요약**(기존 `OrderFinanceSummary` 재사용 가능 — TASK-188 완료 후 병합하면 `isAgency` prop도 포함된 최신 버전을 재사용하게 됨)
- Route Optimization/TISA Dashboard 등 **복합운송 전용 섹션은 제외**

### 2. 재사용 원칙
가능한 한 기존 컴포넌트(`UpsActualAdjustmentForm`, `OrderFinanceSummary`, `TrackingTimeline`, `UpsTradeDocumentActions` 등)를 그대로 import해서 재구성 — 새로 작성하지 말 것. 새로 작성이 필요한 건 "UPS에 필요한데 기존에 화면 자체가 없던 것"(Zone·티어 표시, 운임 breakdown 요약)뿐.

### 3. 권한/데이터
기존 `getOrderDetails()` 등 조회 로직 재사용 — 신규 RLS/서버 액션 불요(전부 기존 데이터 재조합 화면).

---

## [DoD]

- [ ] 신규 UPS 전용 Order Detail 화면 구현(위 섹션 포함)
- [ ] 기존 `orders/[orderId]/page.tsx` **무수정 확인**(diff에 해당 파일 변경 없어야 함)
- [ ] 기존 컴포넌트 재사용 확인(중복 구현 없어야 함)
- [ ] 전체 회귀 테스트 PASS (`npm run test:regression`)
- [ ] `check-R17-DoD` 자가 검증 통과
- [ ] 문서 커밋 해시 기재

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[Riley] feat: TASK-189 UPS 전용 Order Detail 신규 화면 — Issue #607`
2. 상세 파일 `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔 변경
3. `.agent/ACTIVE_TASK.md` 상태 🔄→🔔 변경
4. `gh issue edit 607 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 통과 확인
6. **[문서 커밋]** `[Riley] docs: TASK-189 완료 보고 — task file 🔔`
7. **[PR 생성]** `feature/teama-task-189-ups-order-detail-screen-riley → develop`, `Closes #607`

---

## [발견 이슈]

없음

---

## [작업 결과]

_(착수 시 작성)_
