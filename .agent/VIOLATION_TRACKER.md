# R-17 위반 누적 현황

> R-17 반복 위반 페널티 기준: **동일 유형 3회 이상** 시 신규 Task 할당 일시 중단 → Aiden 재교육 세션 후 재개.
> 위반 유형: task file 미업데이트·커밋 해시 미기재·상태 미변경·DoD 미체크·자가 검증 미실행·PR 자체 병합(Aiden 단독 권한 위반)

| Agent | 위반 유형 | 누적 횟수 | 관련 Task | 비고 |
|:------|:---------|:--------:|:---------|:----|
| B_Kai | task file 절차 미준수 | **2회** | TASK-018 재작업 | 할당 중단 기준(3회) 미달 |
| Ring  | task file 절차 미준수 | **4회** | TASK-010 1·2차, TASK-012 1·2차 | ⚠️ 기준 초과 — 할당 중단 중 |
| D_Kai | develop 직접 커밋 (R-17 브랜치 규칙 위반) | ⚠️ **2회** | TASK-169 (`8cfeda4`), TASK-182 (`ad6bf0c6`·`1b3edf5d`) | 2차 위반 — 할당 중단 기준(3회)까지 1회 남음. PR#275 반려(브랜치 미갱신) 직후 재작업 없이 동일 코드를 PR 없이 develop에 직접 push. `enforce_admins:false`로 branch protection 미적용, CI(PR Checks) 전혀 미실행 상태로 반영됨 — Aiden 긴급 로컬 검증(build ✅·tsc src/ 0 errors·vitest 475 PASS)으로 기능적 정합성만 사후 확인, 코드 자체는 되돌리지 않음 |
| ~~Dave~~ | ~~develop 직접 커밋 (R-17 브랜치/PR 규칙 위반)~~ | ~~1회~~ | ~~TASK-B-043 (`84c103e`)~~ | **면제** (2026-07-04 JSJung 결정) — 초회 위반 특성 고려, 횟수 카운트 제외 |
| ~~Dave~~ | ~~task file 미업데이트 (R-17 완료 보고 절차 위반)~~ | ~~1회~~ | ~~TASK-B-043 (`84c103e`)~~ | **면제** (2026-07-04 JSJung 결정) — 횟수 카운트 제외 |
| ~~Baker~~ | ~~develop 직접 커밋 (R-17 브랜치/PR 규칙 위반)~~ | ~~1회~~ | ~~TASK-B-044 (`08dc986`)~~ | **면제** (2026-07-04 JSJung 결정) — 초회 위반 특성 고려, 횟수 카운트 제외 |
| ~~Baker~~ | ~~task file 상태 미전환 (R-17 완료 보고 절차 위반)~~ | ~~1회~~ | ~~TASK-B-044 (`08dc986`)~~ | **면제** (2026-07-04 JSJung 결정) — 횟수 카운트 제외 |
| Baker | task file 헤더 상태 미변경 ⬜→🔔 (R-17 완료 보고 절차 위반) | **1회** | TASK-B-054 (`7fe0bb2`) | 개정 이력에 🔔 기재했으나 헤더 미변경. 동일 유형 재발. 할당 중단 기준(3회) 미달 |
| Riley | 코드/문서 커밋 미분리 (R-17 §1 위반) | **1회** | GH#204 (`e005cc53`) | 단일 커밋에 코드 파일과 task file·LIVE_REGRESSION_TEST_MAP.md·IMP_PROGRESS.md·ACTIVE_TASK.md 문서 파일 혼입. PR#215 조건부 반려, 재작업 요청. 할당 중단 기준(3회) 미달 |
| Jaison | PR 자체 병합 (R-17 "Aiden 단독 권한" 위반) | **1회** | DEF-098 (PR#252, `mergedBy: jungjs`) | UAT-17 전면 차단 긴급 수정 — 본인 작성 DEF 보고서에 "Aiden PR 머지" 명시했음에도 자체 병합. 수정 내용 자체는 검증 결과 정확·안전하여 되돌리지 않음. 할당 중단 기준(3회) 미달 |
| Dave | task file 미생성 (R-17 완료 보고 절차 위반) | 🚫 **3회** | TASK-B-092 (PR#323), TASK-B-093 (PR#324), Issue #381 (PR#383) | **할당 중단 기준(3회) 도달.** 세 건 모두 `.agent/tasks/` task file·ACTIVE_TASK.md 행 자체가 없는 상태로 PR 제출(코드·실제 CI는 매번 정상 확인되어 병합은 진행). 정책상 신규 Task 할당 일시 중단 + Aiden 재교육 세션 필요 — Edward 보고 및 결정 대기 |
| Mike | 공유 workspace 브랜치 오염 (R-17 §0 위반) | ⚠️ **2회** | PR#353 (Issue #347), PR#367 (Issue #350) | 두 건 모두 담당 Issue와 무관한 Dave의 미병합/작업중 코드가 diff에 통째로 혼입됨 — PR#367은 특히 PR#365에서 Aiden이 Critical 보안 결함으로 반려한 `zone-discounts.ts`가 그대로 포함되어 재유입됨. Issue #358(2026-07-11)에서 worktree 격리 원칙을 문서로 안내했음에도 재발 — 문서 안내만으로는 불충분함이 확인되어 Team B 실제 작업 환경(에이전트별 물리적 디렉토리 분리 여부) 점검 필요. 할당 중단 기준(3회)까지 1회 남음 |

## 처리 이력

| 일자 | Agent | 조치 | 비고 |
|:----|:------|:----|:----|
| 2026-05-20 | Ring | 신규 Task 할당 일시 중단 | 4회 누적, 재교육 대기 |
| 2026-07-04 | Dave | **면제** — TASK-B-043 위반 2건 카운트 제외 | JSJung 결정. 재발 방지 지시 task file 표준화 적용 |
| 2026-07-04 | Baker | **면제** — TASK-B-044 위반 2건 카운트 제외 | JSJung 결정. 재발 방지 지시 task file 표준화 적용 |
| 2026-07-05 | Baker | **1회 기록** — TASK-B-054 task file 헤더 상태 미변경 | Jaison 검토 시 발견. 수정 요청 후 조건부 승인 예정 |
| 2026-07-06 | Riley | **1회 기록** — GH#204(PR#215) 코드/문서 커밋 미분리 | Aiden 검토 시 발견. PR#215 조건부 반려, 커밋 분리 후 재제출 요청 |
| 2026-07-07 | Jaison | **1회 기록** — DEF-098(PR#252) 자체 병합 | UAT-17 차단 긴급 수정 자체 판단으로 병합. Aiden이 Issue #250에 위반 기록 안내 + 향후 긴급 상황 시 코멘트 요청 절차 안내(40분 간격 상시 모니터링 중). 수정 내용은 되돌리지 않음 |
| 2026-07-08 | D_Kai | ⚠️ **2회 기록** — TASK-182 develop 직접 push (PR#275 반려 직후) | PR#275(브랜치 미갱신)를 Aiden이 반려하자 rebase 없이 동일 커밋을 PR 없이 develop에 직접 push, PR-checks.yml은 pull_request 이벤트에만 트리거되어 CI 완전 미실행. Aiden 긴급 로컬 검증으로 기능 정상 확인 후 되돌리지 않음. Issue #271에 재발 방지 지시 게시. 동일 유형 3회째부터 할당 중단 대상 — Edward 보고 |
| 2026-07-11 | Dave | ⚠️ **2회 기록** — TASK-B-092(PR#323)·TASK-B-093(PR#324) task file 미생성 | check-request 점검 중 Aiden 발견. 두 PR 모두 실제 CI PASS·diff 정합 확인되어 병합은 진행했으나, `.agent/tasks/` task file과 ACTIVE_TASK.md 행 자체가 생성되지 않은 상태. 동일 유형 3회째부터 할당 중단 대상 — Jaison 재발 방지 지시 요청 |
| 2026-07-11 | Mike | ⚠️ **2회 기록** — PR#353·PR#367 공유 workspace 브랜치 오염 | PR#353(Issue #347)에 이어 PR#367(Issue #350)에도 Dave의 무관한 미병합 작업(Issue #351 zone-discounts.ts — 반려된 보안 취약 코드 포함, Issue #340 관련 파일)이 diff에 섞여 들어와 Aiden이 반려. Issue #358 worktree 격리 안내 이후에도 재발 — 문서 안내의 실효성에 의문, Team B 작업 환경 자체 점검 필요. 동일 유형 3회째부터 할당 중단 대상 |
| 2026-07-12 | Dave | 🚫 **3회 기록 — 할당 중단 기준 도달** — Issue #381(PR#383) task file 미생성 | check-request 점검 중 Aiden 발견. TASK-B-092/093에 이어 3번째 동일 유형 위반. 코드(discount-guard.ts 원가마진 하한 검증 등)는 실제 CI PASS·diff 정합 확인되어 병합 진행했으나, R-17 정책상 동일 유형 3회 도달로 신규 Task 할당 일시 중단 + Aiden 재교육 세션 필요 — Edward 보고 |

_최종 갱신: 2026-07-12 (Dave task file 미생성 3회 도달 — 할당 중단 기준)_
