# TASK-160 — P7 WBS Team B SPR-04~08 트랙 develop 반영

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-160 |
| **생성일** | 2026-06-19 |
| **발령자** | Aiden (ZEN_CEO) |
| **할당 Agent** | B_Kai |
| **우선순위** | P4 |
| **전제조건** | TASK-159 ✅ |
| **관련 이슈** | Issue #43 |
| **브랜치** | `feature/wbs-bkai-p6p7-wbs-teamb-spr04-08` |
| **커밋 태그** | `[B_Kai]` |
| **상태** | ⬜ |

## [목표]

TASK-159 ✅ 승인·PR #41 머지 이후, B_Kai가 `feature/wbs-bkai-p6p7-wbs` 브랜치에 직접 추가한 커밋(`d05de26`)의 내용을 적절한 거버넌스 절차(신규 Issue → Task → PR)를 통해 develop에 반영한다.

> **배경**: TASK-159 ✅ 완료 후 동일 브랜치 추가 커밋은 R-17 미정의 케이스 — 거버넌스 갭 (Issue #43, IMP-124 편입)  
> **처리 원칙**: B_Kai 페널티 없음. 내용은 유효하므로 신규 PR로 develop 반영.

## [작업 범위]

### 포함
- `docs/07_Project_Management/P6_P7_WBS.md` — P7-SPR-04~08 Team B(JSJung/Jaison) 트랙 추가 (`d05de26` WBS 변경분)

### 제외
- `d05de26`의 TASK-159 task file 수정 2줄 — 포함 금지 (TASK-159는 ✅ 완료 상태 유지)

### 작업 절차
1. `develop`에서 신규 브랜치 생성: `feature/wbs-bkai-p6p7-wbs-teamb-spr04-08`
2. `d05de26`의 WBS 변경 내용만 적용 (task file 변경 제외)
3. 코드 커밋 (`[B_Kai] docs: TASK-160 P7 WBS Team B SPR-04~08 트랙 추가`)
4. R-17 절차에 따라 완료 보고 후 PR 생성 → `Closes #43`

## [DoD]

- [ ] `P6_P7_WBS.md` P7-SPR-04~08 Team B 트랙 내용 반영 (`d05de26` 내용 기준)
- [ ] TASK-159 task file 미포함 확인 (코드 커밋에 포함 금지)
- [ ] 코드 커밋 해시 기재
- [ ] PR 생성 → `Closes #43`
- [ ] check-R17-DoD 자가 검증 통과 (환경 제약 시 수기 5/5 검증)

## [R-17 완료 보고 절차]

> **문서 전용 Task** — 코드 커밋 = WBS 파일 변경 커밋

| 단계 | 내용 | 포함 파일 |
|:----:|:----|:---------|
| ① **코드 커밋** | WBS 파일 변경 | `docs/07_Project_Management/P6_P7_WBS.md` 만 |
| ② **check-R17-DoD** | 자가 검증 (OpenCode 외부 환경 시 수기 5/5) | — |
| ③ **문서 커밋** | 완료 보고 | task file · ACTIVE_TASK.md 만 |
| ④ **PR 생성** | `feature/wbs-bkai-p6p7-wbs-teamb-spr04-08 → develop` | `Closes #43` |

## [발견 이슈]

_(없음)_

## [작업 결과]

_(착수 후 기재)_

## [Aiden 검토]

_(검토 후 기재)_
