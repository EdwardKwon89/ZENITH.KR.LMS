# TASK-1175: Issue #1486 (IMP-204) — deploy-prod.sh V2(alias 확인) 오탐 수정 + 전수 점검 + 211 런북 갱신

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1486](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1486) |
| **수행(Worker)** | Riley (Team A, `[Gemini]`) |
| **검증(Auditor)** | Aiden (Team A, ZEN_CEO) (R-01) |
| **우선순위** | P2 (`priority:p2`, `team:a`, `type:fix`) |
| **상태** | 완료 보고 (`status:review`) |
| **브랜치** | `feature/teama-task-1175-deploy-v2-false-positive` |

---

## 1. 수정 요약

1. **`scripts/deploy-prod.sh` (`verify_deploy` V2 수정)**:
   - 기존 `vercel inspect "$NEW_URL" 2>&1 | grep -q "$ALIAS_HOST"` 파이프를 제거하고, `inspect_out="$(vercel inspect "$NEW_URL" 2>&1)"` 변수 캡처 후 `grep -q "$ALIAS_HOST" <<<"$inspect_out"` 검사로 전환해 `set -euo pipefail` 하 SIGPIPE(exit 141) 오탐을 원천 제거.
   - `vercel inspect` 실패 시 최대 3회 재시도(`DEPLOY_INSPECT_RETRY_DELAY`, 기본 2초) 후에도 실패하면 `"vercel inspect 실패(exit $inspect_rc, 3회 재시도)"`, 정상 출력에 `$ALIAS_HOST`가 없을 때만 `"alias($ALIAS_HOST)가 새 배포에 연결되지 않았습니다"`로 구분해 `die 3` 호출.
2. **`scripts/agent-worktree-init.sh` (L56 동일 패턴 예방 수정)**:
   - `set -euo pipefail` 환경에서 `git worktree list | grep -q "$WORKTREE_DIR"` 파이프를 `WORKTREE_LIST="$(git -C "$REPO_ROOT" worktree list)"` 변수 캡처 후 `grep -qF "$WORKTREE_DIR" <<<"$WORKTREE_LIST"`로 수정.
3. **`docs/00_GUIDE/211_PRODUCTION_DEPLOY_RUNBOOK.md` (§2-A 갱신)**:
   - 실배포(V1·V3) 동작 확인 및 V2(SIGPIPE 오탐 수정, 실패/미연결 구분 + 최대 3회 재시도) 상태를 반영하고, 수동 V2 명령은 `vercel inspect` 자체 실패 시의 대체 확인으로만 제한.

---

## 2. `scripts/*.sh` · `.githooks/*` 전수 점검 결과표

- **사용 명령**:
  - `rg -n "pipefail" scripts/*.sh .githooks/*`
  - `rg -n "\| *grep -q|\| *grep " scripts/*.sh .githooks/*`

| 파일:줄 | 패턴 | `pipefail` 여부 | 판정 | 근거 |
|:--|:--|:--:|:--|:--|
| `scripts/deploy-prod.sh:127` | `vercel inspect ... \| grep -q` | O (`set -euo pipefail`) | **수정 완료** | 상류 SIGPIPE 오탐 실제 발생(IMP-204) → 변수 캡처 + 3회 재시도 + 실패/미연결 구분으로 전환 |
| `scripts/agent-worktree-init.sh:56` | `git worktree list \| grep -q` | O (`set -euo pipefail`) | **수정 완료** | 워크트리 목록 다수 시 조기 pipe close로 SIGPIPE 오탐 가능 → 변수 캡처 후 `grep -qF`로 전환 |
| `.githooks/commit-msg:11` | `echo "$COMMIT_MSG" \| grep -qE` | X (`set -e` 단독) | **수정 불요** | `pipefail` 미사용이라 상류 종료코드가 파이프라인 결과에 영향 주지 않음 |
| `scripts/deploy-prod.sh:85, 108` | `git diff \| grep -vE ... \|\| true`, `vercel ls \| grep ... \| head -1 \|\| true` | O | **수정 불요** | 일반 `grep` 또는 `\|\| true`로 안전 처리됨 |
| `scripts/check-db-freshness.sh:26, 46` | `grep -c . \|\| true`, `grep '^...' \| cut` | O | **수정 불요** | `-q` 미사용(EOF까지 소비) 및 `\|\| true` 처리 |
| `scripts/next-task-number.sh:53, 55` | `\| grep -ohE ... \|\| true` | O | **수정 불요** | `-q` 미사용 및 `\|\| true` 처리 |
| `scripts/next-def-number.sh:56, 59, 61` | `\| grep -ohE / -oihE ... \|\| true` | O | **수정 불요** | `-q` 미사용 및 `\|\| true` 처리 |
| `.githooks/pre-commit:16`, `scripts/test_with_filter.sh:17` | `\| grep ... \|\| true`, `\| grep -Ev \| tee` | X | **수정 불요** | `pipefail` 미사용 및 `-q` 미사용 |

- **수정 후 재조회**: `scripts/*.sh` 및 `.githooks/*` 내 `pipefail` + `| grep -q` 조합 **0건**.

---

## 3. 검증 결과 (로컬 스텁 + `--dry-run`)

1. **문법 점검**: `bash -n scripts/deploy-prod.sh` · `bash -n scripts/agent-worktree-init.sh` — **PASS**
2. **로컬 스텁 검증 (`PATH` 앞 가짜 `vercel` · `curl` 주입, `verify_deploy` 격리 실행)**:
   - **오탐 재현 (수정 전 파이프 방식)**: 대량 출력으로 `grep -q` 조기 종료 시 `vercel` SIGPIPE → `exit 3` (`DIE_3_SIGPIPE`) 재현 확인.
   - **Case 1 (수정 후 SIGPIPE 시나리오)**: 동일 대량 출력에서도 변수 캡처 방식으로 **PASS** (`V2 alias(...) 연결 확인`).
   - **Case 2 (정상 연결)**: `Ready` + `$ALIAS_HOST` → **PASS** (`exit 0`).
   - **Case 3 (alias 미연결)**: `Ready` + 타 호스트 → **PASS** (`exit 3`, `"alias(...)가 새 배포에 연결되지 않았습니다"` 구분 출력).
   - **Case 4 (inspect 실패 + 3회 재시도)**: V2 `vercel inspect` 실패 시 정확히 **3회 호출** 후 `exit 3` (`"vercel inspect 실패(exit 1, 3회 재시도)"`) + 일시 실패 2회 후 3회차 성공 시 **PASS** (`exit 0`) 확인.
3. **게이트 점검**: `./scripts/deploy-prod.sh --dry-run --allow-diverge` — 모든 배포 전 게이트 및 `origin/main` worktree 준비 **PASS** (`exit 0`, 실배포 미실행).
4. **문서 링크 점검**: `node scripts/check-doc-links.mjs` — 신규 깨진 링크 **0건**.

---

## 4. DoD 체크리스트
- [x] V2가 변수 캡처 방식이며 `pipefail` + `| grep -q` 조합이 남지 않음 (전수 grep 0건)
- [x] `inspect` 실패 / `alias` 미연결 구분 + 재시도 동작, 4경우(+재시도 복구) 단언
- [x] 오탐 재현 → 수정 후 통과 → 되돌리면 실패 증적
- [x] `--dry-run` · `bash -n` 정상 동작 확인
- [x] 전수 점검 결과표(수정한 곳 / 수정 불요 + 근거)
- [x] `211` 런북 §2-A 문장 갱신
- [x] R-17 준수, 운영 배포 미수행

---

## 5. [작업 결과]

- **코드·문서 커밋**: `b188341a9bced949b71e546c5d6bc69e83477739` (`[Gemini] fix: TASK-1175 deploy-prod.sh V2 SIGPIPE 오탐 수정 및 211 런북 갱신 (#1486)`)
- **IMP-204 갱신 요약 (Aiden 참고)**: `scripts/deploy-prod.sh` V2를 변수 캡처 + 3회 재시도(실패/미연결 구분)로 수정하고 `agent-worktree-init.sh:56` 동일 패턴 예방 수정, 로컬 스텁 4경우+SIGPIPE 재현 및 `211` 런북 §2-A 갱신 완료 (`PR #<PR번호>`).
