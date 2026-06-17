# GitHub Issues/PR 중심 Task 관리 체계 전환 검토 보고서

> **작성일**: 2026-06-16  
> **작성자**: Aiden (Claude, ZEN_CEO)  
> **상태**: 검토 완료 — 구현 대기  
> **승인**: Edward (방향 확정, 구현 일정 추후 결정)

---

## 1. 전환 배경

### 현재 시스템의 한계

| 파일 | 역할 | 한계 |
|:----|:----|:----|
| `.agent/ACTIVE_TASK.md` (532줄) | Task 인덱스 SSOT | 다중팀 머지 충돌 |
| `.agent/tasks/TASK-NNN.md` (147개) | Task 상세·DoD·이력 | 수동 상태 동기화 오류 반복 |
| `scratch/IMP_PROGRESS.md` (379줄) | 기능 진척 대시보드 | 수동 갱신·허위 체크 |
| `.agent/defects/DEF-NNN.md` | 결함 추적 | 독립 파일, 검색 불편 |

**핵심 문제**:
- `ACTIVE_TASK.md` 단일 파일에 모든 팀 상태 집중 → Team B 온보딩 이후 머지 충돌 발생
- Agent 파일 직접 편집 → DoD 허위 체크, 헤더 상태 불일치 반복 (TASK-B-007 사례 등)
- `.github/` 디렉토리 미존재 → CI/CD, Issue Template 자동화 인프라 전무
- R-19 5팀 확장 목표 달성 시 수동 파일 관리 체계 임계점 도달 예상

---

## 2. 핵심 매핑: 현재 → GitHub 대체

| 현재 (파일 기반) | GitHub 대체 |
|:---------------|:-----------|
| `ACTIVE_TASK.md` 인덱스 | **GitHub Project Board** (Kanban) |
| `.agent/tasks/TASK-NNN.md` | **GitHub Issue** (본문 = Task 명세 + DoD) |
| `IMP_PROGRESS.md` | **GitHub Milestone** + Project custom field |
| `DEF-NNN.md` 결함 | **GitHub Issue** (label: `defect`) |
| `check-R17-DoD` 수동 실행 | **GitHub Actions** PR required check |
| 상태 ⬜→🔔→✅ | **Issue/PR label** + PR state |
| Aiden 단독 ✅ 권한 | **CODEOWNERS** + Branch protection |

---

## 3. 권장 구현 방안: 3단계 점진적 전환

### Phase 1 — Foundation (~1일)

**`.github/` 디렉토리 신설**:
```
.github/
├── CODEOWNERS                    # Aiden 단독 머지 권한
├── PULL_REQUEST_TEMPLATE.md      # R-17 DoD 체크리스트 내장
├── ISSUE_TEMPLATE/
│   ├── task.yml                  # Task 발령 템플릿
│   └── defect.yml                # DEF 결함 보고 템플릿
└── workflows/
    └── pr-checks.yml             # 빌드 + 회귀 테스트 자동 실행
```

**CODEOWNERS** (Aiden 단독 머지 강제):
```
develop  @EdwardKwon89
main     @EdwardKwon89
```

**PR Template** (R-17 DoD 통합):
```markdown
## Task 연결
- Closes #NNN

## DoD 체크리스트
- [ ] 코드 커밋 해시: `(기재)`
- [ ] 문서 커밋 해시: `(기재)`
- [ ] `npm run test:regression` PASS — 결과: `NNN/NNN`
- [ ] ZEN_A4 (함수 50줄 이하) 확인
- [ ] check-R17-DoD 전항목 통과
```

**GitHub Actions** (`pr-checks.yml`):
```yaml
on: [pull_request]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npm run test:regression
```

**GitHub Labels 체계**:

| 범주 | Labels |
|:----|:------|
| **상태** | `status:draft` `status:in-progress` `status:review` `status:done` `status:blocked` |
| **팀** | `team:a` `team:b` `team:c` |
| **우선순위** | `priority:p1` `priority:p2` `priority:p3` `priority:p4` |
| **유형** | `type:feat` `type:fix` `type:docs` `type:refactor` |
| **결함** | `defect` `defect:critical` `defect:high` |
| **위반** | `violation:r17` `violation:zen-a4` |

---

### Phase 2 — Issue 기반 Task 관리 (~1주)

**Task 발령 방식 변경**:
- 기존: Aiden이 `.agent/tasks/TASK-NNN.md` 파일 직접 생성
- 신규: GitHub Issue 생성 → Issue body = Task 명세 + DoD
- **Issue 번호 = Task 번호** (TASK-151 → Issue #151)

**완료 보고 간소화 (R-17 6단계 → PR 기반 3단계)**:
```
1. PR 생성 (PR body = DoD 체크리스트)
2. PR Checks 통과 (GitHub Actions: build + regression 자동)
3. Aiden PR 머지 = ✅ 승인 (CODEOWNERS 강제)
```

**ACTIVE_TASK.md 자동 생성**:
- GitHub Actions가 `develop` Push 시 열린 Issues 조회
- `.agent/ACTIVE_TASK.md` 자동 재생성 → 수동 편집 불필요

**IMP_PROGRESS.md → GitHub Milestone**:
- IMP Phase A~K → GitHub Milestone 매핑
- Issue Milestone 할당으로 Phase 진척률 자동 계산

---

### Phase 3 — 완전 자동화 (~1개월)

- `DEF-NNN.md` → GitHub Issue (`defect` label) 완전 대체
- Agent R-17 위반 누적 → `violation:r17` label 자동 부여
- 스프린트 리뷰 → GitHub Milestones 번다운 차트
- `ACTIVE_TASK.md` 완전 폐기 (자동 생성본 대체)

---

## 4. 유지되는 요소 (불변)

| 항목 | 이유 |
|:----|:----|
| R-17 커밋 순서 (코드→문서) | PR diff로 검증 가능, 유지 |
| `[Agent] type:` 커밋 메시지 | `.githooks/commit-msg` 훅 유지 |
| GOV_COMMON.md 거버넌스 규칙 | 규칙 자체 유지, 시행 방식만 자동화 |
| Aiden 단독 ✅ 승인 | CODEOWNERS로 강제화 (동일 효과) |
| `.agent/tasks/` 기존 파일 | TASK-150까지 완료 시 순차 아카이브 |

---

## 5. 예상 작업량

| Phase | 소요 | 주요 작업 |
|:------|:---:|:---------|
| Phase 1 | ~4h | `.github/` 신설, CODEOWNERS, PR/Issue Template, GitHub Actions |
| Phase 2 | ~1주 | Issue 기반 발령 전환, ACTIVE_TASK 자동생성 Action |
| Phase 3 | ~1개월 | 전체 자동화, ACTIVE_TASK 폐기, Milestone 전환 |

---

## 6. 검증 기준

1. PR#9 이상부터 PR Template DoD 체크리스트 자동 표시 확인 (Phase 1)
2. TASK-151 이상 신규 Task가 GitHub Issue로 발령, PR 머지 시 `status:done` 자동 전환 (Phase 2)
3. `npm run test:regression` PASS/FAIL이 PR Checks에 자동 표시 (Phase 1)
4. Team C 온보딩 시 충돌 없이 Issue 섹션 독립 운용 (Phase 2)
