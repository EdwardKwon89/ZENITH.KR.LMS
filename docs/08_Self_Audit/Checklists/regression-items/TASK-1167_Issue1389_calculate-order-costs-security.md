# [TASK-1167] `calculate_order_costs` 권한 구성 정정 및 재발 방지 검증 (Issue #1389)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-1167 / [#1389](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1389) |
| **팀 / 작성일** | Team A / 2026-11-19 |
| **대상 모듈 (231 연동)** | `supabase/migrations/20261119000500_task1167_def156_calculate_order_costs_privileges.sql` |
| **검증 차원 (231 D1~D9)** | D1, D3 |

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-1167-01 | `anon` 세션 `calculate_order_costs` 호출 거부 | `42501` / `permission denied` 오류 반환 | `tests/integration/task-1167-calculate-order-costs-security.test.ts` | CI (vitest) |
| TC-1167-02 | `authenticated` 세션 `calculate_order_costs` 호출 거부 | `42501` / `permission denied` 오류 반환 | `tests/integration/task-1167-calculate-order-costs-security.test.ts` | CI (vitest) |
| TC-1167-03 | `service_role` 세션 `calculate_order_costs` 정상 동작 | 권한 오류 없이 기존 JSONB 응답 반환 (`p6-transport-policy` 포함) | `tests/integration/task-1167-calculate-order-costs-security.test.ts` | CI (vitest) |
| TC-1167-04 | 마이그레이션 최종 상태 정적 가드 | 마지막 `CREATE OR REPLACE` 이후 `INVOKER`·`search_path`·권한 회수 유지 | `tests/integration/task-1167-calculate-order-costs-security.test.ts` | CI (vitest) |
