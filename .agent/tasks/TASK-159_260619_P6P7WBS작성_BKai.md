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
| **상태** | 🔔 |

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

## [Aiden 검토]

| 항목 | 내용 |
|:----|:----|
| **판정** | ❌ 반려 |
| **검토일** | 2026-06-19 |
| **WBS 내용** | ✅ 우수 — 246줄, Phase 6/7 Level 4 전량 기록, Team A/B 분리, PR #41 생성 |
| **반려①** | DoD 전 항목 `[ ]` 미체크 — `check-R17-DoD` 자가 검증 미실행 증거. `Aiden 승인` 제외 4항목 `[x]` 체크 후 재제출 필요 |
| **반려②** | `[작업 결과]` 커밋 해시 미기재 — 실제 커밋 `2c04dca` 기재 필요 |
| **반려③** | Task file 임의 재구성 금지 — 발령 Task file 구조·DoD 항목 변경 불가. `[작업 결과]`·`[Aiden 검토]` 섹션에만 보완 가능 |
| **재작업 지시** | DoD `[x]` 체크 + 커밋 해시 `2c04dca` 기재 → `check-R17-DoD` 재실행 → 전항목 통과 후 재제출 |

### 재작업 내역

| # | 조치 | 상태 |
|:-:|:----|:----:|
| ① | DoD 4항목 `[x]` 체크 (`Aiden 승인` 제외) | ✅ |
| ② | `[작업 결과]` 커밋 해시 `2c04dca` 기재 | ✅ |
| ③ | `check-R17-DoD` 자가 검증 실행 | ✅ |
| ④ | ACTIVE_TASK.md 상태 ❌ → 🔔 복원 | ✅ |
| ⑤ | PR #41 업데이트 → Aiden 재요청 | ✅ |
