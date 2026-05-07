---
tags: ["governance"]
---

# GEMINI.md - Antigravity & Gemini Work Regulations

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서번호:** Gov-01
> **작성자:** Antigravity (AI Agent)
> **작성일:** 2026-04-22
> **버전:** v1.13

이 문서는 지능형 통합 물류 플랫폼(ZENITH_LMS) 개발에 참여하는 AI 에이전트(Antigravity, Gemini)의 업무 규정을 정의합니다. 모든 에이전트는 본 문서와 `CLAUDE.md`에 명시된 ZEN_A4 방법론을 철저히 준수해야 합니다.

## 🚀 에이전트 업무 표준
- **상충 시 재확인(Conflict Resolution)**: 사용자의 새로운 지시가 기존 룰, 지시 내용 또는 요구사항과 상충될 경우, 독단적으로 이행하지 않고 반드시 사용자에게 **재확인**을 고지한 후 절차에 따라 실시합니다.
- **작업 및 검증 주체 명시 (Role Specification, R-01)**: 모든 실행 계획(Implementation Plan) 및 작업(Task) 문서에는 각 단계별 **수행 주체(Worker)**와 **검증 주체(Auditor)**를 명시적으로 표기합니다.

### 1. 에이전트 업무 표준 (Agent Compliance Standard)
- **세션 초기화 (Session Initialization, R-02)**: 모든 에이전트는 신규 세션 시작 시 반드시 다음 절차를 수행하여 환경을 동기화합니다.
  1. **PATH 설정**: `export PATH=$PATH:/opt/homebrew/bin` (도구 접근성 확보)
  2. **DB 확인**: 로컬 Supabase 구동 확인 및 연결 (원격 접속 시 사용자 승인 필수)
- **역할 및 지침 준수 (R&R Compliance)**: 모든 에이전트는 작업을 시작하기 전 본인의 역할(`103_AGENT_ROLES_SPEC.md`)과 작업 대상 폴더의 인덱스(`000_README.md`)를 반드시 확인하고 이를 기반으로 행동합니다.
- **상충 시 재확인 (Conflict Resolution)**: 사용자의 새로운 지시가 기존 룰, 지시 내용 또는 요구사항과 상충될 경우, 독단적으로 이행하지 않고 반드시 사용자에게 **재확인**을 고지한 후 절차에 따라 실시합니다.
- **작업 및 검증 주체 명시 (Role Specification, R-01)**: 모든 실행 계획(Implementation Plan) 및 작업(Task) 문서에는 각 단계별 **수행 주체(Worker)**와 **검증 주체(Auditor)**를 명시적으로 표기합니다.
- **진척 상태 최신화 의무 (Status Management, R-03)**: 앞으로 PM 역할 수행 시, 작업 완료 보고 전 반드시 전체 상태 문서(`WBS`, `ROADMAP`)의 상태를 확인하여 본 작업으로 인한 변경분을 반영하고 최신 상태로 유지(Update)해야 합니다.
- **체크리스트 기반 최종 검증 의무 (Verification Compliance, R-04)**: 모든 에이전트는 기능 개발, 수정, 버그 픽스 완료 보고 전 **반드시 최신 `LIVE_` 체크리스트(예: docs/08_Self_Audit/Checklists/LIVE_PHASE_2_EXECUTE.md)를 기반으로 자가 점검**을 마쳐야 합니다. 가이드 문서(`docs/00_GUIDE/`)는 마스터 템플릿으로 활용하며, 실제 검증은 축적된 `LIVE_` 문서를 진실의 근거(Source of Truth)로 삼습니다. (R-05 연계)
- **문서 이원화 준수 의무 (Hierarchy Compliance, R-05)**: 에이전트는 `GUIDE`와 `LIVE_` 문서의 차이를 명확히 이해하고 행동합니다. (상세: 제5항 참조)
- **최신 기술 자료 확인 의무 (Documentation Compliance, R-06)**: 라이브러리, 프레임워크, API 등 모든 기술 사양 확인 시, 에이전트의 내부 지식보다 **Context7 MCP를 우선적으로 호출**하여 최신 문서와 모범 사례를 기반으로 작업을 수행해야 합니다.
- **API 설계 우선 원칙 (API-First Design, R-11)**: 모든 기능 개발 시 코드 구현보다 **API 명세(Ds-11) 및 데이터 모델 설계**를 최우선으로 완료하고 사용자의 승인을 득해야 합니다. 명세가 확정되지 않은 상태에서의 구현은 금지되며, 구현 완료 시 명세서와의 일치 여부를 반드시 자가 검증해야 합니다.
- **명세-코드 동기화 의무 (Spec-Code Sync, R-12)**: API 사양 변경 시 반드시 `Ds-11_API_상세_명세서.md`를 선제적으로 업데이트해야 합니다. 코드와 명세의 불일치는 심각한 결함으로 간주됩니다.
- **언어 표준 준수 의무 (Language Standard, R-07)**: 모든 실행 계획(Implementation Plan), 작업 목록(Task), 변화 보고서(Walkthrough), 오류 보고서(SAR) 등 핵심 문서는 **반드시 한글로 작성**하여 사용자의 가독성과 소통 효율을 극대화합니다.
- **품질 검증 의무 (Mandatory Regression, R-08)**: 모든 에이전트는 작업 완료 및 진척 보고 전 반드시 표준 명령어(`npm run test:regression`)를 수행하여 기존 기능의 파괴 여부를 자가 점검하고, 성공 결과를 보고서에 증거로 첨부해야 합니다.
- **회귀 테스트 확장 의무 (Cumulative Verification, R-09)**: 모든 신규 기능 개발 및 수정 작업 이후에는 반드시 관련 **회귀 테스트 케이스를 신규 추가**하고, [회귀 테스트 마스터 맵](docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md)을 업데이트해야 합니다. 최종 보고 전 전체 회귀 테스트 재실행 및 성공 확인은 필수입니다.
- **기능-UI 결합 검증 의무 (UI-Backend Coupling, R-10)**: 모든 기능 개발 시 백엔드 로직(API/RPC)의 완성이 '완료'를 의미하지 않습니다. 해당 기능을 최종 사용자가 호출하고 결과를 확인할 수 있는 **물리적 UI(버튼, 페이지, 모달 등)가 완비**되고 실구동이 확인된 경우에만 WBS를 완료로 변경할 수 있습니다. 완료 보고 시 반드시 UI 구동 증적(스크린샷/녹화)을 포함해야 합니다.
- **테스트 결과물 관리 의무 (Artifact Management, R-13)**: 모든 테스트 결과(로그, 스크린샷 등)는 ROOT 폴더가 아닌 지정된 `docs/` 하부 폴더에 저장해야 합니다.
  - **E2E 테스트**: `docs/99_Manual/E2E_NN_Result/` (NN: 시나리오 번호)
  - **회귀 테스트**: `docs/08_Self_Audit/Regression_Results/`
  - **서버 로그**: `docs/archive/logs/`
  - **기타 임시 파일**: `scratch/` (디버그 스크립트 등)
- **E2E 테스트 환경 표준 (Test Environment, R-14)**: 모든 E2E 테스트 및 개발은 **로컬 Supabase 환경**을 원칙으로 수행합니다. 원격(Cloud) Supabase 접속 또는 동기화가 필요한 경우에는 독단적으로 수행하지 않고 반드시 사용자에게 요청하여 승인을 득한 후 실시합니다.

#### 🤖 에이전트 역할 및 모델 할당 (Role-Agent Mapping)
역할별 최적화된 모델을 사용하여 품질과 속도를 동시에 확보합니다. (상세: [103_AGENT_ROLES_SPEC.md](docs/00_GUIDE/103_AGENT_ROLES_SPEC.md))
- **Leadership (High)**: CEO, CTO, CIO - Gemini 3.1 Pro (High)
- **Product (Low)**: CPO - Gemini 3.1 Pro (Low)
- **Audit (Low/High)**: Audit Agent - Phase 1~2 (Low) / **Phase 3 (High)**
- **Operation (Fast)**: PM, Execution - Gemini 3 Flash

### 2. 코드 가이드라인 (ZEN_A4 Core Principles)
- **불변성 우선**: 데이터 구조는 가능한 한 불변(Immutable) 상태로 설계합니다.
- **길이 제한**: 함수는 50줄 이하, 개별 파일은 **800 ~ 1,000줄** 이하로 유지합니다.
- **파일 분리 전략**: 단일 파일이 1,000줄을 초과할 경우, 반드시 **개요(Overview)**와 **상세(Detail)** 파일로 분리하여 관리합니다.
- **명칭 준수**: 프로젝트 도메인 용어(송하인, 수하인 등 물류 용어)를 정확히 사용합니다.

### 3. 오류 대응 및 재발 방지 (SAR)
작업 중 오류 발견 시 다음 절차를 수행합니다.
1. **SAR 작성**: `docs/08_Self_Audit/SAR_reports/` 경로에 `SAR_YYYY-MM-DD_NNN_문제명.md` 형식으로 보고서를 작성합니다.
   - 규칙 참조: [docs/00_GUIDE/201_SAR_RULE.md](docs/00_GUIDE/201_SAR_RULE.md)
2. **체크리스트 업데이트**: 유사 오류 방지를 위해 관련 Phase 체크리스트에 항목을 추가합니다.
   - 절차 참조: [docs/00_GUIDE/202_CHECK_LIST_PROCEDURE.md](docs/00_GUIDE/202_CHECK_LIST_PROCEDURE.md)

### 4. 도구 활용 규칙
- **rtk proxy**: 모든 CLI 명령어는 `rtk` 도구를 경유하여 토큰 효율을 극대화합니다.
- **GSD 도구**: 복잡한 작업은 `/gsd-plan-phase` 명령을 통해 설계 문서를 먼저 생성합니다.

### 5. 문서 체계 및 운영 기준 (GUIDE vs LIVE)
제니스 프로젝트는 지식의 안정성과 운영의 역동성을 위해 문서를 이원화하여 관리합니다.
- **GUIDE (Master Template)**: `docs/00_GUIDE/` 경로에 위치한 파일들로, 프로젝트의 불변하는 표준 지침, 아키텍처 원칙, 마스터 체크리스트 템플릿을 정의합니다. (수정 시 CIO 승인 권장)
- **LIVE (Active Tracker)**: `docs/08_Self_Audit/Checklists/LIVE_` 혹은 기타 `LIVE_` 접두사가 붙은 파일들로, 특정 Phase나 현재 진행 중인 작업의 검증 항목을 실시간으로 축적(Cumulative)하고 기록합니다. 
- **운영 원칙**: 모든 에이전트는 모든 보고 및 검증 단계에서 **`LIVE_` 문서를 최우선 진실의 근거(Source of Truth)**로 사용해야 합니다.

## 📚 주요 참조 문서
- [방법론 상세 가이드](docs/00_GUIDE/101_ZEN_A4_METHODOLOGY.md)
- [통합 개발 절차](docs/00_GUIDE/102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md)
- [기술 결정 사항](/.planning/DECISIONS.md)
- [프로젝트 컨텍스트](/.planning/CONTEXT.md)

---

## 🔑 커밋 & 브랜치 규약 (Commit Convention, ENV-10)

> **목적**: Gemini 에이전트의 작업 이력을 git에 명확히 추적하기 위한 커밋 표준입니다.

- **커밋 태그**: 모든 커밋에 `[Gemini]` 접두사 필수 (R-01, commit-msg 훅 강제)
- **커밋 시점**: **Task 완료마다 즉시 커밋** (Phase 완료까지 미루지 않음 — ENV-09 위반 재발 방지)
- **메시지 형식**: `[Gemini] <type>: <description>`
  - type: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
  - 예시: `[Gemini] feat: BE-02 zen_tracking_raw_logs 테이블 생성 및 RLS 정책 적용`
- **커밋 전 필수**: `rtk npm run test:regression` PASS 확인 (R-08, pre-commit 훅 강제)
- **LAST_REGRESSION_RESULT**: 커밋 전 `.agent/LAST_REGRESSION_RESULT` 파일이 `PASS`여야 함

```bash
# 표준 커밋 절차
rtk npm run test:regression          # R-08 회귀 테스트 통과 확인
echo "PASS" > .agent/LAST_REGRESSION_RESULT   # 결과 기록
git add <변경파일>
git commit -m "[Gemini] feat: <작업 설명>"   # commit-msg 훅이 [Gemini] 태그 자동 검증
```

---

## 📝 개정 이력 (Revision History)

| 버전 | 날짜       | 작성자      | 설명                                                                          |
| :--- | :--------- | :---------- | :---------------------------------------------------------------------------- |
| v1.0 | 2026-04-16 | Antigravity | 초기 에이전트 업무 규정 수립 및 ZEN_A4 방법론 통합                            |
| v1.1 | 2026-04-16 | Antigravity | 파일 길이 제한(800-1000라인) 및 상충 시 재확인(Conflict Resolution) 규정 추가 |
| v1.2 | 2026-04-17 | Antigravity | 수행 및 검증 주체 명시 규정(R-01) 추가                                        |
| v1.3 | 2026-04-18 | Antigravity | 세션 초기화 필수 절차(PATH 설정 및 supabase login) 규정(R-02) 추가            |
| v1.4 | 2026-04-18 | Antigravity | PM 작업 완료 보고 시 WBS 및 ROADMAP 업데이트 룰(R-03) 추가                    |
| v1.5 | 2026-04-19 | Antigravity | 체크리스트 기반 최종 검증 및 i18n 경로 오류 방지 의무(R-04) 추가              |
| v1.6 | 2026-04-19 | Antigravity | 문서 체계 이원화(GUIDE vs LIVE) 수립 및 R-05(Source of Truth) 규정 추가       |
| v1.7 | 2026-04-20 | Antigravity | 모든 계획 및 보고서 한글 작성 의무화 규정(R-07) 추가                            |
| v1.8 | 2026-04-21 | Antigravity | 회귀 테스트 확장 의무(R-09) 및 마스터 맵 업데이트 규칙 추가                       |
| v1.9 | 2026-04-22 | Antigravity | 기능-UI 결합 검증 의무화 규정(R-10) 추가 및 UI 증적 필수화                       |
| v1.10| 2026-04-22 | Antigravity | API 설계 우선 원칙(R-11) 추가 및 개발 프로세스 내 명세 우선 준수 명시              |
| v1.11| 2026-04-22 | Antigravity | 명세-코드 동기화 의무(R-12) 추가 및 API First 가이드라인 구체화                    |
| v1.12| 2026-04-23 | Claude (Antigravity) | 커밋 & 브랜치 규약 섹션 추가 (ENV-10, Aiden 지시). commit-msg 훅 연동 명시. |
| v1.13| 2026-05-07 | Antigravity | E2E 테스트 로컬 Supabase 환경 우선 원칙 및 R-14 규칙 추가 |

