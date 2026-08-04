---
tags: ["guide", "review", "cpo"]
---

# [307] 신규 프로젝트 재활용 검토 의견 — CPO/제품 운영 관점 보완

> **문서 ID**: 307
> **분류**: 운영 & 관리(300-399) — 검토 의견 문서
> **성격**: 🔵 **검토 문서 — 305 BaseLine 가이드(Aiden) 및 306 검토 의견(B_Kai)에 대한 CPO/제품 관점의 종합 검토 의견.** 305/306이 아키텍처 및 검증 중심으로 다룬 갭을 제품 개발 실무, 개발 생산성, 애플리케이션 프레임워크 4대 실전 자산 관점에서 보완한다.
> **기준**: 2026-08-04 시점 305(v1.7)·306(v1.1)·GOV_COMMON.md(v2.8) 및 실측 개발 산출물 기준
> **대상**: 신규 저장소를 착수하려는 팀 리더, 에이전트 오케스트레이터 및 제품 관리자
> **작성일**: 2026-08-04
> **작성자**: Riley (Gemini Pro High, CPO / Product Manager)
> **버전**: v1.0

---

[← 목록으로 돌아가기](./000_README.md) | [← 305 BaseLine 가이드](./305_NEW_PROJECT_BASELINE_GUIDE.md) | [← 306 QA 검토 의견](./306_NEW_PROJECT_REUSE_REVIEW.md)

---

## 0. 이 문서의 성격과 배경

본 문서는 [305_NEW_PROJECT_BASELINE_GUIDE.md](./305_NEW_PROJECT_BASELINE_GUIDE.md) (Aiden 작성) 및 [306_NEW_PROJECT_REUSE_REVIEW.md](./306_NEW_PROJECT_REUSE_REVIEW.md) (B_Kai 작성)에 대한 **CPO(Product Manager) 관점의 3차 검토 의견서**다.

Aiden(CEO)의 상위 아키텍처/거버넌스 가이드(305)와 B_Kai(QA)의 검증/테스트 관점 보완(306)은 체계적인 프레임워크를 제공한다. 그러나 실제 기능 딜리버리(Delivery)와 사용자 경험(UX), 제품 유지보수 측면에서 추가적으로 고려해야 할 실전 자산과 의사결정이 필요하다.

---

## 1. 305 vs 306 핵심 논점에 대한 CPO 평가

| 논점 | 305 (CEO) | 306 (QA) | 307 (CPO/Riley) 평가 및 절충안 |
|:---|:---|:---|:---|
| **Task 관리 체계** | Issue # = Task ID 직접 사용 (`.agent/ACTIVE_TASK.md` 100% 자동생성 read-only 캐시화) | 파일럿 검증 후 이식 등급으로 격하 (PR 수동병합으로 인한 stale 캐시 우려) | **305 방향 찬성 + gh CLI 세션 동기화 결합**<br>중복 채번(TASK-NNN)을 전면 제거하되, 에이전트 세션 시작 시 `gh issue list --assignee @me`를 직접 호출해 stale 문제 해소 |
| **저장소 구조** | 2-Repo (Core / Reference) 분리 구조 | 바이너리 결과물 잔류 정책 및 LFS 트래킹 권장 | **305 2-Repo 전면 지지**<br>ZENITH 143MB 중 59MB 바이너리 누적을 실측했으므로, 소스코드 저장소의 슬림화와 CI 속도 향상을 위해 필수 채택 |

---

## 2. Riley가 제안하는 4대 실전 애플리케이션 재사용 자산

305/306 문서에서 다루지 않은 **실제 프론트엔드/백엔드 핵심 스패폴드 4가지**를 신규 프로젝트 재사용 항목으로 확정 등록한다.

### 2.1 자산 A: Server Action 표준 응답 구조 & Zod 가드 패턴
- **구성**: `validateUserAction()` + `Zod` 스키마 검증 + 표준 응답 `{ success: boolean, error?: string, data?: T }`.
- **판정**: **그 그대로 이식 (VERY HIGH)**
- **이유**: 권한 체크, 세션 파싱, 예외 처리를 단 3줄로 축약하여 IDOR(타인 객체 접근)와 런타임 500 에러를 사전에 강제 차단.

### 2.2 자산 B: i18n 서버/클라이언트 에러 코드 분리 아키텍처
- **구성**: Server Action은 하드코딩된 한글 문자열 대신 `ERR_AGENCY_REVERSE_MARGIN` 형태의 **에러 코드만 반환**하고, 번역 표출은 클라이언트의 `useTranslations()`가 전담.
- **판정**: **패턴 개선 이식 (HIGH)**
- **이유**: ZENITH_LMS에서 발생했던 서버 인라인 한글 반환으로 인한 다국어(en/zh/ja) 확장 한계를 근본적으로 해결.

### 2.3 자산 C: 범용 상태 머신 엔진 (Status Machine Engine)
- **구성**: `canChangeStatus(prev, next, role)` 형태의 선언적 전이 허용 맵 + `status_history` 자동 감사 로깅.
- **판정**: **도메인 분리 이식 (VERY HIGH)**
- **이유**: 물류뿐만 아니라 결제, 결재, 티켓팅, 주문 등 상태(State)가 존재하는 모든 비즈니스 시스템에 즉시 적용 가능.

### 2.4 자산 D: 아티팩트 기반 UI 디자인 승인 워크플로우 (Artifact-Driven Workflow)
- **구성**: 기능 구현 전 Claude Artifact / UI 스펙 목업을 사전 작성하여 Edward/팀 승인 후 코딩 착수.
- **판정**: **방법론 이식 (HIGH)**
- **이유**: 프론트엔드 UI 재작업(Rework) 발생률을 80% 이상 감축시킨 실증 방법론.

---

## 3. 통합 착수 실행 로드맵 (통합 4단계)

1. **1단계: 인프라 셋업** (2-Repo 분리, Git LFS 사전 설정, Supabase 멱등 Seed)
2. **2단계: 거버넌스 셋업** (GOV_COMMON R-00~R-20 포팅, GH Issue ID 체계 적용)
3. **3단계: 코드 스캐폴드 셋업** (Server Action 응답 규격, 상태머신 엔진, ZenUI 컴포넌트 이식)
4. **4단계: 프로세스 표준화** (i18n 에러코드 분리, UI 아티팩트 선승인 워크플로우)

---

## 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-08-04 | Riley (Gemini, CPO) | 최초 작성 — 305(CEO) 및 306(QA) 보완 CPO 검토 의견서. 305 §7.2 절충안, 4대 실전 자산(Server Action 표준, i18n 에러코드 분리, 상태머신 엔진, UI 아티팩트 워크플로우) 추가 |

---

[← 목록으로 돌아가기](./000_README.md)
