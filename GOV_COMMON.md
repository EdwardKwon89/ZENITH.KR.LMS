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
- **길이 제한**: 함수는 50줄 이하, 개별 파일은 **800 ~ 1,000줄** 이하로 유지합니다.
- **파일 분리 전략**: 단일 파일이 1,000줄을 초과할 경우, 반드시 **개요(Overview)**와 **상세(Detail)** 파일로 분리합니다.
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
