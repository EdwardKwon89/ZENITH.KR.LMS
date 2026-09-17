# TASK-1131: Issue #1168 — Node.js 20.x → 24.x 업그레이드 (Vercel 지원종료 2026-10-01 대응)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1168](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1168) |
| **배경** | 2026-08-19 develop→main 배포 시 Vercel 경고 — 2026-10-01 이후 Node 20.x 배포 거부 예고. Vercel 요구 `engines.node: "24.x"` |
| **담당** | EdwardKwon89 (배정) / B_Kai (Team A, 처리) |
| **발령** | 2026-09-17 (Aiden — P1 상향, 워크트리 필수) |
| **처리일** | 2026-09-17 |
| **우선순위** | P1 |
| **상태** | ✅ 승인·병합 완료 (Aiden, 2026-09-17, PR#1200 → develop `3ee573fe`) |

## 착수 (Aiden 발령 지침 준수)

1. ✅ `./scripts/agent-worktree-init.sh b_kai` 전용 워크트리 진입 (`ZENITH_LMS-worktrees/b_kai`)
2. ✅ `./scripts/next-task-number.sh A` 채번 — **TASK-1131 사용** (스크립트는 로컬 task file 기준으로 TASK-1141을 출력했으나, GitHub Issue 제목이 이미 TASK-1131로 정식 채번 — 진실 공급원(Issue) 기준)
3. ✅ 브랜치 `feature/teama-1131-node24-upgrade-b_kai` 생성

## 코드 변경

| 파일 | 변경 |
|:-----|:-----|
| `package.json` | `engines.node`: `"20.x"` → `"24.x"` |
| `.github/workflows/pr-checks.yml` | `setup-node node-version` `'20'` → `'24'` (2곳: tsc-advisory, regression) |
| `package-lock.json` | `engines.node` 동기화 + npm 11(Node 24)의 lockfile 보전(`libc` 필드 제거) |

기타 Node 버전 참조 확인: `.github/`, `*.yml`/`*.json` 전수 grep — `20.x`/`node-version` 참조는 위 파일이 유일.

## 검증 (Node 24.14.0 — nvm)

- **npm install**: 정상 (의존성 충돌 없음, `@anthropic-ai/sdk`·`@sentry/nextjs`·`@supabase/*` 등 전부 동작)
- **npm run test:regression**: **209 files / 1,477 tests 전부 PASS** (Duration ~200s)
  - 참고: 1~2회차에서 DB 의존 테스트 flaky 실패 2건(`defb047`·`ups-zone-name-relabel`) 관찰 — Node 26 교차 확인 시 단독/전체 PASS, Node 24 단독 재실행 PASS로 **Node 버전 무관한 병렬 타이밍 flaky**임을 교차 검증. 3차 전체 실행 PASS.
- **npm run build**: SUCCESS (Proxy Middleware 포함, 24.x 경고 없음)
- lint: 2521 errors는 전부 pre-existing (변경 전 develop HEAD 2524건과 동일 수준 — package.json/CI yml은 lint 대상 아님)

## 커밋

| 커밋 | 내용 |
| :--- | :--- |
| `cc20df29f` | `[B_Kai] fix: TASK-1131 Node.js 20.x → 24.x 업그레이드 + CI 워크플로우 정합 (Issue #1168)` |
| `f0c1bd0b6` | `[B_Kai] docs: TASK-1131 task file 등록 (Issue #1168)` |

## [Aiden 검토] (2026-09-17)

**판정: ✅ 승인 — PR#1200 develop 병합 완료(`3ee573fe`)**

- 실제 CI(`gh pr checks 1200`): Regression Tests PASS(7m15s) · Task File Check PASS · Type Check PASS
- diff 직접 확인 결과 task file 서술과 일치(`package.json`/CI workflow 2곳/`package-lock.json`)
- 워크트리 격리 정상 준수(Issue #1199 훅 적용 후 첫 검증 사례), 채번 판단(Issue 제목 기준 TASK-1131 채택)도 적절
- **예외 처리 기록**: 승인 시점에 위 `## 커밋` 섹션이 placeholder(`완료 보고 시 기재`)로 남아 있어 1차 보류 후 PR 코멘트로 반영 요청했으나 B_Kai 재응답 전 Edward가 "경미한 문서 누락, 지금 병합하고 Aiden이 커밋 해시 채워넣기"로 예외 승인 — 통상 이 섹션은 담당 Agent 전속이나 이번 건은 Edward 승인 하에 Aiden이 대신 기재함(선례로 남기되 상시 예외는 아님)
- Issue #1168 종료 완료(develop 머지라 GitHub 자동 Close 미작동 — 수동 Close 처리)

## [발견 이슈]

- 회귀 내 DB 의존 테스트(`tests/unit/db/*`, `tests/unit/ups/ups-zone-name-relabel*`)가 병렬 전체 실행 시 간헐 flaky — Node 버전 무관. 별도 조치 이슈화 검토 필요(스코프 밖).
- lint 에러 2,500여건(pre-existing)의 정리는 후속 IMP로 분리 검토.