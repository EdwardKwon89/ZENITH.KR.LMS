---
tags: ["procedure"]
---

# 🎯 120_MCP_SKILL_GUIDE (Java 기반 Web/모바일 플랫폼 개발 가이드)

> **문서 ID**: 120  
> **분류**: 🎯 개발 방법론  
> **목적**: Java 기반 플랫폼 개발을 위한 MCP 도구 및 Skill 활용 표준 정의  
> **대상**: 모든 팀원 (개발자, 리더, 기여자)  
> **작성일**: 2026-04-20  
> **최종 수정**: 2026-04-20  
> **작성자**: Gemini CLI (AI)  
> **버전**: v1.0  

---

[← 목록으로 돌아가기](./000_README.md)

---

## 📋 목차

1. [Web/모바일 플랫폼 개발 추천 MCP (Top 10)](#1-web모바일-기반-업무-시스템-개발-추천-mcp-top-10)
2. [품질 향상(QA) 필수/추천 MCP 및 Skill (15선)](#2-품질-향상qa-필수추천-mcp-및-skill-15선)
3. [멀티 에이전트 운영 및 오케스트레이션 전략](#3-멀티-에이전트-운영-및-오케스트레이션-전략)
4. [중점 관리 지표 및 자동화 전략](#4-중점-관리-지표-및-자동화-전략)
5. [권장 워크플로우 (Standard Workflow)](#5-권장-워크플로우-standard-workflow)

---

## 📌 개요

이 가이드는 Java 기반의 현대적인 업무 플랫폼(LMS, ERP 등)을 구축할 때 필요한 MCP(Model Context Protocol) 도구와 전문 Skill 세트, 품질 관리 및 에이전트 운영 전략을 종합적으로 정의합니다.

---

## 1. Web/모바일 기반 업무 시스템 개발 추천 MCP (Top 10)

복잡한 비즈니스 로직과 다양한 클라이언트를 지원하기 위한 핵심 도구 조합입니다.

| 구분 | MCP/Skill 명칭 | 주요 역할 및 활용 |
| :--- | :--- | :--- |
| **디자인** | **1. Pencil MCP** | React/Flutter 화면 설계 및 시각적 프로토타이핑. 디자인의 단일 진실 공급원. |
| **데이터** | **2. Database/SQL MCP** | RDBMS 스키마 설계 및 SQL 검증. JPA Entity 및 DTO 설계의 기초 데이터 제공. |
| **인프라** | **3. Shell/Terminal MCP** | Docker 환경 구축, Gradle/Maven/npm 빌드 제어. 로컬 개발 환경 자동화. |
| **리서치** | **4. Google Search & Fetch** | 최신 프레임워크 기술 문서 및 에러 해결책 실시간 검색. |
| **협업** | **5. GitHub/Git MCP** | 버전 관리, PR 리뷰 자동화 및 에이전트 간 코드 충돌 방지. |
| **설계** | **6. Architecture Diagramming** | Mermaid/PlantUML을 이용한 서비스 흐름 및 클래스 구조 시각화. |
| **API** | **7. API Design (OpenAPI)** | 프론트-백엔드 간 통신 규격 정의. 병렬 개발을 위한 명세서 선제공. |
| **보안** | **8. Auth & Security Skill** | OAuth2, JWT, RBAC 등 업무 시스템의 핵심 권한 및 보안 설계/구현. |
| **검증** | **9. Unit Testing & Mocking** | JUnit, Mockito, Jest를 이용한 로직의 격리된 단위 테스트 수행. |
| **배포** | **10. IaC (Docker/K8s) Skill** | 컨테이너 기반 배포 설정 최적화 및 환경 전이(Dev->Ops) 문제 예방. |

---

## 2. 품질 향상(QA) 필수/추천 MCP 및 Skill (15선)

문서, 코드 완성도, 테스트 계획 및 시나리오를 아우르는 품질 관리 체계입니다.

### [코드 완성도 및 아키텍처]
1.  **Static Analysis Skill (SonarQube/Lint):** 코드 스멜, 보안 취약점, 중복 코드를 실시간 탐지.
2.  **Refactoring Agent Skill:** 복잡도가 높은 로직을 클린 코드로 재구조화하여 유지보수성 향상.
3.  **Java/Spring Design Pattern Skill:** 계층형 아키텍처 준수 및 의존성 주입 최적화 검증.
4.  **Performance Profiling Skill:** DB 쿼리 실행 계획 분석 및 메모리 누수 지점 파악.

### [문서화 및 설계 품질]
5.  **Swagger/OpenAPI MCP:** API 스펙과 실제 구현의 일치성(Sync) 보장 및 문서 자동 생성.
6.  **Mermaid/PlantUML Skill:** 시퀀스/클래스 다이어그램을 통해 로직 흐름 시각화 및 오류 조기 발견.
7.  **Documentation Generator Skill:** JavaDoc 및 Markdown 기반 기술 문서를 표준 템플릿에 맞춰 작성.

### [테스트 계획 및 시나리오]
8.  **Requirement Traceability Skill:** 요구사항 명세서와 구현 코드, 테스트 케이스 간의 연결 고리 검증.
9.  **Edge Case Discovery Skill:** 입력값의 경계 조건(Null, 최대치 등)을 분석하여 잠재적 에러 차단.
10. **Test Strategy Planner Skill:** 단위-통합-E2E 테스트의 범위와 우선순위를 정의하는 전략 수립.
11. **BDD (Cucumber/Gherkin) Skill:** 사용자 동선 기반 "Given-When-Then" 시나리오 작성.
12. **JUnit/Mockito Unit Test Skill:** 자바 백엔드 로직의 단위 테스트 및 Mock 객체 이용 격리 테스트.
13. **Playwright/Cypress MCP:** 실제 웹 UI 상에서의 사용자 시뮬레이션 및 E2E 테스트 자동화.

### [검증 및 자가 감사]
14. **Self-Audit (SAR) Agent Skill:** 프로젝트 표준(Naming, Commit rule 등) 준수 여부 자동 감사.
15. **Mutation Testing Skill:** 테스트 코드가 실제 버그를 잡을 수 있는지 테스트의 품질 역검증.

---

## 3. 멀티 에이전트 운영 및 오케스트레이션 전략

복잡한 작업을 여러 전문 에이전트에게 배분하고 결과를 통합하는 전략적 체계입니다.

### 핵심 오케스트레이션 도구
-   **Pencil MCP (Visual Coordinator):** UI/UX와 백엔드 사이의 시각적 기준점 제공.
-   **GitHub/Git MCP:** 병렬 작업 시 발생하는 코드 충돌 관리 및 PR 프로세스 제어.
-   **Local Memory/Context MCP:** 에이전트 간 공유 지식(컨텍스트) 저장 및 검색.

### 필수 협업 Skill
-   **Strategic Orchestrator (Brain):** [리서치 -> 전략 -> 실행 -> 검증] 루프 기반 업무 할당.
-   **Task Decomposer Agent:** 거대 요구사항을 원자 단위(Atomic Task)로 분할하여 병렬 처리 가능하게 변환.
-   **Quality Gate Agent (Reviewer):** 코드 표준 및 품질 지표(커버리지 등) 만족 여부 최종 승인.
-   **Context Compressor Skill:** 정보 요약을 통해 에이전트의 컨텍스트 윈도우 효율 극대화.
-   **Conflict Resolution Skill:** `wait_for_previous` 전략 및 파일 잠금을 통한 데이터 무결성 보장.

---

## 4. 중점 관리 지표 및 자동화 전략

### [테스트 커버리지 (Coverage)]
-   **Jacoco/LCOV Parser:** 테스트가 누락된 '구멍(Gap)'을 정확히 식별하여 에이전트에게 보충 지시.
-   **Mocking Architect:** 외부 의존성을 배제하고 로직만 순수하게 테스트할 수 있는 Mock 환경 설계.

### [UI 일관성 (Consistency)]
-   **`get_variables` 활용:** Pencil 디자인 시스템의 변수(Theme Axis)를 코드로 즉시 반영.
-   **`get_screenshot` 검증:** 구현 결과물을 디자인 원본과 픽셀 단위로 비교(Visual Regression).

---

## 5. 권장 워크플로우 (Standard Workflow)

1.  **[Design Stage]**: Pencil MCP로 UI 설계 및 테마 변수 확정.
2.  **[Logic Stage]**: Edge-Case Generator를 통해 구현 전 테스트 시나리오 선제 도출.
3.  **[Execution Stage]**: Task Decomposer에 의해 분할된 작업을 전문 에이전트들이 병렬 수행.
4.  **[Audit Stage]**: SAR 에이전트의 실시간 코드 리뷰 및 표준 준수 검사.
5.  **[Verify Stage]**: 테스트 커버리지 및 UI 일치도 자동 검증 후 PR 승인 및 머지.

---

[← 목록으로 돌아가기](./000_README.md)
