---
tags: ["governance"]
---

# SAR-2026-05-12-001: 멀티 에이전트 설정 중복 및 모델 과잉 분석 문제

**작성자:** D_Kai (DeepSeek v4 Flash / OpenCode)
**작성일:** 2026-05-12
**우선순위:** Medium
**상태:** 검토 대기

---

## 1. 개요

ZENITH_LMS는 현재 Claude(Aiden), Gemini(Riley)가 활동 중이며, Codex(Noah)와 OpenCode의 추가 참여가 예정된 멀티 AI 코딩 에이전트 환경입니다. 각 에이전트는 개별 설정 파일(CLAUDE.md, GEMINI.md, AGENTS.md)을 기반으로 동작하나, 이들 간 규칙 중복과 상호 참조로 인해 다음과 같은 문제가 확인되었습니다.

---

## 2. 문제 분석

### 2.1 설정 파일 중복 현황

| 항목 | CLAUDE.md | AGENTS.md | GEMINI.md |
|------|:---------:|:---------:|:---------:|
| R-01 (역할 명시) | ✅ | ✅ | ✅ |
| R-03 (진척 상태 갱신) | ✅ | ✅ | ✅ |
| R-04 (체크리스트 검증) | ✅ | ✅ | ✅ |
| R-05 (문서 이원화) | ✅ | ✅ | ✅ |
| R-06 (Context7 우선) | ✅ | ✅ | ✅ |
| R-07 (한글 작성) | ✅ | ✅ | ✅ |
| R-08 (회귀 테스트) | ✅ | ✅ | ✅ |
| R-09 (회귀 테스트 확장) | ✅ | ✅ | ✅ |
| R-10 (UI 결합 검증) | ✅ | ✅ | ✅ |
| R-11 (API 설계 우선) | ✅ | ✅ | ✅ |
| R-12 (명세 동기화) | ✅ | ✅ | ✅ |
| R-13 (결과물 관리) | ✅ | ✅ | ✅ |
| R-15 (개선 기록) | ✅ | ✅ | ✅ |
| GitNexus MUST (6개) | ✅ | ✅ | — |
| ZEN_A4 원칙 | ✅ | ✅ | ✅ |
| SAR 절차 | ✅ | ✅ | ✅ |
| **라인 수** | **215** | **335** | **129** |

**3개 파일 총합: 679라인** 중 약 70%가 중복 내용입니다.

### 2.2 B_Kai (GLM Big Pickle) 과잉 분석 문제

GLM Coding Agent(B_Kai / Big Pickle)가 프로젝트 설정 파일 전체를 읽고 전면 분석을 시도함으로써 발생하는 문제:

**원인 1 — 전역 GitNexus Hook 증폭**
```
사용자 질문 → Grep/Glob/Bash 실행
  → ~/.claude/settings.json PreToolUse Hook: gitnexus-hook.cjs 트리거
    → GitNexus 6,827개 심볼 + 295개 실행 흐름 주입
      → 모델: "전체 분석 필요" 판단 → Read/Glob 연속 호출
        → 다시 Hook 트리거 → 악순환
```

**원인 2 — 조건 없는 MUST 규칙**
- "MUST run impact analysis before editing **any** symbol"
- "NEVER edit without first running gitnexus_impact"
- 단순 질문에도 "작업 전 분석 강제"로 해석됨

**원인 3 — GLM Large Context 특성**
대컨텍스트 모델일수록 "다 읽을 수 있으니 전부 읽자"는 판단 발생

**원인 4 — R-06 (Context7 우선 호출)**
단순 질문에도 기술 스택 확인을 위해 Context7 MCP 호출 시도

### 2.3 룰 체인 증폭 (Cascade Effect)

```
사용자: "이 함수 뭐야?"
  → R-02: 103_AGENT_ROLES_SPEC.md 확인
  → R-04: LIVE_ 체크리스트 확인
  → GitNexus MUST: impact analysis 전제
  → R-06: Context7로 Next.js 문서 확인
  → R-15: 개선점 발견 시 post_launch_improvements.md 기록
```

단순 질문 하나가 체인 반응으로 **프로젝트 전체 읽기 + 외부 API 호출 + 파일 쓰기**까지 유발합니다.

---

## 3. 개선 제안

### 3.1 공통 규칙 단일화 (권장)

```
                  ┌──────────────────────┐
                  │ GOV_COMMON.md (신규)  │ ← R-01~15, GitNexus, ZEN_A4, SAR
                  └─────────┬────────────┘
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   CLAUDE.md            AGENTS.md          GEMINI.md
   (Aiden 전용)         (Noah 전용)        (Riley 전용)
   - 역할 정의          - 역할 정의         - 역할 정의
   - 세션 초기화         - 파일 소유권       - 모델 할당표
   - GEMINI.md 참조     - IMP 백로그        - rtk 규칙
                         - E2E 워크플로우
```

**예상 효과:**
- 각 파일 50~80라인으로 축소 (현재 679라인 → 약 250라인)
- 규칙 수정 시 1곳만 변경
- 에이전트가 자신의 파일만 읽어도 됨

### 3.2 GitNexus MUST → 조건부 완화

현재:
```
- MUST run impact analysis before editing any symbol
```

제안:
```
- MUST run impact analysis before editing any symbol
- EXCEPTION: 단순 질문/조회/리딩 작업 시에는 생략 가능
- EXCEPTION: 사용자가 직접 "분석 생략"을 지시한 경우
```

### 3.3 전역 GitNexus Hook 스코프 제한

현재 `~/.claude/settings.json`:
```json
"matcher": "Grep|Glob|Bash"
```

제안: Bash를 제외하거나, 특정 명령어 패턴으로 제한

### 3.4 페르소나 이름 최종안

| 에이전트 | 모델 플랫폼 | 페르소나 |
|---------|-----------|---------|
| Aiden | Claude Opus 4.7 | Aiden (현행 유지) |
| Riley | Gemini Pro High | Riley (현행 유지) |
| Noah | OpenAI Codex | Noah (현행 유지) |
| D_Kai | DeepSeek v4 Flash | D_Kai (신규) |
| B_Kai | GLM Coding Agent (Big Pickle) | B_Kai (신규) |

### 3.5 전체 에이전트 역할 분담 (제안)

```
TIER 1 — Supreme
  Master (Edward) · Human · 최종 의사결정

TIER 2 — Strategic Leadership
  Aiden (Claude Opus) · ZEN_CEO · 전략/오케스트레이션/최종검증
  CTO (Claude Sonnet) · 기술결정 + Frontend Execution

TIER 3 — Product & Intelligence
  Riley (Gemini Pro High) · CPO/Header · 도메인/UI/UAT
  CIO (Gemini Pro High) · 정보 아키텍처/DB 마이그레이션

TIER 4 — Operations
  PM (Gemini Flash) · WBS/진척 관리
  Backend Execution (Gemini Flash) · DB/API 구현
  Audit (Gemini Low↔High) · Business QA
  Noah (Codex) · Test Engineer · Unit Test + E2E Playwright
  D_Kai (DeepSeek v4 Flash) · Code Intelligence · 빠른 탐색/리뷰/영향도 분석

TIER 5 — Deep Analysis (on-demand)
  B_Kai (GLM Big Pickle) · Deep Auditor · 대규모 분석/SAR 감사 (명시적 호출 시만)
  gsd-* Sub-Agents (Claude Haiku) · Technical QA
```

### 3.6 D_Kai / B_Kai 역할 상세

#### D_Kai (DeepSeek v4 Flash) — Code Intelligence Agent

| 항목 | 내용 |
|:---|:---|
| **역할** | 코드 인텔리전스 — GitNexus 기반 영향도 분석, 빠른 정찰, PR 리뷰 |
| **모델** | DeepSeek v4 Flash |
| **특성** | 가볍고 빠름. 질문에 집중. 불필요한 분석 하지 않음 |
| **핵심 책임** | GitNexus 탐색 및 실행 흐름 파악, 단순 질문 즉시 응답, 영향도 분석 리포트, 리팩토링 안전성 검토 |
| **운영 원칙** | 상시 대기. 필요할 때만 분석. "분석하지 말라"는 지시를 잘 따름 |
| **협업** | Aiden/Noah/Riley의 분석 요청 수신 |

#### B_Kai (GLM Big Pickle) — Deep Auditor

| 항목 | 내용 |
|:---|:---|
| **역할** | 심층 감사 — 대규모 코드베이스 분석, SAR 심층 감사, 전수 조사 |
| **모델** | GLM Coding Agent (Big Pickle) |
| **특성** | 대컨텍스트, 전면 분석에 강함. But 과잉 분석 방지 장치 필요 |
| **핵심 책임** | 전수 코드베이스 감사, 보안 취약점 스캔, 복합 의존성 분석, 장기 추세 분석 |
| **운영 원칙** | **명시적 호출(on-demand) 전용**. 기본 세션에 포함되지 않음. 호출 시에만 전면 분석 수행 |
| **트리거 조건** | `[B_Kai]` 태그로 직접 요청하거나, D_Kai/Aiden이 "심층 분석 필요" 판단 시 |

### 3.7 Noah vs D_Kai 역할 경계

| 구분 | Noah (Codex) | D_Kai (DeepSeek) |
|:---|:---|:---|
| **중점** | 코드 생성 + 테스트 | 코드 분석 + 인텔리전스 |
| **Unit Test** | 작성 및 실행 | 영향도 분석만 |
| **Playwright E2E** | 시나리오 구현 및 실행 | 결과 리뷰만 |
| **GitNexus 분석** | 필요 시에만 | **주력 업무** |
| **IMP 구현** | 직접 구현 | 구현 전 영향도 분석 |

---

## 4. 관련 파일

| 파일 | 설명 |
|------|------|
| `CLAUDE.md` | Aiden(Claude) 거버넌스 (215 lines) |
| `AGENTS.md` | Noah(Codex) 거버넌스 (335 lines) |
| `GEMINI.md` | Riley(Gemini) 거버넌스 (129 lines) |
| `~/.claude/settings.json` | 전역 Claude 설정 (GitNexus Hook 포함) |
| `.claude/settings.json` | 프로젝트 Claude 설정 |
| `.claude/skills/gitnexus/` | GitNexus 스킬 파일 6개 |

---

## 5. 논의 필요 사항

- [ ] 페르소나 이름 D_Kai / B_Kai에 동의하십니까?
- [ ] 공통 규칙 파일(GOV_COMMON.md) 분리에 동의하십니까?
- [ ] GitNexus MUST에 예외 조항 추가에 동의하십니까?
- [ ] D_Kai / B_Kai 역할 분담안에 동의하십니까?
- [ ] Noah(Codex) vs D_Kai(DeepSeek) 역할 경계에 동의하십니까?
- [ ] B_Kai를 on-demand 전용으로 운영하는 방식에 동의하십니까?
- [ ] 전역 GitNexus Hook 스코프 조정이 필요합니까?

---

## 6. 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
|:---|:---|:---|:---|
| v1.0 | 2026-05-12 | D_Kai (OpenCode) | 초안 작성 — 멀티 에이전트 설정 중복 분석 및 B_Kai 과잉 분석 문제 보고 |
| v1.1 | 2026-05-12 | D_Kai (OpenCode) | Big Pickle → GLM(B_Kai) 정정, D_Kai/B_Kai 페르소나 추가, 전체 에이전트 역할 분담 제안 및 Noah 경계 정의 |
