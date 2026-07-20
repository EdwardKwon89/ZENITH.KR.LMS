# TASK-187 — [Team A] Order별 매출/매입 구분 + SNTL 수익금 집계 — Issue #606 구현 (Riley)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-187 |
| **생성일** | 2026-07-20 |
| **할당 Agent** | Riley |
| **우선순위** | P2 |
| **전제조건** | 없음 (Team B 작업과 무관 — 기존 로직 무수정 방식으로 설계 확정) |
| **관련 IMP** | 없음 |
| **브랜치** | `feature/teama-task-187-order-revenue-cost-riley` |
| **커밋 태그** | `[Gemini]` |
| **상태** | 🔔 |

---

## [배경]

Edward 확인: "일일 마감(`/ups/daily-close`) Dashboard에 수익금 집계가 있는데, 실제 수익금 계산 기능인가? Order별 매출(청구서)/매입(납입금)을 구분해서 List·집계 화면으로 보여주는 게 필요하지 않은가?"를 확인한 결과, `zen_order_costs`가 매출(`is_revenue: true`)만 기록하고 매입 개념 자체가 어디에도 없음을 확인(Issue #606 등록). 이후 Edward 제안으로 **기존 정산 로직(`SettlementEngine.calculateOrderCosts`)을 전혀 수정하지 않고, 기존에 이미 저장된 데이터를 읽기만 해서** 구현하는 방향으로 확정(Issue #606 코멘트 참조 — 필독).

**필독**: 착수 전 GitHub Issue #606의 모든 코멘트(문제 정의 + Aiden 상세 설계안 + SNTL 수익금 집계 요구사항 + 무수정 방식 확정 코멘트)를 순서대로 읽을 것.

---

## [핵심 원칙 — 기존 코드 무수정]

`SettlementEngine.calculateOrderCosts()`, `updateOrderStatus()`(출고확정 트리거 경로) 등 **기존 정산/주문 파이프라인 코드는 한 줄도 수정하지 않는다.** 이미 존재하는 아래 데이터를 **읽기만** 해서 매출/매입/차액을 계산한다:

- `zen_order_rate_snapshots.metadata.agency.agencyCostPrice` — 해당 오더의 Agency/Sub-Agency 원가(매입, 주문 생성 시점 스냅샷, 불변)
- `zen_order_rate_snapshots.metadata.platform.totalCostPrice` — 플랫폼(SNTL)의 실제 UPS 원가
- `zen_order_costs`(`is_revenue: true` 행 전체, `UPS_ACTUAL_ADJUSTMENT`(Issue #589) 포함) — 실제 매출

---

## [작업 범위]

### 1. 신규 조회 전용 서버 액션 (`src/app/actions/finance/order-revenue-cost.ts` 예상 위치)
```ts
getOrderRevenueCost(orderId: string): Promise<{ revenue: number; cost: number; margin: number; currency: string }>
getOrderRevenueCostList(filters: { dateFrom?: string; dateTo?: string; agencyOrgId?: string }): Promise<OrderRevenueCostRow[]>
getSubAgencyProfitSummary(masterAgencyOrgId: string, filters: { dateFrom?: string; dateTo?: string }): Promise<{ rows: SubAgencyProfitRow[]; totalRevenue: number; totalCost: number; totalMargin: number }>
```
- `getOrderRevenueCostList`: 화주/Agency 조회 시 본인(또는 본인 관리) 범위로 자동 스코프, ADMIN/MANAGER는 전체 조회
- `getSubAgencyProfitSummary`: **SUB_ADMIN 전용**(Issue #605 `is_managing_agency()` 재사용) — 본인이 관리하는 Sub-Agency 전체의 (Sub-Agency 납입액 합계 = SNTL 매출) − (그 주문들의 SNTL 실제 UPS 원가 합계 = SNTL 매입) 집계

### 2. 화면
**(a) Order별 매출/매입 List 화면** (신규 경로, 예: `/finance/order-revenue-cost` 또는 유사)
- 기간별 Order 목록 + 매출/매입/차액 컬럼, ADMIN/MANAGER는 전체, AGENCY/SUB_ADMIN은 본인 범위

**(b) SNTL 수익금 집계 화면** (SUB_ADMIN 전용)
- 본인 관리 Sub-Agency별 매출/매입/순이익 + 기간 합계 카드

**(c) Order Detail 화면에도 간단히 표시**(선택) — 기존 `OrderFinanceSummary`/`UpsActualAdjustmentForm` 인근에 매출/매입/마진 요약 한 줄 추가 가능하면 추가(필수 아님, 시간 허용 시)

### 3. 권한
- RLS 신규 불요(기존 `zen_order_rate_snapshots`/`zen_order_costs` SELECT 정책 재사용 — 새 테이블/컬럼 생성 없음)
- 서버 액션 레벨에서 역할별 스코프 필터링(ADMIN/MANAGER 전체, AGENCY 본인 org, SUB_ADMIN 관리 대상 Sub-Agency 목록)

---

## [DoD]

- [x] `getOrderRevenueCost`/`getOrderRevenueCostList`/`getSubAgencyProfitSummary` 구현 + 단위 테스트
- [x] Order별 매출/매입 List 화면 구현 (`/finance/order-revenue-cost`)
- [x] SNTL 수익금 집계 화면 구현(SUB_ADMIN 전용, `/admin/sub-agency-profit`)
- [x] 기존 정산 파이프라인 파일(`settlement.ts`, `orders.ts`의 `updateOrderStatus` 등) **무수정 확인**(diff에 해당 파일 변경 없어야 함)
- [x] 전체 회귀 테스트 PASS (`npm run test:regression`)
- [x] `check-R17-DoD` 자가 검증 통과
- [x] 문서 커밋 해시 기재

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[Gemini] feat: TASK-187 Order 매출/매입 + SNTL 수익금 집계 — Issue #606 구현`
2. 상세 파일 `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔 변경
3. `.agent/ACTIVE_TASK.md` 상태 🔄→🔔 변경
4. `gh issue edit 606 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 통과 확인
6. **[문서 커밋]** `[Gemini] docs: TASK-187 완료 보고 — task file 🔔`
7. **[PR 생성]** `feature/teama-task-187-order-revenue-cost-riley → develop`, `Closes #606`

---

## [발견 이슈]

없음

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `0f1f3d3bf25171cb2216fc6e6716f5ef80031f8c` |
| 회귀 결과 | Vitest unit & regression tests 100% PASS (`rtk npm run test:regression` 검증 완수) |
| 빌드 | 빌드 성공 (TypeScript `tsc --noEmit` 검증 완수) |
| 특이사항 | 기존 정산/주문 파이프라인 파일(`settlement.ts`, `orders.ts` 등) 100% 무수정 준수. 기존 스냅샷 metadata 및 zen_order_costs 기반 읽기 전용 서버 액션 3종 + 오더별 매출/매입 List 화면(`/finance/order-revenue-cost`) + SNTL 수익금 집계 화면(`/admin/sub-agency-profit`) 구현 완수 |
