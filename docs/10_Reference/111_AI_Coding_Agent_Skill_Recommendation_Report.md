# 📊 AI Coding Agent Skill/Plugin/MCP 추천 보고서

> **문서 ID**: 111  
> **분류**: 📊 분석 & 보고  
> **목적**: 업무용 웹 서비스 개발용 AI Coding Agent 운용에 필요한 skill, plugin, MCP 구성을 권고한다  
> **대상**: CIO, Tech Lead, AI Agent 운영 담당자  
> **작성일**: 2026-04-27  
> **최종 수정**: 2026-04-27  
> **작성자**: Codex (AI)  
> **버전**: v1.0  

---

[← 목록으로 돌아가기](./000_README.md)

---

## 📌 개요

본 보고서는 ZENITH_LMS 프로젝트의 업무용 웹 서비스 개발에 맞추어, AI Coding Agent가 활용할 수 있는 역량을 `설계 / 구현 / 품질 / 운영전달 / 분석협업`으로 분류하고 현재 환경의 설치 상태와 연결 가능한 skill, plugin, MCP를 정리한 권고안이다.

핵심 목적은 다음과 같다.

- 현재 환경에서 즉시 활용 가능한 skill 세트를 정의한다
- plugin과 MCP의 현실적인 활용 가능 범위를 분리한다
- 과도하게 많은 skill 목록을 실무 운영 가능한 번들 구조로 축약한다

---

## 🔎 조사 범위와 기준

### 조사 범위

- 리포지토리: `ZENITH_LMS_001`
- 설치된 skill 소스:
  - `~/.codex/skills/.system`
  - `~/.agents/skills`
- plugin 캐시 위치:
  - `~/.codex/.tmp/plugins/plugins`
- 현재 세션 MCP 상태:
  - Codex MCP resource / template 조회 결과

### 판정 기준

- **직접 매핑 가능**: 업무용 웹 서비스 개발 작업에 곧바로 투입 가능한 skill
- **보조 매핑 가능**: 설계 협업, 배포, 외부 서비스 연계 등 간접 지원 용도
- **현재 세션 미사용**: 파일 또는 캐시는 존재하나 현재 세션에서 활성 상태가 확인되지 않음

---

## 🧾 현재 상태 요약

### 1. Skills

현재 환경에는 다수의 skill이 설치되어 있으며, 그중 업무용 웹 서비스 개발에 직접 연결 가능한 후보가 충분하다.

### 2. Plugins

`~/.codex/.tmp/plugins/plugins/` 아래에 다수의 plugin 패키지가 존재한다. 다만 이는 캐시 또는 설치 흔적 기준이며, 현재 세션에서 활성 plugin으로 바로 사용 가능하다고 단정할 수는 없다.

### 3. MCP

현재 세션 기준 MCP resource 및 template 조회 결과는 모두 비어 있다. 즉, **실제 연결되어 바로 호출 가능한 MCP는 없는 상태**로 판단한다.

### 4. 결론

현재 환경은 다음과 같이 보는 것이 정확하다.

- **Skill 중심 운영은 즉시 가능**
- **Plugin은 후보군은 많지만 활성 여부 재확인이 필요**
- **MCP 기반 자동 연동은 아직 공백**

---

## 🏗️ 업무용 웹 서비스용 AI Coding Agent 분류 체계

### 1. 설계 스킬

주요 역할:

- 요구사항 구조화
- 도메인/아키텍처 설계
- API 계약 설계
- 인증/인가 설계
- DB 스키마 설계

직접 매핑 가능한 skills:

- `analyze-project`
- `architecture`
- `software-architecture`
- `architecture-patterns`
- `api-design-principles`
- `api-endpoint-builder`
- `auth-implementation-patterns`
- `database-design`
- `openapi-spec-generation`

보조 plugin 후보:

- `figma`
- `linear`
- `github`

MCP 매핑:

- 현재 없음

### 2. 구현 스킬

주요 역할:

- Next.js/React UI 구현
- 서버/API 구현
- 상태관리 및 검증
- 인증 연동
- 파일 업로드
- ORM/DB 구현

직접 매핑 가능한 skills:

- `react-nextjs-development`
- `nextjs-best-practices`
- `nextjs-app-router-patterns`
- `frontend-developer`
- `frontend-dev-guidelines`
- `backend-dev-guidelines`
- `nodejs-backend-patterns`
- `react-patterns`
- `tailwind-patterns`
- `shadcn`
- `radix-ui-design-system`
- `zustand-store-ts`
- `tanstack-query-expert`
- `zod-validation-expert`
- `file-uploads`
- `clerk-auth`
- `nextjs-supabase-auth`
- `postgresql`
- `prisma-expert`
- `drizzle-orm-expert`
- `database-migrations-sql-migrations`

보조 plugin 후보:

- `github`
- `vercel`
- `neon-postgres`
- `cloudinary`
- `cloudflare`
- `netlify`

MCP 매핑:

- `cloudflare/.mcp.json` 파일은 존재하나 현재 세션 미연결
- 직접 호출 가능한 활성 MCP는 현재 없음

### 3. 품질 스킬

주요 역할:

- 단위/통합/E2E 테스트
- 접근성 점검
- 성능 점검
- 보안 점검
- 코드 리뷰 및 감사

직접 매핑 가능한 skills:

- `testing-qa`
- `test-automator`
- `unit-testing-test-generate`
- `e2e-testing`
- `playwright-skill`
- `webapp-testing`
- `accessibility-compliance-accessibility-audit`
- `fixing-accessibility`
- `performance-optimizer`
- `web-performance-optimization`
- `k6-load-testing`
- `security-audit`
- `security-auditor`
- `web-security-testing`
- `api-security-best-practices`
- `code-reviewer`
- `production-code-audit`

보조 plugin 후보:

- `github`
- `jam`
- `amplitude`

MCP 매핑:

- 현재 없음

### 4. 운영/전달 스킬

주요 역할:

- CI/CD
- 배포
- 배포 검증
- 관측성
- 에러 추적
- 문서화 및 전달

직접 매핑 가능한 skills:

- `cloud-devops`
- `devops-deploy`
- `vercel-deployment`
- `github-actions-templates`
- `deployment-validation-config-validate`
- `observability-engineer`
- `sentry-automation`
- `analytics-tracking`
- `documentation`
- `pr-writer`

보조 plugin 후보:

- `vercel`
- `github`
- `netlify`
- `amplitude`
- `linear`

MCP 매핑:

- 현재 없음

### 5. 분석/협업 스킬

주요 역할:

- 코드베이스 탐색
- 영향도 분석
- 문제 원인 분석
- 설계/PR 설명
- 운영 문서 정리

직접 매핑 가능한 skills:

- `analyze-project`
- `documentation`
- `pr-writer`
- `code-reviewer`
- `production-code-audit`

보조 plugin 후보:

- `github`
- `linear`
- `notion`
- `slack`

MCP 매핑:

- 현재 없음

---

## ✅ 최종 추천안: 필수 / 권장 / 선택

### 1. 필수 Skill Set

업무용 웹 서비스에서 거의 항상 필요한 기본 세트다.

#### 설계

- `analyze-project`
- `architecture`
- `api-design-principles`
- `database-design`
- `auth-implementation-patterns`

#### 구현

- `react-nextjs-development`
- `nextjs-best-practices`
- `nextjs-app-router-patterns`
- `frontend-dev-guidelines`
- `backend-dev-guidelines`
- `nodejs-backend-patterns`
- `zod-validation-expert`

#### 데이터

- `postgresql`
- `database-migrations-sql-migrations`
- `prisma-expert` 또는 `drizzle-orm-expert`

#### 품질

- `testing-qa`
- `unit-testing-test-generate`
- `e2e-testing`
- `playwright-skill`
- `code-reviewer`
- `production-code-audit`

#### 운영

- `github-actions-templates`
- `vercel-deployment`
- `deployment-validation-config-validate`
- `observability-engineer`

### 2. 권장 Skill Set

서비스 완성도와 유지보수성을 높이는 세트다.

- `react-patterns`
- `tailwind-patterns`
- `shadcn`
- `radix-ui-design-system`
- `tanstack-query-expert`
- `zustand-store-ts`
- `accessibility-compliance-accessibility-audit`
- `fixing-accessibility`
- `web-performance-optimization`
- `performance-optimizer`
- `web-security-testing`
- `api-security-best-practices`
- `documentation`
- `pr-writer`
- `sentry-automation`
- `analytics-tracking`
- `cloud-devops`

### 3. 선택 Skill Set

조직 정책, 제품 특성, 인프라 상황에 따라 붙이는 세트다.

- `clerk-auth`
- `nextjs-supabase-auth`
- `file-uploads`
- `openapi-spec-generation`
- `k6-load-testing`

---

## 📦 추천 운영 번들

Skill이 많을수록 운영이 어려워지므로, 실제 사용은 번들 단위가 적절하다.

### 1. Core Build Bundle

- `analyze-project`
- `architecture`
- `react-nextjs-development`
- `nextjs-best-practices`
- `frontend-dev-guidelines`
- `backend-dev-guidelines`
- `nodejs-backend-patterns`
- `zod-validation-expert`

### 2. Data Build Bundle

- `database-design`
- `postgresql`
- `prisma-expert` 또는 `drizzle-orm-expert`
- `database-migrations-sql-migrations`
- `auth-implementation-patterns`

### 3. Quality Bundle

- `testing-qa`
- `unit-testing-test-generate`
- `e2e-testing`
- `playwright-skill`
- `code-reviewer`
- `production-code-audit`
- `web-security-testing`
- `accessibility-compliance-accessibility-audit`

### 4. Delivery Bundle

- `github-actions-templates`
- `vercel-deployment`
- `deployment-validation-config-validate`
- `observability-engineer`
- `sentry-automation`
- `documentation`
- `pr-writer`

---

## 🔌 Plugin 추천안

현재 확인된 plugin 캐시 중 업무용 웹 서비스 개발에 의미 있는 후보는 아래와 같다.

### 개발/배포

- `github`
- `vercel`
- `cloudflare`
- `netlify`
- `neon-postgres`

### 협업/기획

- `linear`
- `notion`
- `slack`
- `figma`

### 운영/분석

- `amplitude`
- `jam`

### 주의

위 목록은 **활성 plugin 목록이 아니라 활용 후보군**이다. 실제 사용 전에는 세션 또는 클라이언트 설정에서 활성화 여부를 재확인해야 한다.

---

## 🔗 MCP 도입 우선순위

현재 MCP가 비어 있으므로, 자동화 수준을 높이려면 아래 순서로 도입하는 것이 합리적이다.

### 1순위

- `GitHub MCP`
  - 이슈, PR, 코드리뷰, 릴리즈 추적
- `Linear MCP`
  - 작업 분해, 상태 연결, 에이전트 협업
- `Browser/DevTools MCP`
  - 화면 검증, 런타임 점검, UI 회귀 확인

### 2순위

- `OpenAI Docs MCP`
  - 공식 문서 기반 정확한 참조
- `Postgres/DB 계열 MCP`
  - 스키마 조회, 운영 점검 자동화

### 3순위

- `Cloudflare` 또는 `Vercel` 연계 MCP
  - 배포, 환경, edge/runtime 운영 연동

---

## 🧭 운영 권고안

### 최소 운영안

초기에는 다음 원칙으로 운용하는 것이 적절하다.

- Skill은 **25개 내외 핵심 세트**로 제한
- Plugin은 `github`, `vercel`, `linear`, `notion`, `figma` 중심으로 선별
- MCP는 `GitHub`, `Linear`, `Browser/DevTools`를 우선 도입

### 작업 단계별 권장 조합

#### 설계 시작

- `Core Build Bundle`
- `Data Build Bundle`

#### 구현 진행

- `Core Build Bundle`

#### 배포 전 검증

- `Quality Bundle`
- `Delivery Bundle`

#### 장애 분석 및 개선

- `Quality Bundle`
- `Delivery Bundle`
- `analyze-project`

---

## 📝 최종 결론

현재 환경에서 가장 현실적인 전략은 다음과 같다.

1. Skill은 이미 충분하므로, **많이 보유하는 것보다 운영 가능한 핵심 세트로 축약**한다.
2. Plugin은 후보가 많지만 활성 상태가 불명확하므로, **업무 연관성이 높은 소수만 선별 운영**한다.
3. MCP는 현재 공백이므로, **GitHub/Linear/Browser 중심으로 우선 연결**하는 것이 투자 대비 효과가 크다.

즉, ZENITH_LMS의 업무용 웹 서비스 개발용 AI Coding Agent 체계는 현재 시점에서 **Skill 중심 운영 + 제한적 Plugin 채택 + 단계적 MCP 도입**이 가장 타당하다.

---

## 📝 버전 이력

| 버전 | 날짜 | 작성자 | 변경 사항 |
|------|------|--------|---------|
| v1.0 | 2026-04-27 | Codex (AI) | 초안 작성 |

