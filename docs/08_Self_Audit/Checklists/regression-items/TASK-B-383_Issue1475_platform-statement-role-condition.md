# TASK-B-383 회귀 항목 — 플랫폼 발행 청구서 조회 역할 조건 (Issue #1475, DEF-B-171)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | #1475 · DEF-B-171 · 설계: PR #1488 `[설계 확정]` |
| 담당 | Mike (Worker) / Auditor: Jaison |
| 변경 | `supabase/migrations/20261124090000_task_b383_platform_statement_role_condition.sql` (신규 SELECT 정책 2개 조건 수정 + ROLLBACK) · `tests/integration/task-b383-platform-statement-role-condition.test.ts` (신규) |
| 검증 차원 (231 D1~D9) | `D1(정합성)`, `D5(권한/RLS)` |

## 회귀 항목

| TC# | 시나리오 | 기대 | 테스트 파일 | 실행 |
|:----|:---------|:-----|:------------|:----:|
| TC-383-01 | **헤더 매트릭스** — 실세션 9종(ADMIN·ZENITH_SUPER_ADMIN·MANAGER·OPERATOR@플랫폼 / SUB_ADMIN·AGENCY@대리점A / AGENCY@대리점B / INDIVIDUAL / CORPORATE) × 발행 조직(플랫폼 2건·대리점 1건) | 목표 표의 모든 셀과 일치 — 플랫폼 발행분은 관리 역할만, 수신자·감독 자격은 유지 | `tests/integration/task-b383-platform-statement-role-condition.test.ts` | CI (vitest) |
| TC-383-02 | **항목 매트릭스** — 동일 9세션의 항목 조회 | 헤더와 동일한 판정 (항목은 헤더 종속) | 동일 | CI (vitest) |
| TC-383-03 | **판정 불가 fail-closed** — 조직 조회 결과를 일시 제거 | 비관리 역할 차단(발행자 경로) · 관리 역할은 발행자 자격으로 허용 · **수신자 분기는 조직 조회 무관으로 유지** · 복원 후 발행자 경로 재개 | 동일 | CI (vitest) |
| TC-383-04 | **중첩 케이스 단언** — 수신자 자격이 발행 조건과 겹치는 셀(TC-383-01·03에 내장) | 수신자 분기가 우선해 허용 유지 | 동일 | CI (vitest) |
| TC-383-05 | **R-10 무회귀** — 청구서 관리 E2E(`e2e-31`) 14시나리오 | **14/14 PASS** + `/admin/error-logs` 신규 ERROR **無**(delta 0) | `tests/e2e/e2e-31-billing-flow-verification.spec.ts` | **CI 미실행/수동** (Playwright) |
| TC-383-06 | B-382 교차 확인 (정산 해제 경로) | B-382 존재 확인 함수 **적용 후** 측정 — 병합 전 단계에서 추가 | _(병합 조건 연동 — B-382 적용 시점에 추가)_ | 병합 전 |

## 회귀 검증 (2026-11-24, 실측)

- 신규 통합 테스트 **3/3 PASS** (헤더 매트릭스·항목 매트릭스·fail-closed)
- R-10 E2E `e2e-31` **14/14 PASS** (4.9m) · `zen_error_logs` before=0 → after=0 (**delta 0**)
- `npm run test:regression` → **298 files / 2,274 tests 전부 PASS** · `npm run build` → **exit 0** (`✓ Compiled successfully in 12.3s`)

## 되돌리기 검증 (조건별 — ROLLBACK 블록 실행/재적용, 로컬만 · 커밋 금지)

| 조건 | 되돌리기 내용 | 결과 |
|:--|:--|:--|
| R1 | 마이그레이션 **ROLLBACK 블록 실행**(변경 전 정책 원문 복원 → 정책 2개 ORIGINAL 확인) | **3 failed / 0 passed** (TC-383-01·02·03 전부 FAIL — 매트릭스가 목표와 어긋남) |
| (기준선) | 마이그레이션 본문 재적용(정책 2개 NEW 확인) 후 재실행 | **3/3 PASS** · 잔여 stmt=0 / orders=0 / profiles=0 |

> 되돌리기 런의 실패가 **전 매트릭스 단언**(해당 정책을 바로 검증하는 테스트)에서 발생함을 실측했다. `afterAll`이 조직 조회 정책·fixture를 항상 복원해 런 간 오염이 없음을 함께 확인했다.

**주의 (R-09 v3.10)**: 회귀 맵 단일 파일에 `## N.` 추가 금지 — 본 파일이 등재 단위.
