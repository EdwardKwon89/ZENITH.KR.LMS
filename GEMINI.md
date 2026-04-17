# GEMINI.md - Antigravity & Gemini Work Regulations

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **문서번호:** Gov-01
> **작성자:** Antigravity (AI Agent)
> **작성일:** 2026-04-16
> **버전:** v1.1

이 문서는 SNTL 통합 물류 플랫폼(ZENITH_LMS) 개발에 참여하는 AI 에이전트(Antigravity, Gemini)의 업무 규정을 정의합니다. 모든 에이전트는 본 문서와 `CLAUDE.md`에 명시된 ZEN_A4 방법론을 철저히 준수해야 합니다.

## 🚀 에이전트 업무 표준
- **상충 시 재확인(Conflict Resolution)**: 사용자의 새로운 지시가 기존 룰, 지시 내용 또는 요구사항과 상충될 경우, 독단적으로 이행하지 않고 반드시 사용자에게 **재확인**을 고지한 후 절차에 따라 실시합니다.

### 1. 개발 방법론: ZEN_A4 (GSD Hybrid)
에이전트는 모든 작업 수행 시 다음 4단계 워크플로우를 반드시 따릅니다.
- **Phase 1 (Design)**: 설계 및 `Self Check` (필수)
- **Phase 2 (Implement)**: 구현 및 `Self Test` (필수)
- **Phase 3 (Verify)**: 결과 검증 및 교차 체크 (Audit Agent 검증 필수)
- **Phase 4 (Commit)**: 규정에 맞는 깃 커밋

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

## 📚 주요 참조 문서
- [방법론 상세 가이드](docs/00_GUIDE/101_ZEN_A4_METHODOLOGY.md)
- [통합 개발 절차](docs/00_GUIDE/102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md)
- [기술 결정 사항](/.planning/DECISIONS.md)
- [프로젝트 컨텍스트](/.planning/CONTEXT.md)

---

## 📝 개정 이력 (Revision History)

| 버전 | 날짜 | 작성자 | 설명 |
|:---|:---|:---|:---|
| v1.0 | 2026-04-16 | Antigravity | 초기 에이전트 업무 규정 수립 및 ZEN_A4 방법론 통합 |
| v1.1 | 2026-04-16 | Antigravity | 파일 길이 제한(800-1000라인) 및 상충 시 재확인(Conflict Resolution) 규정 추가 |
