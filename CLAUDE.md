# PJT_2026_010 (ZENITH_LMS)

> **프로젝트:** ZENITH_LMS (지능형 통합 물류 관리 플랫폼)  
> **문서번호:** Gov-02  
> **작성자:** Antigravity (AI Agent) / Claude Code  
> **작성일:** 2026-04-16  
> **최종 수정:** 2026-04-20  
> **버전:** v2.1 (프로젝트 격상 - 물류 ECO 플랫폼)

> [!IMPORTANT]
> 본 문서는 **모든 개발자 및 AI 에이전트**를 위한 통합 규정입니다.
>
> - **Claude 에이전트**: 본 문서의 전체 규정 준수 (Gov-02)
> - **Gemini 에이전트**: 본 문서 + [GEMINI.md](GEMINI.md) 병행 (Gov-01 참조)
> - **일반 개발자**: 아래 규정 및 관련 가이드 문서(`docs/00_GUIDE/`) 준수

## Project Overview

**ZENITH_LMS**(지능형 통합 물류 관리 플랫폼)는 세계적 물류 관리를 지능화·효율화하는 **물류 ECO 플랫폼**입니다.

### 플랫폼 특성

- **멀티 스테이크홀더**: 화주(일반/법인), 운송업자(항공/운항/육상/택배), 플랫폼 운영자
- **엔드투엔드 솔루션**: 오더 접수 → 창고 관리 → 실시간 트래킹 → 지능형 배정 → 회계 정산
- **지능화**: AI 기반 경로 최적화, 수요 예측, 이상 탐지
- **글로벌 확장성**: 다국가, 다통화, 다언어 지원

## Tech Stack

### Frontend & Backend

- **Language**: TypeScript
- **Framework**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Auth**: Supabase Auth (OAuth, Magic Link)

### Intelligence & AI

- **LLM**: Claude API (경로 최적화, 수요 예측)
- **Real-time**: WebSockets (실시간 트래킹, 배정)
- **Analytics**: Time-series DB (TrackingDB), Aggregation
- **Caching**: Redis (세션, 캐시)

### Multi-Stakeholder Support

- **i18n**: next-intl (다국어)
- **Currency**: Localized pricing (다통화)
- **Payment**: Stripe (다국가 결제)
- **Maps**: Google Maps API (지도, 경로)

## 🔧 에이전트 업무 표준 (Agent Compliance Standard)

### 신규 세션 시작 필수 절차 (R-02: Session Initialization)

> [!IMPORTANT]
> **모든 에이전트는 신규 세션 시작 시 반드시 다음을 수행:**

1. **PATH 설정** (도구 접근성 확보)

   ```bash
   export PATH=$PATH:/opt/homebrew/bin
   ```

1. **Supabase 로그인** (원격 DB 접근 권한 확보)

   ```bash
   rtk supabase login
   ```

1. **모든 CLI 명령어는 RTK 경유** (토큰 효율 극대화)

   ```bash
   rtk <command>  # 예: rtk npm run dev, rtk gh pr list
   ```

### 역할 및 지침 준수 (R&R Compliance)

작업 시작 전 반드시 확인:

- 본인의 역할: [docs/00_GUIDE/103_AGENT_ROLES_SPEC.md](docs/00_GUIDE/103_AGENT_ROLES_SPEC.md)
- 대상 폴더의 인덱스: 각 폴더의 `000_README.md`

### 상충 시 재확인 (Conflict Resolution)

사용자의 새로운 지시가 기존 룰/요구사항과 상충할 경우:

- ❌ 독단적으로 이행 금지
- ✅ 반드시 사용자에게 **재확인** 고지 후 절차에 따라 실시

### 수행/검증 주체 명시 (R-01: Role Specification)

모든 실행 계획(Implementation Plan) 및 작업(Task) 문서에는:

- 각 단계별 **수행 주체(Worker)** 명시
- 각 단계별 **검증 주체(Auditor)** 명시

### 진척 상태 최신화 (R-03: Status Management)

PM 역할 수행 시, 작업 완료 보고 전 반드시:

- [ ] `WBS` 상태 확인 및 갱신
- [ ] `ROADMAP` 상태 확인 및 갱신
- [ ] 본 작업의 변경분 반영

### 체크리스트 기반 최종 검증 (R-04: Verification Compliance)

기능 개발/수정/버그 픽스 완료 보고 전:

1. **`LIVE_` 체크리스트를 진실의 근거(Source of Truth)로 사용**
   - 예: `docs/08_Self_Audit/Checklists/LIVE_PHASE_2_EXECUTE.md`
2. **자가 점검** 반드시 완료
3. 가이드 문서(`docs/00_GUIDE/`)는 마스터 템플릿으로 활용

### 문서 이원화 준수 (R-05: Hierarchy Compliance)

**GUIDE vs LIVE 문서 체계**

| 구분 | 위치 | 용도 | 수정 권한 |
| --- | --- | --- | --- |
| **GUIDE** | `docs/00_GUIDE/` | 마스터 템플릿, 불변 표준 | CIO 승인 권장 |
| **LIVE** | `docs/08_Self_Audit/Checklists/LIVE_*` | 실시간 추적, 누적 검증 | 모든 에이전트 |
| **운영 원칙** | - | 모든 검증은 **`LIVE_` 문서를 최우선** | - |

### 최신 기술 자료 확인 (R-06: Documentation Compliance)

라이브러리, 프레임워크, API 등 기술 사양 확인 시:

- ✅ **Context7 MCP 우선 호출** (최신 문서)
- ❌ 에이전트 내부 지식은 참고만 함

## 💻 코드 가이드라인 (ZEN_A4 Core Principles)

### 불변성 (Immutability) - 최우선

데이터 구조는 가능한 한 **불변(Immutable) 상태**로 설계합니다.

### 길이 제한

- **함수**: 50줄 이하
- **파일**: 800 ~ 1,000줄 이하
- **초과 시 분리**: 1,000줄을 초과할 경우 **개요(Overview)**와 **상세(Detail)** 파일로 분리

### 기타 규칙

- 커밋 메시지: `<type>: <description>` (feat, fix, refactor, docs, test, chore)
- 브랜치 전략: `main` / `feature/*` / `fix/*`
- **명칭 준수**: 프로젝트 도메인 용어 정확히 사용 (송하인, 수하인 등 물류 용어)

## 🚨 오류 대응 및 재발 방지 (SAR)

### 오류 발견 시 절차

1. **SAR 작성** (Self Audit Report)
   - 경로: `docs/08_Self_Audit/SAR_reports/`
   - 형식: `SAR_YYYY-MM-DD_NNN_문제명.md`
   - 규칙: [docs/00_GUIDE/201_SAR_RULE.md](docs/00_GUIDE/201_SAR_RULE.md)

2. **체크리스트 업데이트** (재발 방지)
   - 유사 오류 방지를 위해 관련 Phase 체크리스트에 항목 추가
   - 절차: [docs/00_GUIDE/202_CHECK_LIST_PROCEDURE.md](docs/00_GUIDE/202_CHECK_LIST_PROCEDURE.md)

## 🛠️ 도구 활용 규칙

### RTK (Rust Token Killer)

모든 CLI 명령어는 **`rtk` 도구를 경유**하여 토큰 효율을 극대화합니다.

```bash
rtk npm run dev        # npm 명령어 최적화
rtk gh pr list         # GitHub CLI 최적화
rtk git status         # Git 명령어 최적화
rtk cc-economics       # Claude Code 비용 분석
```

### GSD 도구

복잡한 작업은 `/gsd-plan-phase` 명령을 통해 설계 문서를 먼저 생성합니다.

## 📚 주요 참조 문서

### GUIDE (마스터 템플릿)

- [ZEN_A4 방법론](docs/00_GUIDE/101_ZEN_A4_METHODOLOGY.md)
- [통합 개발 절차](docs/00_GUIDE/102_INTEGRATED_DEVELOPMENT_METHODOLOGY.md)
- [에이전트 역할 정의](docs/00_GUIDE/103_AGENT_ROLES_SPEC.md)
- [SAR 작성 규칙](docs/00_GUIDE/201_SAR_RULE.md)
- [체크리스트 관리 절차](docs/00_GUIDE/202_CHECK_LIST_PROCEDURE.md)

### 프로젝트 문서

- [기술 의사결정](/.planning/DECISIONS.md)
- [프로젝트 컨텍스트](/.planning/CONTEXT.md)
- [Gemini 에이전트 규정](GEMINI.md) (AI 에이전트 전용)

---

## 📝 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
| --- | --- | --- | --- |
| v1.0 | 2026-04-16 | Antigravity | 초기 프로젝트 규정 수립 |
| v2.0 | 2026-04-20 | Claude Code | GEMINI.md 통합, 에이전트 업무 표준 추가 |
| v2.1 | 2026-04-20 | Edward Kwon | 프로젝트 격상: 물류 ECO 플랫폼, 멀티 스테이크홀더 지원, 지능화 기능 추가 |
