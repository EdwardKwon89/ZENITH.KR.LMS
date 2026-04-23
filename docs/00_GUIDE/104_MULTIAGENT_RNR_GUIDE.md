---
tags: ["governance"]
---

# 104_MULTIAGENT_RnR_GUIDE (멀티 에이전트 역할 및 협업 가이드)

> **프로젝트**: ZENITH_LMS
> **문서번호**: Gov-04
> **작성자**: Claude (ZEN_CEO 지시)
> **작성일**: 2026-04-23
> **버전**: v1.1

이 문서는 ZENITH_LMS 프로젝트에 참여하는 전체 멀티 에이전트의 역할(R&R), 사용 모델, 협업 절차, 그리고 컴플라이언스 강제 수행 구조를 정의합니다. 향후 `CLAUDE.md` 및 `103_AGENT_ROLES_SPEC.md` 업데이트의 기반 문서로 활용됩니다.

---

## 🏗️ 1. 전체 에이전트 계층 구조

```
┌──────────────────────────────────────────────────────────────────────────┐
│  TIER 1 — Supreme                                                        │
│  Master (Edward) · Human · 최종 의사결정, 방향 설정, 아키텍처 승인         │
└──────────────────────────────────────────────────────────────────────────┘
            │
┌──────────────────────────────────────────────────────────────────────────┐
│  TIER 2 — Strategic Leadership (Claude)                                  │
│  ZEN_CEO (Claude Opus 4.7)   CTO (Claude Sonnet 4.6)                    │
│  전략 오케스트레이션           기술 결정 + 테크니컬 오케스트레이션          │
└──────────────────────────────────────────────────────────────────────────┘
            │                           │
┌───────────────────────┐   ┌───────────────────────────────────────────────┐
│  TIER 3 — Product     │   │  TIER 3 — Information Architecture            │
│  CPO (Gemini Low)     │   │  CIO (Gemini High)                            │
│  PRD, UAT 시나리오     │   │  데이터 모델, DB Migration 게이트, .env 관리   │
└───────────────────────┘   └───────────────────────────────────────────────┘
            │
┌──────────────────────────────────────────────────────────────────────────┐
│  TIER 4 — Operations                                                     │
│  PM (Gemini Flash)                                                       │
│  Frontend Execution (Claude Sonnet ← CTO 직접 수행)                      │
│  Backend Execution  (Gemini Flash)                                       │
│  Audit / Business QA (Gemini Low→High)                                   │
└──────────────────────────────────────────────────────────────────────────┘
            │
┌──────────────────────────────────────────────────────────────────────────┐
│  TIER 5 — Sub-Agent Pool (Claude Code 내장 GSD 에이전트)                  │
│  gsd-executor · gsd-verifier · gsd-debugger · gsd-nyquist-auditor       │
│  gsd-planner · gsd-plan-checker · gsd-phase-researcher                  │
└──────────────────────────────────────────────────────────────────────────┘
```

> **Tier 6 (Ollama) 삭제 확정**: 로컬 메모리 한계로 제외 (2026-04-23 Edward 확정)

---

## 🪪 1-2. 에이전트 페르소나 이름 (확정)

| 페르소나 | 역할 | 플랫폼 | 호칭 |
|:---|:---|:---|:---|
| **Aiden (에이든)** | ZEN_CEO | Claude Opus 4.7 | 전략 총괄, 최종 결정자 |
| **Riley (라일리)** | CPO + **Header Agent** | Gemini Pro High | Gemini 측 단일 창구 및 내부 위임 총괄 |

> **운영 원칙**: Aiden은 Riley에게만 지시한다. Riley는 내부적으로 PM·Backend Execution·Audit에 위임하며, Aiden은 Gemini 내부 sub-agent 구조에 직접 관여하지 않는다.

---

## 👤 2. 에이전트별 상세 정의

### 2-1. ZEN_CEO (Aiden) | Claude Opus 4.7

| 항목 | 내용 |
| :--- | :--- |
| **역할** | 전략 오케스트레이션, 전체 방향 설정, 아키텍처 최종 결정 |
| **모델** | Claude Opus 4.7 (`claude-opus-4-7`) |
| **컨텍스트** | ~200K tokens |
| **핵심 책임** | Phase 계획 수립, 에이전트 작업 할당, 품질 게이트 최종 확인, SAR 심층 분석 |
| **GSD Skills** | `/gsd:plan-phase`, `/gsd:next`, `/gsd:manager`, `/gsd:health` |
| **Sub-Agents 호출** | `gsd-planner`, `gsd-plan-checker`, `gsd-phase-researcher` |
| **참조 규정** | CLAUDE.md R-01~R-12, 103_AGENT_ROLES_SPEC.md |
| **협업 채널** | `.agent/TASK_BOARD.md` (작업 지시), `.agent/HANDOFF_BOX.md` (인계) |
| **Git 태그** | `[Claude]` |

**특화 강점**: 심층 추론, 복잡한 트레이드오프 분석, 에이전트 오케스트레이션 (Agent 툴 네이티브 지원)

---

### 2-2. CTO | Claude Sonnet 4.6

| 항목 | 내용 |
| :--- | :--- |
| **역할** | 기술 결정 + 테크니컬 오케스트레이션 + 품질 게이트 |
| **모델** | Claude Sonnet 4.6 (`claude-sonnet-4-6`) |
| **컨텍스트** | ~200K tokens |
| **핵심 책임** | 기술 스택 선정, API 설계 리뷰, 통합·회귀 테스트 설계, Vercel 배포 게이트, Phase VERIFICATION 관리 |
| **GSD Skills** | `/gsd:execute-phase`, `/gsd:verify-work`, `/gsd:debug`, `/gsd:plan-phase` |
| **Sub-Agents 호출** | `gsd-executor`, `gsd-verifier`, `gsd-debugger`, `gsd-nyquist-auditor` |
| **MCP** | Vercel MCP (배포 게이트), Context7 MCP (기술 문서), Supabase MCP |
| **참조 규정** | CLAUDE.md R-06, R-08, R-10, R-11, R-12 |
| **협업 채널** | `.agent/TASK_BOARD.md` (기술 태스크 확인), `.agent/HANDOFF_BOX.md` |
| **Git 태그** | `[Claude]` |

**특화 강점**: 코드 리뷰 자동화, 보안 검토, Context7 통한 최신 문서 참조, Sub-Agent 병렬 실행, React/Next.js/Tailwind 프론트엔드 구현

> **테크니컬 오케스트레이션 흡수 이유**: CTO의 기술 결정권 + Sub-Agent 스폰 능력이 동일 권한 범위이므로 역할 분리 없이 CTO가 통합 수행. 별도 Technical Orchestrator Agent 불필요.

> **Frontend Execution 겸임**: UI/UX 컴포넌트(React, Next.js, Tailwind), 복잡한 프론트엔드 인터랙션 구현은 Claude Sonnet의 업계 최고 수준 성능을 활용하여 CTO가 직접 수행한다. 백엔드 DB 로직·대규모 마이그레이션은 Gemini Flash(Backend Execution)에 위임하여 각자의 강점 영역에 집중한다.

---

### 2-3. CIO | Gemini High (Antigravity)

| 항목 | 내용 |
| :--- | :--- |
| **역할** | 정보 아키텍처, 문서 무결성, DB 마이그레이션 게이트, .env 관리 |
| **모델** | Gemini Pro High |
| **컨텍스트** | ~1M tokens (장기 문서 컨텍스트 강점) |
| **핵심 책임** | ERD 설계, API 명세서(`Ds-11`) 관리, 마이그레이션 파일 승인, 인덱스(`000_README.md`) 상시 관리, .env 변경 이력 관리 |
| **DB Migration 게이트** | 마이그레이션 PR은 CIO의 스키마 검토 후 승인 필요 |
| **참조 규정** | GEMINI.md R-11, R-12, R-05 |
| **협업 채널** | `.agent/HANDOFF_BOX.md` (DB 스키마 변경 공지) |
| **Git 태그** | `[Gemini]` |

---

### 2-4. CPO / Header Agent (Riley) | Gemini Pro High

| 항목 | 내용 |
| :--- | :--- |
| **역할** | **Header Agent** (Gemini 측 단일 창구) + 제품 명세, UI/UX 디자인 기준, UAT 시나리오 정의 |
| **모델** | Gemini Pro High (Header 책임 반영, Low → High 조정) |
| **핵심 책임** | PRD 작성, 비즈니스 테스트 케이스 확정, 사용자 스토리 관리 |
| **테스트 소유권** | UAT 시나리오 도출 및 합격 기준 정의 (실행은 QA Architect에 위임) |
| **참조 규정** | GEMINI.md R-04, R-10 |
| **Git 태그** | `[Gemini]` |

**UI/UX 디자인 및 일관성 관리 상세**:

| 단계 | CPO 책임 |
|:---|:---|
| **기준 정의** | Design Token(색상, 타이포, 간격), 컴포넌트 명세, 화면별 UI 스펙(와이어프레임 수준) |
| **Style Guide 관리** | shadcn/ui 컴포넌트 사용 기준, Tailwind 클래스 컨벤션, 공통 레이아웃 패턴 |
| **구현 전 승인** | Frontend Execution(Claude Sonnet) 착수 전 UI 스펙 확정 및 승인 (R-11 준용) |
| **구현 후 검수** | 완성된 UI가 명세와 일치하는지 최종 확인 및 승인 |
| **일관성 감사** | 신규 화면이 기존 디자인 패턴과 일관성을 유지하는지 상시 검토 |

**도메인 지식 오너십 (v1.2 추가)**:

| 책임 | 내용 |
|:---|:---|
| **도메인 Source of Truth** | [`105_DOMAIN_KNOWLEDGE.md`](./105_DOMAIN_KNOWLEDGE.md) 문서를 소유·관리 |
| **업무 규칙 정의** | 물류 용어, 계산 공식, 상태 전이, 엣지케이스 카탈로그 최신화 |
| **에이전트 질의 대응** | 도메인 의사결정 필요 시 모든 에이전트의 질의를 받아 문서에 추가 후 회신 |
| **PRD 도메인 검증** | PRD 작성 시 도메인 지식 문서와의 일치 여부 자체 검증 |

> **운영 원칙**: 물류 도메인 판단이 필요한 모든 에이전트는 `105_DOMAIN_KNOWLEDGE.md`를 먼저 참조하고, 문서에 없는 사항은 CPO(Riley)에게 질의하여 문서 추가 후 구현한다.

**Header Agent 운영 원칙 (v1.3 추가)**:

| 원칙 | 내용 |
|:---|:---|
| **단일 창구** | Aiden의 모든 지시·질의는 Riley를 통해 수신 |
| **내부 위임** | Riley는 PM·Backend Execution·Audit에 내부 위임하며, Aiden은 해당 과정에 관여하지 않음 |
| **완료 보고** | 내부 sub-agent 작업 완료 후 Riley가 TASK_BOARD에 통합 보고 |
| **에스컬레이션** | Riley가 판단 불가한 전략적 사항만 Aiden에게 에스컬레이션 |

---

### 2-5. PM | Gemini Flash (Antigravity, Riley 위임)

| 항목 | 내용 |
| :--- | :--- |
| **역할** | WBS 관리, 진척도 추적, 배포 상태 기록 |
| **모델** | Gemini Flash |
| **핵심 책임** | WBS 업데이트(R-03), ROADMAP 최신화, 작업 로그(LOG) 관리, Vercel 배포 상태 기록 |
| **DevOps 역할 흡수** | 배포 상태 추적 및 WBS 반영 (실제 배포 게이트는 CTO가 Vercel MCP로 수행) |
| **참조 규정** | GEMINI.md R-03 |
| **협업 채널** | `.agent/TASK_BOARD.md` (상태 업데이트) |
| **Git 태그** | `[Gemini]` |

---

### 2-6. Execution — 역할 분리 (Frontend / Backend)

> **Antigravity 제안 반영 (v1.1)**: Execution을 단일 역할에서 도메인별로 분리하여 각 AI의 강점을 극대화한다.

#### Frontend Execution | Claude Sonnet 4.6 (CTO 직접 수행)

| 항목 | 내용 |
| :--- | :--- |
| **역할** | UI/UX 컴포넌트 구현, 프론트엔드 인터랙션 |
| **모델** | Claude Sonnet 4.6 (CTO와 동일 세션) |
| **담당 영역** | React/Next.js 컴포넌트, Tailwind CSS, shadcn/ui, 폼 검증, 클라이언트 상태 관리 |
| **핵심 책임** | 복잡한 UI 로직 구현, 접근성(a11y) 준수, 반응형 레이아웃 |
| **테스트 소유권** | 컴포넌트 단위 테스트 작성 (코드와 병행) |
| **참조 규정** | CLAUDE.md R-08, R-09, R-10 |
| **Git 태그** | `[Claude]` |

#### Backend Execution | Gemini Flash (Antigravity)

| 항목 | 내용 |
| :--- | :--- |
| **역할** | 백엔드 API, DB 로직, 대규모 데이터 처리 구현 |
| **모델** | Gemini Flash |
| **컨텍스트 강점** | 1M tokens → 대규모 코드베이스·마이그레이션 일관성 유지 |
| **담당 영역** | Supabase RPC/Function, DB 트랜잭션, 복잡한 쿼리, 마이그레이션 로직, 외부 API 연동 |
| **핵심 책임** | TDD 기반 백엔드 구현, 단위 테스트 작성, 데이터 무결성 보장 |
| **테스트 소유권** | 구현 코드와 함께 단위 테스트 작성 (코드와 1:1 병행) |
| **참조 규정** | GEMINI.md R-08, R-09, R-10 |
| **Git 태그** | `[Gemini]` |

**분리 기준 요약**:

| 기준 | Frontend Execution (Claude) | Backend Execution (Gemini) |
|:---|:---|:---|
| 주요 파일 | `app/`, `components/`, `*.tsx` | `app/api/`, `supabase/`, `lib/` |
| 모델 강점 | UI 컴포넌트 품질, 프론트엔드 패턴 | 장기 컨텍스트, 대용량 데이터 로직 |
| 테스트 도구 | React Testing Library, Vitest | Vitest, Supabase 통합 테스트 |

---

### 2-7. Audit — Business QA | Gemini Low / High (Antigravity)

> **Antigravity 제안 반영 (v1.1)**: Audit은 비즈니스 레벨 검증에 집중하고, 코드 레벨 기계 검증은 gsd-nyquist-auditor(Technical QA)가 전담한다.

| 항목 | 내용 |
| :--- | :--- |
| **역할** | **Business QA** — 비즈니스 로직 감사, 엣지케이스 누락 검출, API 명세 일치 검증 |
| **모델** | Phase 1~2: Gemini Pro Low / **Phase 3: Gemini Pro High (자동 전환)** |
| **핵심 책임** | 비즈니스 예외 케이스 누락 여부, API 설계 vs 실제 구현 불일치 탐지, RBAC 권한 정책 준수, SAR 심층 감사 |
| **명시적 비담당** | 코드 커버리지 수치 측정, Playwright 자동화 실행, 단위 테스트 Pass/Fail 확인 → Technical QA(gsd-nyquist-auditor) 전담 |
| **참조 규정** | GEMINI.md R-04, R-05 |
| **Git 태그** | `[Gemini]` |

**Business QA 검증 항목**:
- 물류 도메인 예외 케이스 (요율 계산 엣지케이스, 오더 상태 전이 예외 등)
- API 명세서(`Ds-11`)와 실제 응답 구조 불일치
- RBAC 권한(ADMIN/USER/SUPER_ADMIN) 적용 누락
- 비즈니스 플로우 완결성 (오더 → 창고 → 트래킹 → 정산 end-to-end)

---

### 2-8. QA Architect — Technical QA | gsd-nyquist-auditor (Sub-Agent)

> **Antigravity 제안 반영 (v1.1)**: gsd-nyquist-auditor는 코드 레벨의 기계적 검증에 집중하고, 비즈니스 로직 판단은 Audit(Business QA)에 위임한다.

| 항목 | 내용 |
| :--- | :--- |
| **역할** | **Technical QA** — 코드 커버리지 측정, 자동화 테스트 실행, CI 메트릭 수집 |
| **모델** | Claude Haiku 4.5 (내장) |
| **호출 방식** | CTO가 `/gsd:verify-work` 또는 직접 `Agent(subagent_type="gsd-nyquist-auditor")` 호출 |
| **핵심 책임** | Vitest 커버리지 측정(80%+ 기준), Playwright E2E 실행, 누락 테스트 자동 생성, PASS/FAIL 리포트 |
| **명시적 비담당** | 비즈니스 로직 예외 케이스 판단, RBAC 정책 적합성 평가 → Audit(Business QA) 전담 |
| **독립 세션 없음** | 별도 Agent 세션이 아닌 CTO의 Sub-Agent로만 동작 |

**Technical QA 검증 항목**:
- 라인/브랜치/함수 커버리지 수치 (Vitest 리포트)
- Playwright E2E 시나리오 Pass/Fail
- 회귀 테스트 전체 통과 여부 (`npm run test:regression`)
- 누락된 테스트 케이스 식별 및 자동 보완 생성

---

## 🔄 3. 협업 및 업무 절차

### 3-1. Claude ↔ Antigravity 협업 채널: `.agent/` 디렉토리

```
.agent/
├── ACTIVE_AGENT.md     # 현재 작업 중인 에이전트 (동시 작업 충돌 방지)
├── TASK_BOARD.md       # 전체 태스크 현황 및 인계 큐
├── HANDOFF_BOX.md      # 에이전트 간 상세 인계 메시지
└── SESSION_LOG.md      # 작업 이력 (타임스탬프 포함)
```

#### ACTIVE_AGENT.md 형식
```markdown
## 현재 활성 에이전트
- **에이전트**: [Claude/Gemini]
- **역할**: CTO
- **작업**: Phase 3.1 API 명세 리뷰
- **시작**: 2026-04-23 14:00
- **예상 완료**: 2026-04-23 15:30
- **잠금 파일**: src/app/api/orders/
```

#### TASK_BOARD.md 형식
```markdown
## 태스크 큐

| ID | 작업 | 담당 | 상태 | 선결 조건 | Done 조건 |
|:---|:---|:---|:---|:---|:---|
| T-001 | Order API 구현 | Execution[Gemini] | 🔄 진행 | T-000 완료 | 단위테스트 통과, R-08 회귀 통과 |
| T-002 | API 명세 업데이트 | CIO[Gemini] | ⏳ 대기 | T-001 완료 | Ds-11 동기화 완료 |
| T-003 | 통합테스트 실행 | CTO[Claude] | ⏳ 대기 | T-002 완료 | gsd-nyquist-auditor 커버리지 80%+ |
```

#### HANDOFF_BOX.md 형식
```markdown
## 인계 메시지

### [2026-04-23 15:30] Gemini → Claude
- **발신**: Execution (Gemini Flash)
- **수신**: CTO (Claude Sonnet)
- **내용**: T-001 완료. Order API 구현 및 단위 테스트 작성 완료.
  - 파일: `src/app/api/orders/route.ts`
  - 테스트: `__tests__/orders.test.ts` (커버리지 87%)
  - 회귀 결과: PASS (16/16)
- **요청**: 통합 테스트 및 Vercel 배포 게이트 진행 요청
```

### 3-2. Git 커밋 태그 규약

모든 커밋에 에이전트 식별 태그를 포함하여 작업 이력을 추적합니다.

```
[Claude] feat: Order API 설계 및 명세 확정
[Gemini] feat: Order API TDD 구현 완료
[Claude] test: 통합 테스트 및 커버리지 검증
[Gemini] fix: Order 상태 전이 버그 수정
```

### 3-3. 표준 Phase 워크플로우

```
Phase 시작
    │
    ▼
[ZEN_CEO/Claude] Phase 계획 수립
    → /gsd:plan-phase → gsd-planner → gsd-plan-checker
    → .agent/TASK_BOARD.md 에 태스크 등록
    │
    ▼
[CTO/Claude] 기술 설계 리뷰 + API 명세 승인 요청
    → R-11: API 명세 확정 후 구현 착수
    → CIO에게 DB 스키마 검토 요청 (.agent/HANDOFF_BOX.md)
    │
    ▼
[CIO/Gemini] DB 마이그레이션 파일 검토 및 승인
    → ERD 검토, 마이그레이션 파일 승인
    → Ds-11 API 명세서 업데이트
    │
    ▼
[Frontend Execution / CTO·Claude] UI 구현 (병렬 가능)
    → React/Next.js 컴포넌트, shadcn/ui, Tailwind
    → 컴포넌트 단위 테스트 병행 작성
    
[Backend Execution / Gemini Flash] API·DB 로직 구현 (병렬 가능)
    → Supabase RPC, 트랜잭션, 외부 API 연동
    → 단위 테스트 병행 작성 (R-09)
    → rtk npm run test:regression (R-08)
    → .agent/HANDOFF_BOX.md 에 각각 완료 보고
    │
    ▼
[CTO/Claude] 통합 테스트 + 품질 게이트
    → gsd-nyquist-auditor 호출 (커버리지 80%+ 확인)
    → Vercel MCP 배포 게이트 확인
    → VERIFICATION.md 생성 (Phase 완료 증적)
    │
    ▼
[Audit/Gemini] 최종 감사 — Business QA (Phase 3에서 High 전환)
    → 비즈니스 엣지케이스, RBAC 정책, API 명세 일치 검증
    → SAR 필요 시 작성
    │
    ▼
[ZEN_CEO/Claude] Phase 완료 승인 → Master 보고
```

---

## 🔐 4. 컴플라이언스 강제 수행 5계층 구조

> **핵심 원칙**: "규칙은 에이전트에게 읽게 하지 말고, 구조가 스스로 강제하도록 설계한다"

### Layer 1 — Git Pre-commit Hook (진입 차단)

```bash
#!/bin/bash
# .git/hooks/pre-commit

# R-08: 회귀 테스트 통과 증적 확인
LAST_REGRESSION=$(cat .agent/LAST_REGRESSION_RESULT 2>/dev/null)
if [ "$LAST_REGRESSION" != "PASS" ]; then
  echo "❌ BLOCKED: R-08 위반 — 회귀 테스트 통과 후 커밋 가능"
  echo "   실행: rtk npm run test:regression"
  exit 1
fi

# R-01: 에이전트 태그 필수 확인
COMMIT_MSG=$(cat "$1" 2>/dev/null || git log --format="%s" -n1)
if ! echo "$COMMIT_MSG" | grep -qE '^\[(Claude|Gemini)\]'; then
  echo "❌ BLOCKED: 커밋 메시지에 에이전트 태그 필요"
  echo "   형식: [Claude] 또는 [Gemini] 접두사 필수"
  exit 1
fi

echo "✅ Pre-commit 게이트 통과"
```

**강제 규칙**:
- `[Claude]` 또는 `[Gemini]` 태그 없는 커밋 차단
- `.agent/LAST_REGRESSION_RESULT` = PASS 없으면 차단 (R-08)
- `VERIFICATION.md` 없는 Phase 완료 커밋 차단

### Layer 2 — TASK_BOARD Done 조건 명시

모든 태스크는 TASK_BOARD에 **명시적 Done 조건**을 포함해야 합니다. 조건 미충족 시 상태 변경 불가.

```markdown
| T-001 | Order API 구현 | Execution | 🔄 | - |
| Done 조건 | ✅ 단위테스트 통과 | ✅ R-08 회귀 PASS | ✅ [Gemini] 태그 커밋 | ✅ HANDOFF_BOX 인계 완료 |
```

**효과**: 에이전트가 완료 처리하려면 모든 Done 조건을 물리적으로 충족해야 함.

### Layer 3 — Claude Code 자동 Hooks (우회 불가)

Claude Code의 설정 파일(`.claude/settings.json`)에 등록된 자동 실행 훅:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "rtk npx eslint $CLAUDE_TOOL_INPUT_FILE_PATH --quiet" },
          { "type": "command", "command": "echo '[AUTO] 코드 변경 감지 — 보안 검토 필요'" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "rtk npm run test:regression && echo 'PASS' > .agent/LAST_REGRESSION_RESULT || echo 'FAIL' > .agent/LAST_REGRESSION_RESULT" }
        ]
      }
    ]
  }
}
```

**효과**: 코드 수정 즉시 린트 자동 실행, 세션 종료 시 회귀 테스트 자동 실행 및 결과 저장.

### Layer 4 — VERIFICATION.md Phase 게이트

CTO는 Phase 완료 전 `VERIFICATION.md`를 생성해야 하며, 이것이 없으면 Phase 완료 커밋이 pre-commit hook에 의해 차단됩니다.

```markdown
# VERIFICATION.md — Phase N 완료 증적

## 체크리스트
- [x] gsd-nyquist-auditor 커버리지: 87% (기준 80%+)
- [x] 회귀 테스트: PASS (24/24)
- [x] Vercel 배포 게이트: PASS
- [x] API 명세 동기화 (Ds-11): 완료
- [x] DB 마이그레이션 CIO 승인: 완료
- [x] UI 구동 증적: /docs/screenshots/phase-N-*.png

## 담당자
- Worker: Execution [Gemini]
- Auditor: CTO [Claude]
- 승인일: 2026-04-23
```

**효과**: VERIFICATION.md 없이 Phase 완료 선언 불가. CTO가 직접 서명하는 품질 보증서.

### Layer 5 — SAR 페널티 루프 (재발 방지)

규칙 위반 발생 시 즉시 SAR을 작성하고, 다음 Phase의 TASK_BOARD에 추가 검증 항목이 자동 추가됩니다.

```
위반 발생
    │
    ▼
SAR 작성 (docs/08_Self_Audit/SAR_reports/)
    → 분류, 심각도, 원인 분석
    │
    ▼
다음 Phase TASK_BOARD에 추가 Done 조건 삽입
    → "SAR-NNN 재발 방지 점검 완료" 항목 필수화
    │
    ▼
Audit Agent가 해당 항목 집중 검증
    → 재발 시 심각도 상향 및 Master 즉시 보고
```

**효과**: 위반이 누적될수록 다음 작업의 Done 조건이 더 엄격해짐. 자기 강화 품질 루프.

---

## 📁 5. 파일 소유권 Zone 분리

| Zone | 경로 | 소유자 | 규칙 |
|:---|:---|:---|:---|
| **Claude 전용** | `.agent/`, `.claude/`, `CLAUDE.md` | Claude | Gemini 직접 수정 금지 |
| **Gemini 전용** | `GEMINI.md` | Antigravity | Claude 직접 수정 금지 |
| **공유 (협의 필요)** | `docs/00_GUIDE/`, `.planning/`, `supabase/migrations/` | CTO + CIO | 변경 전 .agent/HANDOFF_BOX.md 공지 |
| **읽기 전용** | `docs/00_GUIDE/101~104_*.md` | 전체 | CIO 승인 없이 수정 금지 |
| **자유 작업** | `src/`, `__tests__/`, `app/` | Execution | TASK_BOARD 태스크 범위 내에서만 |

---

## 🧪 6. 테스트 케이스 소유권 분담

> **v1.1 개정**: Technical QA (gsd-nyquist-auditor) vs Business QA (Audit) 경계 명확화

| 테스트 유형 | QA 분류 | 도출 책임 | 실행 책임 | 완료 기준 |
|:---|:---|:---|:---|:---|
| **단위 테스트** | Technical | Frontend/Backend Execution | Execution | 80%+ 커버리지 |
| **통합 테스트** | Technical | CTO (시나리오 설계) | gsd-nyquist-auditor | Phase별 전체 통과 |
| **회귀 테스트** | Technical | CTO (케이스 설계) + R-09 확장 | 전체 에이전트 공통 의무 | `npm run test:regression` PASS |
| **E2E (코드 레벨)** | Technical | CTO + CPO 협의 | gsd-nyquist-auditor | Playwright 전체 Pass |
| **UAT 시나리오** | Business | CPO (비즈니스 관점 설계) | Audit (Business QA 검증) | CPO 정의 합격 기준 충족 |
| **비즈니스 엣지케이스** | Business | Audit (도메인 지식 기반) | Audit | 누락 케이스 0건 |
| **API 명세 일치 검증** | Business | Audit (Ds-11 대조) | Audit | 코드 vs 명세 완전 일치 |
| **RBAC/권한 감사** | Business | Audit (정책 기준) | Audit | 권한 정책 완전 준수 |

---

## 🔧 7. DevOps 역할 분산 (별도 Agent 없음)

| DevOps 업무 | 담당 에이전트 | 도구 |
|:---|:---|:---|
| Vercel 배포 게이트 | CTO (Claude) | Vercel MCP |
| 환경변수(.env) 관리 | CIO (Gemini) | Supabase MCP, 직접 관리 |
| 배포 상태 기록 | PM (Gemini) | WBS/ROADMAP 업데이트 |
| CI/CD 파이프라인 확인 | CTO (Claude) | Vercel MCP 빌드 로그 |

---

## 📊 8. 기대 효과 및 설계 근거

| 항목 | 기존 | 개선 후 |
|:---|:---|:---|
| **컨텍스트 활용** | 단일 에이전트 | Claude (~200K 심층추론) + Gemini (~1M 장기일관성) |
| **오케스트레이션** | 없음 | ZEN_CEO (Claude Opus) 네이티브 Sub-Agent 스폰 |
| **테스트 자동화** | 수동 트리거 | Layer 3 Hook → 자동 회귀 실행 + 결과 저장 |
| **에이전트 컴플라이언스** | 문서 열람 의존 | 5계층 구조적 강제 (우회 불가) |
| **역할 명확성** | 중복/공백 존재 | Zone 분리 + TASK_BOARD Done 조건 명시 |
| **품질 추적** | Phase 완료 후 발견 | VERIFICATION.md 게이트 + SAR 페널티 루프 |
| **Execution 효율** | 단일 에이전트 → 병목 | Frontend(Claude) + Backend(Gemini) 병렬 수행 |
| **QA 명확성** | 역할 중복 모호 | Technical QA(코드) vs Business QA(비즈니스) 완전 분리 |

---

## 📝 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
|:---|:---|:---|:---|
| v1.0 | 2026-04-23 | Claude (ZEN_CEO) | 초기 멀티 에이전트 R&R 가이드 수립. Tier 1~5 정의, 5계층 강제 구조, 협업 절차 포함. Tier 6 삭제 확정 반영. |
| v1.1 | 2026-04-23 | Claude + Antigravity | Antigravity 검토 의견 반영. Execution → Frontend(Claude)/Backend(Gemini) 분리. Audit → Business QA / gsd-nyquist-auditor → Technical QA 경계 명확화. |
| v1.2 | 2026-04-23 | Claude (CTO) | CPO 도메인 지식 오너십 추가. 105_DOMAIN_KNOWLEDGE.md 생성 및 참조 연결. |
| v1.3 | 2026-04-23 | Aiden (ZEN_CEO) | 페르소나 이름 확정 (Aiden/Riley). CPO → Header Agent 승격(Gemini High). Header Agent 운영 원칙 4항 추가. |

---

*문서 끝*
