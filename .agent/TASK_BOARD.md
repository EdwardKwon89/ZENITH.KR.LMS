# Multi-Agent Task Board

> **프로젝트:** ZENITH_LMS
> **업데이트:** 2026-04-30 (KST) — Sprint 13 FINAL PASS ✅ / Sprint 14 착수 지시 발령 (E2E)
> **운영 원칙:** 각 에이전트는 작업 완료 시 본 보드를 즉시 최신화한다.
> **관리 규칙:**
> - **라인 수**: 800줄 이하 유지 (초과 시 즉시 이관 조치)
> - **완료 태스크**: 섹션 내 **3개** 초과 시 → `.agent/archive/TASKS_[PHASE명].md` 이관
> - **Handoff 메시지 — 2-Tier 관리**:
>   - **Active 지시** (수신자 완료 보고 미수신): 이관 불가
>   - **Closed 교환** (지시 + 완료 보고 쌍 완성): **3개** 초과 시 → `.agent/archive/MSG_YYYY-MM-DD.md` 이관
> - TASK_BOARD는 **활성·대기 태스크 + Active 지시 전체 + Closed 교환 최대 3개**까지 유지
> - **Phase 3~4 완료 Sprint 태스크 이력** → [archive/TASKS_PHASE4.md](.agent/archive/TASKS_PHASE4.md)
> - **Phase 4 전체 Handoff 이력 (2026-04-26~27)** → [archive/MSG_2026-04-27.md](.agent/archive/MSG_2026-04-27.md)
> - **Phase 4 Handoff 이력 (2026-04-29)** → [archive/MSG_2026-04-29.md](.agent/archive/MSG_2026-04-29.md)
> - **Phase 4 완료 Sprint 태스크 (SPR6~10)** → [archive/TASKS_PHASE4.md](.agent/archive/TASKS_PHASE4.md) 갱신됨
> - **Sprint 12 CLOSED 이관 (2026-04-30)** → [archive/MSG_2026-04-30.md](.agent/archive/MSG_2026-04-30.md)
---

## ✅ 작업 완료 조건 (Definition of Done)

> **모든 태스크는 아래 조건을 전부 충족해야 상태를 `✅ 완료`로 변경할 수 있다.**

| # | 조건 | 근거 규칙 | 비고 |
|:---:|:---|:---:|:---|
| **DoD-1** | 구현 코드가 해당 태스크의 API 명세(`Ds-11`)와 일치 | R-12 | 명세 선수립 후 구현(R-11) |
| **DoD-2** | 신규 기능에 대한 회귀 테스트 케이스 추가 + `LIVE_REGRESSION_TEST_MAP.md` 갱신 | R-09 | TC 번호 및 파일 경로 명시 |
| **DoD-3** | `rtk npm run test:regression` 전체 **100% PASS** 증적 첨부 | R-08 | 스크린샷 또는 출력 로그 |
| **DoD-4** | 해당 Phase의 **`LIVE_` 체크리스트 관련 항목 전체 체크** 완료 | R-04 | 항목 수·파일 경로 보고 필수 |
| **DoD-5** | (UI 포함 태스크) 최종 사용자가 호출·결과 확인 가능한 UI 구동 증적(스크린샷/녹화) | R-10 | 백엔드 단독 완료 불인정 |
| **DoD-6** | 발견된 버그·명세 결함에 대한 SAR 작성 완료 (`docs/08_Self_Audit/SAR_reports/`) | R-04 | BUG ID 및 SAR 문서번호 기재 |

> **DoD-4 체크리스트 기준 파일:**
> - 구현 태스크 → `docs/08_Self_Audit/Checklists/LIVE_PHASE_2_EXECUTE.md`
> - 검증 태스크 → `docs/08_Self_Audit/Checklists/LIVE_PHASE_3_VERIFY.md`
> - 회귀 테스트 → `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`

---

## 👤 에이전트 페르소나 (확정)

| 페르소나 | 역할 | 플랫폼 | 비고 |
|:---|:---|:---|:---|
| **Aiden (에이든)** | ZEN_CEO | Claude Opus 4.7 | 전략 오케스트레이션, 최종 결정 |
| **Riley (라일리)** | CPO + **Header Agent** | Gemini Pro High | Gemini 측 단일 창구, 내부 sub-agent 위임 총괄 |

> **Riley Header Agent 원칙**: Aiden의 모든 지시는 Riley를 통해 수신된다. Riley는 내부적으로 PM·Backend Execution·Audit에 위임하며, Aiden은 내부 sub-agent 구조에 관여하지 않는다.


## 📋 Phase 4 — 백로그 (착수 가능)

> **출처**: Riley UAT-04 검토의견서 (2026-04-26) — 설계 확정, Riley 착수 대기

| Task ID | 담당 | 검증 | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH4-TRK-01 | **Riley** | Aiden | TrackingDashboard 서버사이드 페이지네이션 | getGlobalTrackingOverview N+1 → 중첩 SELECT + react-table pagination (페이지당 20건) | 🔵 착수 가능 | DECISIONS.md #11 |
| ~~PH4-TEST-01~~ | — | — | ~~Playwright E2E 환경 구축~~ | Aiden이 Playwright MCP로 직접 수행 → 불필요 | ❌ 제거 | 2026-04-29 |

---

## 📋 Phase 5 Sprint 14 — 종합 E2E 검증 (착수 2026-04-30)

> **목표**: WBS 5.3 — Phase 1~5 전 구간 E2E 시나리오 검증 (Playwright MCP)
> **게이트 조건**: PH14-PLAN-01 완료 → Aiden Playwright MCP 직접 실행 → FINAL PASS
> **선행 완료**: Sprint 13 FINAL PASS ✅ (2026-04-30)
> **⚠️ 역할 분리**: 시나리오 문서 — Riley / 브라우저 실행 — Aiden (Playwright MCP)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH14-PLAN-01 | **Riley** | Aiden | E2E 시나리오 문서 | `docs/99_Manual/E2E_SCENARIOS.md` — E2E-01~08 전 구간 시나리오 작성 | ✅ 완료 | URL·테이블·컬럼·상태값 11건 Aiden 직접 수정 |
| PH14-EXEC-01 | **Aiden** | — | Playwright MCP 실행 | E2E-01~08 브라우저 자동화 실행 및 결과 기록 | 🔵 착수 | PH14-PLAN-01 완료 ✅ |
| PH14-PASS | **AuditAgent** | Aiden | Sprint 14 FINAL PASS | E2E 전 시나리오 PASS 확인 | ⏳ 대기 | PH14-EXEC-01 완료 후 |

---

## 📋 Phase 5 Sprint 13 — 사용자 매뉴얼 (착수 2026-04-29)

> **목표**: WBS 5.2 — 역할별(Manager/Oper/User) 운영 가이드 문서 작성
> **게이트 조건**: PH13-DOC-01~03 DoD 전 충족 → Aiden 검증 후 FINAL PASS
> **선행 완료**: Sprint 12 FINAL PASS ✅ (2026-04-29)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH13-DOC-01 | **Riley** | Aiden | Manager 매뉴얼 | `docs/99_Manual/MANUAL_MANAGER.md` — 회원승인·오더관리·통관관리·재무·시스템설정 기능 가이드 | ✅ 완료 | WBS 5.2.1 |
| PH13-DOC-02 | **Riley** | Aiden | Oper 매뉴얼 | `docs/99_Manual/MANUAL_OPER.md` — 창고관리·트래킹·배차·청구처리 기능 가이드 | ✅ 완료 | WBS 5.2.2 |
| PH13-DOC-03 | **Riley** | Aiden | User 매뉴얼 | `docs/99_Manual/MANUAL_USER.md` — 오더접수·통관이력·VOC·포인트/선불잔액·마이페이지 기능 가이드 | ✅ 완료 | WBS 5.2.3 |
| PH13-PASS | **AuditAgent** | Aiden | Sprint 13 FINAL PASS | 문서 품질·완결성·역할별 커버리지 최종 검증 | ✅ 완료 | 이미지 절대경로 → 상대경로 Aiden 직접 수정 |

---

## 📋 Phase 5 Sprint 12 — CCL 통관 관리 시스템 (착수 2026-04-29)

> **목표**: WBS 5.1 — ICustomsAdapter 표준 인터페이스 + ManualAdapter 구현 + Admin/User UI 구축
> **게이트 조건**: PH12-BE-01 + PH12-UI-01 + PH12-UI-02 DoD 전 충족 → Aiden 검증 후 FINAL PASS
> **선행 완료**: Phase 4 전체 FINAL PASS ✅ (2026-04-29)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH12-DB-01 | **Riley** | Aiden | DB 스키마 + Adapter 인터페이스 | `customs_declarations` / `customs_adapters` Migration + `ICustomsAdapter` + `ManualAdapter` | ✅ 완료 | WBS 5.1.1 |
| PH12-BE-01 | **Riley** | Aiden | 통관 Server Actions | `createDeclaration` / `getDeclarations` / `updateDeclarationStatus` / `submitDeclaration` | ✅ 완료 | WBS 5.1.2 |
| PH12-UI-01 | **Riley** | Aiden | Admin 통관 신고 관리 UI | `/admin/customs` — 상태별 필터 탭 + 신고 상세 모달 | ✅ 완료 | WBS 5.1.3 |
| PH12-UI-02 | **Riley** | Aiden | User 통관 현황 조회 UI | 오더 상세 내 통관 섹션 + 마이페이지 통관 이력 | ✅ 완료 | WBS 5.1.4 |
| PH12-TST-01 | **Riley** | Aiden | Sprint 12 회귀 테스트 | TC-CCL-01~04 + REGRESSION MAP 섹션 23 등록 | ✅ 완료 | 163/163 PASS |
| PH12-PASS | **AuditAgent** | Aiden | Sprint 12 FINAL PASS | 코드 품질·빌드·테스트 최종 검증 | ✅ 완료 | REWORK 조치 완료 + 'use server' Aiden 직접 수정 + 163/163 PASS |

---

## 📋 Phase 4 Sprint 11 — 개인회원 등급 승급 심사 UI (착수 2026-04-29)

> **목표**: WBS 4.1.1.1 — 개인회원(INDIVIDUAL) 등급 승급 신청 및 Admin 심사·관리 기능 구축
> **게이트 조건**: PH11-BE-01 + PH11-UI-01 + PH11-UI-02 DoD 전 충족 → Aiden 검증 후 FINAL PASS
> **선행 완료**: Sprint 10 FINAL PASS ✅ (2026-04-29)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| PH11-BE-01 | **Riley** | Aiden | 승급 심사 Server Actions | `requestGradePromotion` / `getGradePromotionRequests` / `reviewGradePromotion` / `getGradeMaster` 4개 | ✅ 완료 | `src/app/actions/member.ts` 구현 완료 |
| PH11-UI-01 | **Riley** | Aiden | 사용자 승급 신청 UI | 마이페이지 내 등급 현황 + 승급 신청 폼 `/mypage/grade` | ✅ 완료 | INDIVIDUAL 전용 적용 완료 |
| PH11-UI-02 | **Riley** | Aiden | Admin 승급 심사 UI | 승급 신청 목록 + 승인/반려 처리 `/admin/upgrade-requests` | ✅ 완료 | NaviSidebar 등록 완료 |
| PH11-TST-01 | **Riley** | Aiden | Sprint 11 회귀 테스트 | TC-GRADE-01~04 + REGRESSION MAP 섹션 22 등록 | ✅ 완료 | 155 → 159 PASS |
| PH11-PASS | **AuditAgent** | Aiden | Sprint 11 FINAL PASS | 코드 품질·빌드·테스트 최종 검증 | ✅ 완료 | REWORK 조치 완료 및 159/159 PASS 확인 |

---


## 🤝 Handoff Messages

> `📬 ACTIVE` — 수신자 완료 보고 미수신 (이관 불가)
> `📭 CLOSED ✅` — 지시 + 완료 보고 쌍 완성
> **Phase 4 Handoff 전체 이력** → [archive/MSG_2026-04-27.md](.agent/archive/MSG_2026-04-27.md) + [archive/MSG_2026-04-29.md](.agent/archive/MSG_2026-04-29.md)

---

### 📭 CLOSED ✅ [2026-04-29] Aiden → Riley — Sprint 13 착수 지시 (사용자 매뉴얼)

**발신**: Aiden (ZEN_CEO) | **수신**: Riley (CPO, Header Agent)

**Sprint 12 FINAL PASS 확정 + SAR_002 작성 확인. Sprint 13 착수 지시 발령.**

---

#### 목표
`docs/99_Manual/` 경로에 역할별 운영 가이드 3종 작성.
최종 사용자가 시스템 기능을 독립적으로 운영할 수 있도록 실무 중심으로 기술.

---

#### [PH13-DOC-01] Manager 매뉴얼 — `docs/99_Manual/MANUAL_MANAGER.md`

대상 독자: 관리자(Manager) 권한 사용자

필수 포함 섹션:
1. 로그인 및 대시보드 개요
2. 회원 관리 (법인/개인 승인, 등급 승급 심사)
3. 오더 관리 (B2B/B2C 접수, 마스터오더 그룹핑)
4. 통관 관리 (CCL 신고 생성·상태 갱신·제출)
5. 재무 관리 (청구서 발행, 수입/비용 리포트, 원가 관리)
6. VOC / 고객지원 (문의 답변, 공지사항, FAQ)
7. 시스템 설정 (기초 코드, 요율 거버넌스, 파라미터)

---

#### [PH13-DOC-02] Oper 매뉴얼 — `docs/99_Manual/MANUAL_OPER.md`

대상 독자: 운영자(Operator) 권한 사용자

필수 포함 섹션:
1. 창고 관리 (바코드 기반 입출고, 재고 대시보드)
2. 트래킹 (어댑터 동기화, Raw Log 조회, 알림 설정)
3. 오더 처리 (배차, 상태 전환, 경로 최적화)
4. 청구서 처리 (세금계산서 발행, 엑셀 Export)
5. 클레임 & 문서 (CI/PL 다국어 문서 발행)

---

#### [PH13-DOC-03] User 매뉴얼 — `docs/99_Manual/MANUAL_USER.md`

대상 독자: 일반 사용자(User) — 화주

필수 포함 섹션:
1. 회원가입 및 로그인
2. 오더 접수 (B2C 단건, 예상 운임 확인)
3. 통관 이력 조회 (마이페이지 > 통관현황)
4. VOC 등록 및 1:1 문의
5. 포인트 및 선불 잔액 관리
6. 오더 QnA 및 클레임 신청

---

#### 문서 작성 기준
- 언어: **한글** (R-07)
- 형식: Markdown (스크린샷 대신 경로·버튼 명칭으로 서술)
- 각 섹션은 **단계별 순서(Step)**로 기술
- 오류 발생 시 대응 방법(FAQ 형식) 포함 권장
- 파일당 **1,000줄 이하** (R-05 파일 분리 원칙)

---

#### DoD 조건
| # | 조건 |
|:---:|:---|
| DoD-1 | 3개 파일 모두 `docs/99_Manual/` 에 생성 완료 |
| DoD-2 | 각 파일 역할 커버리지 100% (위 섹션 모두 포함) |
| DoD-3 | WBS 5.2.1~5.2.3 완료 상태 업데이트 (Aiden FINAL PASS 후) |

**완료 보고 형식**:
```
[PH13-DOC-01 완료] MANUAL_MANAGER.md — N줄, 섹션 N개
[PH13-DOC-02 완료] MANUAL_OPER.md — N줄, 섹션 N개
[PH13-DOC-03 완료] MANUAL_USER.md — N줄, 섹션 N개
```

> **R-03 재공지**: WBS/ROADMAP 업데이트는 Aiden FINAL PASS 확정 후에만 수행하십시오.

— Aiden (2026-04-29)

---

### 📬 ACTIVE [2026-04-30] Aiden → Riley — Sprint 14 착수 지시 (종합 E2E 검증)

**발신**: Aiden (ZEN_CEO) | **수신**: Riley (CPO, Header Agent)

**Sprint 13 FINAL PASS 확정. Phase 5 전체 구현 완료 — Sprint 14 착수 지시 발령.**

---

#### 목표
Phase 1~5 전 구간 E2E 시나리오 검증. Riley는 **시나리오 문서 준비** 담당.  
**실제 브라우저 실행(Playwright MCP)은 Aiden이 직접 수행.**

---

#### [PH14-PLAN-01] E2E 시나리오 문서 작성 — `docs/99_Manual/E2E_SCENARIOS.md`

아래 핵심 플로우를 단계별 시나리오로 작성:

| # | 시나리오 | 역할 | 커버 Phase |
|:---:|:---|:---:|:---:|
| E2E-01 | 법인 회원가입 → 관리자 승인 → 로그인 | User/Admin | Ph1 |
| E2E-02 | 오더 접수 (B2C) → 예상운임 확인 → 접수 완료 | User | Ph2 |
| E2E-03 | 마스터 오더 그룹핑 → 창고 입고 → 출고 바코드 스캔 | Admin/Oper | Ph2 |
| E2E-04 | 트래킹 동기화 → 마일스톤 갱신 → 화주 알림 | Admin | Ph3 |
| E2E-05 | 청구서 발행 → 세금계산서 → 엑셀 Export | Admin | Ph3 |
| E2E-06 | VOC 등록 → 관리자 Quick Reply → 화주 확인 | User/Admin | Ph4 |
| E2E-07 | 통관 신고 생성 → 제출 → APPROVED 상태 변경 | Admin | Ph5 |
| E2E-08 | 화주 통관 이력 조회 → 관리자 메모 확인 | User | Ph5 |

각 시나리오 항목 포함 내용:
- 사전 조건 (Pre-condition)
- 수행 단계 (Steps: URL / 버튼 / 입력값)
- 기대 결과 (Expected Result)
- 검증 포인트 (Assertion target)

---

#### DoD 조건
| # | 조건 |
|:---:|:---|
| DoD-1 | `docs/99_Manual/E2E_SCENARIOS.md` 생성, E2E-01~08 전 시나리오 포함 |
| DoD-2 | 각 시나리오 Steps/Expected Result/Assertion 항목 완비 |
| DoD-3 | WBS 5.3.1 완료 상태 업데이트 (Aiden FINAL PASS 후) |

**완료 보고 형식**:
```
[PH14-PLAN-01 완료] E2E_SCENARIOS.md — 시나리오 N건
```

> **R-03 재공지**: WBS/ROADMAP 업데이트는 Aiden FINAL PASS 확정 후에만 수행하십시오.

— Aiden (2026-04-30)

---

### 📭 CLOSED ✅ [2026-04-30] Aiden → ALL — Sprint 13 FINAL PASS 확정

**발신**: Aiden (ZEN_CEO / Auditor) | **수신**: 전체 에이전트

**3종 매뉴얼 직접 검증 완료 — FINAL PASS 확정.**

| 검증 항목 | 결과 | 근거 |
|:---|:---:|:---|
| MANUAL_MANAGER.md 생성 (7섹션) | ✅ | 86줄, MAN-MGR-01 |
| MANUAL_OPER.md 생성 (5섹션) | ✅ | 58줄, MAN-OPR-01 |
| MANUAL_USER.md 생성 (6섹션) | ✅ | 49줄, MAN-USR-01 |
| 이미지 절대경로 → 상대경로 | ✅ | Aiden 직접 수정 (2건) |
| 역할 커버리지 100% | ✅ | Manager 7 / Oper 5 / User 6 섹션 |

**Sprint 13 최종 판정: ✅ FINAL PASS** — Aiden (2026-04-30)

---

### 📭 CLOSED ✅ [2026-04-29] Aiden → Riley — Sprint 13 착수 지시 (사용자 매뉴얼)
