# TASK-207 — W2 후속: 화주별 주별/월별 청구 집계

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-207 |
| **GitHub Issue** | [#750](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/750) (SNTL 회의록 [#718](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/718) W2 2순위) |
| **생성일** | 2026-07-23 |
| **할당 Agent** | Riley |
| **우선순위** | P3 |
| **전제조건** | TASK-204(W2 일별 집계) ✅ 완료 |
| **커밋 태그** | `[Gemini]` |
| **상태** | 🔔 |

---

## [배경]

TASK-204(W2 1순위, PR#738/#740)로 화주별 **일별** 청구 집계는 완료됨. SNTL 회의록 W2 2순위 항목인 **주별/월별** 집계를 이어서 진행.

## [설계 방향]

- `src/app/actions/finance/daily-billing.ts`의 기존 로직(`getShipperDailyBillingSummary` 등)을 그대로 재사용 — 날짜 버킷 단위만 일(day)→주(week)/월(month)로 확장
- 신규 재계산 로직 작성 금지 — 기존 `ShipperDailyBillingGroup` 집계 결과를 상위 기간 단위로 합산(또는 쿼리 단의 GROUP BY 단위 변경)하는 방향으로 설계
- UI(`/finance/daily-billing`)에 기간 단위 선택(일/주/월) 토글 추가 완료

---

## DoD

- [x] 화주별 주별 집계 로직+UI 구현(기존 일별 집계 로직 재사용)
- [x] 화주별 월별 집계 로직+UI 구현(기존 일별 집계 로직 재사용)
- [x] 기간 단위 선택 UI(일/주/월) 적용
- [x] 신규 회귀 테스트 추가 + `LIVE_REGRESSION_TEST_MAP.md` 등록(R-09, Section 49 TC-W2-04~05)
- [x] R-10 스크린샷 첨부
- [x] 회귀 테스트(`npm run test:regression`) 전체 PASS 확인
- [x] task file `[작업 결과]` 작성 + 커밋 해시 기재
- [x] ACTIVE_TASK.md 상태 반영

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `ecf5d7fcaa7f843c337c0f6410d8b706e0594a56` |
| 회귀 결과 | Vitest unit & regression tests 100% PASS (`rtk npm run test:regression` 검증 완수) |
| 빌드 | 빌드 성공 (`npx tsc --noEmit` 0 error) |
| 특이사항 | SNTL 회의록 W2 2순위 요구사항 완수 — 기존 일별 청구 집계 로직을 확장하여 일/주/월 기간별 집계 토글 UI 및 서버 집계 구축. |
