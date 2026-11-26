# [TASK-B-381 PR-3] UPS 자동 인보이스 중단·서버 가드 (Issue #1459)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-381 PR-3 / [#1459](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1459) |
| **팀 / 작성일** | Team B / 2026-11-26 |
| **대상 모듈 (231 연동)** | `src/app/actions/operations/orders.ts`, `src/app/actions/finance/settlement.ts`, `src/app/actions/finance/daily-billing.ts` |
| **검증 차원 (231 D1~D9)** | D1, D5 |

**2026-11-26, Dave** — UPS 오더의 자동 인보이스 생성을 서버에서 중단했습니다. 범위는 **서버 방어만**이며 옛 액션·UI 제거는 PR-4a입니다. 비UPS 동작은 변경하지 않았습니다.

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-381B-01 | UPS 오더 RELEASED | `generateInvoicesForOrder` 미호출 | `tests/unit/finance/task-b381-pr3-ups-invoice-guards.test.ts` |
| TC-381B-02 | 비UPS 오더 RELEASED (양성 대조) | `generateInvoicesForOrder` 호출 | 동일 |
| TC-381B-03 | UPS 오더·비RELEASED 상태 | 인보이스 액션 미호출 | 동일 |
| TC-381B-04 | `generateInvoicesForOrder` UPS 직접 호출 | `ups_invoice_blocked`, 생성기 미호출 | `tests/unit/finance/task-b381-pr3-generate-invoices-guard.test.ts` |
| TC-381B-05 | `generateInvoicesForOrder` 비UPS (양성 대조) | 생성기 호출·기존 결과 반환 | 동일 |
| TC-381B-06 | 오더 가드 조회 실패 | `generic` 거부, 생성기 미호출 | 동일 |
| TC-381B-07 | AGENCY 역할의 UPS 직접 호출 | `ups_invoice_blocked` | 동일 |
| TC-381B-08 | 일괄 마감 — UPS/비UPS 혼재 | UPS `skippedCount` 1, 비UPS만 `finalizeInvoice` 호출 | `tests/unit/finance/task-b381-pr3-ups-invoice-guards.test.ts` |
| TC-381B-09 | 일괄 마감 — 인보이스 조회 실패 | fail-closed(`success:false`), 마감 0건 | 동일 |
| TC-381B-10 | 오류 키 동기화 — `ups_invoice_blocked` | 4개 로케일 동일 키 집합(118키) | `tests/unit/i18n/errors-key-sync.test.ts` |

**비UPS 양성 대조**: 출고확정 자동 인보이스(TC-381B-02)와 일괄 마감(TC-381B-08) 모두 비UPS 경로가 그대로 동작함을 함께 단언합니다.

**연속 병합**: PR-3과 PR-4a는 같은 날 연달아 병합하며, 그 사이 `TeamB_Dev`는 수동 테스트·UAT·배포 대상에서 제외합니다(시작·종료 시각은 병합 때 `date`로 기재).

**회귀**: `npm run test:regression` — **311 files passed · 1 skipped / 2,386 passed · 16 skipped**(skip은 B-373 세션 16건), `npm run build` SUCCESS.
