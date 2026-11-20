# 🗺️ ZENITH_LMS 회귀 테스트 추적 인덱스 (LIVE_REGRESSION_TEST_MAP)

> **문서 용도 (R-09 v3.10, Issue #1309 / TASK-1150)**:
> 본 문서는 **자동 생성 추적 인덱스**입니다. 수동 편집을 금지하며, 신규 회귀 케이스는 `docs/08_Self_Audit/Checklists/regression-items/TASK-*.md`에 개별 파일로 등재합니다.
> - **인덱스 재생성**: `npm run build:lrtm` (`scripts/build-lrtm-index.mjs`)
> - **정합성 점검**: `npm run check:lrtm` (`scripts/check-lrtm-sync.mjs`)
> - **구 단일 맵(§1~§92) 아카이브**: `docs/08_Self_Audit/Checklists/lrtm-archive/` (읽기 전용)

---

## 📊 실측 Vitest 회귀 스위트 현황 (자동 집계)

- **스캔 범위**: `tests/**/*.{test,spec}.{ts,tsx}` (`tests/e2e/**`, `tests/poc-*/**` 제외 — `vitest.config.ts` 기준)
- **실측 테스트 파일 수**: **280개**
- **실측 테스트 케이스 수 (`it`/`test` 블록)**: **2,077건**
- **신규 구조 등재 Task 수**: **12건**

---

## 📚 아카이브 인덱스 (구 단일 맵 분할본 — 읽기 전용)

과거 task file·SAR·문서 231의 `§N` 참조 호환을 위해 원형 절 번호를 보존하여 분할 보관합니다.

| 아카이브 파일 | 포함 절 범위 | 줄 수 | 상태 |
|:---|:---|---:|:---:|
| [LRTM_ARCHIVE_PART1_SEC01_TO_50.md](./lrtm-archive/LRTM_ARCHIVE_PART1_SEC01_TO_50.md) | §1 ~ §50 (57개 절) | 770줄 | 읽기 전용 |
| [LRTM_ARCHIVE_PART2_SEC51_TO_92.md](./lrtm-archive/LRTM_ARCHIVE_PART2_SEC51_TO_92.md) | §51 ~ §92 (43개 절) | 659줄 | 읽기 전용 |

---

## 📋 신규 Task별 회귀 항목 목록 (`regression-items/`)

<!-- LRTM_ITEMS_START -->
| Task | Issue | 팀 | 작성일 | 케이스 수 | 테스트 파일 | 차원(231) | 상세 |
|:---|:---:|:---:|:---:|---:|:---|:---:|:---:|
| **TASK-B-367** | #1377 | Team B | 2026-11-20 | 19건 | `tests/unit/finance/task-b367-unmark-cost-settled.test.ts`, `tests/unit/orders/task-b367-settled-cargo-guard.test.ts`, `tests/integration/task-b367-unmark-cost-settled.test.ts`, `tests/unit/i18n/errors-key-sync.test.ts` | D1, D5 | [상세](./regression-items/TASK-B-367_Issue1377_unmark-cost-settled.md) |
| **TASK-B-366** | #1376 | - | - | 19건 | `tests/unit/finance/task-b366-cost-settlement.test.ts`, `tests/integration/task-b366-cost-settlement.test.ts` | - | [상세](./regression-items/TASK-B-366_Issue1376_cost-settlement-actions.md) |
| **TASK-B-365** | #1375 | - | - | 10건 | `tests/unit/migrations/taskb365-cost-settlement-columns.test.ts` | - | [상세](./regression-items/TASK-B-365_Issue1375_cost-settlement-columns.md) |
| **TASK-B-364** | #1374 | - | - | 10건 | `tests/unit/ups/actual-cost-compute.test.ts`, `tests/unit/finance/task-b364-cost-integration.test.ts`, `tests/unit/components/billing-confirm-modal-preview.test.tsx` | - | [상세](./regression-items/TASK-B-364_Issue1374_cost-integration.md) |
| **TASK-B-360** | #1366 | Team B | 2026-11-21 | 18건 | `tests/integration/task-b360-billing-statements.test.ts` | D1, D5, D6, D8 | [상세](./regression-items/TASK-B-360_Issue1366_billing-statement-actions.md) |
| **TASK-B-359** | #1365 | - | - | 8건 | `tests/unit/migrations/taskb359-billing-statement-db.test.ts` | - | [상세](./regression-items/TASK-B-359_Issue1365_billing-statement-db.md) |
| **TASK-B-357** | #1351 | - | - | 5건 | `tests/unit/shxk/task-b357-shxk-lib-logging.test.ts` | - | [상세](./regression-items/TASK-B-357_Issue1351_shxk-lib-logging.md) |
| **TASK-1167** | #1389 | Team A | 2026-11-19 | 4건 | `tests/integration/task-1167-calculate-order-costs-security.test.ts` | D1, D3 | [상세](./regression-items/TASK-1167_Issue1389_calculate-order-costs-security.md) |
| **TASK-1166** | #1386 | Team A | 2026-11-18 | 19건 | `tests/unit/migrations/task1166-def153-rate-cards-rls.test.ts` | D3, D5 | [상세](./regression-items/TASK-1166_Issue1386_rate-cards-rls.md) |
| **TASK-1161** | #1347 | Team A | 2026-11-18 | 7건 | `tests/integration/p6-transport-policy.test.ts`, `tests/integration/tracking-business-qa.test.ts`, `tests/integration/helpers/db.test.ts` | D1, D5, D6 | [상세](./regression-items/TASK-1161_Issue1347_db-fixture-helper.md) |
| **TASK-1158** | #1344 | Team A | 2026-11-18 | 8건 | `tests/unit/scripts/next-number-scripts.test.ts` | D1, D6 | [상세](./regression-items/TASK-1158_Issue1344_next-number-issue-scan.md) |
| **TASK-1150** | #1309 | Team A | 2026-11-18 | 5건 | `tests/unit/scripts/lrtm-sync.test.ts` | D1, D6 | [상세](./regression-items/TASK-1150_Issue1309_lrtm-sync.md) |
<!-- LRTM_ITEMS_END -->

---

## 📝 R-09 신규 등재 규칙 (옵션 A — PR 충돌 방지)

1. 각 Task PR에서는 [`regression-items/_TEMPLATE_item.md`](./regression-items/_TEMPLATE_item.md)를 복사해 `regression-items/TASK-NNN_IssueNNNN_slug.md` (Team B는 `TASK-B-NNN_...`) 파일 **1개만 추가**합니다.
2. 개별 PR에서 본 인덱스(`LIVE_REGRESSION_TEST_MAP.md`)를 직접 수정하지 마세요 (`npm run check:lrtm`이 `regression-items/`를 직접 스캔하여 정합성을 즉시 검증합니다).
3. `develop` 병합 후 `npm run build:lrtm`(또는 자동 갱신 PR)으로 본 인덱스를 갱신합니다.
4. `tests/e2e/**` 경로를 인용할 때는 같은 행 또는 섹션에 반드시 `CI 미실행` 또는 `수동` 표기를 포함해야 합니다.
