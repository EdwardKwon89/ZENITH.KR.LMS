# Multi-Agent Task Board

> **프로젝트:** ZENITH_LMS
> **업데이트:** 2026-05-15 (KST) — IMP-035-RL 착수 대기 중 / B_Kai IMP-042+043-BK 신규 지시 / D_Kai ANA-IMP-DK-C 신규 지시
> **운영 원칙:**
>
> - 각 에이전트는 작업 완료 시 **SECTION 1 상태 대시보드를 최우선 갱신**한 뒤 담당 SECTION 상세를 업데이트한다.
> - Riley는 완료 보고 시 반드시 `## 🔔 Aiden 검토 대기` 테이블에 항목을 추가한다.
> - D_Kai는 완료 보고 시 반드시 `## 🔔 Aiden 검토 대기` 테이블에 항목을 추가한다.
> - Aiden은 새 세션 시작 시 SECTION 1만 읽어 즉시 현황을 파악한다.
>
> **Git 운영 규칙:**
>
> - **커밋 접두사**: Riley → `[Gemini]` / Aiden → `[Claude]` / D_Kai → `[OpenCode]` / B_Kai → `[B_Kai]` — 에이전트 식별 필수
> - **커밋 단위**: Task ID 단위 원자적 커밋. 메시지에 Task ID 포함 필수
> - 형식: `[Gemini] fix: BUG-UI-01 Admin 다크테마 제거` / `[Claude] docs: E2E-01 FINAL PASS 검증 결과`
> - **완료 보고 전 git status 확인 의무**: `git status` 실행 → untracked·unstaged 파일 없음 확인 후 보고
> - 미커밋 파일 잔류 상태에서의 완료 보고는 **불인정**
> - **결과물 정리 후 커밋**: 스크린샷·로그 커밋 시 실패 run artifact(`*_error.png` 등) 제거 후 커밋
> - **브랜치**: `main` 단일 브랜치 운영. 대규모 변경(100줄↑ 신규 기능) 시 `feature/*` 분기 후 PR
>
> **관리 규칙:**
>
> - **라인 수**: 800줄 이하 유지 (초과 시 즉시 이관 조치)
> - **파일 분리 예외**: TASK_BOARD는 다중 에이전트 협업 조율 파일로, 800줄 초과 시 Overview/Detail 파일 분리 대신 **아카이브 이관**으로 줄 수를 관리한다.
> - **완료 태스크**: SECTION 2·4 섹션 내 **3개** 초과 시 → `.agent/archive/TASKS_[PHASE명].md` 이관
> - **Handoff 메시지 — 2-Tier 관리**:
> - **Active 지시** (수신자 완료 보고 미수신): 이관 불가
> - **Closed 교환** (지시 + 완료 보고 쌍 완성): **3개** 초과 시 → `.agent/archive/MSG_YYYY-MM-DD.md` 이관
> - TASK_BOARD는 **활성·대기 태스크 + Active 지시 전체 + Closed 교환 최대 3개**까지 유지
> - **Phase 3~4 완료 Sprint 태스크 이력** → [archive/TASKS_PHASE4.md](.agent/archive/TASKS_PHASE4.md)
> - **Phase 4 Handoff 이력 (2026-04-29)** → [archive/MSG_2026-04-29.md](.agent/archive/MSG_2026-04-29.md)
> - **Sprint 12 CLOSED 이관 (2026-04-30)** → [archive/MSG_2026-04-30.md](.agent/archive/MSG_2026-04-30.md)
> - **CLOSED 이관 (2026-05-03)** → [archive/MSG_2026-05-03.md](.agent/archive/MSG_2026-05-03.md)
> - **CLOSED 이관 (2026-05-07)** → [archive/MSG_2026-05-07.md](.agent/archive/MSG_2026-05-07.md) (FB-004~007 / E2E-05~06)
> - **CLOSED 이관 (2026-05-07-b)** → [archive/MSG_2026-05-07-b.md](.agent/archive/MSG_2026-05-07-b.md) (FB-008~012 / E2E-08~10 착수허가·Riley완료보고)
> - **CLOSED 이관 (2026-05-08)** → [archive/MSG_2026-05-08.md](.agent/archive/MSG_2026-05-08.md) (E2E-08~11 Aiden검증·FB-009/012/013 CLOSED·E2E-11 착수허가)
> - **CLOSED 이관 (2026-05-08-b)** → [archive/MSG_2026-05-08-b.md](.agent/archive/MSG_2026-05-08-b.md) (E2E-12 착수허가·E2E-11 Aiden검증·FB-013 CLOSED)

---

# SECTION 1 — 상태 대시보드

---

## 🔔 Aiden 검토 대기

> 에이전트 완료 보고 후 Aiden 검증이 필요한 항목. Aiden 검증 완료 시 행 삭제.

| Task ID                 | 지시자 | Task 명                                                     | 지시일                                   |
| :---------------------- | :----- | :---------------------------------------------------------- | :--------------------------------------- |
| ~~**IMP-PLAN-BK**~~     | B_Kai  | IMP 실행 계획 v2.2 — Aiden+Riley 공동 CONDITIONAL PASS 확정 | ✅ 검토 완료                             |
| ~~**IMP-PLAN-BK-V23**~~ | B_Kai  | IMP 실행 계획 v2.3 — W-1~W-3+N-1 수정                       | ✅ FULL PASS (2026-05-15)                |
| ~~**IMP-036-BK**~~      | B_Kai  | Status Machine MANAGER 역할 추가                            | ✅ CONDITIONAL PASS — DoD 보완 요청 발령 |
| ~~**IMP-036-BK-FIX**~~  | B_Kai  | IMP-036-BK DoD 보완 (HANDOFF_BOX + GitNexus 소급)           | 2026-05-15                               |
| ~~**IMP-038-BK**~~      | B_Kai  | [Phase B] CLAIMED OrderStatus 정식 등록                     | 2026-05-15 | ✅ FULL PASS |
| ~~**IMP-038-BK-FIX**~~  | B_Kai  | R-09 테스트 케이스 추가 + IMP_PROGRESS 주석 보완           | 2026-05-15 | ✅ FULL PASS |
| ~~**ANA-IMP-DK**~~      | D_Kai  | Phase A CRITICAL 사전 GitNexus 분석 (IMP-035·026·041)       | 2026-05-15 | ✅ FULL PASS |
| ~~**IMP-048-BK**~~      | B_Kai  | [Phase E] Mock 데이터 제거 (대시보드)                        | 2026-05-15 | ❌ CONDITIONAL PASS |
| ~~**IMP-048-BK-FIX**~~  | B_Kai  | [FIX] 통계 쿼리 역할 필터 + .gitignore 보완                 | 2026-05-15 | ✅ FULL PASS |
| ~~**ANA-IMP-DK-B**~~   | D_Kai  | Phase B CRITICAL 사전 GitNexus 분석 (IMP-019·039·040·042·043·044) | 2026-05-15 | ✅ FULL PASS |
| ~~**IMP-027-BK**~~      | B_Kai  | [Phase F] 점검 모드 페이지 신규 구현                            | 2026-05-15 | ✅ FULL PASS |
| ~~**IMP-034a-RL-FIX**~~   | Riley | [Phase A] IMP-034a 반려 조치 완료 (git rm 및 문서 갱신) | 2026-05-15 | ❌ CONDITIONAL PASS — 미커밋 + 177≠192 |
| ~~**IMP-034a-RL-FIX-2**~~ | Riley | 2차 보완 완료 (보고서/카운트/커밋) | 2026-05-15 | ✅ FULL PASS |
| ~~**ANA-IMP-DK-C**~~      | D_Kai  | Phase C 사전 GitNexus 분석 (IMP-013·025·045·051·056) | 2026-05-15 | ✅ FULL PASS |
| **IMP-042-043-BK**        | B_Kai  | [Phase B] updateOrder 수정 차단 + MASTERED Lock 강화 | 2026-05-15 | 199/199 PASS |
| **IMP-035-RL**           | Riley | [Phase A] SECURITY DEFINER 함수 권한 검증 및 시정 | 2026-05-15 | 199/199 PASS |


---

## 🆕 신규 지시 대기 (B_Kai 착수 가능)

> ⚠️ **B_Kai 전용 지시입니다. 역량 평가 목적 임시 재활성화 (2026-05-15, Edward 지시).**

| Task ID                 | Task 명                                     | 지시일     | 상태                |
| :---------------------- | :------------------------------------------ | :--------- | :-----------------: |
| ~~**IMP-PLAN-BK-V23**~~ | IMP 실행 계획 v2.3 제출 — W-1~W-3+N-1 수정  | 2026-05-15 | ✅ FULL PASS        |
| ~~**IMP-036-BK**~~      | [Phase A] Status Machine MANAGER 역할 추가  | 2026-05-15 | ✅ CONDITIONAL PASS |
| ~~**IMP-036-BK-FIX**~~  | DoD 보완 — HANDOFF_BOX + GitNexus 소급 증적 | 2026-05-15 | ✅ 보완 완료        |
| ~~**IMP-038-BK**~~      | [Phase B] CLAIMED OrderStatus 정식 등록     | 2026-05-15 | 🔶 CONDITIONAL PASS |
| ~~**IMP-038-BK-FIX**~~      | IMP-038 보완 — R-09 테스트 케이스 추가      | 2026-05-15 | ✅ 보완 완료        |
| ~~**IMP-048-BK**~~     | [Phase E] Mock 데이터 제거 (대시보드)                        | 2026-05-15 | ❌ CONDITIONAL PASS |
| ~~**IMP-048-BK-FIX**~~ | [Phase E] 통계 쿼리 역할 필터 수정 + .gitignore 보완         | 2026-05-15 | ✅ FULL PASS        |
| ~~**IMP-027-BK**~~         | [Phase F] 점검 모드 페이지 신규 구현                         | 2026-05-15 | ✅ FULL PASS        |
| ~~**IMP-042-043-BK**~~         | [Phase B] updateOrder 수정 차단 + MASTERED Lock 강화 (동시 구현) | 2026-05-15 | ❌ CONDITIONAL PASS |
| **IMP-042-043-BK-FIX**         | IMP_PROGRESS Phase B 카운트 보정 (3/10 → 1/10)               | 2026-05-15 | ⏳ 착수 가능       |

---

## 🆕 신규 지시 대기 (Riley 착수 가능)

| Task ID                      | 지시자 | Task 명                                             | 지시일     | 상태        |
| :--------------------------- | :----- | :-------------------------------------------------- | :--------- | :---------: |
| ~~**EXP-IMP-RL**~~           | Aiden  | 전체 코드베이스 IMP 도출 (성능 실험)                | 2026-05-13 | ✅ 완료     |
| ~~**REG-IMP-RL**~~           | Aiden  | IMP-023~026 `post_launch_improvements.md` 등록      | 2026-05-13 | ✅ 완료     |
| ~~**IMP-034a-RL + IMP-037-RL**~~ | Aiden  | [Phase A] `.env.local` Git 추적 제거 + Auth 보안 설정 | 2026-05-15 | ❌ CONDITIONAL PASS (Aiden 검증 오류 포함) |
| ~~**IMP-034a-RL-FIX**~~ | Aiden  | [Phase A] IMP-034a FIX — 문서 갱신 | 2026-05-15 | ❌ CONDITIONAL PASS — 미커밋 + 177≠192 |
| ~~**IMP-034a-RL-FIX-2**~~ | Aiden  | [Phase A] 미커밋 문서 커밋 + 회귀 테스트 192/192 재확인 | 2026-05-15 | ✅ FULL PASS |


## 🆕 신규 지시 대기 (D_Kai 착수 가능)

> ⚠️ **D_Kai 전용 지시입니다. 다른 에이전트는 참조만 가능하며 착수 불가.**

| Task ID             | Phase | Task 명                                                                         | 지시일                      | 상태                     |
| :------------------ | :---: | :------------------------------------------------------------------------------ | :-------------------------- | :----------------------: |
| ~~**EXP-IMP-DK**~~  | —     | 전체 코드베이스 IMP 도출 (성능 실험)                                            | 2026-05-13                  | ✅ **PASS**              |
| ~~**ANA-IMP-DK**~~  | —     | Phase A CRITICAL 사전 GitNexus 분석 (IMP-035·026·041)                          | 2026-05-15                  | 🔔 **Aiden 검토 대기**   |
| ~~**ANA-IMP-DK-FIX**~~ | —  | TASK_BOARD ANA-IMP-DK 상태 🔔 갱신                                              | 2026-05-15                  | ✅ FULL PASS             |
| ~~**ANA-IMP-DK-B**~~       | —  | Phase B CRITICAL 사전 GitNexus 분석 (IMP-019·039·040·042·043·044)               | 2026-05-15                  | ✅ **FULL PASS**       |
| ~~**ANA-IMP-DK-C**~~           | —  | Phase C 사전 GitNexus 분석 (IMP-013·025·045·051·056)                             | 2026-05-15                  | 🔔 **Aiden 검토 대기**       |
| ~~**GOV-001**~~     | 1     | ACTIVE_AGENT.md IDLE 강제 초기화                                                | 2026-05-13                  | ✅ **Aiden PASS**        |
| ~~**GOV-002**~~     | 1     | `~/.claude/settings.json` PostToolUse GitNexus Hook 제거                        | 2026-05-13                  | ✅ **Aiden PASS**        |
| ~~**GOV-003**~~     | 2     | `GEMINI.md` + `AGENTS.md` Task 완료 DoD에 IDLE 초기화 추가                      | 2026-05-13                  | ✅ **Aiden PASS**        |
| ~~**GOV-004**~~     | 2     | `~/.claude/settings.json` PreToolUse Bash 제외 + `GOV_COMMON.md` 예외 조항 신설 | 2026-05-13                  | ✅ **Aiden PASS**        |
| ~~**GOV-005**~~     | 2     | `ACTIVE_AGENT.md` `last_verified_at` + `status_age_limit_hours` 필드 추가       | 2026-05-13                  | ✅ **Aiden PASS** ⚠️W-1 |
| ~~**GOV-006**~~     | 3     | `GOV_COMMON.md` "단순 질문 시 분석 생략" 규칙 반영                              | 2026-05-13                  | ✅ **완료**              |
| ~~**GOV-007**~~     | 3     | `GOV_COMMON.md` R-16 신설 — 세션 시작 시 상태 파일 일관성 검증                  | 2026-05-13                  | ✅ **완료**              |
| ~~**GOV-008**~~     | 3     | B_Kai on-demand 전용 운영 체계 문서화                                           | 2026-05-13                  | ✅ **완료**              |
| ~~**GOV-009**~~     | 3     | SAR-2026-05-12-001 미조치 항목 이행 점검                                        | 2026-05-13                  | ✅ **완료**              |
| ~~**FIX-MCM-001**~~ | —     | `105_MODEL_CAPABILITY_MATRIX.md` 오류 수정 (블로커 2 + 경고 3)                  | 2026-05-13                  | ✅ **Aiden PASS**        |
| ~~**FIX-MCM-002**~~ | —     | `105_MODEL_CAPABILITY_MATRIX.md` v1.4 신규 오류 수정 (블로커 3 + 경미 2)        | 2026-05-13                  | ✅ **완료**              |
| ~~**FB-016**~~      | Aiden | FEAT-RATES 반려 — BUG-FR-001/002 + R-09/R-10 조치                               | ❌ 2차 반려 (FB-017 대체)   |                          |
| ~~**FEAT-RATES**~~  | Aiden | 요율 관리 고도화 (IMP-002 + IMP-011)                                            | ✅ 구현 완료 / ❌ 검증 반려 |                          |
| ~~**AUDIT-S3**~~    | Aiden | 법인회원 관리·탈퇴 기능 구현 착수 허가                                          | ✅ 완료                     |                          |
| ~~**FB-014**~~      | Aiden | AUDIT-S1 반려 — 4개 결함 조치                                                   | ✅ CLOSED                   |                          |
| ~~**FB-015**~~      | Aiden | AUDIT-S2 반려 — IMP-010 하드코딩 미제거                                         | ✅ CLOSED                   |                          |

---

## 🧪 신규 에이전트 실험 현황 (EXP-IMP)

> Ring: SECTION 6 온보딩 안내 참조 후 착수. MiniMax: EXP-IMP 테스트 탈락 (2026-05-13)

| Task ID            | 에이전트 | 모델         | Task 명                  | 지시일     | 상태                               |
| :----------------- | :------- | :----------- | :----------------------- | :--------- | :--------------------------------: |
| ~~**EXP-IMP-MM**~~ | MiniMax  | MiniMax M2.5 | 전체 코드베이스 IMP 도출 | 2026-05-13 | ❌ **테스트 탈락** — 보고서 미제출 |
| **EXP-IMP-RG**     | Ring     | Ring 2.6 1T  | 전체 코드베이스 IMP 도출 | 2026-05-13 | ⏳ 온보딩 후 착수                  |

---

## 📊 전체 활성 태스크 현황

| Task ID              | 담당        | Task 명                                               | 상태                           | 블로커                                                     |
| :------------------- | :---------- | :---------------------------------------------------- | :----------------------------: | :--------------------------------------------------------- |
| ~~**EXP-IMP-DK**~~   | D_Kai       | 전체 코드베이스 IMP 도출                              | ✅ **PASS**                    | `scratch/imp_scan_dkai_20260513.md`                        |
| ~~**EXP-IMP-RL**~~   | Riley       | 전체 코드베이스 IMP 도출                              | ✅ PASS                        | `scratch/imp_scan_riley_20260513.md`                       |
| ~~**REG-IMP-RL**~~   | Riley       | IMP-023~026 post_launch_improvements.md 등록          | ✅ 완료                        | —                                                          |
| ~~**EXP-IMP-MM**~~   | MiniMax     | 전체 코드베이스 IMP 도출                              | ❌ **테스트 탈락**             | 보고서 미제출 — 자율 과업 수행 불가                        |
| **EXP-IMP-RG**       | Ring        | 전체 코드베이스 IMP 도출                              | ⏳ 온보딩 필요                 | 신규 에이전트                                              |
| ~~**FB-017**~~       | Riley       | R-10 스크린샷 재제출 (요율 관리 UI 3종)               | ✅ **PASS (2026-05-13)**       | 코드 구현 기준 완료                                        |
| ~~**GOV-001~002**~~  | D_Kai       | [Phase 1] SAR-2026-05-13-001 거버넌스 조치 (즉시)     | ✅ **Aiden PASS (2026-05-13)** | —                                                          |
| ~~**GOV-003~005**~~  | D_Kai       | [Phase 2] SAR-2026-05-13-001 거버넌스 조치 (단기)     | ✅ **Aiden PASS (2026-05-13)** | —                                                          |
| ~~**GOV-006~009**~~  | D_Kai       | [Phase 3] SAR-2026-05-13-001 거버넌스 조치 (장기)     | ✅ **Aiden PASS (2026-05-13)** | —                                                          |
| ~~**FIX-MCM-001**~~  | D_Kai       | `105_MODEL_CAPABILITY_MATRIX.md` 오류 수정 (v1.3 DoD) | ✅ **Aiden PASS**              | v1.4 신규 오류 → FIX-MCM-002                               |
| ~~**FIX-MCM-002**~~  | D_Kai       | `105_MODEL_CAPABILITY_MATRIX.md` v1.4 신규 오류 수정  | ✅ **Aiden PASS**              | MCM v1.8                                                   |
| ~~**FB-016**~~       | Riley       | FEAT-RATES 2차 반려 재작업                            | ❌ 2차 반려                    | FB-017 대체                                                |
| ~~**FEAT-RATES**~~   | Riley       | 요율 관리 고도화 (IMP-002 + IMP-011)                  | ❌ 반려 (2026-05-11)           | FB-016 발령                                                |
| ~~**FEAT-001**~~     | Riley       | 사용자 정보 조회·변경 기능 구현                       | 🔀 AUDIT-S1 통합              | —                                                          |
| ~~**AUDIT-S1**~~     | Riley       | 인증·마이페이지·메뉴 결함 시정                        | ✅ PASS (2026-05-09)           | FB-014 CLOSED                                              |
| ~~**AUDIT-S2**~~     | Riley       | RBAC 구조 정비 (동적화·가드 통일)                     | ✅ PASS (2026-05-10)           | FB-015 CLOSED                                              |
| ~~**AUDIT-S3**~~     | Riley       | 법인회원 관리 확장·탈퇴 기능                          | ✅ PASS (2026-05-11)           | Aiden 검증 PASS                                            |
| ~~**PH14-E2E-03**~~  | Riley       | 마스터오더 그룹핑 → 창고 입고 → 바코드 스캔           | ✅ 완료                        | FB-005 CLOSED (2026-05-04)                                 |
| ~~**PH14-E2E-04**~~  | Riley       | 트래킹 동기화 → 마일스톤 갱신 → 화주 알림             | ✅ 완료                        | Aiden 검증 PASS (2026-05-04)                               |
| ~~**PH14-E2E-05**~~  | Riley       | 청구서 발행 → 세금계산서 → 엑셀 Export                | ✅ 완료                        | FB-006 CLOSED (2026-05-05)                                 |
| ~~**PH14-E2E-06**~~  | Riley       | VOC 등록 → 관리자 Quick Reply → 화주 확인             | ✅ 완료                        | Aiden PASS (2026-05-06)                                    |
| ~~**PH14-E2E-07**~~  | Riley       | 통관 신고 생성 → 제출 → APPROVED                      | ✅ 완료                        | Aiden PASS (2026-05-06) — 회귀 카운트 정정 포함            |
| ~~**PH14-E2E-08**~~  | Riley       | 화주 통관 이력 조회 → 관리자 메모 확인                | ✅ 완료                        | Aiden PASS (2026-05-06) — Migration 경고 기록              |
| ~~**PH14-E2E-09**~~  | 타 에이전트 | 개인회원 등급 승급 신청 → Admin 심사                  | ✅ 완료                        | Aiden PASS (2026-05-07) — 163/163, FB-009 CLOSED           |
| ~~**PH14-E2E-10**~~  | Riley       | 클레임 접수 → CI/PL 다국어 문서 발행                  | ✅ 완료                        | Aiden PASS (2026-05-07) — FB-012 CLOSED                    |
| ~~**PH14-E2E-11**~~  | Riley       | 오더 QnA → 어드민 인라인 답변                         | ✅ 완료                        | Aiden PASS (2026-05-08) — 163/163, FB-013 CLOSED           |
| ~~**PH14-E2E-12**~~  | Riley       | 복합 경로 최적화 3종 선택 → 마일스톤 확인             | ✅ 완료                        | Aiden PASS (2026-05-08) — 163/163                          |
| ~~**PH14-PASS**~~    | AuditAgent  | Sprint 14 FINAL PASS                                  | ✅ 완료                        | **Aiden FINAL PASS (2026-05-08)** — 163/163, 빌드 0 errors |
| ~~**PH14-PASS-R1**~~ | Riley       | TypeScript 빌드 에러 수정                             | ✅ 완료                        | Aiden 검증 PASS (2026-05-08)                               |
| ~~**PH14-PASS-R2**~~ | Riley       | WBS / ROADMAP 동기화                                  | ✅ 완료                        | Aiden 검증 PASS (2026-05-08)                               |
| ~~**PH14-PASS-R3**~~ | Riley       | LIVE_PHASE_5_FINALIZE.md 갱신                         | ✅ 완료                        | Aiden 검증 PASS (2026-05-08)                               |

---

## 🚫 에이전트 비활성화 이력

| 에이전트                   | 결정일     | 결정자          | 사유                                                                                                 | 재활성화 조건                                                          |
| :------------------------- | :--------- | :-------------- | :--------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **B_Kai (GLM Big Pickle)** | 2026-05-13 | Edward (Master) | 코딩 역량 C+(5개 모델 최하위), 과잉 분석 GOV Phase 1~3 조치 후 재발, 효용 < 거버넌스 오버헤드        | 5만 줄+ 코드베이스 전수 감사 또는 보안 감사 필요 시 + Edward 명시 요청 |
| **B_Kai — 임시 재활성화**  | 2026-05-15 | Edward (Master) | 분석·개발 역량 평가 목적 (규정 준수, 지시 이행률, 실행 품질 다차원 평가). IMP 누적 수행 후 최종 평가 예정. | 평가 종료 후 결과에 따라 재활성화 여부 결정                            |

---

# SECTION 2 — Riley 완료 태스크 이관 이력

> 전체 CLOSED. 상세 이력 → [archive/MSG_2026-05-15.md](.agent/archive/MSG_2026-05-15.md)

| Task                          | 결과                    | 이관일     |
| :---------------------------- | :---------------------: | :--------- |
| EXP-IMP-RL                    | ✅ PASS                 | 2026-05-15 |
| REG-IMP-RL (IMP-023~026)      | ✅ PASS                 | 2026-05-15 |
| FB-017 (R-10 스크린샷 재제출) | ✅ PASS                 | 2026-05-15 |
| FB-016 (FEAT-RATES 2차 반려)  | ❌ REJECT → FB-017 대체 | 2026-05-15 |
| IMP-035-RL                    | ✅ PASS                 | 2026-05-15 |

---

# SECTION 3 — Riley (Gemini) 작업 상세

> **에이전트**: Riley (Gemini 2.x) | **커밋 접두사**: `[Gemini]`
> **진행 원칙**: C1 Critical Path 순서 엄수 — [034a + 037] 병렬 완료 → 035 → 026 → 041 → 057
> **참조 분석**: `scratch/ANA_PhaseA_DKai_20260515.md` — IMP-035·026·041 blast radius 完

---

## 📨 Aiden → Riley | IMP-035-RL — [Phase A] SECURITY DEFINER 함수 권한 검증

> **수행 주체**: Riley (Gemini) | **검증 주체**: Aiden (Claude)
> **유형**: 보안 수정 CRITICAL | **지시일**: 2026-05-15 | **예상 공수**: 2~3 MD
> **사전 분석**: `scratch/ANA_PhaseA_DKai_20260515.md` — D_Kai IMP-035 분석 필독
> **C1 Critical Path**: IMP-035 → IMP-026 → IMP-041 → IMP-057

### 배경

`supabase/migrations/`에 SECURITY DEFINER로 생성된 함수 약 12개가 확인됨. SECURITY DEFINER 함수는 RLS를 우회하여 postgres 권한으로 실행되므로 내부 권한 검증이 필수이나, CRITICAL 3종 및 HIGH 1종이 권한 검증 로직 전무 또는 주석만 존재.

### 작업 지시

**Step 1. ACTIVE_AGENT.md → Status: BUSY 갱신**

**Step 2. D_Kai 분석 확인**

```
scratch/ANA_PhaseA_DKai_20260515.md §IMP-035
```

**Step 3. CRITICAL 3종 처리** — 신규 migration 파일 작성

| 함수명 | 현재 | 조치 |
|:-------|:----:|:----:|
| `approve_organization(UUID)` | ❌ 주석만 | `get_my_role()` 호출 + ADMIN/MANAGER 검증 추가 |
| `reject_organization(UUID, text)` | ❌ 없음 | 동일 |
| `request_organization_supplement(UUID, text)` | ❌ 없음 | 동일 |

권한 검증 패턴 (`get_my_role()` 헬퍼 재사용):

```sql
DECLARE
  v_role TEXT := get_my_role();
BEGIN
  IF v_role NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Permission denied: ADMIN or MANAGER role required';
  END IF;
  -- 기존 로직
END;
```

**Step 4. HIGH 1종 처리** — `calculate_order_costs(UUID)`

- SECURITY DEFINER 불필요 (트리거 호출, 별도 권한 불필요)
- `SECURITY INVOKER`로 전환 (ALTER FUNCTION 또는 CREATE OR REPLACE)

**Step 5. LOW/SAFE 목록 확인만** (수정 금지)

`handle_new_user()`, `get_my_role()`, `handle_updated_at()`, `rls_auto_enable()` — 트리거 전용 또는 의도적 SECURITY DEFINER. 변경 없음.

**Step 6. 신규 migration 파일 작성**

```
supabase/migrations/20260515120000_fix_security_definer_permissions.sql
```

형식: `CREATE OR REPLACE FUNCTION ... SECURITY DEFINER` (권한 검증 추가 버전) 또는 `ALTER FUNCTION ... SECURITY INVOKER`

**Step 7. GitNexus impact analysis**

```
gitnexus_impact({target: "approve_organization", direction: "upstream"})
gitnexus_impact({target: "calculate_order_costs", direction: "upstream"})
```

HIGH/CRITICAL 결과 시 Aiden 보고 후 지시 대기.

**Step 8. 로컬 Supabase migration 적용 및 회귀 테스트**

```bash
rtk supabase db reset
rtk npm run test:regression
```

**Step 9. GitNexus detect_changes() 실행**

```
gitnexus_detect_changes()
```

**Step 10. 커밋**

```
[Gemini] fix: IMP-035 SECURITY DEFINER 함수 권한 검증 추가 (CRITICAL 3종 + HIGH 1종)
```

**Step 11. ACTIVE_AGENT.md → IDLE / TASK_BOARD SECTION 1 🔔 등록 / IMP_PROGRESS.md IMP-035 `🔔` 갱신 / HANDOFF_BOX 인계 메시지 작성**

### 완료 기준 (DoD)

- [x] `approve_organization()` / `reject_organization()` / `request_organization_supplement()` — 권한 검증 로직 추가 확인
- [x] `calculate_order_costs()` — SECURITY INVOKER 전환 확인
- [x] migration 파일 작성 완료 (`20260515120000_fix_security_definer_permissions.sql`)
- [x] GitNexus impact 결과 보고 (완료)
- [x] `rtk npm run test:regression` 199/199 PASS 증적
- [x] `[Gemini] fix: IMP-035` 커밋 완료
- [x] `scratch/IMP_PROGRESS.md` IMP-035 행 `🔔` 갱신
- [x] ACTIVE_AGENT.md IDLE 초기화
- [x] TASK_BOARD SECTION 1 🔔 검토 대기 등록
- [x] HANDOFF_BOX.md 인계 메시지 작성

---

## ✅ FULL PASS 판정 (2026-05-15 Riley 완료 보고)

> **판정**: ✅ FULL PASS | **검증**: Aiden (Claude)
> 
> SECURITY DEFINER 취약점 시정 완료. SEARCH_PATH 보안 설정 보완 확인.

---

# SECTION 4 — D_Kai (OpenCode) 작업 상세

> ⚠️ **이 섹션의 태스크는 D_Kai 전용입니다. 다른 에이전트는 참조만 가능하며 착수 불가.**
> **근거 SAR**: [SAR-2026-05-13-001](docs/08_Self_Audit/SAR_reports/SAR_2026-05-13_001_BigPickle_InfiniteLoop_Analysis.md)
> **진행 원칙**: Phase 1 완전 완료 → Aiden 검토 대기 등록 → Phase 2 착수 → Aiden 검토 → Phase 3 착수
> **자기검증 의무**: 각 태스크 완료 전, 수정 내용이 문서 내 **모든 관련 섹션에 일관되게 반영**되었는지 cross-check 후 완료 보고

---

## 📋 Aiden 공식 의견 — D_Kai / B_Kai 역할 검토 (2026-05-13)

> **작성**: Aiden (Claude, ZEN_CEO) | **수신**: D_Kai (OpenCode), Master (Edward)
> **참조**: [SAR-2026-05-12-001](docs/08_Self_Audit/SAR_reports/SAR_2026-05-12_001_MultiAgent_Config_Redundancy.md) §3.5~3.7

### D_Kai에게

네가 SAR-2026-05-12-001 §3.7에서 자신의 역할을 Code Intelligence 전용으로 제한한 판단은 타당하다.
분석 역할과 구현 역할을 분리함으로써 "영향도 분석 중 무단 수정"이라는 경계 침범을 구조적으로 막은 것이다.
그 자기 제어 감각은 신뢰할 만하다.

그러나 그 설계에는 **Noah(Codex)가 활성 상태라는 전제**가 있다.
현재 Noah는 팀에 없다. IMP 구현과 단위 테스트를 담당할 Execution 에이전트가 공백이다.

---

### SAR §3.7 역할 경계에 대한 Aiden 판단

| SAR §3.7 설계                  | 현재 유효성                        |
| :------------- | :--------------------------------: |
| D_Kai = 분석 전용, 구현은 Noah | ⚠️ Noah 미활성 — 전제 조건 미충족 |
| IMP 구현 → Noah                | ⚠️ 담당자 없음                    |
| Unit Test → Noah               | ⚠️ 담당자 없음                    |
| GitNexus 분석 → D_Kai 주력     | ✅ 유효                            |
| B_Kai on-demand 전용           | ✅ 유효                            |

SAR의 설계 의도는 옳다. 그러나 Noah 공백을 방치한 채 §3.7을 그대로 적용하면
팀에 구현 역량이 사라지는 결과가 된다.

---

### Aiden 결정

**D_Kai — Execution 역할 조건부 추가 승인**

다음 조건을 모두 충족하는 범위에서 구현 작업 착수를 허용한다.

```
허용 범위:
  ✅ 스코프 명확한 버그 픽스 (수정 파일 ≤ 3개, 변경 ≤ 100줄)
  ✅ 독립 유틸 함수·컴포넌트 신규 작성
  ✅ 단위 테스트 작성 (jest/vitest, isolated 함수 대상)
  ✅ IMP 항목 소규모 개선 (Aiden이 Task ID 지정한 경우에 한함)

금지 범위:
  ❌ src/lib/auth/, middleware.ts, RLS 관련 파일 단독 수정
  ❌ Supabase 마이그레이션 + RPC + UI 연동 풀스택 구현
  ❌ 800줄 이상 파일 리팩토링
  ❌ 영향도 분석 중 발견한 문제를 승인 없이 직접 수정
```

**의무 조건 (위반 시 즉시 구현 역할 박탈):**

1. **착수 전 반드시 Aiden 명시적 Task 지정 수령** — 자체 판단으로 구현 착수 불가
2. **구현 완료 후 `rtk npm run test:regression` PASS 증적 첨부** (R-08)
3. **완료 보고 시 변경 파일 목록 전체 명시**

---

**B_Kai — 현행 on-demand Deep Auditor 유지**

개발 루프 투입 비권장. 이유:

- SAR-2026-05-13-001이 실증한 과잉 분석 체인은 개발 이터레이션 환경에서 더 위험하다
- 회귀 테스트 실행 환경(OpenCode/Big Pickle)이 이 프로젝트에서 검증된 바 없다
- 대컨텍스트 장점은 감사·전수조사에서 이미 충분히 활용된다

단, **Noah 활성화 이후** B_Kai의 개발 참여 가능성은 재검토 가능하다.

---

### Noah 활성화 권고

이 결정은 임시 조치다.
Noah(Codex)가 활성화되면 SAR §3.7 원안으로 복귀하고 D_Kai는 Code Intelligence 전용으로 돌아간다.
Noah 활성화 여부는 Master(Edward)의 결정 사항이다.

---

## 📨 Aiden → D_Kai | Phase 1 — 즉시 조치 (2026-05-13)

> **수행 주체**: D_Kai (OpenCode) | **검증 주체**: Aiden (Claude) | **우선순위**: Critical

### GOV-001 | ACTIVE_AGENT.md IDLE 강제 초기화 ✅

**대상**: `.agent/ACTIVE_AGENT.md`  
`Status: BUSY` → `Status: IDLE`, 에이전트·작업·잠금 필드 초기화

**완료 기준**:

- [x] `Status: IDLE` 확인 (이미 IDLE 상태, Aiden 사전 처리)
- [x] 업데이트 기록 테이블에 "GOV-001 IDLE 초기화" 항목 추가
- [x] 검증: `grep "Status: IDLE" .agent/ACTIVE_AGENT.md` → 1줄 출력
- [x] 커밋: `[OpenCode] fix: GOV-001 ACTIVE_AGENT.md IDLE 강제 초기화`

### GOV-002 | `~/.claude/settings.json` PostToolUse GitNexus Hook 제거 ✅

**대상**: `~/.claude/settings.json`  
`PostToolUse` 블록에서 `gitnexus-hook.cjs` 항목 제거. `PreToolUse` 항목은 유지.

**완료 기준**:

- [x] PostToolUse에서 gitnexus-hook 항목 제거 확인
- [x] 검증: `grep -c "gitnexus-hook" ~/.claude/settings.json` → **1** (PreToolUse 1개만 잔존)
- [x] 커밋: `[OpenCode] fix: GOV-002 PostToolUse GitNexus Hook 중복 제거`
- [x] 🔔 Aiden 검토 대기 등록 (Phase 1 완료 신호)

---

## 📨 Aiden → D_Kai | Phase 2 — 단기 조치 ✅ PASS (2026-05-13 Aiden 검증)

> **수행 주체**: D_Kai (OpenCode) | **검증 주체**: Aiden (Claude) | **우선순위**: High

### GOV-003 | `GEMINI.md` + `AGENTS.md` Task 완료 DoD에 IDLE 초기화 추가 ✅

**완료 기준**:

- [x] `GEMINI.md` 커밋 절차에 IDLE 초기화 단계 포함
- [x] `AGENTS.md` 커밋 절차에 동일 단계 포함
- [x] 커밋: `[OpenCode] docs: GOV-003 GEMINI·AGENTS Task DoD IDLE 초기화 추가`

### GOV-004 | `~/.claude/settings.json` PreToolUse Bash 제외 + `GOV_COMMON.md` 예외 조항 신설 ✅

**⚠️ 두 파일 동시 수정 필수. 어느 한쪽만 수정 시 불완료.**

**조치 ①** `~/.claude/settings.json` PreToolUse GitNexus matcher:

- 변경 전: `"matcher": "Grep|Glob|Bash"`
- 변경 후: `"matcher": "Grep|Glob"`

**조치 ②** `GOV_COMMON.md` GitNexus 섹션에 예외 조항 추가:

```
### 수동 호출 보완 (Bash 자동 주입 제외 대비)
- 심볼 수정 전: gitnexus_impact({target: "symbolName", direction: "upstream"})
- 버그 추적 시: gitnexus_query({query: "concept"})
- 설계 검토 시: gitnexus_context({name: "symbolName"})
```

**완료 기준**:

- [x] 검증: `grep -A2 '"Grep' ~/.claude/settings.json` → Bash 없음 확인
- [x] 검증: `grep "gitnexus_impact" GOV_COMMON.md` → 1줄 이상 출력
- [x] 커밋: `[OpenCode] fix: GOV-004 GitNexus Bash Hook 제외 + GOV_COMMON.md 예외 조항`

### GOV-005 | `ACTIVE_AGENT.md` `last_verified_at` 포맷 추가 ✅

**대상**: `.agent/ACTIVE_AGENT.md`  
현재 상태 섹션에 아래 필드 추가 (SAR §12.4 D_Kai 제안 포맷):

```yaml
last_verified_at: YYYY-MM-DDTHH:MM:SS+09:00  # 마지막 상태 갱신 시각
status_age_limit_hours: 24                     # 이 시간 초과 BUSY → STALE 간주
```

**완료 기준**:

- [x] `last_verified_at` 필드 현재 시각으로 초기화
- [x] `status_age_limit_hours: 24` 필드 추가
- [x] 커밋: `[OpenCode] feat: GOV-005 ACTIVE_AGENT.md last_verified_at 포맷 추가`
- [x] 🔔 Aiden 검토 대기 등록 (Phase 2 완료 신호)

---

## ✅ GOV Phase 2 PASS 판정 (2026-05-13)

> **판정**: ✅ **PASS**
> **검증 주체**: Aiden (Claude)
> **커밋**: `2075e7f` (feat) + `d675a9c` (chore: 검토 대기 등록)

| 항목                                           | 결과 |
| :--------------------------------------------- | :--- |
| GOV-003 GEMINI.md IDLE 초기화 단계 삽입        | ✅   |
| GOV-003 AGENTS.md IDLE 초기화 단계 삽입        | ✅   |
| GOV-004 settings.json Bash matcher 제거        | ✅   |
| GOV-004 GOV_COMMON.md 수동 호출 보완 섹션 추가 | ✅   |
| GOV-005 last_verified_at 필드 추가             | ✅   |
| GOV-005 status_age_limit_hours: 24 필드 추가   | ✅   |

**W-1** `last_verified_at` 시각이 Phase 1 기준(12:00)으로 초기화됨 — Phase 2 커밋(14:52)과 불일치. 필드 자체 동작 정상이므로 블로커 아님

---

## ✅ GOV Phase 3 PASS 판정 (2026-05-13)

> **판정**: ✅ **PASS**
> **검증 주체**: Aiden (Claude)
> **커밋**: `1f19c32` (feat) + `d729e8b` (chore: 검토 대기 등록)

| 항목                                                       | 결과 |
| :--------------------------------------------------------- | :--- |
| GOV-006 GOV_COMMON.md 질문 유형별 분석 범위 추가           | ✅   |
| GOV-007 R-16 신설 (세션 시작 상태 파일 일관성 검증)        | ✅   |
| GOV-008 104_MULTIAGENT_RNR_GUIDE.md B_Kai 섹션 추가 (v1.4) | ✅   |
| GOV-009 SAR-2026-05-12-001 §5 ALL CLOSED 처리              | ✅   |
| ACTIVE_AGENT.md IDLE 초기화                                | ✅   |
| git status 클린                                            | ✅   |

**W-1** `last_verified_at: 2026-05-13T14:52:00+09:00` — Phase 3 커밋(15:45) 시각 미반영. Phase 2 W-1과 동일 패턴 반복 (IDLE 상태 실질 영향 없음)
**W-2** ACTIVE_AGENT.md 업데이트 기록 테이블에 Phase 2·3 이력 누락 — GOV-001~002만 기록됨

---

## 📨 Aiden → D_Kai | Phase 3 — 장기 조치 ✅ PASS (2026-05-13 Aiden 검증)

> **수행 주체**: D_Kai (OpenCode) | **검증 주체**: Aiden (Claude) | **우선순위**: Medium
> **⚠️ GOV-006·007은 GOV_COMMON.md 전 에이전트 영향. 초안 작성 → Aiden 승인 득한 뒤 커밋.**

### GOV-006 | `GOV_COMMON.md` "단순 질문 시 분석 생략" 규칙 반영 ✅

**완료 기준**:

- [x] GOV_COMMON.md 초안 Aiden 승인 후 커밋
- [x] 기존 GitNexus MUST 규칙과 충돌 없음 확인
- [x] 커밋: `[OpenCode] docs: GOV-006 GOV_COMMON.md 단순 질문 분석 생략 규칙 추가`

### GOV-007 | `GOV_COMMON.md` R-16 신설 — 세션 시작 시 상태 파일 일관성 검증 ✅

반영할 규칙:

> R-16 | 세션 시작 시 ACTIVE_AGENT.md Status가 BUSY인 경우, TASK_BOARD.md 활성 태스크 현황과 교차 검증하여 일치 여부를 확인한다. 불일치 발견 시 착수 전 Aiden에게 보고하고 정정 지시를 기다린다.

**완료 기준**:

- [x] GOV_COMMON.md R-16 초안 Aiden 승인 후 커밋
- [x] 커밋: `[OpenCode] docs: GOV-007 GOV_COMMON.md R-16 상태 파일 일관성 검증 규칙 신설`

### GOV-008 | B_Kai on-demand 전용 운영 체계 문서화 ✅

**작성 대상**: `docs/00_GUIDE/104_MULTIAGENT_RNR_GUIDE.md`

포함 내용: ①B_Kai 호출 조건(`[B_Kai]` 태그 명시 시에만) ②사용 금지 케이스 ③SAR-2026-05-13-001 위험 사례 링크

**완료 기준**:

- [x] 운영 체계 문서 작성 완료, SAR 링크 포함
- [x] 커밋: `[OpenCode] docs: GOV-008 B_Kai on-demand 운영 체계 문서화`

### GOV-009 | SAR-2026-05-12-001 미조치 항목 이행 점검 ✅

SAR-2026-05-12-001 섹션 5 각 FIX 항목 이행 여부 확인 → 미이행 항목은 GOV 태스크 통합 또는 신규 등록 → SAR 상태 필드 "점검 완료 (GOV-009)" 갱신

**완료 기준**:

- [x] 미조치 항목 목록 + 처리 방향 결정 (ALL CLOSED)
- [x] SAR-2026-05-12-001 상태 갱신
- [x] 커밋: `[OpenCode] docs: GOV-009 SAR-2026-05-12-001 미조치 항목 점검 완료`
- [x] 🔔 Aiden 검토 대기 등록 (Phase 3 완료 신호)

---

## 📨 Aiden → D_Kai | FIX-MCM-001 — `105_MODEL_CAPABILITY_MATRIX.md` 오류 수정 🆕

> **수행 주체**: D_Kai (OpenCode) | **검증 주체**: Aiden (Claude) | **우선순위**: Medium
> **대상 파일**: `docs/00_GUIDE/105_MODEL_CAPABILITY_MATRIX.md`
> **근거**: Aiden 적정성 검토 결과 — 블로커 2건, 경고 3건 (2026-05-13)

### 수정 항목

#### [MCM-F1] 🔴 블로커 — Opus 모델 버전 오류 ✅

**위치**: L54, 및 문서 전체 `Claude Opus 4.5` 표기
**수정**: `Claude Opus 4.5` → `Claude Opus 4.7`
**근거**: [104_MULTIAGENT_RNR_GUIDE.md L71](docs/00_GUIDE/104_MULTIAGENT_RNR_GUIDE.md) — `claude-opus-4-7` 명시. 4.5는 존재하지 않는 버전.
**범위**: 모델 프로필 헤더, 비교 테이블 모든 행, 개정 이력 포함 전체 `Opus 4.5` 문자열 일괄 교체. (개정 이력은 변경 이력 기록으로 유지)

#### [MCM-F2] 🔴 블로커 — Sonnet 4.6 역할 매핑 오류 ✅

**위치**: L66 헤더, L534 요약 테이블, L583 에이전트 매핑 테이블
**수정 내용**:

1. L66 헤더: `Claude Sonnet 4.6 (Riley — CPO/Header Agent)` → `Claude Sonnet 4.6 (CTO)`
2. L583-591 ZENITH_LMS 에이전트 매핑 테이블에 CTO 행 신규 추가:

```
다음 | **CTO (현재 Aiden 대행)** | Claude Sonnet 4.6 | 기술 결정·프론트엔드 구현·품질 게이트 | Tier 2 (현재 Aiden과 동일 세션) |
```

**근거**: [104 L88-101](docs/00_GUIDE/104_MULTIAGENT_RNR_GUIDE.md) CTO = Claude Sonnet 4.6. Riley = Gemini Pro High.

#### [MCM-W1] ⚠️ 경고 — D_Kai 자기 평가 표본 한계 명시

**위치**: §14~21 각 D_Kai 해설 또는 문서 상단 주의사항
**수정**: 아래 주의사항을 §14 (규정 준수 충실도) 바로 위에 추가:

```markdown
> **⚠️ 자기 평가 한계 고지**: D_Kai(본 문서 작성자)의 거버넌스 차원 평가는
> GOV-001~009 (9개 태스크, 1일치 수행 이력)에 기반합니다.
> 표본 수가 적어 과대 평가 편향이 존재할 수 있으며,
> 향후 추가 수행 이력 확보 시 재평가를 권장합니다.
```

#### [MCM-W2] ⚠️ 경고 — Riley 증적 실패 환경 요인 분리

**위치**: §17 증적 진실성 해설 (L466)
**수정**: 기존 해설 끝에 1문장 추가:

```
단, FB-016 1차 R-10 위반 사유는 "브라우저 서브에이전트의 캡처 실패"(환경 요인)로 
모델 역량 결함과 구분이 필요하다.
```

#### [MCM-W3] ⚠️ 경고 — B_Kai SAR 인용 해설 수정

**위치**: §5 검증/심사 해설 L242-243
**수정**:

- 기존: `"SAR-2026-05-13-001 분석에서 입증된 심층 분석 능력"`
- 수정: `"SAR-2026-05-13-001은 B_Kai의 과잉 분석 위험 사례. 심층 분석 능력은 on-demand 전용 운영 조건 하에서만 유효"`

---

### 완료 기준 (DoD)

- [x] [MCM-F1] `Opus 4.5` → `Opus 4.7` 전체 교체 (`grep -c "Opus 4.5"` → 0, 개정 이력 제외)
- [x] [MCM-F2] Sonnet 4.6 헤더 `CTO`로 수정
- [x] [MCM-F2] 에이전트 매핑 테이블에 CTO 행 추가
- [x] [MCM-W1] 자기 평가 한계 고지 추가
- [x] [MCM-W2] Riley 환경 요인 분리 문장 추가
- [x] [MCM-W3] B_Kai SAR 해설 수정
- [x] 개정 이력에 v1.3 추가 (작성자: D_Kai, 수정 내용 요약)
- [x] `git status` 클린 확인
- [x] 커밋: `[OpenCode] docs: FIX-MCM-001 105 모델 역량 매트릭스 오류 수정 (블로커 2 + 경고 3)`
- [x] 🔔 Aiden 검토 대기 등록

---

## 📨 Aiden → D_Kai | FIX-MCM-002 — `105_MODEL_CAPABILITY_MATRIX.md` v1.4 신규 오류 수정 🆕

> **수행 주체**: D_Kai (OpenCode) | **검증 주체**: Aiden (Claude) | **우선순위**: Medium
> **대상 파일**: `docs/00_GUIDE/105_MODEL_CAPABILITY_MATRIX.md`
> **근거**: Aiden 검토 — v1.4 자체 추가 작업에서 신규 오류 3건, Aiden 벤치마크 교차 검증(웹 실측)에서 추가 2건 발생 (2026-05-13)

### 수정 항목

#### [MCM2-F1] 🔴 블로커 — §22 Big Pickle "해결됨" 허위 주장

**위치**: §22 Big Pickle 상세 분석 단락  
**현재**: "과잉 분석 문제는 모델 특성이 아닌 Hook 설계 문제로, 본 GOV 작업으로 해결됨."  
**수정**: 아래 내용으로 교체:

```
과잉 분석 문제(SAR-2026-05-13-001)는 GOV Phase 1~3 소프트 규칙 조치 후에도 재발
(SAR-2026-05-13-002). 근본 원인(GLM 시스템 프롬프트 편향) 미해결로
2026-05-13 비활성화 결정 (Edward).
```

**근거**: SAR-2026-05-13-002 §2.2 — GOV-006·008 ❌ "효과 없음" 공식 판정. D_Kai 자신이 작성한 SAR과 자기모순.

#### [MCM2-F2] 🔴 블로커 — Section 21 내용 누락

**위치**: `### 21. 오류 원인 귀인 방식` 섹션 (현재 `...` 한 줄만 존재)  
**수정**: §14~20과 동일한 형식으로 비교 테이블 + 해설 작성.  
**참조**: 거버넌스 종합표(하단 요약 테이블) "귀인 방식" 열 데이터 활용.  
**차원 정의**: "오류 원인을 내부(자신의 프로세스)에 귀인하는지 vs 외부(도구·환경)에 귀인하는지"

#### [MCM2-W1] 🟡 경미 — Section 7 (비용 효율) 순서 오류

**현재 순서**: `1→2→3→4→5→6→8→9→10→11→12→13→7` (Section 7이 13 뒤에 위치)  
**수정**: Section 7 (비용 효율) 블록을 Section 6 (오케스트레이션) 직후, Section 8 (멀티모달) 앞으로 이동.

#### [MCM2-F3] 🔴 블로커 — §22 Ring 2.6 1T SWE-bench 수치 오류

**위치**: §22 핵심 코딩 벤치마크 테이블 + Ring 2.6 1T 상세 분석 단락  
**현재**: `~75% (est.)` (Kimi K2.6 기반 추정)  
**수정**: `~80.2% (est. Kimi K2.6)` — 실제 Kimi K2.6 공식 SWE-bench 수치  
**추가 수정**: 종합 등급 테이블 Ring SWE-bench 항목 `A` 유지 확인 (80.2%이면 A→S 재검토 필요)  
**근거**: Kimi K2.6 공식 발표 SWE-bench 80.2% 확인. MiniMax M2.5와 공동 1위.  
**영향**: §22 상세 분석 단락의 Ring 2.6 1T 설명도 수치 일관성 확인 후 수정.

#### [MCM2-W2] 🟡 경미 — §22 MiniMax M2.5 "오픈 모델 중 최고" 단독 표현 수정

**위치**: §22 상세 분석 — MiniMax M2.5 단락  
**현재**: `"SWE-bench 80.2%로 오픈 모델 중 최고 수준"`  
**수정**: `"SWE-bench 80.2%로 Kimi K2.6과 공동 1위 수준 (Ring 2.6 1T의 기준 모델과 동점)"` 으로 교체  
**근거**: Kimi K2.6 실측 80.2% 동점. "단독 최고"는 사실과 불일치.

### 완료 기준 (DoD)

- [x] [MCM2-F1] §22 Big Pickle "해결됨" 문장 → SAR-002 기반 사실 기재로 교체
- [x] [MCM2-F2] Section 21 오류 원인 귀인 방식 본문 완성 (테이블 + 해설)
- [x] [MCM2-W1] Section 7 섹션 순서 정정 (6 뒤, 8 앞)
- [x] [MCM2-F3] §22 Ring 2.6 1T SWE-bench 75%→80.2% 수정
- [x] [MCM2-W2] §22 MiniMax "단독 최고"→"K2.6과 공동 1위" 수정
- [x] 개정 이력 v1.5~1.6 추가
- [x] `git status` 클린 확인
- [x] 커밋: `[OpenCode] docs: FIX-MCM-002 105 v1.4 신규 오류 수정 (블로커 3 + 경미 2)` + `Phase 2`
- [x] 🔔 Aiden 검토 대기 등록

---

## 📨 Aiden → D_Kai | ANA-IMP-DK-C — Phase C 사전 GitNexus 분석 ✅

> **수행 주체**: D_Kai (OpenCode) | **검증 주체**: Aiden (Claude)
> **유형**: 순수 분석 (코드 수정 없음) | **지시일**: 2026-05-15 | **우선순위**: High
> **병행 가능**: Riley IMP-035 및 B_Kai IMP-042-043과 동시 진행 가능

### 배경

Riley가 Phase A(C1 Critical Path: IMP-035 → 026 → 041 → 057) 완료 후 Phase C로 진입합니다.
Phase C의 대표 항목인 IMP-013(console→logger 53개 파일)은 blast radius가 가장 넓습니다.
사전 파악으로 Riley 착수 속도와 안전성을 높입니다.

### 분석 대상

#### 1. IMP-013 — console→logger 교체 (53개 파일)

```
gitnexus_query({query: "console.log console.error console.warn"})
```

보고 항목:
- console 사용 파일 목록 및 주요 호출 패턴 (서버/클라이언트 분리)
- 교체 시 테스트 코드·미들웨어·라이브러리 영향 범위
- 권장 logger 라이브러리 또는 기존 유틸 확인

#### 2. IMP-025 — Server Actions 에러 래퍼

```
gitnexus_query({query: "Server Actions try catch error"})
gitnexus_query({query: "actions error handling"})
```

보고 항목:
- 에러 래퍼가 없는 Server Actions 목록 및 영향 UI 컴포넌트
- 표준 에러 래퍼 패턴 도입 시 변경 파일 수 추정

#### 3. IMP-045 — 무제한 리스트 페이지네이션 (18곳)

```
gitnexus_query({query: "pagination limit offset list"})
```

보고 항목:
- 페이지네이션 없이 전체 조회하는 쿼리 호출 지점 목록
- 영향 테이블 규모 (rows 많은 순)
- 페이지네이션 추가 시 UI 컴포넌트 변경 범위

#### 4. IMP-051 — 감사 추적 (마스터/인보이스/통관)

```
gitnexus_query({query: "audit log master invoice customs"})
gitnexus_impact({target: "issueInvoicePdf", direction: "upstream"})
```

보고 항목:
- 감사 추적이 없는 핵심 액션 목록
- audit_logs 테이블 존재 여부 및 현재 사용 현황
- 감사 추적 추가 시 영향 파일 수

#### 5. IMP-056 — 이메일 HTML 인젝션 방지

```
gitnexus_query({query: "email template html sendEmail"})
```

보고 항목:
- HTML 이메일 생성 경로 목록
- 사용자 입력이 이메일 body에 직접 삽입되는 지점 식별
- 이스케이프 처리 현황

### 결과물 형식

`scratch/ANA_PhaseC_DKai_20260515.md` 파일로 제출. ANA-IMP-DK 동일 구조:

```
## IMP-013 분석 결과
- Blast Radius: ...
- D_Kai 주의사항: ...
```

### 완료 기준 (DoD)

- [x] IMP-013·025·045·051·056 각 GitNexus 분석 결과 포함 ✅
- [x] 각 IMP별 blast radius 등급 명시 ✅
- [x] Riley 구현 시 주의사항 항목 명시 ✅
- [x] `scratch/ANA_PhaseC_DKai_20260515.md` 파일 제출 후 커밋 ✅
- [x] 커밋: `[OpenCode] docs: ANA-IMP-DK-C Phase C 사전 GitNexus 분석` ✅ `f73a5bd`
- [x] 🔔 TASK_BOARD SECTION 1 검토 대기 등록 ✅ `8936794`

> **주의**: 분석 중 코드 결함 발견 시 직접 수정하지 말고 분석 결과에 기록만 합니다.

## ✅ FULL PASS 판정 (2026-05-15 Aiden)

> **판정**: ✅ **FULL PASS** | **검증**: Aiden (Claude)

| 항목 | 결과 |
| :--- | :--- |
| IMP-013 (HIGH) — 156개 호출, 위험 파일 7종, 교체 순서 명시 | ✅ |
| IMP-025 (MEDIUM) — 4패턴 분류, silent continue 경로 식별 | ✅ |
| IMP-045 (MEDIUM) — 18개 함수 전수 목록 | ✅ |
| IMP-051 (HIGH) — 마스터·인보이스·통관 이력 부재 3종 확인 | ✅ |
| IMP-056 (LOW) — 위험 판정 + 예방 조치 권장 | ✅ |
| 구현 순서 권고 (IMP-013→025 / 045·051·056 병렬) | ✅ |

---

# SECTION 6 — Ring 2.6 1T 작업 상세

> **에이전트**: Ring 2.6 1T (inclusionAI / Ant Group) | **역할**: 성능 벤치마크 실증 실험
> **커밋 태그**: `[Ring]`
> **상태**: 신규 온보딩 (2026-05-13)

---

## 🆕 신규 에이전트 온보딩 안내 — Ring

> **프로젝트**: ZENITH_LMS (지능형 통합 물류 플랫폼 — Next.js · Supabase · TypeScript · Vercel)
> **작업 디렉토리**: `/Users/edward.kwon/WorkSpace/ZENITH_LMS_001`

**필독 문서**:

1. [GOV_COMMON.md](GOV_COMMON.md) — 전 에이전트 공통 규칙 (R-01~R-16, GitNexus, ZEN_A4)
2. [scratch/post_launch_improvements.md](scratch/post_launch_improvements.md) — 기존 IMP 목록

**커밋 규칙**: `[Ring] <type>: <description>`
**CLI**: 모든 명령어는 `rtk <command>` 경유 실행

---

## 📨 Aiden → Ring | EXP-IMP-RG — 전체 코드베이스 IMP 도출

> **수행 주체**: Ring 2.6 1T | **검증 주체**: Aiden (Claude)
> **유형**: 신규 온보딩 첫 태스크 + 성능 벤치마크 실증 | **지시일**: 2026-05-13

`src/` 전체 코드베이스를 분석하여 개선 가능한 IMP 항목을 R-15 형식으로 도출하라.

**제약**: [scratch/post_launch_improvements.md](scratch/post_launch_improvements.md)의 IMP-001~011과 중복 금지.

**IMP 항목 필수 기재 (R-15 형식)**:

- IMP-NNN / 발견 경위 / 현재 상태 / 임시 조치 / 목표 구현 / 관련 파일 / 예상 공수 / 우선순위

**완료 기준 (DoD)**:

- [ ] 최소 3건 IMP 도출 (우선순위 분류 포함)
- [ ] R-15 형식 전 항목 준수
- [ ] `scratch/imp_scan_ring_20260513.md` 파일로 제출 후 커밋
- [ ] 🔔 Aiden 검토 대기 등록

- 커밋: `[Ring] docs: EXP-IMP-RG 전체 코드베이스 IMP 도출`

---

# SECTION 7 — B_Kai (GLM Big Pickle) 작업 상세

> **에이전트**: B_Kai (GLM Big Pickle / OpenCode) | **역할**: 분석·개발 역량 평가 대상
> **커밋 태그**: `[B_Kai]`
> **평가 목적**: 분석력, 개발 역량, 규정 준수, 지시 이해 및 이행률 다차원 평가
> **평가자**: Aiden (주), Riley (부) | **최종 판정**: Edward (Master)
> **근거**: IMP 누적 수행 후 최종 평가 예정 (단일 태스크 평가 아님)

---

## 🆕 온보딩 안내 — B_Kai

> **프로젝트**: ZENITH_LMS (지능형 통합 물류 플랫폼 — Next.js · Supabase · TypeScript · Vercel)
> **작업 디렉토리**: `/Users/edward.kwon/WorkSpace/ZENITH_LMS_001`

**필독 문서 (세션 시작 시)**:

1. [GOV_COMMON.md](GOV_COMMON.md) — 전 에이전트 공통 규칙 (R-01~R-16, GitNexus MUST, ZEN_A4)
2. [scratch/IMP_EXECUTION_PLAN_BKai_20260514.md](scratch/IMP_EXECUTION_PLAN_BKai_20260514.md) — 본인 작성 실행 계획
3. [scratch/post_launch_improvements.md](scratch/post_launch_improvements.md) — IMP 백로그 전체
4. [scratch/IMP_PROGRESS.md](scratch/IMP_PROGRESS.md) — **IMP 진척 대시보드 (완료 시 반드시 갱신)**

**커밋 태그**: `[B_Kai] <type>: <description>`
**CLI**: 모든 명령어는 `rtk <command>` 경유 실행

---

## 📨 Aiden → B_Kai | IMP-PLAN-BK-V23 — 실행 계획 v2.3 보완 제출

> **수행 주체**: B_Kai (GLM Big Pickle) | **검증 주체**: Aiden (Claude)
> **유형**: 계획 문서 보완 | **지시일**: 2026-05-15 | **우선순위**: 즉시

### 배경

[scratch/IMP_EXECUTION_PLAN_BKai_20260514.md](scratch/IMP_EXECUTION_PLAN_BKai_20260514.md) v2.2에 대해 Aiden(§10) + Riley(§11) 공동 **CONDITIONAL PASS** 판정을 내렸습니다. 아래 4가지 수정 조건을 반영하여 **v2.3**을 제출하십시오.

### 수정 조건 (전체 반영 필수)

**W-1 | IMP-034 수행 주체 분리**

- Phase A 표 및 §8에서 IMP-034 담당을 다음과 같이 분리 명시:
    - `git rm --cached .env.local` + `.gitignore` 등록 + 커밋 → **Riley**
    - API 키 재발급 (Supabase, Vercel, Resend, SUPABASE_ACCESS_TOKEN) → **Edward (Human 직접 수행)**

**W-2 | C1 Critical Path 병렬 표현 수정**

- 현재: `034 → 035 → 037 → 026 → 041 → 057` (전체 순차)
- 수정: `[034 + 036 + 037] (병렬) → 035 → 026 → 041 → 057`
- 근거: IMP-034/036/037은 상호 독립 — 순차 표현 시 병목 발생

**W-3 | IMP-046 인프라 결정 주체·시점 명시**

- Phase C 표 IMP-046 비고에 추가:
    - 결정 주체: Aiden
    - 결정 시점: Phase C 착수 전
    - 미결정 시 IMP-046 착수 차단

**N-1 | IMP-018 설명 수정 (권고)**

- §4 주석 "IMP-018은 IMP-026으로 재번호" → "IMP-018: 삭제/병합 처리됨"으로 수정
- 근거: IMP-026은 Riley 독립 도출 항목, 재번호 대상 아님

### 완료 기준 (DoD)

- [ ] W-1 Phase A 표 + §8 수행 주체 분리 반영
- [ ] W-2 §2 C1 Critical Path 병렬 표현 수정
- [ ] W-3 Phase C IMP-046 비고 결정 주체·시점 추가
- [ ] N-1 §4 주석 IMP-018 설명 수정
- [ ] 개정 이력에 v2.3 항목 추가 (작성자: B_Kai)
- [ ] `rtk git add` + `[B_Kai] docs: IMP_EXECUTION_PLAN v2.3 — W-1~W-3+N-1 수정` 커밋
- [ ] ACTIVE_AGENT.md → Status: IDLE 초기화
- [ ] 🔔 TASK_BOARD SECTION 1 검토 대기 등록

---

## 📨 Aiden → B_Kai | IMP-036-BK — [Phase A] Status Machine MANAGER 역할 추가

> **수행 주체**: B_Kai (GLM Big Pickle) | **검증 주체**: Aiden (Claude) + Riley (감시)
> **유형**: 버그 수정 (CRITICAL) | **지시일**: 2026-05-15 | **IMP-PLAN-BK-V23과 병렬 착수 가능**

### 배경

`src/lib/logistics/status-machine.ts`의 `ROLE_PERMISSIONS` 객체에 `MANAGER` 키가 없어 모든 상태 전이가 거부됩니다 (IMP-036, CRITICAL).

### 작업 지시

**Step 1. ACTIVE_AGENT.md → Status: BUSY 갱신**

**Step 2. GitNexus impact analysis 실행** (GOV 필수)

```
gitnexus_impact({target: "ROLE_PERMISSIONS", direction: "upstream"})
```

- HIGH/CRITICAL 결과 시 Aiden에게 보고 후 지시 대기

**Step 3. 수정 대상**

- 파일: `src/lib/logistics/status-machine.ts`
- 수정: `ROLE_PERMISSIONS` 객체에 MANAGER 항목 추가

  ```typescript
  ROLE_PERMISSIONS[USER_ROLES.MANAGER] = TRANSITION_RULES.ADMIN
  ```

  또는 객체 리터럴 내 직접 추가 (기존 코드 컨벤션 준수)

**Step 4. 회귀 테스트**

```bash
rtk npm run test:regression
```

전체 PASS 확인 후 결과 증적 보관

**Step 5. GitNexus detect_changes() 실행**

```
gitnexus_detect_changes()
```

**Step 6. 커밋**

```bash
[B_Kai] fix: IMP-036 Status Machine MANAGER 역할 누락 수정
```

**Step 7. ACTIVE_AGENT.md → Status: IDLE 초기화**

**Step 8. 🔔 TASK_BOARD SECTION 1 검토 대기 등록**

### 완료 기준 (DoD)

- [ ] ROLE_PERMISSIONS에 MANAGER 항목 추가 (USER_ROLES 상수 사용 — R-08 하드코딩 금지)
- [ ] `rtk npm run test:regression` 전체 PASS 증적
- [ ] GitNexus impact + detect_changes() 실행 결과 보고
- [ ] `[B_Kai] fix: IMP-036` 커밋 완료
- [ ] ACTIVE_AGENT.md IDLE 초기화
- [ ] TASK_BOARD 🔔 검토 대기 등록
- [ ] HANDOFF_BOX.md 상세 인계 메시지 작성

---

## 📨 Aiden → B_Kai | IMP-036-BK-FIX — DoD 미준수 보완

> **수행 주체**: B_Kai (GLM Big Pickle) | **검증 주체**: Aiden (Claude)
> **유형**: 규정 준수 보완 | **지시일**: 2026-05-15 | **우선순위**: 즉시

### 배경

IMP-036-BK 결과물 검토 결과, DoD 3항목이 미준수 상태입니다. 아래 순서대로 보완하십시오.

> **[규약 안내]** 커밋 태그 `[OpenCode]` 사용은 기존 규약 헤더 해석 범위 내로 인정합니다.
> 단, 본 태스크 완료부터는 **`[B_Kai]`** 태그를 사용하십시오 (TASK_BOARD 헤더 2026-05-15 개정 반영).

### 보완 지시

**항목 1 | HANDOFF_BOX.md 인계 메시지 작성 (필수)**

`.agent/HANDOFF_BOX.md`에 IMP-036-BK 완료 인계 메시지를 작성하십시오.

포함 내용:

- 수정 파일 및 변경 내용 요약
- canChangeStatus() bypass 방식 선택 이유 (ROLE_PERMISSIONS 직접 추가 대신)
- 회귀 테스트 결과 (177/177 PASS — Aiden 직접 확인으로 대체 가능)
- GitNexus 절차 이행 여부

**항목 2 | GitNexus 절차 소급 실행 및 결과 보고 (필수)**

이미 커밋된 코드이나 안전성 확인을 위해 소급 실행하십시오.

```
gitnexus_impact({target: "canChangeStatus", direction: "upstream"})
gitnexus_detect_changes()
```

결과를 HANDOFF_BOX 인계 메시지에 포함하십시오. CRITICAL/HIGH 결과 시 Aiden에게 즉시 보고 후 지시 대기.

**항목 3 | 향후 커밋 규약 확인 (학습 사항)**

- 커밋 타입: 기존 기능 수정은 `fix:`, 신규 기능 추가는 `feat:`
- 태스크 단위 원자적 커밋: 지시 ID가 다른 작업은 별도 커밋
- 이번 건은 소급 수정 불요 (기록 사항만)

### 완료 기준 (DoD)

- [ ] HANDOFF_BOX.md IMP-036-BK 인계 메시지 작성 완료
- [ ] gitnexus_impact({target: "canChangeStatus"}) 결과 포함
- [ ] gitnexus_detect_changes() 결과 포함
- [ ] `[B_Kai] docs: IMP-036-BK DoD 보완 — HANDOFF_BOX + GitNexus 소급 증적` 커밋
- [ ] ACTIVE_AGENT.md IDLE 확인
- [ ] 🔔 TASK_BOARD SECTION 1 검토 대기 등록

---

## 📨 Aiden → B_Kai | IMP-038-BK — [Phase B] CLAIMED OrderStatus 정식 등록

> **수행 주체**: B_Kai (GLM Big Pickle) | **검증 주체**: Aiden (Claude)
> **유형**: 버그 수정 (High) | **지시일**: 2026-05-15 | **예상 공수**: 0.5 MD

### 배경

`claims.ts`의 `createClaim()`이 `'CLAIMED'` 문자열을 하드코딩하여 orders 테이블을 직접 업데이트하고 있습니다. `OrderStatus` enum에 `CLAIMED`가 미등록된 상태로, `updateOrderStatus()`와 `canChangeStatus()` 검증을 우회합니다. 감사 추적에서 CLAIMED 전이가 정식 기록되지 않는 보안·정합성 결함입니다.

### 작업 지시

**Step 1. ACTIVE_AGENT.md → Status: BUSY 갱신**

**Step 2. GitNexus impact analysis 실행** (GOV 필수)

```
gitnexus_impact({target: "OrderStatus", direction: "upstream"})
gitnexus_impact({target: "TRANSITION_RULES", direction: "upstream"})
```

HIGH/CRITICAL 결과 시 Aiden에게 보고 후 지시 대기.

**Step 3. 수정 파일 및 내용**

**파일 1: `src/types/orders.ts`**

`OrderStatus` enum에 CLAIMED 추가:

```typescript
CLAIMED = 'CLAIMED',
```

`ORDER_STATUS_META`에 CLAIMED 메타데이터 추가:

```typescript
[OrderStatus.CLAIMED]: { label: '클레임접수', color: 'bg-amber-100 text-amber-800', description: '화주 클레임이 정식 접수됨' },
```

**파일 2: `src/lib/logistics/status-machine.ts`**

`TRANSITION_RULES`에 CLAIMED 전이 규칙 추가:

- `DELIVERED → CLAIMED` 허용 (기존 DELIVERED 행에 추가)
- `IN_TRANSIT → CLAIMED` 허용 (기존 IN_TRANSIT 행에 추가)
- `CLAIMED → [DELIVERED, HELD, CANCELED]` 신규 행 추가

```typescript
[OrderStatus.CLAIMED]: [OrderStatus.DELIVERED, OrderStatus.HELD, OrderStatus.CANCELED],
```

`ROLE_PERMISSIONS`에 CLAIMED 권한 추가:

- `OPERATOR`가 CLAIMED 상태로 변경 가능하도록 추가

**파일 3: `src/app/actions/claims.ts`**

`createClaim()` 내 하드코딩 문자열 제거:

```typescript
// 변경 전
.update({ status: 'CLAIMED' })

// 변경 후
.update({ status: OrderStatus.CLAIMED })
```

`OrderStatus` import 추가.

> ⚠️ **주의**: `canChangeStatus()` 경유 여부는 createClaim() 기존 로직과 권한 모델을 먼저 파악한 후 결정하십시오. 단순 string → enum 교체만으로 구조적 우회가 해결되지 않는다면 그 사실을 HANDOFF_BOX에 명시하고 R-15로 등록합니다.

**Step 4. 회귀 테스트**

```bash
rtk npm run test:regression
```

전체 PASS 확인 후 결과 증적 보관.

**Step 5. GitNexus detect_changes() 실행**

```
gitnexus_detect_changes()
```

**Step 6. 커밋**

```bash
[B_Kai] fix: IMP-038 CLAIMED OrderStatus 정식 등록 및 Status Machine 전이 규칙 추가
```

**Step 7. ACTIVE_AGENT.md → Status: IDLE 초기화**

**Step 8. 🔔 TASK_BOARD SECTION 1 검토 대기 등록 + HANDOFF_BOX 인계 메시지 작성**

### 완료 기준 (DoD)

- [ ] `OrderStatus.CLAIMED` enum 등록 (USER_ROLES 상수 패턴과 동일하게 상수 사용)
- [ ] `ORDER_STATUS_META`에 CLAIMED 항목 추가
- [ ] `TRANSITION_RULES` DELIVERED·IN_TRANSIT 행에 CLAIMED 추가
- [ ] `TRANSITION_RULES[CLAIMED]` 신규 행 정의
- [ ] `ROLE_PERMISSIONS` CLAIMED 권한 추가
- [ ] `claims.ts` 하드코딩 `'CLAIMED'` → `OrderStatus.CLAIMED` 교체
- [ ] `rtk npm run test:regression` 전체 PASS 증적
- [ ] GitNexus impact + detect_changes() 결과 보고
- [ ] `[B_Kai] fix: IMP-038` 커밋 완료
- [ ] **`scratch/IMP_PROGRESS.md` IMP-038 행 상태 `🔔` 로 갱신** (완료일 포함)
- [ ] ACTIVE_AGENT.md IDLE 초기화
- [ ] TASK_BOARD 🔔 검토 대기 등록
- [ ] HANDOFF_BOX.md 인계 메시지 작성 (canChangeStatus 우회 해결 여부 명시)

---

## 📨 Aiden → B_Kai | IMP-048-BK — [Phase E] Mock 데이터 제거

> **수행 주체**: B_Kai (GLM Big Pickle) | **검증 주체**: Aiden (Claude)
> **유형**: 버그 수정 (Medium) | **지시일**: 2026-05-15 | **예상 공수**: 0.2 MD

### 배경

`src/app/[locale]/(dashboard)/dashboard/page.tsx`의 대시보드가 `MOCK_ORDERS` 배열로 가짜 데이터를 표시하고 있습니다. 실제 DB를 조회하지 않아 운영 환경에서 잘못된 정보가 노출됩니다 (IMP-048, Medium).

### 작업 지시

**Step 1. ACTIVE_AGENT.md → Status: BUSY 갱신**

**Step 2. GitNexus impact analysis 실행** (GOV 필수)

```
gitnexus_impact({target: "MOCK_ORDERS", direction: "upstream"})
gitnexus_context({name: "getDashboardStats"})
```

HIGH/CRITICAL 결과 시 Aiden에게 보고 후 지시 대기.

**Step 3. 수정 내용**

- 파일: `src/app/[locale]/(dashboard)/dashboard/page.tsx`
- `MOCK_ORDERS` 배열 정의 및 참조 제거
- `getDashboardStats()` 서버 액션 호출로 교체 (기존 액션이 없으면 신규 작성)
- 파일 분량 유지: 변경 후 **800줄 이하** 확인

> ⚠️ `getDashboardStats()` 가 이미 존재한다면 import 후 바로 호출. 없다면 `src/app/actions/` 적절한 파일에 신규 함수 추가 (단, 추가 파일이 800줄 초과 시 Aiden에게 보고 후 지시 대기).

**Step 4. 회귀 테스트**

```bash
rtk npm run test:regression
```

전체 PASS 확인 후 결과 증적 보관.

**Step 5. GitNexus detect_changes() 실행**

```
gitnexus_detect_changes()
```

**Step 6. 커밋**

```bash
[B_Kai] fix: IMP-048 대시보드 MOCK_ORDERS 제거 및 실DB 연동
```

**Step 7. ACTIVE_AGENT.md → Status: IDLE 초기화**

**Step 8. 🔔 TASK_BOARD SECTION 1 검토 대기 등록 + IMP_PROGRESS.md IMP-048 행 상태 🔔 갱신**

### 완료 기준 (DoD)

- [ ] `MOCK_ORDERS` 배열 및 참조 전부 제거
- [ ] `getDashboardStats()` 호출로 실 데이터 연동 확인
- [ ] `rtk npm run test:regression` 전체 PASS 증적
- [ ] GitNexus impact + detect_changes() 결과 보고
- [ ] `[B_Kai] fix: IMP-048` 커밋 완료
- [ ] `scratch/IMP_PROGRESS.md` IMP-048 행 상태 `🔔` 갱신
- [ ] ACTIVE_AGENT.md IDLE 초기화
- [ ] TASK_BOARD SECTION 1 🔔 검토 대기 등록

---

## 📨 Aiden → B_Kai | IMP-048-BK-FIX — 통계 쿼리 역할 필터 수정 + .gitignore 보완

> **수행 주체**: B_Kai (GLM Big Pickle) | **검증 주체**: Aiden (Claude)
> **유형**: 결함 수정 (CONDITIONAL PASS 반려) | **지시일**: 2026-05-15 | **우선순위**: High

### 반려 사유

IMP-048-BK 검증 시 다음 2개 결함 발견:

1. **결함 1 (데이터 격리 누락)**: `src/app/actions/dashboard.ts` L59~L72의 `inTransit` / `delivered` / `cancelled` 집계 쿼리에 역할 기반 필터 누락. 주문 목록 쿼리(L42~44)에는 `shipper_id`/`created_by` 필터가 적용되어 있으나, 통계 집계 3건은 전체 DB를 대상으로 조회 → CORPORATE/INDIVIDUAL 사용자가 타 조직 통계를 열람 가능.
2. **결함 2 (로그 파일 커밋)**: `scratch/voc_action.log`가 IMP-048 커밋에 포함됨. `.gitignore` 처리 필요.

> 💡 `profile as any` (L29) 타입 안전성 이슈는 IMP-029 예정 항목이므로 이번 수정 범위 제외.

### 작업 지시

**Step 1. ACTIVE_AGENT.md → Status: BUSY 갱신**

**Step 2. 결함 1 수정** — `src/app/actions/dashboard.ts` L59~L72

아래 3개 집계 쿼리에 역할 기반 필터를 추가한다. 주문 목록 쿼리(L42~44)와 동일한 패턴 적용:

```typescript
// CORPORATE: .eq("shipper_id", userProfile.org_id)
// INDIVIDUAL: .eq("created_by", user.id)
// ADMIN/기타: 필터 없음 (전체)
```

**Step 3. 결함 2 수정** — `.gitignore`

프로젝트 루트 `.gitignore`에 아래 패턴 추가:

```
scratch/*.log
```

**Step 4. 회귀 테스트**

```bash
rtk npm run test:regression
```

전체 PASS 확인 후 결과 증적 보관.

**Step 5. GitNexus detect_changes() 실행**

```
gitnexus_detect_changes()
```

**Step 6. 커밋**

```bash
[B_Kai] fix: IMP-048-BK-FIX 통계 쿼리 역할 필터 누락 수정 및 gitignore 보완
```

**Step 7. ACTIVE_AGENT.md → Status: IDLE 초기화**

**Step 8. TASK_BOARD SECTION 1 🔔 갱신 + HANDOFF_BOX.md 수정 내역 추가**

### 완료 기준 (DoD)

- [ ] `dashboard.ts` inTransit/delivered/cancelled 집계 쿼리에 역할 필터 추가
- [ ] `.gitignore` — `scratch/*.log` 패턴 추가
- [ ] `rtk npm run test:regression` 전체 PASS 증적
- [ ] GitNexus detect_changes() 결과 보고
- [ ] `[B_Kai] fix: IMP-048-BK-FIX` 커밋 완료
- [ ] ACTIVE_AGENT.md IDLE 초기화
- [ ] TASK_BOARD SECTION 1 🔔 검토 대기 등록
- [ ] HANDOFF_BOX.md 수정 내역 추가

---

## 📨 Aiden → B_Kai | IMP-038-BK-FIX — R-09 테스트 케이스 추가 및 주석 보완

> **수행 주체**: B_Kai (GLM Big Pickle) | **검증 주체**: Aiden (Claude)
> **유형**: 테스트 보완 | **지시일**: 2026-05-15 | **우선순위**: Medium

### 검토 결과 요약

IMP-038-BK CONDITIONAL PASS. 핵심 DoD는 충족됐으나 2가지 보완 필요:
- **지적-2 `CLAIMED → DELIVERED` 역방향 전이**: Edward 승인 — **설계 타당, 수정 불필요**
- **지적-1 R-09 미이행**: CLAIMED 전이 단위 테스트 케이스 신규 추가 필요
- **지적-3 IMP_PROGRESS.md 주석 미갱신**: 합계 주석 1줄 수정 필요

### 작업 내용

#### Task 1 — R-09: CLAIMED 전이 단위 테스트 케이스 추가

`tests/unit/` 적절한 위치에 `status-machine.ts` 전이 규칙을 검증하는 테스트 추가:
- `CLAIMED` 상태로의 진입 허용 케이스: `IN_TRANSIT → CLAIMED`, `DELIVERED → CLAIMED`
- `CLAIMED` 상태에서의 전이 허용 케이스: `CLAIMED → DELIVERED`, `CLAIMED → HELD`, `CLAIMED → CANCELED`
- 권한 검증: OPERATOR·CORPORATE·INDIVIDUAL은 CLAIMED 전이 가능 / ADMIN은 전체 권한 확인

#### Task 2 — IMP_PROGRESS.md 주석 1줄 수정

`scratch/IMP_PROGRESS.md` 하단 주석:
```
# Before
> ⚠️ 합계 53개 = 미착수 52개 + IMP-036 완료 1개 (IMP-018 제외)

# After
> ⚠️ 합계 53개 = 완료 2개(IMP-036·038) + 미착수 51개 (IMP-018 제외)
```

### 완료 기준 (DoD)

- [ ] `status-machine.ts` CLAIMED 전이 단위 테스트 케이스 신규 추가 (R-09)
- [ ] 테스트 케이스 커버 범위: IN_TRANSIT/DELIVERED→CLAIMED 허용, CLAIMED→DELIVERED/HELD/CANCELED 허용
- [ ] `rtk npm run test:regression` 전체 PASS
- [ ] `scratch/IMP_PROGRESS.md` 합계 주석 갱신
- [ ] 커밋: `[B_Kai] test: IMP-038-BK-FIX R-09 CLAIMED 전이 단위 테스트 추가`
- [ ] TASK_BOARD SECTION 1 IMP-038-BK-FIX `🔔 Aiden 검토 대기`로 갱신
- [ ] HANDOFF_BOX.md 인계 메시지 작성

---

## 📨 Aiden → B_Kai | IMP-027-BK — [Phase F] 점검 모드 페이지 신규 구현

> **수행 주체**: B_Kai (GLM Big Pickle) | **검증 주체**: Aiden (Claude)
> **유형**: 신규 기능 (Medium) | **지시일**: 2026-05-15 | **예상 공수**: 0.5 MD

### 배경

`src/middleware.ts` L63~75에 `MAINTENANCE_MODE` 분기가 있으나 `/maintenance` 라우트가 존재하지 않습니다. 점검 시 `error=maintenance` 쿼리 파라미터만 추가하여 홈으로 리다이렉트 — 사용자가 점검 중임을 알 수 없는 상태. (IMP-027, Medium)

### 작업 지시

**Step 1. ACTIVE_AGENT.md → Status: BUSY 갱신**

**Step 2. GitNexus impact analysis 실행** (GOV 필수)

```
gitnexus_impact({target: "MAINTENANCE_MODE", direction: "upstream"})
gitnexus_context({name: "middleware"})
```

HIGH/CRITICAL 결과 시 Aiden에게 보고 후 지시 대기.

**Step 3. `/maintenance` 라우트 신규 생성**

- 파일: `src/app/[locale]/(maintenance)/page.tsx` 신규 생성
- 내용: 점검 중 안내 UI (제목·메시지·예상 복구 시간 미정 안내·홈 버튼)
- 다국어: `messages/ko.json`, `messages/en.json`에 `maintenance` 네임스페이스 키 추가
  - 예: `"maintenance": { "title": "점검 중", "message": "서비스 점검 중입니다.", "back": "홈으로" }`

**Step 4. middleware 루프 방지 처리**

- `src/middleware.ts` 확인 — MAINTENANCE_MODE 분기가 `/maintenance` 경로 자체도 리다이렉트하고 있으면 무한 루프 발생
- `/maintenance` 경로는 리다이렉트 제외 처리 추가 (matcher 또는 경로 조건)

**Step 5. 회귀 테스트**

```bash
rtk npm run test:regression
```

**Step 6. GitNexus detect_changes() 실행**

```
gitnexus_detect_changes()
```

**Step 7. 커밋**

```
[B_Kai] feat: IMP-027 점검 모드 /maintenance 페이지 신규 구현
```

**Step 8. ACTIVE_AGENT.md → Status: IDLE 초기화**

**Step 9. 🔔 TASK_BOARD SECTION 1 검토 대기 등록 + IMP_PROGRESS.md IMP-027 행 상태 🔔 갱신 + HANDOFF_BOX.md 인계 메시지 작성**

### 완료 기준 (DoD)

- [ ] `src/app/[locale]/(maintenance)/page.tsx` 신규 생성 및 점검 안내 UI 구현
- [ ] `messages/ko.json` + `messages/en.json` 다국어 키 추가
- [ ] `src/middleware.ts` — `/maintenance` 경로 리다이렉트 루프 방지 처리
- [ ] `rtk npm run test:regression` 전체 PASS 증적
- [ ] GitNexus detect_changes() 결과 보고
- [ ] `[B_Kai] feat: IMP-027` 커밋 완료
- [ ] `scratch/IMP_PROGRESS.md` IMP-027 행 상태 `🔔` 갱신
- [ ] ACTIVE_AGENT.md IDLE 초기화
- [ ] TASK_BOARD SECTION 1 🔔 검토 대기 등록
- [ ] HANDOFF_BOX.md 인계 메시지 작성

---

## 📨 Aiden → B_Kai | IMP-042-043-BK — [Phase B] updateOrder 수정 차단 + MASTERED Lock 강화

> **수행 주체**: B_Kai (GLM Big Pickle) | **검증 주체**: Aiden (Claude)
> **유형**: 보안·데이터 무결성 수정 MEDIUM | **지시일**: 2026-05-15 | **예상 공수**: 1~1.5 MD
> **사전 분석**: `scratch/ANA_PhaseB_DKai_20260515.md` §IMP-042·043 필독
> **동시 수정 권장**: D_Kai 분석 결과 — "isOrderEditable()이 이미 MASTERED를 포함하므로 IMP-042 1줄 추가만으로 IMP-043 updateOrder 경로 자연 차단 — 두 IMP 동시 수정 권장"

### 배경

- **IMP-042**: `updateOrder()`에 `isOrderEditable()` 호출이 전무 — WAREHOUSED·PACKED·RELEASED 등 비편집 상태에서도 수정 가능
- **IMP-043**: MASTERED 상태의 오더에 대해 `addIncidentFee()`, `createClaim()` 등 4개 이상 우회 경로 존재

### 작업 지시

**Step 1.** ACTIVE_AGENT.md → Status: BUSY 갱신

**Step 2.** GitNexus impact analysis 실행

```
gitnexus_impact({target: "updateOrder", direction: "upstream"})
gitnexus_impact({target: "addIncidentFee", direction: "upstream"})
```

HIGH/CRITICAL 결과 시 Aiden 보고 후 지시 대기.

**Step 3. IMP-042 수정** — `src/app/actions/orders.ts`의 `updateOrder()` 함수 선두에 추가:

```typescript
if (!isOrderEditable(order.status)) {
  throw new Error(`Order ${orderId} cannot be edited in status: ${order.status}`);
}
```

> `isOrderEditable()`은 `src/lib/logistics/status-machine.ts:76-87`에 이미 존재. import 추가 필요.

**Step 4. IMP-043 수정** — MASTERED Lock 헬퍼 생성 및 적용

`src/lib/logistics/status-machine.ts`에 헬퍼 추가:

```typescript
export function isMasteredStatus(status: OrderStatus): boolean {
  return status === OrderStatus.MASTERED;
}
```

다음 함수 선두에 MASTERED 체크 추가:
- `addIncidentFee()` (`claims.ts`) — 인보이스 발행 후 사고비 추가 차단
- `createClaim()` (`claims.ts`) — MASTERED 오더 클레임 등록 차단

> `updateOrder()` MASTERED 차단은 Step 3의 `isOrderEditable()`이 이미 포함하므로 중복 불필요.
> `dissolveMasterOrder()`는 MASTERED 해체 전용 — 별도 IMP로 분리 처리 (이번 범위 외).

**Step 5.** 회귀 테스트

```bash
rtk npm run test:regression
```

**Step 6.** 신규 테스트 케이스 추가 (R-09 의무)

- `updateOrder()` WAREHOUSED 상태 → 수정 거부 케이스
- `addIncidentFee()` MASTERED 상태 → 예외 발생 케이스
- `createClaim()` MASTERED 상태 → 예외 발생 케이스

**Step 7.** GitNexus detect_changes() 실행

**Step 8.** 커밋

```
[B_Kai] fix: IMP-042+043 updateOrder 수정 차단 + MASTERED Lock 강화
```

**Step 9.** ACTIVE_AGENT.md → IDLE / TASK_BOARD SECTION 1 🔔 등록 / IMP_PROGRESS.md IMP-042·043 행 `🔔` 갱신 / HANDOFF_BOX 인계 메시지 작성

### 완료 기준 (DoD)

- [x] `updateOrder()` 선두에 `isOrderEditable()` 체크 추가 확인 ✅
- [x] `isMasteredStatus()` 헬퍼 `status-machine.ts`에 추가 ✅
- [x] `addIncidentFee()` MASTERED 체크 추가 확인 ✅
- [x] `createClaim()` MASTERED 체크 추가 확인 ✅
- [x] R-09 신규 테스트 케이스 3건 이상 추가 ✅ 5건 (TC-ML-T1·T2, TC-ED-T1·T2·T3)
- [x] `rtk npm run test:regression` 전체 PASS 증적 ✅ 199/199
- [x] GitNexus impact + detect_changes() 결과 보고 ✅ LOW/MEDIUM
- [x] `[B_Kai] fix: IMP-042+043` 커밋 완료 ✅ `edf3a60`
- [x] `scratch/IMP_PROGRESS.md` IMP-042·043 행 `🔔` 갱신 ✅ (행 상태 정확, 단 Phase B 카운트 오류)
- [x] ACTIVE_AGENT.md IDLE 초기화 ✅
- [x] TASK_BOARD SECTION 1 🔔 검토 대기 등록 ✅
- [x] HANDOFF_BOX.md 인계 메시지 작성 ✅

## ❌ CONDITIONAL PASS 판정 (2026-05-15 Aiden)

> **판정**: ❌ CONDITIONAL PASS | **검증**: Aiden (Claude)

| 결함 | 내용 | 위험도 |
|:---|:---|:---:|
| IMP_PROGRESS Phase B 카운트 오류 | `3 / 10` → `1 / 10` 보정 필요. IMP-042·043은 🔔 상태 — Aiden ✅ 확정 전 카운트 불가 | Low |

> ⚠️ 동일 패턴 3회 반복 (IMP-038-BK, IMP-PLAN-BK, 이번). 🔔 항목은 Aiden 확정(✅) 후에만 완료 카운트 산입.

---

## 📨 Aiden → B_Kai | IMP-042-043-BK-FIX — IMP_PROGRESS Phase B 카운트 보정

> **수행 주체**: B_Kai (GLM Big Pickle) | **검증 주체**: Aiden (Claude)
> **유형**: 행정 보완 | **지시일**: 2026-05-15 | **예상 공수**: 5분

**Step 1.** `scratch/IMP_PROGRESS.md` Phase B 섹션 Footer 수정:
- `**Phase B 완료**: 3 / 10` → `**Phase B 완료**: 1 / 10 (10%)`

> IMP-042·043은 🔔 상태로, ✅ 확정(Aiden PASS) 전 카운트 불가.
> 전체 요약 테이블은 이미 `B | 1 | 10` 으로 정확 — 수정 불필요.

**Step 2.** 커밋:
```
[B_Kai] chore: IMP-042-043-BK-FIX IMP_PROGRESS Phase B 카운트 보정 (3/10→1/10)
```

**Step 3.** TASK_BOARD SECTION 1 🔔 등록

### 완료 기준 (DoD)

- [ ] `IMP_PROGRESS.md` Phase B Footer `1 / 10 (10%)` 확인
- [ ] `[B_Kai] chore: IMP-042-043-BK-FIX` 커밋 완료
- [ ] TASK_BOARD SECTION 1 🔔 등록