# TASK-1167: Issue #1389 — DEF-156 `calculate_order_costs(uuid)` 권한 구성 정정 (IMP-035-RL 조치 복구)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1389](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1389) |
| **수행(Worker)** | Riley (Team A, CPO) |
| **검증(Auditor)** | Aiden (Team A, ZEN_CEO) (R-01) |
| **착수일** | 2026-11-18 (`[설계 의견]` `status:draft` → Aiden `[설계 확정]` 수령 `status:in-progress` → 완료 보고 `status:review`) |
| **우선순위** | P0 (`priority:p1`, `defect:critical`, `type:fix`, `team:a`) |
| **상태** | 🔄 완료 보고 (검토 대기, `status:review`) |
| **브랜치** | `feature/teama-task-1167-def156-security-riley` (`origin/develop` 최신 기준) |

> **보안 기재 원칙 준수 (Issue #1389)**:
> 본 task file·PR 본문에는 원인 경위를 `"IMP-035-RL 조치가 이후 재정의에서 유실됨"` 수준으로만 기재하며, 악용 경로·운영 확인 결과·동종 함수 목록은 비공개 경로로만 Aiden에게 전달한다.

---

## [설계 의견] (Riley, 2026-11-18 — R-11·R-20)

1. **호출처 전수 조사 (`src/`·`supabase/migrations/`·`tests/`)**: `src/` 앱 코드 직접 호출 **0건**, 마이그레이션 내 트리거/타 함수 호출 **0건**, `tests/integration/p6-transport-policy.test.ts`에서 `service_role`로 6회 호출.
2. **차이점**: `IMP-035-RL`(`20260515223345_remediate_security_definer_functions.sql`) 조치가 이후 재정의 과정에서 유실됨.
3. **복구안 및 롤백 SQL**: 계산 본문 무수정 상태로 `ALTER FUNCTION public.calculate_order_costs(uuid) SECURITY INVOKER SET search_path = public;` + `REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;`.
   - **롤백 SQL**: `ALTER FUNCTION public.calculate_order_costs(uuid) SECURITY DEFINER; ALTER FUNCTION public.calculate_order_costs(uuid) RESET search_path; GRANT EXECUTE ON FUNCTION public.calculate_order_costs(uuid) TO authenticated;`

---

## [설계 확정] (Aiden — 2026-11-18, [#issuecomment-6981655111](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1389#issuecomment-6981655111))

1. **복구안**: 계산 본문은 수정하지 않고 `SECURITY INVOKER` + `search_path = public`으로 정정하며, `PUBLIC`/`anon`/`authenticated` 실행 권한을 회수하고 `service_role`에만 부여(`authenticated` 호출 허용 옵션 미채택).
2. **호출처 확인**: 운영 DB(`cron` 스키마 미사용) 및 `supabase/functions`에도 호출처 없음 확인.
3. **마이그레이션**: 신규 멱등 마이그레이션 1개 (운영 적용은 Aiden 승인 후에만 진행).
4. **회귀 테스트**: (a) `anon`/`authenticated` 호출 시 권한 오류, (b) `service_role` 호출은 기존 결과와 동일, (c) 권한 구성 유지·재발 방지 테스트 추가. 동종 함수 목록은 비공개 경로로만 전달.

---

## DoD 체크리스트 (Issue #1389 원문 대비)

- [x] **`[설계 의견]`(호출처 전수·복구안·롤백 SQL) → Aiden `[설계 확정]` 후 구현**: [설계 의견 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1389#issuecomment-6981551297) → [설계 확정 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1389#issuecomment-6981655111) 수령 후 구현 완료.
- [x] **마이그레이션으로 의도한 권한 구성 복구 + 정당 경로 불변 증적**: `supabase/migrations/20261119000500_task1167_def156_calculate_order_costs_privileges.sql` 2회 연속 멱등 적용 및 `prosecdef=f`, `proconfig={search_path=public}`, `anon/auth/public=f`, `svc=t` 확인, `p6-transport-policy.test.ts` (7 tests) PASS.
- [x] **회귀 테스트 신규 + `regression-items/` 등재 + `check:lrtm` 통과**: `tests/integration/task-1167-calculate-order-costs-security.test.ts` (4 tests PASS), `docs/08_Self_Audit/Checklists/regression-items/TASK-1167_Issue1389_calculate-order-costs-security.md` 등재, `node scripts/check-lrtm-sync.mjs --strict` PASS.
- [x] **동종 함수 목록은 비공개 경로로 Aiden에 전달(저장소에 기재 금지)**: 저장소 미기재 원칙 준수, 비공개 경로 전달용 목록 로컬 정리 완료.
- [x] **build·회귀 PASS 수치, R-12·R-10 증적**: `npm run test:regression` **266 test files / 1,952 tests PASS**, `npm run build` **EXIT=0**, `npm run check:doc-links` 신규 깨진 링크 **0건**. R-12 해당 없음(`src/app/actions/` 변경 없음), R-10 UI 변경 없음(`src/` 무수정).
- [x] **R-17 완료 보고·`check-R17-DoD`, PR 본문 `Closes #1389`, 커밋 40자 해시**: 1차 커밋(`20a271c3bfde11ab10bc5ecf2fdc24b98a32792f`) 후 본 task file에 40자 해시 기재 및 2차 문서 커밋 분리 완료.

---

## [작업 결과] (Riley, 2026-11-19)

### 1. 커밋 해시 및 변경 파일
- **1차 커밋 (멱등 마이그레이션 + 보안 회귀 테스트 + `regression-items` 등재)**: `20a271c3bfde11ab10bc5ecf2fdc24b98a32792f` (`[Gemini] fix: TASK-1167 DEF-156 calculate_order_costs 권한 구성 정정 및 회귀 테스트 추가 (#1389)`)
- **변경 파일 (`src/` 무수정)**:
  - `supabase/migrations/20261119000500_task1167_def156_calculate_order_costs_privileges.sql` (신규 멱등 마이그레이션)
  - `tests/integration/task-1167-calculate-order-costs-security.test.ts` (신규 회귀 테스트 4건)
  - `docs/08_Self_Audit/Checklists/regression-items/TASK-1167_Issue1389_calculate-order-costs-security.md` (R-09 등재)

### 2. 검증 증적 (로컬 Supabase — R-14)
```text
# 1. 마이그레이션 2회 연속 적용 (멱등 확인) → DO / DO
# 2. pg_proc 및 실행 권한 카탈로그 확인:
 proname               | prosecdef | proconfig            | anon_exec | auth_exec | public_exec | svc_exec
-----------------------+-----------+----------------------+-----------+-----------+-------------+----------
 calculate_order_costs | f         | {search_path=public} | f         | f         | f           | t

# 3. 신규 보안 테스트 + 기존 정산 정책 테스트:
npx vitest run tests/integration/task-1167-calculate-order-costs-security.test.ts tests/integration/p6-transport-policy.test.ts
→ Test Files  2 passed (2) | Tests  11 passed (11)

# 4. 정합성 및 링크 점검:
node scripts/check-lrtm-sync.mjs --strict
→ Vitest 266개 | 맵 등재 167개 | 미등재 99개 (허용 목록 99개) | 유령 경로 0건 | E2E 미표기 0건
node scripts/check-doc-links.mjs
→ 깨진 링크 84건 (허용 목록 84건, 신규 0건)

# 5. 전체 회귀 및 프로덕션 빌드:
npm run test:regression → Test Files  266 passed (266) | Tests  1952 passed (1952)
npm run build           → BUILD_EXIT=0
```
- **R-10 / R-12**: `src/` 및 UI 변경 0건 (DB 마이그레이션 및 회귀 테스트 전용).

## [발견 이슈]
- 없음 (동종 함수 목록은 보안 원칙에 따라 저장소에 기재하지 않고 비공개 경로로 Aiden에게 별도 전달).
