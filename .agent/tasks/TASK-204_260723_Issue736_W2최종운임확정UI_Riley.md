# TASK-204: Issue #736 — W2: 최종 운임 확정 UI(UPS 발송 기준) + 화주별 일별 청구 집계 구현 (Riley)

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-204 |
| **생성일** | 2026-07-23 |
| **할당 Agent** | Riley |
| **우선순위** | P0 (SNTL 회의록 W2) |
| **전제조건** | 없음 |
| **관련 IMP** | Issue #718 (SNTL 회의록 W2) |
| **브랜치** | `feature/teama-task-204-final-freight-settlement-riley` |
| **커밋 태그** | `[Gemini]` |
| **상태** | 🔔 |

---

## [배경]

Issue #718 (SNTL 회의록 W2). 현재 청구서 생성은 오더 1건 단위만 지원하며, 화주별/일별 청구 집계 로직 및 최종 운임 확정 UI가 부족했던 문제를 해결하기 위해 구축.

---

## [주요 구현 사양]

1. **서버 액션 (`src/app/actions/finance/daily-billing.ts`)**:
   - `getShipperDailyBillingSummary({ startDate, endDate, shipperId })`: 화주별×일자별(`YYYY-MM-DD`) 오더수, 기본운임, 유류할증료, 급증수수료, 기타부과금(`OTHER_CHARGE`), 사후조정액, 총 합계액(USD 및 환율 반영 KRW), 마감/미마감 건수 집계.
   - `getShipperDailyOrdersDetails(shipperId, date)`: 일별 그룹 소속 개별 오더 세부 정보 및 인보이스 상태 조회.
   - `finalizeDailyShipperInvoices(invoiceIds, reason)`: 선택된 일자/화주의 인보이스 일괄 정산 마감 처리.

2. **클라이언트 및 페이지 UI (`src/components/finance/ShipperDailyBillingClient.tsx`, `/finance/daily-billing`)**:
   - 날짜 및 화주 필터 검색 바, 기준 환율 표기.
   - 요약 KPI 카드 (총 오더수, 총 USD 집계액, 추정 KRW 집계액, 마감 상태).
   - 화주별 일별 청구 집계 테이블 + 개별 오더 드롭다운 확장 패널.
   - 미마감 그룹 일괄 정산 마감 버튼.

3. **기존 메커니즘 연동**:
   - `recordUpsActualCharges()` 및 `finalizeInvoice()` 기존 서버 액션 재사용.
   - `applied_exchange_rate` 실시간 조회 및 표기 원칙 준수.

---

## [DoD]

- [x] 서버 액션 3종 구현 (`src/app/actions/finance/daily-billing.ts`)
- [x] OTHER_CHARGE(기타부과금) 합산 집계 반영 (`getShipperDailyBillingSummary`)
- [x] 최종 운임 확정 및 일별 청구 집계 화면 구현 (`/finance/daily-billing`)
- [x] 단위 테스트 작성 (`tests/unit/finance/daily-billing-aggregation.test.ts` PASS)
- [x] 전체 회귀 테스트 PASS (`npm run test:regression`)
- [x] `LIVE_REGRESSION_TEST_MAP.md` 등록 (R-09, Section 49 TC-W2-01~03)
- [x] R-10 스크린샷 렌더링 검증 및 완료 보고

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `686dab21` (1차) / `dea14f25` (2차 재작업) |
| 회귀 결과 | Vitest unit & regression tests 100% PASS (`rtk npm run test:regression` 검증 완수) |
| 빌드 | 빌드 성공 (`npx tsc --noEmit` 0 error) |
| 특이사항 | SNTL 회의록 W2 P0 요구사항 완수 — 기존 사후청구 및 마감 메커니즘 재사용, 일별/화주별 집계 및 일괄 마감 구축, OTHER_CHARGE 포함. |
