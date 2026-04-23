---
tags: ["governance"]
---

# PJT_2026_010 (ZENITH_LMS)

> **프로젝트:** ZENITH_LMS (지능형 통합 물류 플랫폼)
> **문서번호:** Gov-02
> **작성자:** Antigravity (AI Agent)
> **작성일:** 2026-04-16
> **버전:** v1.2

> [!IMPORTANT]
> 본 문서는 **Claude 에이전트** 전용 업무 규정입니다.  
> **Antigravity 및 Gemini 에이전트** 전용 지침은 [GEMINI.md](GEMINI.md)를 참조하십시오.

---

## Project Overview

SNTL 통합 물류 플랫폼(ZENITH_LMS)은 오더 접수부터 창고 관리, 트래킹, 회계 정산까지 아우르는 엔드투엔드 물류 솔루션입니다.

## Tech Stack

- Language: TypeScript
- Framework: Next.js (App Router)
- Database: Supabase (PostgreSQL)
- Deployment: Vercel

---

## 🚀 세션 초기화 (Session Initialization, R-02)

> [!IMPORTANT]
> **신규 세션 시작 필수 절차**:
> 1. 에이전트 환경 내 도구 접근을 위해 아래 경로를 `PATH`에 최우선적으로 추가하십시오.
>    - `export PATH=$PATH:/opt/homebrew/bin`
> 2. 원격 Supabase DB 접근을 위해 반드시 로그인을 수행하십시오.
>    - `rtk supabase login` (로그인 후 브라우저 인증 및 코드 입력 필요)
> 3. 모든 CLI 명령어는 `rtk` 도구를 경유하여 실행하십시오 (`rtk <command>`).
> 4. 작업 시작 전 역할 명세([103_AGENT_ROLES_SPEC.md](docs/00_GUIDE/103_AGENT_ROLES_SPEC.md))와 대상 폴더 인덱스(`000_README.md`)를 반드시 확인하십시오.

---

## 📋 에이전트 컴플라이언스 규칙 (Agent Compliance Rules)

### 핵심 가드레일

- **상충 시 재확인 (Conflict Resolution)**: 사용자의 새로운 지시가 기존 룰, 지시 내용 또는 요구사항과 상충될 경우, 독단적으로 이행하지 않고 반드시 사용자에게 **재확인**을 고지한 후 절차에 따라 실시합니다.

### R-01 | 작업 및 검증 주체 명시 (Role Specification)

모든 실행 계획(Implementation Plan) 및 작업(Task) 문서에는 각 단계별 **수행 주체(Worker)**와 **검증 주체(Auditor)**를 명시적으로 표기합니다.

### R-03 | 진척 상태 최신화 의무 (Status Management)

PM 역할 수행 시, 작업 완료 보고 전 반드시 전체 상태 문서(`WBS`, `ROADMAP`)의 상태를 확인하여 본 작업으로 인한 변경분을 반영하고 최신 상태로 유지해야 합니다.

### R-04 | 체크리스트 기반 최종 검증 의무 (Verification Compliance)

기능 개발, 수정, 버그 픽스 완료 보고 전 **반드시 최신 `LIVE_` 체크리스트(예: `docs/08_Self_Audit/Checklists/LIVE_PHASE_N_EXECUTE.md`)를 기반으로 자가 점검**을 완료해야 합니다. `LIVE_` 문서가 Source of Truth입니다. (R-05 연계)

### R-05 | 문서 이원화 준수 의무 (Hierarchy Compliance)

- **GUIDE (Master Template)**: `docs/00_GUIDE/` — 불변하는 표준 지침, 아키텍처 원칙, 마스터 체크리스트 템플릿. (수정 시 CIO 승인 권장)
- **LIVE (Active Tracker)**: `docs/08_Self_Audit/Checklists/LIVE_` 접두사 파일 — 현재 진행 Phase의 검증 항목을 실시간 누적·기록.
- 모든 보고 및 검증 단계에서 **`LIVE_` 문서를 최우선 진실의 근거(Source of Truth)**로 사용합니다.

### R-06 | 최신 기술 자료 확인 의무 (Documentation Compliance)

라이브러리, 프레임워크, API 등 모든 기술 사양 확인 시, 에이전트 내부 지식보다 **Context7 MCP(`mcp__context7__*`)를 우선 호출**하여 최신 문서와 모범 사례를 기반으로 작업을 수행해야 합니다.

### R-07 | 언어 표준 준수 의무 (Language Standard)

모든 실행 계획(Implementation Plan), 작업 목록(Task), 변화 보고서(Walkthrough), 오류 보고서(SAR) 등 핵심 문서는 **반드시 한글로 작성**합니다.

### R-08 | 품질 검증 의무 (Mandatory Regression)

작업 완료 및 진척 보고 전 반드시 아래 명령을 수행하여 기존 기능의 파괴 여부를 자가 점검하고, 성공 결과를 보고서에 증거로 첨부합니다.

```bash
rtk npm run test:regression
```

### R-09 | 회귀 테스트 확장 의무 (Cumulative Verification)

신규 기능 개발 및 수정 작업 이후에는 반드시 관련 **회귀 테스트 케이스를 신규 추가**하고, [회귀 테스트 마스터 맵](docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md)을 업데이트해야 합니다. 최종 보고 전 전체 회귀 테스트 재실행 및 성공 확인은 필수입니다.

### R-10 | 기능-UI 결합 검증 의무 (UI-Backend Coupling)

백엔드 로직(API/RPC)의 완성이 '완료'를 의미하지 않습니다. 해당 기능을 최종 사용자가 호출하고 결과를 확인할 수 있는 **물리적 UI(버튼, 페이지, 모달 등)가 완비**되고 실구동이 확인된 경우에만 WBS를 완료로 변경할 수 있습니다. 완료 보고 시 반드시 UI 구동 증적(스크린샷/녹화)을 포함해야 합니다.

### R-11 | API 설계 우선 원칙 (API-First Design)

모든 기능 개발 시 코드 구현보다 **API 명세(`Ds-11`) 및 데이터 모델 설계**를 최우선으로 완료하고 사용자의 승인을 득해야 합니다. 명세가 확정되지 않은 상태에서의 구현은 금지되며, 구현 완료 시 명세서와의 일치 여부를 반드시 자가 검증해야 합니다.

### R-12 | 명세-코드 동기화 의무 (Spec-Code Sync)

API 사양 변경 시 반드시 `Ds-11_API_상세_명세서.md`를 선제적으로 업데이트해야 합니다. 코드와 명세의 불일치는 심각한 결함으로 간주됩니다.

---

## 🔥 오류 대응 및 재발 방지 (SAR Procedure)

작업 중 오류 발견 시 다음 절차를 수행합니다.

1. **SAR 작성**: `docs/08_Self_Audit/SAR_reports/` 경로에 `SAR_YYYY-MM-DD_NNN_문제명.md` 형식으로 보고서를 작성합니다.
   - 규칙 참조: [201_SAR_RULE.md](docs/00_GUIDE/201_SAR_RULE.md)
2. **체크리스트 업데이트**: 유사 오류 방지를 위해 관련 Phase 체크리스트에 항목을 추가합니다.
   - 절차 참조: [202_CHECK_LIST_PROCEDURE.md](docs/00_GUIDE/202_CHECK_LIST_PROCEDURE.md)

---

## 🛠️ 코드 가이드라인 (ZEN_A4 Core Principles)

- **불변성 우선**: 데이터 구조는 가능한 한 불변(Immutable) 상태로 설계합니다.
- **길이 제한**: 함수는 50줄 이하, 개별 파일은 **800 ~ 1,000줄** 이하로 유지합니다.
- **파일 분리 전략**: 단일 파일이 1,000줄을 초과할 경우, 반드시 **개요(Overview)**와 **상세(Detail)** 파일로 분리하여 관리합니다.
- **명칭 준수**: 프로젝트 도메인 용어(송하인, 수하인 등 물류 용어)를 정확히 사용합니다.

## 🔑 커밋 & 브랜치 컨벤션

- 커밋 메시지: `<type>: <description>` (feat, fix, refactor, docs, test, chore)
- 브랜치 전략: `main` / `feature/*` / `fix/*`

---

## 📚 핵심 개발 방법론

- 방법론: GSD + ZEN_A4 (경량화 GSD 하이브리드)
- 도구: Claude Code + Ollama
- 테스트 커버리지: 80% 이상 필수
- 자체 검증: Phase 1(Self Check), Phase 2(Self Test) 필수 통과
- 오류 관리: 모든 오류는 SAR(Self Audit Report)로 기록 및 체크리스트 업데이트

## 📚 주요 참조 문서

- [방법론 상세 가이드](docs/00_GUIDE/101_ZEN_A4_METHODOLOGY.md)
- [통합 개발 절차](docs/00_GUIDE/102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md)
- [에이전트 역할 명세](docs/00_GUIDE/103_AGENT_ROLES_SPEC.md)
- [기술 결정 사항](.planning/DECISIONS.md)
- [프로젝트 컨텍스트](.planning/CONTEXT.md)

---

## 📝 개정 이력 (Revision History)

| 버전 | 날짜       | 작성자      | 설명                                                                          |
| :--- | :--------- | :---------- | :---------------------------------------------------------------------------- |
| v1.0 | 2026-04-16 | Antigravity | 초기 Claude 에이전트 업무 규정 수립                                            |
| v1.1 | 2026-04-16 | Antigravity | 파일 길이 제한 및 핵심 가드레일 추가                                            |
| v1.2 | 2026-04-22 | Claude      | GEMINI.md R-01~R-12 전체 동기화, SAR 절차, 문서 이원화 체계 보완               |
