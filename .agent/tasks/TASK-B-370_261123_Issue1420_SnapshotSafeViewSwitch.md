# TASK-B-370 — Issue #1420: DEF-157 후속 — zen_order_rate_snapshots 안전 뷰 전환 (orders.ts·rate-snapshot-refresh.ts)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1420](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1420) (DEF-157 후속, 선행 TASK-1168/#1406) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-23 |
| **우선순위** | P2 (`priority:p2`, `type:fix`) |
| **상태** | 🔔 리뷰 대기 (`status:review`) |
| **브랜치** | `feature/teamb-task-b370-iss1420-snapshot-safe-view` (base `origin/TeamB_Dev` c0f4409a8 — 0단계 sync PR #1436 병합 후) |
| **채번 확인** | `./scripts/next-task-number.sh B` → **TASK-B-370**, `.agent/tasks` 기존 파일 0건 |
| **선행 조건** | TASK-1168 안전 뷰(`zen_order_rate_snapshots_safe`) develop 병합 완료(#1426) → 0단계 sync PR **#1436 병합 완료**(c0f4409a8) |

## R-20 영향도 (GitNexus 미연결 → grep 전수)

`grep -rn "zen_order_rate_snapshots" src tests` = **144건 / 30파일**. 이번 범위는 이슈 본문대로 **2파일만** 전환한다.

| 파일 | 이번 범위 | 비고 |
|:--|:--:|:--|
| `src/app/actions/operations/orders.ts` | ✅ | 조회 2·쓰기 3 |
| `src/lib/orders/rate-snapshot-refresh.ts` | ✅ | 조회 1·쓰기 2 |
| `src/app/actions/operations/tisa.ts` | — | TASK-1168에서 이미 안전 뷰 전환 완료 |
| `src/lib/actions/ups-daily-close.ts`, `finance/*`, `ups/freight.ts` | — | 관리자/서버 내부 경로(이슈 범위 밖, base 정책 교체 Task에서 별도 점검) |
| `src/app/[locale]/.../order-settlement/[orderId]/page.tsx` | — | Admin 전용(#1430) |
| `src/types/supabase.ts` | — | 생성 타입 |
| `tests/**` | — | 기존 테스트·신규 세션별 실DB 테스트에서 사용 |

> 한계: GitNexus 인덱스 미제공으로 호출 그래프 자동 분석 불가. grep + 직접 호출처 확인으로 대체했다.

## 구현 방침

1. **조회 → 안전 뷰**
   - `orders.ts`: `getOrderByBarcode` 스냅샷 조회, `applyPackageMeasurements` 기존 스냅샷 조회 → `zen_order_rate_snapshots_safe`.
   - `rate-snapshot-refresh.ts`: 기존 스냅샷 조회 → safe view.
   - 안전 뷰 `metadata`는 `platform`(판매가·중량·breakdown)만 포함. 기존 코드가 `metadata.agency`·`metadata.shipper`를 읽지 않음을 확인(읽는 곳은 `platform.totalSellingPrice`뿐).
2. **쓰기 → 소유 검증 후 admin client**
   - 공용 판정 헬퍼 `canWriteOrderRateSnapshot(profile, order)`를 `rate-snapshot-refresh.ts`에 두고 `orders.ts`에서 import.
     - 허용: `ZENITH_SUPER_ADMIN`·`ADMIN`, 또는 `profile.org_id`가 오더 `shipper_id`/`agency_org_id`와 일치.
     - 기존 base RLS(ADMIN 전체 / 화주 org INSERT·UPDATE / AGENCY UPDATE·INSERT)와 동일 범위 유지.
   - `orders.ts` L85 INSERT, L1157 UPDATE, L1165 INSERT → `createAdminClient()`.
   - `rate-snapshot-refresh.ts` L158 UPDATE, L168 INSERT → `createAdminClient()`. 함수 파라미터에 `profile` 추가(호출자 `updateOrder`가 전달).
   - 권한 없는 호출은 **warn 후 쓰기 생략**(기존 RLS 0행과 동일 결과), 오류는 `logger.error`.
3. **금지**: 마이그레이션·base table 정책 변경 없음. 관리자 세션 base 읽기(#1430 등)는 범위 밖.

## 1. 구현 내용

| # | 파일 | 변경 |
|:--|:--|:--|
| 1 | `src/lib/orders/rate-snapshot-refresh.ts` | `canWriteOrderRateSnapshot(profile, order)` 공용 판정 추가(ADMIN/SUPER_ADMIN, shipper/agency org 일치). `refreshUpsRateSnapshot`에 `profile` 파라미터 추가·소유 검증, 조회를 `zen_order_rate_snapshots_safe`로 전환, UPDATE/INSERT는 `createAdminClient()`로 수행 |
| 2 | `src/app/actions/operations/orders.ts` | `saveOrderRateSnapshot` INSERT: 오더 소유자 조회 후 검증 통과 시 admin client INSERT. `getOrderByBarcode`·`applyPackageMeasurements` 조회를 safe view로 전환. `applyPackageMeasurements` snapshot UPDATE/INSERT: 소유 검증 후 admin client + 오류 로깅. `refreshUpsRateSnapshot` 호출에 `profile` 전달 |
| 3 | `src/app/actions/operations/orders.ts` | `applyPackageMeasurements` profile 타입에 `role`·`org_id` 추가(호출자는 이미 전체 profile 전달) |
| 4 | `tests/unit/orders/rate-snapshot-refresh.test.ts` | safe view read·admin client·profile 파라미터·비소유 차단(TC-SNAP-08) 반영 |
| 5 | `tests/unit/orders/direct-shipper-ups-snapshot.test.ts` | 소유자 조회 mock + admin client INSERT 단언으로 갱신 |
| 6 | `tests/integration/ups-edit-before-registration.test.ts` | 서버 액션 경로를 service_role → **Admin 세션 JWT 클라이언트**로 변경(안전 뷰 auth.uid 의존) |
| 7 | `tests/integration/task-b370-snapshot-safe-view.test.ts` (신규) | 화주(소유)·대리점·관리자·비소유 세션별 실DB 조회/쓰기, 등록·실측 경로 |
| 8 | `docs/08_Self_Audit/Checklists/regression-items/TASK-B-370_Issue1420_snapshot-safe-view.md` (신규) | R-09 회귀 항목 |

**마이그레이션·base table 정책 변경 없음.** 관리자 세션 base 읽기(다른 화면)는 이슈 범위 밖으로 유지.

## 2. 테스트 (DoD)

| TC | 내용 | 결과 |
|:--|:--|:--|
| TC-370-01 | safe view 세션별 조회 | 화주(소유)·대리점·관리자 1행 / 비소유 0행 PASS |
| TC-370-02 | metadata 화이트리스트 | `platform`만, `agency`·`shipper` 키 없음 PASS |
| TC-370-03 | 화주(소유) refresh UPDATE | 1행·금액 201 PASS |
| TC-370-04 | 대리점 refresh UPDATE | 금액 202 PASS |
| TC-370-05 | 관리자 refresh UPDATE | 금액 203 PASS |
| TC-370-06 | 비소유 refresh | 쓰기 0·추정 미호출 PASS |
| TC-370-07 | 등록 경로 소유/비소유 | 소유 INSERT 1행(metadata 전체), 비소유 0행 PASS |
| TC-370-08 | 실측 경로 | 중량 7 저장 + 스냅샷 401·1행 PASS |
| TC-370-09 | 기존 수정 통합 회귀 | 6/6 PASS (Admin 세션) |
| TC-370-10~11 | 단위(안전 뷰·소유 검증·직접 화주) | 15/15 PASS |
| TC-370-RST-1 | 소유 검증 항상 true | **2 failed / 15 passed** → 복구 17/17 |
| TC-370-RST-2 | refresh 조회 base 원복 | **2 failed / 8 passed** → 복구 10/10 |
| TC-370-RST-3 | 등록 소유 검증 제거 | **1 failed / 6 skipped** → 복구 7/7 |

## 3. 검증 (DoD)

- [x] 화주·대리점·관리자·비소유 **세션별 실DB 통합 테스트** (`signInWithPassword` 실제 세션)
- [x] 기능 불변 증적: 등록(`saveOrderRateSnapshot`)·수정(`refreshUpsRateSnapshot`)·실측(`applyPackageMeasurements`) 실DB 결과 확인
- [x] 되돌리기 3종 실측
- [x] `npm run test:regression` **293 files / 2,244 tests PASS**, `npm run build` **EXIT=0**
- [x] R-12 Ds-11: 서버 액션 export 시그니처 변경 없음 → 해당 없음
- [x] `zen_error_logs` 최근 1일 신규 ERROR **0건**
- [x] `git diff --stat origin/TeamB_Dev...HEAD -- scratch` 빈 출력(R-15)

## 4. [발견 이슈]

1. **[설계 제약] 안전 뷰는 `auth.uid()` 기반 WHERE를 가진다** — service_role/ admin client로 읽으면 0행이 된다. 서버 액션 경로는 반드시 **사용자 세션 client로 조회**, 쓰기만 admin client를 사용해야 한다. 기존 `ups-edit-before-registration` 통합 테스트가 service_role을 서버 액션 클라이언트로 주입해 이 특성에 걸려 Admin 세션 JWT로 교체했다(코드 무관 테스트 보정). 신규 테스트에도 명시.
2. **[정책 유지] OPERATOR/MANAGER 등 일부 역할은 스냅샷 쓰기 대상이 아니다** — 기존 base RLS(ADMIN·화주 org·AGENCY)와 동일 범위를 유지했다. 해당 역할의 입고 실측 경로는 이전에도 RLS 0행으로 갱신되지 않았고, 이제는 warn 로그가 남는다(동작 불변).
3. **[범위 밖] 그 외 `zen_order_rate_snapshots` 호출처**(`finance/*`, `ups-daily-close.ts`, `ups/freight.ts`, #1430 Admin 페이지 등)는 이슈 본문대로 미변경. base 정책 교체(2/2) 전 Aiden 별도 점검 필요.
4. **[환경] 로컬 DB reset 후 통합 테스트 픽스처 정리** — 신규 테스트는 `370...` UUID·전용 계정을 사용하고 afterAll에서 정리한다.

## 5. [작업 결과]

- 코드 커밋: `ac0776046` (`[Dave] fix: TASK-B-370 …` — 소스 2·테스트 5·회귀항목 1)
- 문서 커밋: 본 task file (docs-only)
- PR: `feature/teamb-task-b370-iss1420-snapshot-safe-view` → `TeamB_Dev` (`Closes #1420`)
