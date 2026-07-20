# TASK-189 — [Team A] UPS 특송 전용 Order Detail 신규 화면 — Issue #607 구현 (Riley)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-189 |
| **생성일** | 2026-07-20 |
| **할당 Agent** | Riley (Edward 직접 지시) |
| **우선순위** | P2 |
| **전제조건** | 없음 |
| **관련 IMP** | 없음 |
| **브랜치** | `feature/teama-task-189-ups-order-detail-screen-riley` |
| **커밋 태그** | `[Gemini]` |
| **상태** | 🔔 |

---

## [배경]

현재 `orders/[orderId]/page.tsx`는 해상/항공 복합운송(멀티 캐리어) 업무 기준으로 만들어진 범용 화면에 `isUpsOrder` 조건부로 UPS 요소를 끼워 넣은 구조 — Route Optimization/TISA Dashboard 등 UPS와 무관한 섹션이 무조건 렌더링되고, Zone·상품 티어·운임 breakdown 등 UPS에 필요한 정보는 없음(Issue #607).

---

## [핵심 원칙 — Strangler Fig 패턴, 기존 화면 무수정]

기존 `orders/[orderId]/page.tsx`는 **전혀 수정하지 않는다.** 신규 UPS 전용 Order Detail 화면을 별도 경로(`src/app/[locale]/(dashboard)/orders/[orderId]/ups-detail/page.tsx`)로 개발한다.

---

## [작업 범위]

### 1. 신규 화면 구성 (`/orders/[orderId]/ups-detail/page.tsx`)
- **Zone·상품 티어 표시**(Saver/Express/Expedited/Flight, Zone ID)
- **운임 breakdown 요약 카드**(기본운임/유류할증료/급증수수료/기타수수료/총합) — `zen_order_rate_snapshots.metadata`에서 조회
- **트래킹 섹션**(기존 `TrackingTimeline` / tracking 액션 재사용)
- **사후 부가금 입력/조회**(`<UpsActualAdjustmentForm />` 재사용)
- **정산/인보이스 요약**(`<OrderFinanceSummary />` 재사용)
- **무역 서류 다운로드**(CI/PL 및 UPS Invoice PDF)
- Route Optimization/TISA Dashboard 등 **복합운송 전용 섹션 제외**

---

## [DoD]

- [x] 신규 UPS 전용 Order Detail 화면 구현 (`/orders/[orderId]/ups-detail/page.tsx`)
- [x] 기존 `orders/[orderId]/page.tsx` **무수정 확인**(diff에 해당 파일 변경 없어야 함)
- [x] 기존 컴포넌트 재사용 확인(중복 구현 없어야 함)
- [x] 전체 회귀 테스트 PASS (`npm run test:regression`)
- [x] `check-R17-DoD` 자가 검증 통과
- [x] 문서 커밋 해시 기재

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[Gemini] feat: TASK-189 UPS 전용 Order Detail 신규 화면 — Issue #607 구현`
2. 상세 파일 `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔 변경
3. `.agent/ACTIVE_TASK.md` 상태 🔄→🔔 변경
4. `gh issue edit 607 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 통과 확인
6. **[문서 커밋]** `[Gemini] docs: TASK-189 완료 보고 — task file 🔔`
7. **[PR 생성]** `feature/teama-task-189-ups-order-detail-screen-riley → develop`, `Closes #607`

---

## [발견 이슈]

없음

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `1794c4fb321ae32a53bfaf0704deeeeb53aea0d9` |
| 회귀 결과 | Vitest unit & regression tests 100% PASS (`rtk npm run test:regression` 검증 완수) |
| 빌드 | 빌드 성공 (TypeScript `tsc --noEmit` 검증 완수) |
| 특이사항 | Strangler Fig 패턴 원칙 100% 준수 — 기존 `orders/[orderId]/page.tsx` 무수정(0 diff lines). 신규 경로(`/orders/[orderId]/ups-detail/page.tsx`) 및 Breakdown 카드(`UpsOrderBreakdownCard.tsx`) 구현 완수. |
