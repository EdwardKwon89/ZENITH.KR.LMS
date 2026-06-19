# TASK-159 — Phase 6 + Phase 7 WBS Level 4 공정관리 문서 작성

| 항목 | 내용 |
|:----|:----|
| **Task-ID** | TASK-159 |
| **생성일** | 2026-06-19 |
| **할당 Agent** | B_Kai |
| **우선순위** | P4 |
| **전제조건** | 없음 |
| **관련 이슈** | Issue #40 (WBS 공정관리 체계) |
| **브랜치** | `feature/ups-spr05-bkai-address-book` |
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
- [ ] Aiden 승인

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
| **반려①** | R-17 커밋 분리 위반 — `2c04dca` 단일 커밋에 WBS파일(코드) + task file + ACTIVE_TASK.md(문서) 혼입. 표준: [코드커밋] WBS → [check-R17-DoD] → [문서커밋] task file+ACTIVE_TASK (각각 별도 커밋) |
| **반려②** | check-R17-DoD 자가 검증 미실행 — task file에 실행 증거 없음. DoD에 `[ ] check-R17-DoD 자가 검증 통과` 항목 추가 후 실행 필수 |
| **재작업 지시** | ① check-R17-DoD 실행 ② DoD에 항목 추가·`[x]` 체크 ③ [문서 커밋] 신규 (task file만 포함) ④ PR #41 업데이트 후 재제출 |
