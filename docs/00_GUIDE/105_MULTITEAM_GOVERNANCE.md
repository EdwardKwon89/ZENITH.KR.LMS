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
Team A: feature/teama-*  ─┐
Team B: feature/teamb-*  ─┼→ develop (Aiden PR 리뷰·머지) → main (Sprint 완료 시)
Team C: feature/teamc-*  ─┘
```

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
