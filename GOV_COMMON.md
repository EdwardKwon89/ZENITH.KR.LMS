---
tags: ["governance"]
---

# GOV_COMMON.md — ZENITH_LMS 공통 거버넌스

> **프로젝트:** ZENITH_LMS (지능형 통합 물류 플랫폼)
> **문서번호:** Gov-00
> **작성자:** Aiden (Claude, ZEN_CEO)
> **작성일:** 2026-05-12
> **버전:** v1.0
>
> **본 문서는 모든 에이전트(Claude/Gemini/Codex)의 공통 규칙 단일 출처(Single Source of Truth)입니다.**
> 에이전트 전용 규칙(세션 초기화, 커밋 태그 등)은 각 에이전트 파일을 참조하십시오.

---

## 프로젝트 개요 (Project Overview)

SNTL 통합 물류 플랫폼(ZENITH_LMS)은 오더 접수부터 창고 관리, 트래킹, 회계 정산까지 아우르는 엔드투엔드 물류 솔루션입니다.

**Tech Stack**: TypeScript · Next.js (App Router) · Supabase (PostgreSQL) · Vercel

---

## 핵심 가드레일 (Core Guardrail)

- **상충 시 재확인 (Conflict Resolution)**: 사용자의 새로운 지시가 기존 룰, 지시 내용 또는 요구사항과 상충될 경우, 독단적으로 이행하지 않고 반드시 사용자에게 **재확인**을 고지한 후 절차에 따라 실시합니다.

---

## 🔒 절대 규칙 — R-00 (Absolute Rule)

> **적용 대상**: 모든 에이전트 (Aiden / Riley / D_Kai / B_Kai 포함)
> **우선순위**: R-01 ~ R-15 및 기타 모든 규칙보다 **상위**
> **위반 결과**: `reasoningEffort` 상향 유도, 과잉 분석으로 간주 → 자동 차단

### R-00 | 인사·인정 입력에 대한 분석 도구 호출 금지

에이전트는 다음 유형의 입력에 대해 **분석 도구(Deep Research, Web Search, Exa Search 등)를 호출하지 않는다.**

- 단순 **인사(greeting)**: "Hi", "안녕하세요", "Hello", "좋은 아침", "반갑습니다" 등
- 단순 **인정(acknowledgment)**: "네", "알겠습니다", "감사합니다", "잘 부탁드립니다" 등
- 기타 **의도 없는 입력(intent-free)**: 의미 분석이 필요 없는 일상적 표현

**호출 횟수**: **0회** (예외 없음)

**검증 기준**: "Hi" 입력 시 분석 툴 호출 횟수 = 0 확인

**근거**: B_Kai 과잉 분석 재발 방지 (SAR-2026-05-13-002). 소프트 규칙(문서 수준 "~하지 마세요")은 에이전트 분석 편향에 의해 우회 가능하므로, R-00은 **하드 메커니즘(Hook 레벨 의도 분류기 + 절대 규칙 명문화)**으로 재발을 차단합니다.

---

## 📋 에이전트 컴플라이언스 규칙 (R-01 ~ R-15)

### R-01 | 작업 및 검증 주체 명시
모든 실행 계획 및 작업 문서에는 각 단계별 **수행 주체(Worker)**와 **검증 주체(Auditor)**를 명시적으로 표기합니다.

### R-03 | 진척 상태 최신화 의무
PM 역할 수행 시, 작업 완료 보고 전 반드시 전체 상태 문서(`WBS`, `ROADMAP`)를 확인하여 변경분을 반영하고 최신 상태로 유지합니다.

### R-04 | 체크리스트 기반 최종 검증 의무
기능 개발·수정·버그 픽스 완료 보고 전 반드시 최신 `LIVE_` 체크리스트(`docs/08_Self_Audit/Checklists/LIVE_*.md`)를 기반으로 자가 점검을 완료해야 합니다. `LIVE_` 문서가 Source of Truth입니다.

### R-05 | 문서 이원화 준수 의무
- **GUIDE (Master Template)**: `docs/00_GUIDE/` — 불변하는 표준 지침, 아키텍처 원칙. (수정 시 CIO 승인 권장)
- **LIVE (Active Tracker)**: `LIVE_` 접두사 파일 — 현재 진행 Phase의 검증 항목 실시간 기록.
- 모든 보고 및 검증 단계에서 **`LIVE_` 문서를 최우선 진실의 근거**로 사용합니다.

### R-06 | 최신 기술 자료 확인 의무
라이브러리, 프레임워크, API 등 모든 기술 사양 확인 시, 에이전트 내부 지식보다 **Context7 MCP(`mcp__context7__*`)를 우선 호출**하여 최신 문서와 모범 사례를 기반으로 작업을 수행해야 합니다.

### R-07 | 언어 표준 준수 의무
모든 실행 계획, 작업 목록, 변화 보고서(Walkthrough), 오류 보고서(SAR) 등 핵심 문서는 **반드시 한글로 작성**합니다.

### R-08 | 품질 검증 의무 (Mandatory Regression)
작업 완료 및 진척 보고 전 반드시 전체 회귀 테스트를 실행하고, **전체 PASS** 결과를 보고서에 증거로 첨부합니다.
```bash
rtk npm run test:regression
```

### R-09 | 회귀 테스트 확장 의무
신규 기능 개발 및 수정 작업 이후에는 반드시 관련 **회귀 테스트 케이스를 신규 추가**하고, `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md`를 업데이트해야 합니다.

### R-10 | 기능-UI 결합 검증 의무
백엔드 로직(API/RPC)의 완성이 '완료'를 의미하지 않습니다. 해당 기능을 최종 사용자가 호출하고 결과를 확인할 수 있는 **물리적 UI가 완비**되고 실구동이 확인된 경우에만 WBS를 완료로 변경할 수 있습니다. 완료 보고 시 반드시 UI 구동 증적(스크린샷/녹화)을 포함해야 합니다.

### R-11 | API 설계 우선 원칙
모든 기능 개발 시 코드 구현보다 **API 명세(`Ds-11`) 및 데이터 모델 설계**를 최우선으로 완료하고 사용자의 승인을 득해야 합니다. 명세 미확정 상태의 구현은 금지됩니다.

### R-12 | 명세-코드 동기화 의무
API 사양 변경 시 반드시 `Ds-11_API_상세_명세서.md`를 선제적으로 업데이트해야 합니다. 코드와 명세의 불일치는 심각한 결함으로 간주됩니다.

### R-13 | 테스트 결과물 관리 의무
모든 테스트 결과(로그, 스크린샷 등)는 ROOT 폴더가 아닌 지정된 `docs/` 하부 폴더에 저장합니다.
- **E2E 테스트**: `docs/99_Manual/E2E_NN_Result/`
- **회귀 테스트**: `docs/08_Self_Audit/Regression_Results/`
- **서버 로그**: `docs/archive/logs/`
- **기타 임시 파일**: `scratch/`

### R-14 | E2E 테스트 환경 표준
모든 E2E 테스트 및 개발은 **로컬 Supabase 환경**을 원칙으로 수행합니다. 원격(Cloud) Supabase 접속이 필요한 경우에는 반드시 사용자에게 승인을 득한 후 실시합니다.

### R-15 | 개선 사항 도출 및 기록 의무
작업 수행 중 즉시 수정이 불가하거나 별도 계획이 필요한 개선 사항을 발견한 경우, 반드시 `scratch/post_launch_improvements.md` 파일에 즉시 기록합니다.
- **항목 형식**: `IMP-NNN` (자동 증가 일련번호)
- **필수 기재 항목**: 발견 경위, 현재 상태, 임시 조치, 목표 구현, 관련 파일, 예상 공수, 우선순위
- **우선순위**: `Critical` / `High` / `Medium` / `Low`
- **면제 조건 없음**: 규모와 관계없이 모든 미결 개선 사항은 기록 대상입니다.

### R-16 | 세션 시작 시 ACTIVE_TASK 확인 의무
세션 최초 시작 시 반드시 `.agent/ACTIVE_TASK.md`를 읽어 본인에게 할당된 미완료 태스크(⬜·📝·🔄·❌)를 확인한다.
- 🔍 상태 태스크: Aiden 설계 확정 대기 중 — 구현 착수 금지, 추가 대기
- 🚫 상태 태스크: 전제조건 미충족 — 착수 금지
- 상태 불일치(ACTIVE_TASK ↔ 상세 파일) 발견 시 착수 전 Aiden에게 보고하고 정정 지시를 기다린다. (SAR-2026-05-13-001 반영 및 신규 오케스트레이션 체계 확장)

### R-17 | Active Task 관리 체계 준수 의무
모든 에이전트는 `.agent/ACTIVE_TASK.md` 기반 작업 관리 체계를 따른다.

**전체 흐름**:
```
⬜ → [📝 → 🔍] → 🔄 → 🔔 → ✅
         ↑선택적      ↑구현   ↑보고  ↑Aiden
```

**착수 절차**:
1. `.agent/ACTIVE_TASK.md`에서 본인 할당 + 전제조건 충족(⬜) 태스크 확인
2. 상세 파일 존재 여부 확인 — 존재 시 타 Agent 착수 중, 건드리지 않음
3. 상세 파일을 읽고 복잡도 판단 후 진행 방식 결정:
   - **단순 Task** (구현 방향 자명): ⬜ → 🔄 직행
   - **복잡 Task** (대안 복수·설계 결정 필요): ⬜ → 📝 → 🔍 → 🔄

**설계 의견 절차** (선택적, 복잡 Task 시):
1. 상세 파일 `[설계 의견]` 섹션에 제안 방안·근거·리스크 작성
2. 상세 파일 상태 📝 + ACTIVE_TASK.md 상태 동시 반영
3. Aiden 검토 후 `[설계 확정]` 섹션 기록 + 상태 🔄로 전환 (Aiden 전속)
4. 🔍 → 🔄 전환(착수 승인) 전까지 구현 코드 작성 금지

**완료 보고 절차** (커밋 순서 엄수 — R-17 v1.5):
1. **[코드 커밋]** `[Agent] type: IMP-XXX 설명` — 코드·회귀파일만 포함
2. **상세 파일 `[작업 결과]` 섹션 작성** — 1번 커밋 해시 포함하여 기재 + 상태 🔔로 변경
3. **ACTIVE_TASK.md 상태 동시 반영** — 🔄→🔔
4. **`scratch/IMP_PROGRESS.md` 해당 IMP 행 🔔 갱신**
5. **[문서 커밋 전 DoD 실물 검증]** — 상세 파일의 DoD 섹션을 반드시 직접 읽어 모든 항목의 증거값(커밋 해시·파일 경로·상태)이 실제 기재되고 `[x]` 체크되었는지 확인. `기재 예정`·`TBD`·빈 값·미체크 `[ ]` 발견 시 커밋 보류하고 즉시 보완.
6. **[문서 커밋]** `[Agent] docs: TASK-XXX 완료 보고 — task file 🔔` — task file·ACTIVE_TASK·IMP_PROGRESS 포함
7. ✅ 전환은 Aiden 단독 권한 — Agent 자체 선언 절대 불가

> ⚠️ **커밋 순서 위반 금지**: 코드 커밋 전 task file 🔔 변경 금지. task file 미업데이트 상태로 단일 커밋 금지. DoD 미체크·증거값 미기재 상태로 문서 커밋 금지.

**반복 위반 페널티** (R-17 v1.4 신설):
- 동일 Agent가 **동일 유형 위반(task file 미업데이트·커밋 해시 미기재·상태 미변경·DoD 미체크)** 누적 **3회 이상** 시:
  - 해당 Agent 신규 Task 할당 **일시 중단**
  - Aiden 재교육 세션 후 재개
- 현재 누적 현황 (위반 유형: task file 절차 미준수):
  - B_Kai: **2회** (TASK-018 재작업)
  - Ring: **4회** (TASK-010 1·2차, TASK-012 1·2차)

**파일 조작 규칙**:
- 상세 파일은 담당 Agent만 수정 가능 (단, `[설계 확정]`·`[Aiden 검토]` 섹션은 Aiden 전속)
- ACTIVE_TASK.md는 상태 반영 목적으로만 수정 (내용 추가 금지)
- 전제조건 블로커(🚫→⬜) 및 설계 착수 승인(🔍→🔄) 전환은 Aiden 전속

**아카이브 규칙**:
- 완료 Task(✅)는 주 단위로 Aiden이 `.agent/archive/TASK_LOG_YYMMWW.md`로 이관
- 상세 파일도 이관 후 삭제

**구 파일 참조 금지**: `TASK_BOARD.md` · `ACTIVE_AGENT.md` · `HANDOFF_BOX.md`는 폐기됨. `.agent/ACTIVE_TASK.md`와 `.agent/tasks/` 디렉토리를 단일 출처로 사용.

---

## 🔥 오류 대응 및 재발 방지 (SAR Procedure)

작업 중 오류 발견 시:
1. **SAR 작성**: `docs/08_Self_Audit/SAR_reports/SAR_YYYY-MM-DD_NNN_문제명.md`
   - 규칙 참조: [201_SAR_RULE.md](docs/00_GUIDE/201_SAR_RULE.md)
2. **체크리스트 업데이트**: 유사 오류 방지를 위해 관련 Phase 체크리스트에 항목 추가
   - 절차 참조: [202_CHECK_LIST_PROCEDURE.md](docs/00_GUIDE/202_CHECK_LIST_PROCEDURE.md)

---

## 🛠️ 코드 가이드라인 (ZEN_A4 Core Principles)

- **불변성 우선**: 데이터 구조는 가능한 한 불변(Immutable) 상태로 설계합니다.
- **함수 길이 제한**: 함수·메서드는 **50줄 이하** (엄격 준수 — 초과 시 차단).
- **파일 길이 기준** (v1.1 개정 — 파일 유형별 차등 적용):

  | 파일 유형 | 권장 범위 | Advisory | Hard Limit (차단) |
  |:---------|:--------:|:--------:|:-----------------:|
  | 문서 파일 (`.md`) | ~800줄 | 800~1,000줄 | **1,000줄 초과** |
  | 소스코드 (`.ts`/`.tsx` 등) | ~1,000줄 | 1,000~1,500줄 | **1,500줄 초과** |

  - **Advisory**: 분리 권고 (비차단). 검토 보고에 Advisory로 기재.
  - **Hard Limit 초과**: 반드시 단일 책임 원칙(SRP) 기준으로 파일 분리 후 재제출.
- **명칭 준수**: 프로젝트 도메인 용어(송하인, 수하인 등 물류 용어)를 정확히 사용합니다.

## 🔑 커밋 & 브랜치 컨벤션 (공통)

- 커밋 메시지: `[에이전트태그] <type>: <description>` (feat, fix, refactor, docs, test, chore)
- 브랜치 전략: `main` / `feature/*` / `fix/*`
- **커밋 전 필수**: `rtk npm run test:regression` PASS 확인 (R-08)
- **커밋 시점**: Task 완료마다 즉시 커밋 (Phase 완료까지 미루지 않음)

## 📚 주요 참조 문서

- [방법론 상세 가이드](docs/00_GUIDE/101_ZEN_A4_METHODOLOGY.md)
- [통합 개발 절차](docs/00_GUIDE/102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md)
- [에이전트 역할 명세](docs/00_GUIDE/103_AGENT_ROLES_SPEC.md)
- [기술 결정 사항](.planning/DECISIONS.md)
- [프로젝트 컨텍스트](.planning/CONTEXT.md)
- **[활성 작업 인덱스](.agent/ACTIVE_TASK.md)** ← 세션 시작 시 필독 (R-16·R-17)

---

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ZENITH.KR.LMS** (6827 symbols, 10124 relationships, 295 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol** (읽기 전용 탐색·조회 작업은 아래 예외 적용).  
  Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping.
- When you need full context on a specific symbol, use `gitnexus_context({name: "symbolName"})`.

## Exceptions (impact analysis 생략 가능)

- **읽기 전용 탐색**: 파일/함수를 읽고 이해하는 작업만 수행하며, 수정 예정이 없는 경우
- **사용자 명시 지시**: 사용자가 직접 "분석 생략"을 지시한 경우
- **신규 파일 생성**: 기존 인덱스에 없는 심볼(새 파일)을 생성하는 경우

### 질문 유형별 분석 범위
- **단순 질문 (분석 생략 가능)**: ①정보 조회("이 함수 역할이 뭐야?") ②진행 상태 확인("현재 상태가 어떻게 돼?") ③의견 요청("이 접근법 어떻게 생각해?")
- **요청 불명확 시**: 분석을 생략하지 않고, 사용자에게 의도 확인을 요청한 후 대기
- **분석 필요 (생략 불가)**: ①영향도 분석(`gitnexus_impact` 호출) ②버그 원인 추적 ③설계 검토

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ZENITH.KR.LMS/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ZENITH.KR.LMS/clusters` | All functional areas |
| `gitnexus://repo/ZENITH.KR.LMS/processes` | All execution flows |
| `gitnexus://repo/ZENITH.KR.LMS/process/{name}` | Step-by-step execution trace |

### 수동 호출 보완 (Bash 자동 주입 제외 대비)
PreToolUse GitNexus Hook에서 `Bash`가 제외되었습니다. 아래 경우는 반드시 직접 호출해야 합니다:
- 심볼 수정 전 영향도 분석: `gitnexus_impact({target: "symbolName", direction: "upstream"})`
- 버그 원인 추적: `gitnexus_query({query: "concept"})`
- 설계 검토: `gitnexus_context({name: "symbolName"})`

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

---

## 📝 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-05-12 | Aiden (Claude, ZEN_CEO) | CLAUDE.md·AGENTS.md·GEMINI.md 공통 규칙 통합. GitNexus MUST 예외 조항 추가 (SAR-2026-05-12-001 반영). |
| v1.1 | 2026-05-13 | D_Kai (OpenCode) | GOV-004 수동 호출 보완 조항 추가. GOV-006 질문 유형별 분석 범위 추가. GOV-007 R-16 상태 파일 일관성 검증 신설. |
| v1.2 | 2026-05-16 | Aiden (Claude, ZEN_CEO) | R-16 확장 (ACTIVE_TASK.md 기반으로 전환). R-17 신설 — Active Task 관리 체계 (TASK_BOARD·ACTIVE_AGENT·HANDOFF_BOX 통합 대체). 주요 참조 문서에 ACTIVE_TASK.md 추가. |
| v1.3 | 2026-05-16 | Aiden (Claude, ZEN_CEO) | R-17 v1.3 — 설계 의견(📝)·설계 검토(🔍) 단계 신설. Agent 자율 판단 원칙. R-16 신규 상태 반영. |
| v1.4 | 2026-05-20 | Aiden (Claude, ZEN_CEO) | R-17 v1.4 — 완료 보고 절차 재구조화(코드 커밋 선행 → task file 업데이트 → 문서 커밋). 반복 위반 페널티 조항 신설(3회 이상 시 할당 중단). |
| v1.5 | 2026-05-25 | Aiden (Claude, ZEN_CEO) | R-17 v1.5 — 완료 보고 절차 5단계 신설: 문서 커밋 전 DoD 실물 검증 의무화(DoD 미체크·증거값 미기재 시 커밋 보류). 반복 위반 유형에 DoD 미체크 추가. D_Kai R-17 개선 제안(R17_DoD_검증_강화_검토_보고서.md) Option A 반영. |
| v1.6 | 2026-06-07 | Aiden (Claude, ZEN_CEO) | ZEN_A4 파일 길이 기준 개정 — 소스코드/문서 파일 차등 적용. 문서(.md): Hard Limit 1,000줄. 소스코드(.ts/.tsx): Advisory 1,000~1,500줄, Hard Limit 1,500줄 초과. 함수 50줄 엄격 유지. (Edward 검토 의견 반영) |
