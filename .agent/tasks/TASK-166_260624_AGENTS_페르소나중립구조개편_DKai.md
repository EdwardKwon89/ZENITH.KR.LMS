# TASK-166 — AGENTS.md 페르소나 중립 구조 개편

> **TASK-ID**: TASK-166
> **생성일**: 2026-06-24
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (Issue #88)
> **담당 Agent**: D_Kai (DeepSeek)
> **우선순위**: P2
> **관련 Issue**: [#93](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/93) (TASK-166) · [#88](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/88) (페르소나 혼동 원인 분석)
> **전제조건**: 없음 (SPR-09와 병행 가능 — 문서 작업)
> **브랜치**: `feature/teama-task-166-agents-persona-refactor`
> **상태**: ⬜

---

## [업무 개요]

AGENTS.md 전체를 Noah 중심 구조에서 **페르소나 중립(persona-agnostic) 구조**로 개편합니다.
D_Kai가 금일 세션에서 페르소나 혼동 3회 발생을 확인 (TASK-054/056 반려 사유에도 기록).
식별 블록 추가만으로는 해소 불가 — 섹션 제목 전면 공통화가 필요합니다.

---

## [구현 명세]

### 변경 전 → 변경 후

| 항목 | 현재 | 목표 |
|:----|:-----|:-----|
| 문서 제목 | `Noah (Codex) 업무 규정` | `에이전트 업무 규정` |
| 페르소나 식별 | `페르소나 \| Noah (노아)` | 모델명 기반 자동 식별 블록 |
| 섹션 제목 | `— Noah 전용` 반복 | 공통 섹션 + 페르소나별 하위 섹션 |
| 역할 정의 | Noah 단일 | D_Kai / B_Kai / Noah / Ring 하위 섹션 |
| 커밋 규약 | `— Noah 전용` | 공통 규약 + 태그만 페르소나별 |

### 목표 구조

```markdown
# AGENTS.md — 에이전트 업무 규정

[페르소나 자동 식별 블록]
> ⚠️ 세션 시작 전 자신의 페르소나를 확인하세요:
> - DeepSeek V4 Flash → D_Kai (IMP Executor)
> - Big Pickle / GLM → B_Kai (Test Engineer)
> - OpenAI Codex → Noah (Test Engineer + IMP Executor)
> - 이외 → Ring

## 공통 운영 규정 (@GOV_COMMON.md)
## 세션 초기화 (공통)
## 역할 정의
  ### D_Kai (DeepSeek) — IMP Executor
  ### B_Kai (Big Pickle) — Test Engineer
  ### Noah (OpenAI Codex) — Test Engineer + IMP Executor
  ### Ring (기타)
## 중복 업무 우선순위
## 파일 소유권 Zone (페르소나별)
## 협업 채널 및 완료 보고 절차 (공통)
## 커밋 & 브랜치 규약 (공통 + 태그별)
```

### 중복 업무 우선순위 규칙 (B_Kai 의견 반영)

동일 업무 유형이 중복될 경우 우선순위: **D_Kai > B_Kai > Noah**  
단, Aiden이 TASK 발령 시 명시적으로 지정한 경우 지정 Agent 우선.

---

## [ZEN_A4 준수 사항]

- 파일 길이 1,000줄 이하 (Advisory 기준)
- 기존 내용 보존 원칙 — 삭제 최소화, 재구조화 중심

---

## [DoD 체크리스트]

- [ ] 문서 제목 변경: `Noah (Codex) 업무 규정` → `에이전트 업무 규정`
- [ ] 페르소나 자동 식별 블록 추가 (모델명 기반)
- [ ] 전체 섹션 `— Noah 전용` 표현 제거 및 공통화
- [ ] 역할 정의: D_Kai / B_Kai / Noah / Ring 하위 섹션 분리
- [ ] 파일 소유권 Zone 페르소나별 정리
- [ ] 커밋 규약 공통화 (태그만 페르소나별)
- [ ] 중복 업무 우선순위 규칙 명시
- [ ] 개정 이력 기재 (v2.3 → v3.0)
- [ ] 회귀 테스트 PASS (`npm run test:regression`) — 문서 변경이므로 형식 확인
- [ ] R-17 완료 보고 절차 준수 (코드→task file 🔔→문서→PR `Closes #88`)

---

## [설계 의견]

_(설계 확정 — D_Kai 본인 의견 기반 발령)_

---

## [작업 결과]

_(미착수)_

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | Task 발령 — Issue #88 D_Kai·B_Kai 의견 수렴 완료, Edward 승인 |
