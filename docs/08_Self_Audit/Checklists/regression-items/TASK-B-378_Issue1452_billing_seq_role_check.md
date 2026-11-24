# TASK-B-378 회귀 항목 — 청구서 seq 채번 함수 실행 권한·역할 검사 정렬 (Issue #1452, #1449 B)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | #1452 (Aiden #1449 B · Jaison 배정 Mike) · 우선순위 p2 · 통합(#1448) 병합 조건 |
| 담당 | Mike (Worker) / Auditor: Jaison |
| 변경 | `supabase/migrations/20261123120000_task_b378_billing_seq_role_check.sql` (신규, b359 수정 없음) — `next_billing_statement_seq` 내부 역할 검사 + GRANT를 청구서 생성 RPC 2종과 동일 정렬 |
| 검증 차원 (231 D1~D9) | `D1(정합성)`, `D5(권한/RLS)` |

## 회귀 항목

| TC# | 시나리오 | 기대 | 테스트 파일 | 실행 |
|:----|:---------|:-----|:------------|:----:|
| TC-378-01 | **seq GRANT 정렬** — `has_function_privilege` 4종 | `authenticated`·`service_role` = **t**, `anon`·`dashboard_user` = **f** (두 RPC와 동일) | `tests/unit/migrations/taskb359-billing-statement-db.test.ts` TC-359-S4 | CI (vitest) |
| TC-378-02 | **seq 역할 검사 양성 대조** — AGENCY(2회)·ADMIN·ZENITH_SUPER_ADMIN 호출 | 원자 증분 계속(1→2→3→4), 오류 없음 | 동일 TC-359-Q1b | CI (vitest) |
| TC-378-03 | **seq 역할 검사 음성 대조** — INDIVIDUAL·MANAGER·OPERATOR 호출 | `create_not_allowed: role=%` 거부 + **카운터 불변**(증분 없음) + `auth.uid()` 없는 슈퍼유저 직접 호출도 `profile_not_found` | 동일 TC-359-Q1b | CI (vitest) |
| TC-378-04 | **청구서 생성 RPC 무회귀** — 이 테스트 파일 내 모든 `create_billing_statement` 경로(대리점·Admin 발행, 병렬 4중복 포함) | 전부 정상 생성 (내부 seq 역할 검사가 정상 경로를 막지 않음) | 동일 (R·U·RLS 블록 전체) | CI (vitest) |
| TC-378-05 | **월 seq 4자리 상한 소진 동작** — 카운터 999→1000 정상 생성 후 9999→10000 | `lpad('10000',4,'0')='1000'` 절단 → 기존 `ST-202606-01-1000`과 UNIQUE 충돌 → **생성 실패(롤백, 카운터도 9999 복귀)** | 동일 TC-359-Q1c | CI (vitest) |
| TC-378-06 | **R-10 UI 무회귀** — 청구서 관리 전 구간 E2E 14시나리오(대리점 청구서 생성 포함) | **14/14 PASS** + `zen_error_logs` 신규 **0건** | `tests/e2e/e2e-31-billing-flow-verification.spec.ts` | **CI 미실행/수동** (Playwright) |

## 회귀 검증 (2026-11-23, 실측)

- `tests/unit/migrations/taskb359-billing-statement-db.test.ts`: **36/36 PASS** (기존 35건 + Q1c 신규 1건, Q1b는 같은 테스트 내 양성/음성 대조로 확장)
- R-10 E2E `e2e-31`: **14/14 PASS** (4.9m) · `zen_error_logs` before=0 → after=0 (**delta 0**)
- `npm run test:regression` → **296 files / 2,268 tests 전부 PASS** · `npm run build` → **exit 0** (`✓ Compiled successfully in 7.6s`)

## 되돌리기 검증 (조건별 — 로컬 DB에서만, 커밋 금지 → 원복)

| 조건 | 되돌리기 내용 | 결과 |
|:--|:--|:--|
| R1 | **함수 본문 원본 복원**(b359 원본 = 내부 역할 검사 없음, GRANT는 유지) | **1 failed / 35 passed** — TC-359-Q1b 음성 대조만 FAIL (`expected '5' to contain 'create_not_allowed: role=INDIVIDUAL'`, i.e. 비허용 역할 호출이 **통과**) → 테스트가 역할 검사에 민감함을 실측 |
| R2 | **GRANT 원본 복원**(b359 원본 = `REVOKE FROM PUBLIC, anon` — `dashboard_user` 명시 제거) | **36 passed (전부 PASS)** — GRANT 두 줄의 관측 가능한 privilege 값은 **변화 없음**(dashboard_user는 원래 false)을 실측 → 민감성 실측은 R1로 확보하고, GRANT 부분은 관측값 변화 없는 방어적 명시임을 정직하게 기재 |
| (기준선) | 원본 함수·GRANT 재적용 후 재실행 | **36/36 PASS** · `create_not_allowed` 존재=true · `dashboard_user=false, anon=false, service_role=true` |

> R1/R2 모두 측정 후 **원본(마이그레이션 본문·GRANT) 재적용**으로 복구했고, 최종 기준선 36/36을 재확인했다.

**주의 (R-09 v3.10)**: 회귀 맵 단일 파일에 `## N.` 추가 금지 — 본 파일이 등재 단위.
