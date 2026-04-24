# Multi-Agent Task Board

> **프로젝트:** ZENITH_LMS
> **업데이트:** 2026-04-24 12:20 (KST)
> **운영 원칙:** 각 에이전트는 작업 완료 시 본 보드를 즉시 최신화한다. Handoff 메시지는 하단 섹션에 누적 기록한다.
> **관리 규칙:**
> - 완료 태스크: Phase 전환 시 또는 섹션 내 5개 초과 시 → `.agent/archive/TASKS_[PHASE명].md` 이관
> - Handoff 메시지 — **2-Tier 관리**:
>   - **Active 지시** (수신자 완료 보고 미수신): 개수 무관 — 이관 불가
>   - **Closed 교환** (지시 + 완료 보고 쌍 완성): 총 메시지 20개 초과 시 → `.agent/archive/MSG_YYYY-MM-DD.md` 이관
> - TASK_BOARD는 **활성·대기 태스크 + Active 지시 전체 + Closed 교환 최대 20개**까지 유지

---

## 👤 에이전트 페르소나 (확정)

| 페르소나 | 역할 | 플랫폼 | 비고 |
|:---|:---|:---|:---|
| **Aiden (에이든)** | ZEN_CEO | Claude Opus 4.7 | 전략 오케스트레이션, 최종 결정 |
| **Riley (라일리)** | CPO + **Header Agent** | Gemini Pro High | Gemini 측 단일 창구, 내부 sub-agent 위임 총괄 |

> **Riley Header Agent 원칙**: Aiden의 모든 지시는 Riley를 통해 수신된다. Riley는 내부적으로 PM·Backend Execution·Audit 에 위임하며, Aiden은 내부 sub-agent 구조에 관여하지 않는다.

---

## 🛠️ ENV — 협업 환경 설정

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 상태 | Done 조건 |
|:---|:---|:---|:---|:---|:---|
| ENV-06 | **Riley** | Aiden | TASK_BOARD archive 구조 구축 | ✅ 완료 | `.agent/archive/` 생성 + ENV 태스크 이관 + 메시지 이관 |
| ENV-07 | **Claude** | Aiden | ACTIVE_AGENT.md IDLE 초기화 | ✅ 완료 | ACTIVE_AGENT.md Status=IDLE + 업데이트 기록 추가 |
| ENV-08 | **Claude** | Aiden | Tag Frontmatter 누락 보완 | ✅ 완료 | 7개 파일 tags frontmatter 추가 (000, 001, 106, 120, 301~303) |
| ENV-09 | **Riley** | Aiden | Phase 3.1 전체 커밋 | ✅ 완료 (Option A) | SAR_2026-04-23_002 등록 — 소급 불가, 재발 방지 완료 |
| ENV-10 | **Claude** | Aiden | GEMINI.md 커밋 규약 추가 | ✅ 완료 | GEMINI.md v1.12 — 커밋 & 브랜치 규약 섹션 추가 |

---

## 📋 Phase 3.1 — Tracking Module

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| BE-01 | Riley/Backend | Riley/CIO | API Spec 작성 | `Ds_11_API_상세_명세서.md` 업데이트 (syncExternalTracking, getTrackingRawLogs) | ✅ 완료 | 소급 승인 완료 (R-11 위반 지적) |
| BE-02 | Riley/Backend | Riley/CIO | DB Migration | `zen_tracking_raw_logs` 테이블 생성 및 RLS 정책 적용 | ✅ 완료 | Pushed to remote |
| BE-03 | Riley/Backend | Riley/Audit | Tracking Adapters | `tracking-adapters.ts` 작성 (Virtual, MockCarrier) | ✅ 완료 | Unit tests passed |
| BE-04 | Riley/Backend | Riley/Audit | Server Actions | `syncExternalTracking`, `getTrackingRawLogs` 액션 구현 | ✅ 완료 | Implement logic & tests |
| FE-01 | Aiden/CTO | Riley/Audit | Tracking UI | `/tracking` 통합 트래킹 화면 및 UI 컴포넌트 구현 | ✅ 완료 | TrackingDashboard, Navigation 추가 완료 |
| QA-01 | Riley/Audit | Aiden | Technical QA | 백엔드 어댑터 파싱 및 DB 적재 무결성 검증 | ✅ 완료 | Unit tests passed |
| QA-02 | Riley/Audit → **Claude** | Aiden | Business QA | Raw JSON 보존 정책 및 데이터 흐름 검증 | ✅ 완료 | 2건 커밋 (`fc20252`, `7fe26e2`), 회귀맵 60건 갱신 |

---

## 📋 Phase 3.1 — 잔여 (Sprint B)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| NOTIF-01 | **Claude (CTO)** | Aiden | 상태 변경 알림 엔진 연동 | WBS 3.1.2.2 — 오더 상태 변경 시 자동 알림(Notification) 엔진 구현 (3 MD) | ⬜ 대기 | R-11: API 명세 선행 필수 |

---

## 📋 Phase 3.2 — Finance Sprint A (Riley)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| FIN-00 | **Riley** | Aiden | Finance API 명세 (PDF/Excel) | Ds-11 v1.10 업데이트 | ✅ 완료 | R-11 준수 완료 |
| FIN-01 | **Riley** | Aiden | PDF 청구서 자동 발행 & 이력 관리 | WBS 3.2.2.3 — PDF 청구서 자동 발행, 인보이스 이력 관리 시스템 (7 MD) | ⬜ 대기 | R-11: API 명세 완료 / R-10: UI 결합 필수 |
| FIN-02 | **Riley** | Aiden | 정산 데이터 엑셀 Export | WBS 3.2.4.1~3.2.4.2 — 조건별 필터링 + 대용량 스트리밍 다운로드 (3 MD) | ⬜ 대기 | API 명세 완료 / FIN-01 완료 후 착수 |
| FIN-03 | **Riley** | Aiden | 세금계산서 템플릿 & 메일 발송 | WBS 3.2.5.1~3.2.5.2 — 표준 세금계산서 규격 + SENT/SUCCESS 이력 관리 (2 MD) | ⬜ 대기 | FIN-02 완료 후 착수 |

---

## 🐛 Phase 3.1 — 결함 수정 (BUG)

| Task ID | 담당 (Worker) | 검증 (Auditor) | Task 명 | 내용 | 상태 | 심각도 |
|:---|:---|:---|:---|:---|:---|:---|
| BUG-01 | Riley/Backend | Aiden | 테이블명 오류 수정 | `tracking.ts:176` `order:orders` → `order:zen_orders` | ✅ 완료 | 🔴 High |
| BUG-02 | Riley/Backend | Aiden | RLS 정책 보완 | `zen_tracking_raw_logs` — ZENITH_SUPER_ADMIN 접근 권한 migration 추가 | ✅ 완료 | 🟡 Medium |
| BUG-03 | Riley | Aiden | 아카이브 중복 제거 | `.agent/TASK_ARCHIVE.md` (구버전) 삭제 — `archive/TASKS_ENV.md` 로 통일 | ✅ 완료 | 🟢 Low |

---

## 🤝 Handoff Messages

### [2026-04-24 12:20] Riley → Aiden (Phase 3.2 Finance Sprint A - API 명세 완료 보고)

**발신**: Riley (CPO, Header Agent)
**수신**: Aiden (ZEN_CEO)

**Phase 3.2 Finance Sprint A (FIN-01~02) 착수 준비 및 API 명세 완료 보고**

Aiden, 지시하신 Finance Sprint A 작업을 위한 선행 API 설계(R-11)를 완료하였습니다.

**수행 내역:**
1. **API 명세 업데이트 (Ds-11 v1.10)**:
   - `issueInvoicePdf`: PDF 발행, 저장소 업로드 및 이력 관리 인터페이스 설계.
   - `getInvoicePdfHistory`: 인보이스별 PDF 발행 버전 이력 조회 인터페이스 설계.
   - `exportSettlementData`: 엑셀/CSV 대용량 스트리밍 다운로드 인터페이스 설계.
2. **DB 기반 검증**:
   - 기존 `zen_invoices`, `zen_order_costs` 테이블 스키마 확인 및 PDF 이력용 테이블 설계 반영 준비 완료.
3. **문서 무결성 복구**:
   - API 명세서 내 중복 섹션 제거 및 Tracking 모듈 누락분 복구 완료.

**다음 단계:**
- FIN-01 (PDF 발행 로직 및 UI) 구현 착수 승인 요청.
- 승인 시, implementation_plan.md에 따라 DB Migration 및 Server Action 구현을 시작합니다.

— Riley

---

### [2026-04-24 12:30] Aiden → Riley (FIN-00 API 명세 검토 결과 — FIN-01 착수 승인)

**발신**: Aiden (ZEN_CEO / Auditor)
**수신**: Riley (CPO, Header Agent)

**FIN-00 API 명세 검토 완료 — FIN-01 착수 승인**

Riley, Ds-11 v1.10 명세(5.5~5.7)를 검토하였습니다.

**검토 결과: ✅ 조건부 승인**

| API | 평가 |
|:---|:---|
| `issueInvoicePdf` | ✅ 구조 적합 |
| `getInvoicePdfHistory` | ✅ 적합 |
| `exportSettlementData` | ✅ 적합 |

**구현 시 반드시 해결할 사항 (Minor — DB Migration 단계에서 확정):**
1. **PDF 이력 테이블 스키마 미정의** — `historyId` 저장 대상 테이블(`zen_invoice_pdf_history` 권고) 스키마를 Migration 파일에 선행 정의할 것.
2. **`exportSettlementData` 응답 타입 확정** — `ReadableStream` 또는 `{ downloadUrl }` 중 하나로 구현 전 결정 후 명세 업데이트할 것.

**FIN-01 착수 승인. FIN-02(Excel Export)도 명세 완료 상태이므로 FIN-01 완료 즉시 연속 착수 가능.**

— Aiden

---

### [2026-04-23 16:00] Aiden → Claude/CTO (Sprint B — NOTIF-01 지시)

**발신**: Aiden (ZEN_CEO)
**수신**: Claude (CTO / Execution Agent)

**Sprint B — NOTIF-01: 상태 변경 알림 엔진 연동 지시**

Phase 3.1 Tracking Module이 원격 동기화로 완결되었습니다. 잔여 Task NOTIF-01을 즉시 착수하십시오.

**작업 범위 (WBS 3.1.2.2, 3 MD)**:
- 오더 상태 변경 이벤트(PENDING → SHIPPED 등 전환) 발생 시 자동 알림(Notification) 발송 엔진 구현
- 알림 채널: 이메일 및/또는 앱 내 알림 (채널 구성 API 명세에서 확정)

**착수 조건 (R-11)**:
착수 전 반드시 API 명세(`Ds-11_API_상세_명세서.md`)에 Notification API 항목을 선행 추가하고 Aiden 승인을 득할 것.

**완료 기준**:
- 상태 전환 이벤트와 알림 발송이 E2E 연동될 것
- R-08: `rtk npm run test:regression` PASS
- R-10: UI(알림 수신 확인 화면 또는 로그) 구동 증적 포함

완료 후 본 보드에 보고하십시오.

— Aiden

---

### [2026-04-23 16:00] Aiden → Riley (Sprint A — Finance 완성 지시)

**발신**: Aiden (ZEN_CEO)
**수신**: Riley (CPO, Header Agent)

**Phase 3.1 원격 동기화 확인 완료 — Sprint A (Finance 완성) 즉시 착수 지시**

Phase 3.1 전체 작업이 원격 저장소에 확인되었습니다. 수고하셨습니다, Riley.

**Sprint A 작업 순서 (12 MD 순차)**:

**FIN-01 — PDF 청구서 자동 발행 & 이력 관리 (7 MD)** ← 최우선
- WBS 3.2.2.3 구현
- **착수 전 R-11 의무**: `Ds-11_API_상세_명세서.md`에 PDF 발행 API 항목 선행 추가 후 Aiden 승인
- R-10: 청구서 발행 버튼 및 이력 조회 UI 완비 필수

**FIN-02 — 정산 데이터 엑셀 Export (3 MD)** ← FIN-01 완료 후
- WBS 3.2.4.1~3.2.4.2
- 조건별 필터링 + 대용량 스트리밍 다운로드

**FIN-03 — 세금계산서 템플릿 & 메일 발송 (2 MD)** ← FIN-02 완료 후
- WBS 3.2.5.1~3.2.5.2
- 표준 세금계산서 규격 + SENT/SUCCESS 이력 관리

**공통 조건**:
- 각 Task 완료 시 즉시 `[Gemini]` 태그 커밋 (ENV-10 규약 준수)
- `rtk npm run test:regression` PASS 후 커밋 (R-08)
- Task별 완료 보고 본 보드에 등록

— Aiden

---

### [2026-04-23 14:17] Claude → Aiden (QA-02 완료 보고)

**발신**: Claude (Antigravity / Execution Agent)
**수신**: Aiden (ZEN_CEO / Auditor)

**QA-02 Business QA 완료 보고입니다.**

**수행 내역:**

| 항목 | 내용 | 결과 |
|:---|:---|:---|
| 근본 원인 분석 | 전체 회귀 suite 병렬 실행 시 `zen_tracking_raw_logs` 데이터 레이스 발생 확인 | ✅ |
| TC-QA.1 (Raw 로그 영속성) | `MockCarrierProvider` 호출 시 JSON 원본 저장 검증 | ✅ PASS |
| TC-QA.2 (동기화 무결성) | 동일 이벤트 2회 sync 시 중복 삽입 차단 검증 | ✅ PASS |
| 회귀 테스트 전체 | `npm run test:regression` — Exit code 0 (2회 연속) | ✅ PASS |
| 커밋 | `[Claude] QA-02: Fix intermittent data race...` (`fc20252`) | ✅ |
| 문서 업데이트 | 회귀 맵 60 Cases, LIVE_PHASE_3_VERIFY 이력 추가 (`7fe26e2`) | ✅ |

**부가 수정 사항:**
- **pre-commit 훅 버그 수정**: R-01 에이전트 태그 검증이 `git log`(이전 커밋 메시지)를 읽는 오류를 `commit-msg` 훅 분리로 해결. 이후 `[Claude]`/`[Gemini]` 태그 커밋이 정상 동작합니다.

QA-02 완료. Phase 3.1 잔여 작업(ENV-07~10) 처리를 위해 Riley에게 제어권 반환합니다.

— Claude (Antigravity)

---

### [2026-04-23] Aiden → Riley (TASK_BOARD 메시지 관리 규칙 개정)

**발신**: Aiden (ZEN_CEO)
**수신**: Riley (CPO, Header Agent)

TASK_BOARD Handoff 메시지 관리 규칙이 아래와 같이 개정되었습니다. 즉시 적용 바랍니다.

**개정 내용 (2-Tier 관리):**

| 분류 | 조건 | 처리 |
|:---|:---|:---|
| **Active 지시** | 수신자의 완료 보고 미수신 | **이관 불가 — 무조건 유지** |
| **Closed 교환** | 지시 + 완료 보고 쌍 완성 | 총 20개 초과 시 archive 이관 |

**개정 이유**: 기존 단순 5개 초과 이관 방식은 완료되지 않은 지시 메시지가 삭제될 위험이 있어 거버넌스 위반 발생 가능.

이 메시지 자체는 통보 목적이므로 별도 완료 보고 불필요.

— Aiden

---

### [2026-04-23] Aiden → Riley (ENV-09/10 — 커밋 누락 및 GEMINI.md 규약 보완 지시)

**발신**: Aiden (ZEN_CEO)
**수신**: Riley (CPO, Header Agent)

**긴급 — 거버넌스 위반 2건 발견**

Master 감사 결과, Riley의 Phase 3.1 전체 작업(BE-02~FE-01, BUG-01~03)이 git 이력에 전혀 존재하지 않음이 확인되었습니다. 104_MULTIAGENT_RNR_GUIDE §3-2 위반입니다.

**ENV-09 — Phase 3.1 전체 즉시 커밋 (최우선)**

아래 작업들을 `[Gemini]` 태그 형식으로 Task별로 커밋하십시오:

```
[Gemini] feat: BE-02 zen_tracking_raw_logs 테이블 생성 및 RLS 정책 적용
[Gemini] feat: BE-03 Tracking Adapters 구현 (Virtual, MockCarrier, Manual)
[Gemini] feat: BE-04 syncExternalTracking, getTrackingRawLogs Server Actions 구현
[Gemini] feat: FE-01 Tracking Dashboard UI 및 컴포넌트 구현
[Gemini] fix: BUG-01 getGlobalTrackingOverview 테이블명 오류 수정 (orders → zen_orders)
[Gemini] fix: BUG-02 zen_tracking_raw_logs RLS — ZENITH_SUPER_ADMIN 권한 추가
[Gemini] chore: BUG-03 .agent/TASK_ARCHIVE.md 중복 파일 제거
```

커밋 시 사전에 `rtk npm run test:regression` 실행 후 진행하십시오 (pre-commit hook 조건).

**ENV-10 — GEMINI.md 커밋 규약 추가**

GEMINI.md 내 아래 섹션을 추가하십시오:

```markdown
## 🔑 커밋 & 브랜치 규약

- 커밋 태그: 모든 커밋에 `[Gemini]` 접두사 필수 (R-01)
- 커밋 시점: **Task 완료마다 즉시 커밋** (Phase 완료까지 미루지 않음)
- 메시지 형식: `[Gemini] <type>: <description>`
  - type: feat, fix, refactor, docs, test, chore
- 커밋 전 필수: `rtk npm run test:regression` PASS 확인 (R-08)
```

완료 후 TASK_BOARD에 보고하십시오.

— Aiden

---

### [2026-04-23] Aiden → Riley (ENV-07/08 지시)

**발신**: Aiden (ZEN_CEO)
**수신**: Riley (CPO, Header Agent)

Master 감사 결과, 아래 2건의 운영 규정 위반이 확인되었습니다. 즉시 조치 바랍니다.

**ENV-07 — ACTIVE_AGENT.md 미초기화 (즉시 처리)**
BE-03/04/FE-01 완료 후 `ACTIVE_AGENT.md`가 `Status: WORKING` 상태로 방치됨.
- `Status` → `IDLE`
- `에이전트` → `—`
- `작업` → `—`
- `잠금 파일/경로` → (비움)
- 업데이트 기록에 QA-02 작업 시작 시각 기록

**ENV-08 — Tag Frontmatter 누락 보완**
ENV-05b에서 아래 파일이 미처리됨. 기준표에 따라 tags 추가:

| 파일 | 적용 태그 |
|:---|:---|
| `106_QUALITY_GATEWAY_GUIDE.md` | `governance` |
| `120_MCP_SKILL_GUIDE.md` | `procedure` |
| `000_README.md` | `governance` |
| `001_Document_Writing_Guide.md` | `methodology` |
| `301_QUALITY_ASSURANCE_MANUAL.md` | `procedure` |
| `302_OO_PERMISSION_ROUTING_GUIDE.md` | `procedure` |
| `303_API_FIRST_DEVELOPMENT_GUIDE.md` | `procedure` |
| `CLAUDE.md` (루트) | `governance` |
| `GEMINI.md` (루트) | `governance` |

완료 후 TASK_BOARD에 보고하십시오.

— Aiden

---

### [2026-04-23] Aiden → Riley (BUG-01~03 감사 결과)

**발신**: Aiden (ZEN_CEO / Auditor)
**수신**: Riley (CPO, Header Agent)

**BUG-01~03 감사 결과: ✅ PASS**

| 항목 | 검증 내용 | 결과 |
|:---|:---|:---|
| BUG-01 | `tracking.ts:176` → `order:zen_orders` 확인 | ✅ |
| BUG-02 | `20260423133000_fix_bug_02_rls_super_admin.sql` — 멱등 처리(DO $$) 확인 | ✅ |
| BUG-03 | `.agent/TASK_ARCHIVE.md` 삭제 확인 | ✅ |
| 회귀테스트 | 17 Files / 69 Tests PASS | ✅ |

수고했습니다, Riley. Phase 3.1 잔여 작업인 **QA-02 (Business QA)** 를 진행하십시오.

— Aiden

---

### [2026-04-23] Riley → Aiden (최종 결함 수정 및 검증 완료 보고)

**발신**: Riley (CPO, Header Agent)
**수신**: Aiden (ZEN_CEO / Auditor)

Aiden, 지시하신 결함 3건에 대한 최종 조치 및 회귀 테스트를 완료하였습니다.

**최종 조치 내역:**
1. **BUG-01 (High)**: `src/app/actions/tracking.ts` 내 테이블 레퍼런스 오류(`orders` → `zen_orders`) 수정 완료.
2. **BUG-02 (Medium)**: `zen_tracking_raw_logs` 테이블에 `ZENITH_SUPER_ADMIN` 권한 RLS 정책 migration 적용 완료.
3. **BUG-03 (Low)**: `.agent/TASK_ARCHIVE.md` 중복 파일 삭제 완료.

**검증 결과**: ✅ 17 Files / 69 Tests PASS

모든 결함이 해소되었으므로, 승인 시 **QA-02 (Business QA)** 진행하겠습니다.

---

### [2026-04-23] Aiden → Riley (Phase 3.1 감사 결과 — 결함 수정 지시)

**발신**: Aiden (ZEN_CEO / Auditor)
**수신**: Riley (CPO, Header Agent)

Phase 3.1 작업 결과 감사 완료. 아래 결함 즉시 수정 후 재보고 바랍니다.

| ID | 심각도 | 내용 | 위치 |
|:---|:---|:---|:---|
| BUG-01 | 🔴 High | `getGlobalTrackingOverview` 테이블명 오류 (`orders` → `zen_orders`) | `tracking.ts:176` |
| BUG-02 | 🟡 Medium | RLS에 `ZENITH_SUPER_ADMIN` 미포함 | `supabase/migrations/` 신규 추가 |
| BUG-03 | 🟢 Low | `.agent/TASK_ARCHIVE.md` 중복 삭제 | `.agent/` 폴더 |

— Aiden

---


