# [TASK-B-381 PR-4a] UPS 정산마감 화면 전환·옛 액션/UI 제거 (Issue #1459)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-381 PR-4a / [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) |
| **팀 / 작성일** | Team B / 2026-11-26 |
| **대상 모듈 (231 연동)** | `src/components/finance/order-settlement/*`, `src/app/[locale]/(dashboard)/finance/order-settlement/*`, `src/app/actions/finance/{ups-settlement,ups-actual-cost,ups-actual-charges,settlement,daily-billing}.ts`, `src/components/finance/{OrderFinanceSummary,ShipperDailyBillingClient}.tsx` |
| **검증 차원 (231 D1~D9)** | D1, D5 |

**2026-11-26, Dave** — UPS 정산마감 화면을 PR-2의 새 액션(`previewUpsSettlement`·`saveUpsSettlementDraft`·`finalizeUpsSettlement`)으로 전환하고, 옛 원가·정산 액션과 UI를 제거했습니다. **기존 UPS 자동 인보이스·실비 등록 경로는 서버(PR-3)와 UI(이 PR) 모두 차단**됩니다. 비UPS 경로는 변경하지 않았습니다.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-381C-01 | 새 화면 미리보기 | `previewUpsSettlement` 결과의 원가·2 tier 금액 표시 | 수동 확인(PR-4a 화면) |
| TC-381C-02 | 새 화면 임시저장·정산마감 | `saveUpsSettlementDraft`/`finalizeUpsSettlement` 호출, SETTLED 반영 | 수동 확인 |
| TC-381C-03 | 옛 액션 제거 | `recordUpsActualCost`·`previewUpsActualCost`·`recordActualCostAndFinalize`·`markOrderCostSettled`·`recordUpsActualCharges`·`createPostFinalizationAdjustment` export 0건 | `git grep`/`tsc` |
| TC-381C-04 | 옛 UI 제거 | `BillingConfirmModal`·`UpsActualAdjustmentForm` 참조 0건 | `git grep` |
| TC-381C-05 | 관리자 인보이스 생성 버튼 | UPS 오더에서 버튼 미노출(서버 거부는 PR-3 공통 진입점) | 수동 확인 |
| TC-381C-06 | 일별 청구 UPS 숨김 | UPS 인보이스는 집계·상세에서 제외, 비UPS는 유지 | `tests/unit/finance/task-b381-pr4a-daily-billing-exclusion.test.ts` |
| TC-381C-07 | 옛 실비 화면 | `/admin/ups-actual-charges`에서 새 정산 화면으로 이동 | 수동 확인 |
| TC-381C-08 | 오류 키 정리 | `legacy_invoiced_order` 제거 후 4개 로케일 동기화(116키) | `tests/unit/i18n/errors-key-sync.test.ts` |
| TC-381C-10 | 초안 라운드트립 | 원금액 복원·재저장 total 불변·부가항목 유지 | `tests/integration/task-b381-ups-settlement-actions.test.ts` |
| TC-381C-11 | 새 화면 동작 | 초안 복원(calc 3/2)·미리보기·항목별 부가운임·저장/정산/되돌리기 | `tests/unit/components/order-settlement/order-settlement-detail.test.tsx` |
| TC-381C-12 | 보존 함수 회귀 | 목록 필터·조회 실패·대사/검색 | `tests/unit/finance/task-b381-pr4a-get-orders-list.test.ts`, `task-b381-pr4a-ups-charge-readers.test.ts` |
| TC-381C-13 | 알림 best-effort | 성공 시 1회, 실패해도 정산 유지 | `tests/integration/task-b381-ups-settlement-actions.test.ts` |
| TC-381C-09 | 전체 회귀·build | `npm run test:regression`·`npm run build` PASS | CI |

**되돌리기**: PR 단위 revert(코드·문구). DB 변경 없음.

**회귀**: `npm run test:regression` — **304 files passed · 1 skipped / 2,318 passed · 16 skipped**(skip은 B-373 세션 16건), `npm run build` SUCCESS, `tsc --noEmit` src 오류 0.
