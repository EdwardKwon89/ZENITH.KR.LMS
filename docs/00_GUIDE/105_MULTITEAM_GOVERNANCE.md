# R-19 다중팀 거버넌스 (Multi-Team Governance) — 상세 규정

> **참조 원본**: [GOV_COMMON.md](../../GOV_COMMON.md) R-19 요약 → 상세 내용은 본 문서
> **적용 조건**: 2개 이상의 개발팀이 병행 운영되는 경우 적용. 단일팀 운영 시 R-17만 적용.
> **현재 팀 구성**: Team A (Aiden · D_Kai · B_Kai) / Team B (JSJung · Jaison · Baker)
> **설계 목표**: 5팀까지 확장 가능한 구조로 설계됨 (2팀 병행 운영 프로세스 검증 중)

---

## 팀 리더 권한 (Team Leader Authority)

각 팀의 리더(JSJung 등)는 **팀 내부 업무 범위에서 아래 권한**을 독립적으로 행사한다:

| 권한 | 내용 |
|:----|:----|
| **Task 발령** | 팀 내 Sub-task 자율 발령 (팀 리더 서명) |
| **에이전트 투입** | 팀 내 AI Agent 자율 배정 (Baker 등 팀 소속 에이전트) |
| **ACTIVE_TASK 팀 섹션 관리** | 본인 팀 섹션 독립 편집 (타 팀 섹션 수정 금지) |
| **DoD 내부 검증** | 팀 내 완료 기준 자체 검증 후 PR 제출 |
| **PR 제출** | `feature/teamX-*` → `develop` PR 생성 및 Aiden 검토 요청 |

### 팀 리더 사전 검토 의무 (2026-07-16 신설 — IMP-138 재발 방지)

**팀 리더는 팀원(구현 Agent)의 PR을 오픈하기 전에, 본인이 직접 diff와 CI 결과를 확인한 뒤에만 PR을 제출·검토 요청해야 한다.** "PR 제출 = 이미 팀 리더 검토 완료"를 의미해야 하며, PR 오픈 후 Aiden이 문제를 지적한 다음에야 팀 리더의 실질 리뷰가 시작되는 순서는 이 규정 위반이다.

- **발견 경위**: TASK-B-135(Issue #503, PR#520) — Dave가 작업 배정 11분 만에 PR을 오픈했고, Jaison의 실제 기술 리뷰(import chain 추적 등)는 Aiden 반려 코멘트 이후 2분 뒤에야 등장함이 타임스탬프로 확인됨(2026-07-16, Edward 지시로 명문화)
- **위반 시**: 팀 리더 사전 검토 없이 제출된 PR에서 Aiden이 결함(증적 오류·CI FAIL·테스트 누락 등)을 발견하면, R-17 위반 페널티와 별개로 팀 리더 본인의 "사전 검토 누락"으로 별도 기록한다

## Aiden (ZEN_CEO) 전속 권한 — 불변

| 권한 | 내용 |
|:----|:----|
| **팀 간 Task 조율** | 팀 간 의존성·우선순위 결정 |
| **타 팀 Task file 수정** | 팀 A 파일 ← 팀 A만, 팀 B 파일 ← 팀 B만 (Aiden은 전체 가능) |
| **✅ 최종 전환** | PR 머지 = ✅ 승인 (Aiden 단독) |
| **develop → main 머지** | Sprint 완료 시 Aiden 단독 권한 |
| **신규 팀 투입 결정** | Edward 승인 후 Aiden 집행 |

## 브랜치 전략 (Multi-Team)

```
Team A: feature/teama-*  ────────────────────────────→ develop (Aiden PR 리뷰·머지) → main (Sprint 완료 시)
Team B: feature/teamb-*  → TeamB_Dev (Jaison 자체 병합) ─┘
Team C: feature/teamc-*  ────────────────────────────→ develop
```

### Team B 고정 통합 브랜치 — `TeamB_Dev` (2026-07-18 Edward 지시)

Team B는 개별 `feature/teamb-*` 브랜치를 **develop에 직접 PR 제출하지 않고**, 먼저 고정 브랜치 `TeamB_Dev`로 자체 병합해 최신 상태를 유지한다.

- **개별 → TeamB_Dev**: Jaison 사전검토(diff + **로컬 검증**: `npm run build` + `npm run test:regression`) 후 팀 자체 판단으로 병합 (Aiden 승인 불요). **GitHub Actions CI 완료 대기는 불요**(2026-07-20 개정 — Aiden이 develop에 직접 반영할 때 쓰는 방식과 동일하게, TeamB_Dev는 내부 통합 브랜치라 최종 게이트가 아니므로 로컬 검증으로 충분. CI 큐 혼잡으로 인한 Team B 대기 시간 문제 완화 목적)
- **TeamB_Dev → develop**: Aiden이 정기적으로(1일 1~2회 권장) 배치 병합 — develop 병합은 여전히 Aiden 단독 권한(R-17 §0/R-19 불변). **이 단계는 기존 원칙(R-17 v2.2) 그대로 유지** — 실제 GitHub Actions CI 통과 확인이 원칙이며, CI가 15분 내 트리거되지 않을 때만 R-08-1 로컬 대체 검증 허용. 즉 CI 생략이 허용되는 건 개별→TeamB_Dev 단계뿐이고, develop에 실제로 반영되는 이 단계의 검증 기준은 낮아지지 않는다.
- 이전에는 `integration/teamb-YYMMDD` 형태로 매일 새 브랜치를 만들었으나(2026-07-16~18), 브랜치명이 바뀔 때마다 CI 트리거 목록을 갱신해야 하는 문제가 반복돼 **고정 브랜치로 전환**(과거 `integration/teamb-*` 브랜치는 이력 보존용으로 남겨두고 신규 작업 대상에서 제외)
- Aiden의 배치 병합 시 develop→TeamB_Dev 역방향 병합도 함께 수행해 두 브랜치의 드리프트를 방지한다(충돌은 시간순으로 해소 — [107_MULTIAGENT_SCALING_PROPOSAL.md](107_MULTIAGENT_SCALING_PROPOSAL.md) 참조)

- 각 팀은 `develop`을 베이스로 브랜치 생성
- PR 대상: `develop` (팀 리더가 PR 생성 + Aiden 검토 요청)
- `develop → main`: Aiden 단독 권한 (Phase/Sprint 완료 기준)

## 파일 소유권 원칙

| 파일 유형 | 소유권 | 규칙 |
|:---------|:-----:|:----|
| `.agent/tasks/TASK-XXX_*_[TeamA에이전트].md` | Team A | Team B 수정 금지 |
| `.agent/tasks/TASK-XXX_*_[TeamB에이전트].md` | Team B | Team A 수정 금지 |
| `ACTIVE_TASK.md 팀A 섹션` | Team A | Team B 수정 금지 |
| `ACTIVE_TASK.md 팀B 섹션` | Team B | Team A 수정 금지 |
| 공유 코드 (`rbac.ts` 등) | 공유 | PR 선착순, 후발 팀 리베이스 |
| Migration 파일 | 작성 팀 | 타 팀 읽기 전용 |

## TASK 번호 채번 규칙 (v2.0 — 팀 접두사 체계)

각 팀은 독립 접두사를 사용하여 구조적으로 충돌을 방지한다.

| 팀 | 채번 형식 | 예시 | 비고 |
|:---|:--------:|:-----|:-----|
| Team A (Aiden 관할) | `TASK-NNN` | TASK-151 | 기존 TASK-001~150 연속 |
| Team B (JSJung 관할) | `TASK-B-NNN` | TASK-B-001 | 001부터 독립 순번 |
| Team C+ (향후) | `TASK-C-NNN` 등 | TASK-C-001 | 팀 투입 시 Aiden이 접두사 지정 |

**채번 절차**:
- 채번 전 **본인 팀 섹션 최대값 + 1** (타 팀 섹션 확인 불요 — 충돌 구조적 불가)
- 채번 즉시 ACTIVE_TASK.md 팀 섹션에 등재 (번호 선점)
- 기존 TASK-NNN으로 발령된 타팀 Task(TASK-139/140/142 등)는 그대로 유지 (소급 변경 없음)

> **(Issue #86 Phase 4, 2026-07-07)** Task 발령 자체는 GitHub Issue 생성으로 전환됨(GOV_COMMON.md R-17 참조). 위 채번 절차는 담당 Agent가 Issue를 인지하고 **착수(🔄)하는 시점**에 수행한다 — 발령(Issue 생성) 시점에 미리 번호를 선점하지 않는다.

## DEF 번호 채번 규칙 (v1.0 — 팀 접두사 체계, 2026-07-24 Edward 지시)

TASK 번호와 달리 DEF(결함) 번호는 팀 간 공유 채번 체계 없이 전역으로 운영되어 왔고, 같은 날 Team A와 Team B가 각자 "다음 번호"를 독립적으로 계산하면서 **하루에 세 차례 연속 충돌**이 발생했다(DEF-121: Team A vs TASK-B-192/Issue #728, DEF-121: Team A vs TASK-B-193/Issue #741, DEF-124: Team A vs TASK-B-197/Issue #778 — 상세 경위는 Issue #773 코멘트 이력 참조). TASK 번호와 동일한 팀 접두사 체계를 DEF 번호에도 적용해 구조적으로 충돌을 방지한다(Edward 지시, 2026-07-24).

| 팀 | 채번 형식 | 예시 | 비고 |
|:---|:--------:|:-----|:-----|
| Team A (Aiden 관할) | `DEF-NNN` | DEF-126 | 기존 DEF-001~125 연속(팀 구분 없이 전역 채번되던 이력 그대로 유지) |
| Team B (JSJung 관할) | `DEF-B-NNN` | DEF-B-001 | 001부터 독립 순번, 신규 등록분부터 적용 |
| Team C+ (향후) | `DEF-C-NNN` 등 | DEF-C-001 | 팀 투입 시 Aiden이 접두사 지정 |

**채번 절차**:
- 채번 전 `./scripts/next-def-number.sh [B]` 실행(TASK 번호와 동일 스크립트 패턴) — `.agent/defects/` 파일명뿐 아니라 `.agent/ACTIVE_TASK.md`·`.agent/VIOLATION_TRACKER.md`·`supabase/migrations/*.sql` 파일명까지 함께 스캔(정식 defect 리포트 파일 없이 마이그레이션 파일명에만 번호를 쓴 경우도 있었음 — DEF-124/TASK-B-197 사례 참고)
- 채번 즉시 `.agent/defects/DEF-(B-)NNN_*.md` 파일 생성 또는 참조 문서에 등재해 번호 선점
- **기존 DEF-001~125(팀 구분 없이 전역 채번되던 시절 번호)는 그대로 유지 (소급 변경 없음)** — TASK-139/140/142 선례와 동일 원칙
- Team B는 이번 결정 시점 이후 신규 등록하는 결함부터 `DEF-B-NNN`을 사용한다. 기존에 이미 `DEF-121`~`DEF-124`로 통용 중인 Team B 결함(Issue #741/TASK-B-193, #771/TASK-B-195, #778/TASK-B-197 등)은 소급 변경하지 않는다.

## ACTIVE_TASK.md 구조

```markdown
## Team A 활성 Task  ← Aiden 관할
| TASK-NNN | ... |

## Team B 활성 Task  ← Jaison(JSJung) 관할
| TASK-NNN | ... |

## Team C 활성 Task  ← 향후 팀 리더 관할
```

## 위반 처리

- R-17 위반 페널티는 팀 내부에서도 동일 적용
- 팀 리더 권한 남용(타 팀 파일 수정·타 팀 Task 발령) → 팀 리더 경고 + Aiden 중재
- 이번 TASK-139/140 관련 Jaison의 위반: **규정 미비에 의한 소급 면제** (R-19 최초 적용 기준)
