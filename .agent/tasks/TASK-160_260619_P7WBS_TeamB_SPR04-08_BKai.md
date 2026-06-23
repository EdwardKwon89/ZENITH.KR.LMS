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
| **상태** | ✅ |

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

## [check-R17-DoD 자가 검증]

| DoD | 항목 | 검증 | 결과 |
|:--:|:----|:----|:----:|
| ① | WBS P7-SPR-04~08 Team B 트랙 반영 | `P6_P7_WBS.md`에 SPR-04~08 Team B(JSJung/Jaison) 5개 WP + 12개 Activity 신규 추가 ✅ | ✅ |
| ② | TASK-159 task file 미포함 | 코드 커밋 `1ce7521` — `docs/07_Project_Management/P6_P7_WBS.md` 만 포함, task file 미포함 ✅ | ✅ |
| ③ | 코드 커밋 해시 기재 | `1ce7521` (`feature/wbs-bkai-p6p7-wbs-teamb-spr04-08`) ✅ | ✅ |
| ④ | PR 생성 → Closes #43 | PR #44 생성 완료 · `Closes #43` 기재 ✅ | ✅ |
| ⑤ | check-R17-DoD 자가 검증 통과 | 본 항목. DoD 5/5 전항목 검증 완료 ✅ | ✅ |

**판정**: ✅ **PASS (5/5)**

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `1ce7521` (`feature/wbs-bkai-p6p7-wbs-teamb-spr04-08`) |
| WBS 파일 | `docs/07_Project_Management/P6_P7_WBS.md` |
| 변경 내용 | P7-SPR-04~08 Team B(JSJung/Jaison) 트랙 15행 추가 (+ header 1행) |
| Team B WP | SPR-04: PR 통합+회귀+P8 설계 / SPR-05: Agency 추가기능 / SPR-06: 정산고도화 / SPR-07: UAT참여 / SPR-08: E2E+DEF |
| task file 제외 | ✅ TASK-159 task file 미포함 확인 |
| PR | PR #44 (`feature/wbs-bkai-p6p7-wbs-teamb-spr04-08` → `develop`) · Closes #43 |
| check-R17-DoD | ✅ 5/5 PASS |

## [Aiden 검토]

| 항목 | 내용 |
|:----|:----|
| **판정** | ✅ 승인 |
| **검토일** | 2026-06-19 |
| **코드 커밋** | `1ce7521` — `P6_P7_WBS.md` 단독, TASK-159 task file 미포함 ✅ |
| **DoD** | 5/5 ✅ — 전항목 증거값 기재 확인 |
| **R-17 절차** | ✅ 준수 — 코드(`1ce7521`) → 문서(`00e4e98`+`2b12c3d`) 순서 정상 |
| **Advisory①** | SPR-04 "PR(01~03) 머지 검증" — PR #5·#7·#8 이미 완료 건, ⬜→✅ 수정 필요 (JSJung 확정 시 처리·비차단) |
| **Advisory②** | SPR-04 "Phase 8 선행 설계" — 배치 시점 다소 이른 편. JSJung 계획 확정 시 재배치 권고·비차단 |
| **비고** | WBS 내용은 JSJung/Jaison이 실제 계획 확정 시 갱신 예정. ⬜ Placeholder 수준으로 현재 적절 |

*(승인 2026-06-19)*
