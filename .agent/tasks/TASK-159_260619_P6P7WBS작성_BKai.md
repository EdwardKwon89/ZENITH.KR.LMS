# TASK-159 — Phase 6 + Phase 7 WBS Level 4 공정관리 문서 작성

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-159 |
| **생성일** | 2026-06-19 |
| **할당 Agent** | B_Kai |
| **우선순위** | P4 |
| **전제조건** | 없음 |
| **관련 이슈** | Issue #40 (WBS 공정관리 체계) |
| **브랜치** | `feature/wbs-bkai-p6p7-wbs` |
| **커밋 태그** | `[B_Kai]` |
| **상태** | ❌ |

## [목표]

`docs/07_Project_Management/P6_P7_WBS.md` WBS Level 4 공정관리 문서 신규 생성.
Phase 6 (SPR-01~08 + 추가 Task) 전량 소급 정리 및 Phase 7 (SPR-01~08) Team A/B 분리 기록.

## [작업 범위]

### WBS 구조 (Level 4)

| Level | 명칭 | 예시 |
|:-----:|:----|:----|
| L1 | Phase | Phase 6: 신규 서비스 역할 모델 |
| L2 | Sprint | P6-SPR-01: DB Schema Foundation |
| L3 | Work Package | IMP-097 DB 스키마 기반 구축 |
| L4 | Activity | org_type 컬럼 추가 / 요율테이블 3종 생성 |

### 포함 대상

- **Phase 6**: SPR-01~08 (TASK-113~120) + 확장 Task (TASK-121~126) + DEF Fix (TASK-127~137)
- **Phase 7**: SPR-01~08 (TASK-138,141,143~158) + Team B (TASK-B-001~007)

### 산출물

- `docs/07_Project_Management/P6_P7_WBS.md` 신규 생성
- PR 생성 → `Closes #40`

## [DoD]

- [x] Phase 6 전 Task WBS Level 4로 정리
- [x] Phase 7 전 Task WBS Level 4로 정리 (Team A/B 분리)
- [x] 진행 상태 컬럼 포함 (✅/🔄/⬜/❌)
- [x] PR 생성 → Closes #40
- [ ] check-R17-DoD 자가 검증 통과 (OpenCode 내 `check-R17-DoD` 실행 → 전항목 PASS)
- [ ] Aiden 승인

---

## [R-17 완료 보고 절차]

> ⚠️ **커밋 분리 규칙** (문서 전용 Task 적용 기준)

| 단계 | 커밋 내용 | 포함 파일 | 금지 파일 |
|:----:|:--------|:---------|:--------|
| ① **코드 커밋** | WBS 파일 생성/수정 | `docs/07_Project_Management/P6_P7_WBS.md` | task file · ACTIVE_TASK.md |
| ② **check-R17-DoD** | OpenCode 내 명령 실행 → PASS 확인 | — | — |
| ③ **문서 커밋** | 완료 보고 | task file · ACTIVE_TASK.md | WBS.md |
| ④ **PR 생성/업데이트** | `feature/wbs-bkai-p6p7-wbs → develop` | PR body에 DoD 체크리스트 포함 | — |

1. **[코드 커밋]** `[B_Kai] feat: TASK-159 Phase 6+7 WBS Level 4 공정관리 문서 작성` ← `docs/07_Project_Management/P6_P7_WBS.md` 만 포함
2. `[작업 결과]` 섹션 작성 (코드 커밋 해시 기재) + task file 상태 🔔 변경
3. ACTIVE_TASK.md 🔄→🔔 반영
4. **`check-R17-DoD` 실행** → PASS 확인 후 DoD `[ ] check-R17-DoD` 항목 `[x]` 체크
5. **[문서 커밋]** `[B_Kai] docs: TASK-159 완료 보고 — WBS Level 4 공정관리 🔔` ← task file · ACTIVE_TASK.md 만 포함
6. **[PR #41 업데이트]** PR body 최신화 후 Aiden 검토 요청

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `2c04dca` (`feature/wbs-bkai-p6p7-wbs`) |
| WBS 파일 | `docs/07_Project_Management/P6_P7_WBS.md` |
| WBS 구조 | Level 4 (Phase → Sprint → Work Package → Activity) |
| Phase 6 | SPR-01~08 + Post-SPR(IMP-105~108) + DEF Fixes(TASK-127~137) — 전량 ✅ |
| Phase 7 | SPR-01~08 Team A/B 분리 기록 — SPR-01~07 ✅, SPR-08 TASK-157 ✅, TASK-158 ❌ |
| 특이사항 | TASK-158(E2E-22) Aiden ❌ 반려 — 재작업 필요 (D_Kai) |

---

## [Aiden 검토]

| 항목 | 내용 |
|:----|:----|
| **판정** | ❌ 반려 (2차) |
| **검토일** | 2026-06-19 |
| **WBS 내용** | ✅ 우수 — 246줄, Phase 6/7 Level 4 전량, Team A/B 분리 기록 |
| **DoD** | ✅ 4/5 체크 완료 (`c954aec` 보완) |
| **커밋 해시** | ✅ `2c04dca` 기재 완료 |
| **Advisory** | `2c04dca` 단일 커밋에 WBS+task file+ACTIVE_TASK 혼입 — 과거 위반, 이력 수정 불필요. 향후 task file 자체 생성 시 [R-17 완료 보고 절차] 섹션 반드시 포함할 것 |
| **남은 요건** | check-R17-DoD 자가 검증 미실행 — `check-R17-DoD` 실행 후 DoD `[x]` 체크 → [문서 커밋] → PR #41 업데이트 |
| **재작업 지시** | ① `check-R17-DoD` 실행 (OpenCode 내장 명령) ② DoD `[ ] check-R17-DoD` 항목 `[x]` 체크 ③ [문서 커밋] 신규: task file·ACTIVE_TASK.md만 포함 ④ PR #41 업데이트 후 재제출 |
