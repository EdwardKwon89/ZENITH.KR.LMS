# TASK-195: Issue #627 — CI에 tsc --noEmit advisory 단계 추가 (IMP-134 §1)

**담당**: Riley
**생성일**: 2026-07-21
**우선순위**: P3
**상태**: ✅

---

## [배경]

`test:regression`(vitest)은 esbuild/swc 트랜스파일만 하고 타입 체크를 강제하지 않아, `tests/` 하위에 타입 오류가 있어도 테스트는 PASS로 통과된다. Aiden이 직접 `npx tsc --noEmit` 실행 결과 `tests/` 하위에서 **237건**의 기존 타입 오류를 확인(2026-07-21 — `scratch/post_launch_improvements.md` IMP-134 최초 발견 시점 222건에서 증가). `src/`(앱 코드)는 `next build`가 자체적으로 타입체크하므로 이 문제는 `tests/`에 국한된다.

---

## [작업 범위]

`.github/workflows/pr-checks.yml`에 `npx tsc --noEmit` 실행 단계를 **advisory(non-blocking)** 로 신규 추가한다 — 기존 "Task File Check (advisory, non-blocking)" 잡과 동일한 패턴(경고만 출력, `exit 0`으로 항상 성공 종료).

### ⚠️ 필수 주의사항
이 워크플로우(`pr-checks.yml`)는 `on.pull_request.branches: [develop, main, TeamB_Dev, "integration/**"]`로 설정되어 있어 **Team B의 PR에도 그대로 트리거된다.** 기존 237건의 타입 오류가 이미 존재하는 상태이므로, 이 단계를 **차단(required/blocking) 체크로 추가하면 안 된다** — 그 순간부터 Team A·Team B 구분 없이 모든 PR의 CI가 즉시 실패하게 된다. 반드시 결과와 무관하게 `exit 0`을 보장할 것(기존 "Task File Check" job의 `exit 0` 패턴 참고).

기존 237건 자체를 지금 고치는 것은 이번 Task 범위 밖이다(IMP-134 §2, 별도 Backlog Task로 남김).

---

## [DoD]

- [x] `pr-checks.yml`에 advisory 전용 신규 잡(`Type Check (advisory, non-blocking)`) 추가 — `npx tsc --noEmit` 실행 후 결과와 무관하게 `exit 0`
- [x] 기존 237건 오류가 있는 상태에서도 다른 체크(Task File Check·Regression Tests)에 영향 없음을 실제 PR로 확인
- [x] 네거티브 컨트롤: 신규 타입 오류를 고의로 하나 추가해 advisory 경고 로그에 실제로 나타나는지 확인 후 원복 (`tests/unit/ups/ups-order-detail.test.ts`에 TS2322 고의 추가 후 tsc 실행 출력 확인 후 100% 원복)
- [x] 전체 회귀 테스트 PASS (`npm run test:regression` 검증 완료)
- [x] `./scripts/next-task-number.sh A`로 채번 재확인(TASK-195 확정 배정됨)

---

## [R-17 완료 보고 절차]

1. **[코드 커밋]** `[Gemini] feat: TASK-195 CI에 tsc --noEmit advisory 게이트 신규 추가 — Issue #627 구현`
2. 상세 파일 `[작업 결과]` 섹션 작성(커밋 해시 포함) + 상태 🔔 변경
3. `.agent/ACTIVE_TASK.md` 상태 🔄→🔔 변경
4. `gh issue edit 627 --add-label status:review --remove-label status:in-progress`
5. `check-R17-DoD` 실행 통과 확인
6. **[문서 커밋]** `[Gemini] docs: TASK-195 완료 보고 — task file 🔔`
7. **[PR 생성]** `feature/teama-task-195-ci-tsc-advisory-gate-riley → develop`, `Closes #627`

---

## [발견 이슈]

없음

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `70b3ddbe3cacc7fd339336ec6db32d2de783c6a1` |
| 회귀 결과 | Vitest unit & integration & regression tests 100% PASS (`rtk npm run test:regression` 검증 완수) |
| 특이사항 | `.github/workflows/pr-checks.yml`에 `tsc-advisory` (Name: `Type Check (advisory, non-blocking)`) 신규 잡 추가. `npx tsc --noEmit || true` 후 `exit 0` 보장하여 Team A/B 전체 PR 차단 없는 안전한 advisory 게이트 구현. 네거티브 컨트롤 검증 완수. |

## [Aiden 검토] — 2026-07-21 10:52 KST

**판정**: ✅ 승인

**diff 직접 확인**(`70b3ddbe`): `pr-checks.yml`에 `tsc-advisory` 잡 추가 — `npx tsc --noEmit || true` + `exit 0`으로 advisory 보장, `bot/sync-active-task` 예외 처리도 기존 `regression` 잡과 동일 패턴으로 반영. task file 서술과 정확히 일치.

**실제 CI**(`gh pr checks 628`): Task File Check ✅ · **Type Check(advisory, non-blocking) ✅**(신규 게이트 자체가 실제로 정상 동작) · Regression Tests ✅ · Vercel ✅.

**R-17 준수**: 커밋 순서(feat→docs) 정확히 분리, 커밋 해시(`70b3ddbe3cacc7fd339336ec6db32d2de783c6a1`) 실재 확인. PR body `Closes #627` 정상.

**Aiden 조치**: PR#628 develop 병합.
