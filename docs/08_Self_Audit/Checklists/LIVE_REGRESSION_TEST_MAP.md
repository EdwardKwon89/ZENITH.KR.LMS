# 🗺️ ZENITH_LMS 회귀 테스트 추적 인덱스 (LIVE_REGRESSION_TEST_MAP)

> **문서 용도 (R-09 v3.10, Issue #1309 / TASK-1150)**:
> 본 문서는 **자동 생성 추적 인덱스**입니다. 수동 편집을 금지하며, 신규 회귀 케이스는 `docs/08_Self_Audit/Checklists/regression-items/TASK-*.md`에 개별 파일로 등재합니다.
> - **인덱스 재생성**: `npm run build:lrtm` (`scripts/build-lrtm-index.mjs`)
> - **정합성 점검**: `npm run check:lrtm` (`scripts/check-lrtm-sync.mjs`)
> - **구 단일 맵(§1~§92) 아카이브**: `docs/08_Self_Audit/Checklists/lrtm-archive/` (읽기 전용)

---

## 📊 실측 Vitest 회귀 스위트 현황 (자동 집계)

- **스캔 범위**: `tests/**/*.{test,spec}.{ts,tsx}` (`tests/e2e/**`, `tests/poc-*/**` 제외 — `vitest.config.ts` 기준)
- **실측 테스트 파일 수**: **316개**
- **실측 테스트 케이스 수 (`it`/`test` 블록)**: **2,330건**
- **신규 구조 등재 Task 수**: **38건**

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
| **TASK-B-400** | #1569 | Team B | 2026-11-27 | 7건 | `tests/integration/task-b400-pr3-agency-rls.test.ts`, `tests/integration/task-b381-settlement-run-db.test.ts` | D1, D5 | [상세](./regression-items/TASK-B-400_Issue1569_pr3_agency_rls.md) |
| **TASK-B-397** | #1552 | Team B | 2026-11-27 | 8건 | `tests/unit/shxk/task-b397-shipper-company-env.test.ts`, `tests/unit/ups/ups-labels-mapping.test.ts`, `tests/unit/ups/task-b341-shxk-shipper-name-unify.test.ts`, `tests/unit/ups/task-b342-shxk-shipper-company-default.test.ts`, `tests/unit/ups/task-b324-shxk-shipper-name-override.test.ts`, `tests/unit/ups/defb054-shipper-company.test.ts` | D1, D2, D8 | [상세](./regression-items/TASK-B-397_Issue1552_SHXK_ShipperCompany.md) |
| **TASK-B-395** | #1181 | Team B | 2026-11-26 | 12건 | `tests/unit/ups/task-b395-ups-labels-logging.test.ts` | D1, D8 | [상세](./regression-items/TASK-B-395_Issue1181_ups-labels-logging.md) |
| **TASK-B-385** | - | - | - | 6건 | `tests/unit/evidence-dir.test.ts`, `tests/unit/check-evidence-escape.test.ts`, `tests/unit/evidence-ignore.test.ts`, `tests/e2e/e2e-33-b380-dashboard-dup-key.spec.ts` | D1, D7, D8 | [상세](./regression-items/TASK-B-385_Issue1513_e2e-evidence-outside-repo.md) |
| **TASK-B-382** | #1463 | Team B | 2026-11-24 | 14건 | `tests/unit/db/taskb382-billing-inclusion-rpc.test.ts`, `tests/unit/finance/task-b367-unmark-cost-settled.test.ts`, `tests/integration/task-b367-unmark-cost-settled.test.ts` | - | [상세](./regression-items/TASK-B-382_Issue1463_billing-inclusion-rpc.md) |
| **TASK-B-381** | #1459 | Team B | 2026-11-27 | 5건 | `tests/integration/task-b381-settlement-run-db.test.ts` | D1, D5 | [상세](./regression-items/TASK-B-381_Issue1459_pr4b_ds11_r10.md) |
| **TASK-B-381** | #1459 | Team B | 2026-11-26 | 15건 | `tests/unit/finance/task-b381-pr4a-daily-billing-exclusion.test.ts`, `tests/unit/i18n/errors-key-sync.test.ts`, `tests/integration/task-b381-ups-settlement-actions.test.ts`, `tests/unit/components/order-settlement/order-settlement-detail.test.tsx`, `tests/unit/finance/task-b381-pr4a-get-orders-list.test.ts`, `tests/unit/finance/task-b381-pr4a-ups-charge-readers.test.ts`, `tests/unit/i18n/ups-settlement-notify-keys.test.ts`, `tests/integration/task-b381-pr4a-notification-db.test.ts`, `tests/unit/ups/notify-admins.test.ts` | D1, D5 | [상세](./regression-items/TASK-B-381_Issue1459_pr4a_ui.md) |
| **TASK-B-381** | #1459 | Team B | 2026-11-26 | 14건 | `tests/unit/finance/task-b381-pr3-ups-invoice-guards.test.ts`, `tests/unit/finance/task-b381-pr3-generate-invoices-guard.test.ts`, `tests/unit/finance/task-b381-pr3-invoice-generator-guard.test.ts`, `tests/unit/i18n/errors-key-sync.test.ts` | D1, D5 | [상세](./regression-items/TASK-B-381_Issue1459_pr3_guards.md) |
| **TASK-B-381** | #1459 | Team B | 2026-11-26 | 12건 | `tests/integration/task-b381-ups-settlement-actions.test.ts`, `tests/unit/ups/settlement-build.test.ts` | D1, D5 | [상세](./regression-items/TASK-B-381_Issue1459_pr2_actions.md) |
| **TASK-B-381** | #1459 | Team B | 2026-11-26 | 16건 | `tests/integration/task-b381-settlement-run-db.test.ts`, `tests/integration/task-b360-billing-statements.test.ts`, `tests/unit/migrations/taskb359-billing-statement-db.test.ts` | D1, D5 | [상세](./regression-items/TASK-B-381_Issue1459_pr1_db.md) |
| **TASK-B-380** | - | - | - | 5건 | `tests/e2e/e2e-33-b380-dashboard-dup-key.spec.ts`, `tests/e2e/e2e-31-billing-flow-verification.spec.ts` | D1, D7 | [상세](./regression-items/TASK-B-380_Issue1455_dashboard-dup-key.md) |
| **TASK-B-378** | - | - | - | 6건 | `tests/unit/migrations/taskb359-billing-statement-db.test.ts`, `tests/e2e/e2e-31-billing-flow-verification.spec.ts` | D1, D5 | [상세](./regression-items/TASK-B-378_Issue1452_billing_seq_role_check.md) |
| **TASK-B-375** | #1356 | Team B | 2026-11-23 | 6건 | `tests/integration/task-b375-rls-shipper-agency-select.test.ts` | D1, D3, D5 | [상세](./regression-items/TASK-B-375_Issue1356_rls-shipper-agency-select.md) |
| **TASK-B-374** | - | - | - | 8건 | `tests/integration/task-b374-shipper-ownership.test.ts`, `tests/unit/i18n/errors-key-sync.test.ts`, `tests/e2e/e2e-32-b374-shipper-ownership-ui.spec.ts` | D1, D5 | [상세](./regression-items/TASK-B-374_Issue1349_shipper-ownership.md) |
| **TASK-B-373** | #1362 | Team B | 2026-11-25 | 24건 | `tests/unit/auth/ups-rate-permissions.test.ts`, `tests/unit/ups/freight-estimate-dto.test.ts`, `tests/unit/ups/freight-action-scope.test.ts`, `tests/unit/ups/rates-public.test.ts`, `tests/integration/task-b373-estimate-scope-session.test.ts`, `tests/unit/orders/ups-estimate-panel-dto-parity.test.tsx` | D1, D5 | [상세](./regression-items/TASK-B-373_Issue1362_ups-rates-guard-dto.md) |
| **TASK-B-373** | #1362 | Team B | 2026-11-23 | 9건 | `tests/integration/task-b373-other-charges-ownership.test.ts` | D1, D5 | [상세](./regression-items/TASK-B-373_Issue1362_other-charges-ownership.md) |
| **TASK-B-372** | #1356 | Team B | 2026-11-23 | 6건 | `tests/integration/task-b372-admin-only.test.ts`, `tests/unit/finance/task-b352-error-locale.test.ts` | D1, D3, D5 | [상세](./regression-items/TASK-B-372_Issue1356_def150-pr1.md) |
| **TASK-B-371** | - | - | - | 12건 | `tests/e2e/e2e-31-billing-flow-verification.spec.ts` | D1, D5, D6, D8 | [상세](./regression-items/TASK-B-371_Issue1439_billing-e2e-verification.md) |
| **TASK-B-370** | #1420 | Team B | 2026-11-23 | 13건 | `tests/integration/task-b370-snapshot-safe-view.test.ts`, `tests/integration/ups-edit-before-registration.test.ts`, `tests/unit/orders/rate-snapshot-refresh.test.ts`, `tests/unit/orders/direct-shipper-ups-snapshot.test.ts` | D1, D3, D8 | [상세](./regression-items/TASK-B-370_Issue1420_snapshot-safe-view.md) |
| **TASK-B-369** | #1425 | Team B | 2026-11-22 | 19건 | `tests/unit/components/order-settlement/order-settlement-list.test.tsx`, `tests/unit/components/order-settlement/navi-sidebar.test.tsx`, `tests/unit/components/statements/statement-create.test.tsx`, `tests/e2e/e2e-27-order-settlement-ui.spec.ts` | D1, D3, D9 | [상세](./regression-items/TASK-B-369_Issue1425_order-settlement-ui.md) |
| **TASK-B-368** | - | - | - | 5건 | `tests/unit/finance/task-b368-normalize-shipper-name.test.ts`, `tests/integration/task-b360-billing-statements.test.ts` | D1, D8 | [상세](./regression-items/TASK-B-368_Issue1415_normalize-shipper-name_유틸분리.md) |
| **TASK-B-367** | #1377 | Team B | 2026-11-20 | 19건 | `tests/unit/finance/task-b367-unmark-cost-settled.test.ts`, `tests/unit/orders/task-b367-settled-cargo-guard.test.ts`, `tests/integration/task-b367-unmark-cost-settled.test.ts`, `tests/unit/i18n/errors-key-sync.test.ts` | D1, D5 | [상세](./regression-items/TASK-B-367_Issue1377_unmark-cost-settled.md) |
| **TASK-B-366** | #1376 | - | - | 19건 | - | - | [상세](./regression-items/TASK-B-366_Issue1376_cost-settlement-actions.md) |
| **TASK-B-365** | #1375 | - | - | 10건 | `tests/unit/migrations/taskb365-cost-settlement-columns.test.ts` | - | [상세](./regression-items/TASK-B-365_Issue1375_cost-settlement-columns.md) |
| **TASK-B-364** | #1374 | - | - | 10건 | `tests/unit/ups/actual-cost-compute.test.ts` | - | [상세](./regression-items/TASK-B-364_Issue1374_cost-integration.md) |
| **TASK-B-361** | #1367 | Team B | 2026-11-22 | 34건 | `tests/unit/components/statements/statements-list.test.tsx`, `tests/unit/components/statements/statement-create.test.tsx`, `tests/unit/components/statements/statement-detail.test.tsx`, `tests/unit/i18n/errors-key-sync.test.ts` | D1, D3, D5, D9 | [상세](./regression-items/TASK-B-361_Issue1367_billing-statement-ui.md) |
| **TASK-B-360** | #1366 | Team B | 2026-11-21 | 45건 | `tests/integration/task-b360-billing-statements.test.ts`, `tests/unit/finance/task-b360-billable-limits.test.ts`, `tests/integration/task-b360-excel-export.test.ts`, `tests/unit/finance/task-b360-excel-data.test.ts` | D1, D5, D6, D8 | [상세](./regression-items/TASK-B-360_Issue1366_billing-statement-actions.md) |
| **TASK-B-359** | #1365 | - | - | 8건 | `tests/unit/migrations/taskb359-billing-statement-db.test.ts` | - | [상세](./regression-items/TASK-B-359_Issue1365_billing-statement-db.md) |
| **TASK-B-357** | #1351 | - | - | 5건 | `tests/unit/shxk/task-b357-shxk-lib-logging.test.ts` | - | [상세](./regression-items/TASK-B-357_Issue1351_shxk-lib-logging.md) |
| **TASK-1174** | - | - | - | 0건 | `tests/unit/migrations/task1174-def161-invoice-history-rls.test.ts` | - | [상세](./regression-items/TASK-1174_Issue1470_invoice-history-rls.md) |
| **TASK-1173** | - | - | - | 0건 | `tests/unit/migrations/task1173-def157-safe-view-breakdown-whitelist.test.ts` | - | [상세](./regression-items/TASK-1173_Issue1466_safe-view-breakdown-whitelist.md) |
| **TASK-1169** | #1407 | Team A | 2026-11-21 | 5건 | `tests/integration/task-1169-create-order-atomic-v7-payload.test.ts` | D2, D5 | [상세](./regression-items/TASK-1169_Issue1407_create-order-atomic-v7-payload.md) |
| **TASK-1168** | - | - | - | 0건 | `tests/unit/migrations/task1168-def157-order-rate-snapshots-safe-view.test.ts`, `tests/unit/operations/tisa.test.ts` | - | [상세](./regression-items/TASK-1168_Issue1406_order-rate-snapshots-safe-view.md) |
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
