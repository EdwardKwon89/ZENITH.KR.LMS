---
tags: ["reference"]
---

> **문서 ID**: 112 (구 `00_GUIDE/401_AI_AGENT_TEST_JAVA.md`)
> **분류**: 🔍 참조 자료 (규정 아님)
> **성격**: 타 Agent가 생성한 Java 기반 고신뢰 검증 아키텍처 참조 문서. **ZENITH_LMS(TypeScript/Next.js)에는 직접 적용되지 않으며**, 내용상 확인된 한계(적용 범위·통과 기준 부재, 형식 검증 도구의 현실성)가 있다.
> **활용**: ZENITH 테스트 전략은 [231_TEST_COVERAGE_STRATEGY_GUIDE.md](../00_GUIDE/231_TEST_COVERAGE_STRATEGY_GUIDE.md)를 따른다. 본 문서는 향후 MLFF BOS(Java 여부 확인 후) 도입 검토 시 도구 매핑 참조용.
> **이동일**: 2026-11-13 (Edward 지시)

---

# AI Agent 기반 Java 소프트웨어 고신뢰 검증 아키텍처 보고서

## 1. 개요 및 목적
AI 에이전트 기반 소프트웨어 개발(Agentic Coding) 환경에서 전통적인 예시 기반 단위 테스트(Example-based Unit Testing)는 구현 편향(Confirmation Bias)과 경계값(Edge Case) 누락이라는 근본적 한계를 지닌다. 

본 문서는 모든 입력 시나리오를 수동으로 나열하는 한계를 극복하기 위해 **확률적 탐색 기법(Property-Based, Mutation, Fuzzing)**과 **수학적 추론 논리 기반 검증 기법(Symbolic Execution, Deductive Verification, Model Checking)**을 결합한 **뉴로-심볼릭(Neuro-Symbolic) 검증 아키텍처**를 정의한다. AI 에이전트는 코드 작성 및 수정(Self-healing) 시 본 문서의 검증 계층과 피드백 루프 규칙을 준수해야 한다.

---

## 2. 검증 패러다임의 전환

| 구분 | 기존 접근 (Example-based) | 고신뢰 에이전트 검증 (Generation & Reasoning) |
| :--- | :--- | :--- |
| **검증 방식** | 특정 입력값에 대한 기대 출력값 비교 | 불변식(Invariant) 정의 후 수학적·확률적 공간 탐색 |
| **테스트 작성** | 구현 코드를 참조하여 작성 (편향 발생) | 명세(Spec) 및 계약(Contract) 기반 독립 생성 |
| **결함 탐지** | 사전에 정의된 시나리오만 검출 | 솔버(Solver) 및 변이 엔진을 통한 미지의 반례 역산 |
| **회귀 자산** | 정적 테스트 케이스 수동 유지보수 | 도출된 반례(Counterexample)의 자동 JUnit 영구 편입 |

---

## 3. 2대 핵심 검증 계층 (Java 생태계 기준)

### 3.1 확률적·변이 탐색 계층 (Stochastic & Mutation Layer)
시스템이 반드시 지켜야 할 속성(Property)을 정의하고, 무작위 입력 생성 및 코드 변이를 통해 테스트 사각지대를 제거한다.

1. **속성 기반 테스트 (Property-Based Testing, PBT)**
   * **도구:** `jqwik` (JUnit 5 플랫폼 통합)
   * **원리:** 입력 공간 전체에서 성립해야 하는 불변 규칙(예: 역직렬화 왕복 동일성, 잔액 보존 법칙)을 정의하면 엔진이 수천 개의 무작위 입력을 생성한다.
   * **Shrinking(축소):** 반례 발견 시 실패를 유발하는 가장 단순화된 최소 입력값을 도출하여 에이전트에게 전달한다.
2. **변이 테스트 (Mutation Testing)**
   * **도구:** `PIT (Pitest)`
   * **원리:** 바이트코드의 조건 연산자(`>` $\rightarrow$ `>=`), 논리 연산자(`&&` $\rightarrow$ `||`), 반환값 등을 변형한 돌연변이(Mutant)를 생성해 기존 테스트 스위트의 결함 검출 능력을 측정한다.
   * **에이전트 지침:** `Mutant Survived`(코드가 변형되었으나 테스트가 통과함)가 발생한 라인은 검증 누락 분기이므로 해당 조건을 검증하는 테스트를 즉시 추가해야 한다.
3. **커버리지 기반 퍼징 (Coverage-Guided Fuzzing)**
   * **도구:** `Jazzer` (JVM용 LibFuzzer 기반)
   * **원리:** 외부 프로토콜 파서(Netty 등), JSON/바이너리 디코더에 비정형·손상된 페이로드를 대량 주입하여 예외 처리 누락 및 메모리 고갈을 탐지한다.

### 3.2 추론 논리 기반 검증 계층 (Logical Reasoning Layer)
프로그램의 제어 흐름과 상태 공간을 1차 술어 논리 및 시제 논리 수식으로 변환한 뒤, SMT Solver(`Z3`) 및 모델 체커를 통해 논리적 모순을 수학적으로 역산한다.

1. **기호 실행 (Symbolic Execution) & 콘콜릭 테스팅**
   * **도구:** `JBSE (Java Bytecode Symbolic Executor)` + `Z3 SMT Solver`
   * **원리:** 구체적 값 대신 기호($\alpha$)를 입력하여 분기별 경로 조건(Path Condition)을 수집하고, 솔버가 도달하기 어려운 중첩 조건문(예: 특정 매직 넘버, 나머지 연산 조건)을 통과하는 정확한 입력값을 역산한다.
2. **연역적 프로그램 검증 (Deductive Verification)**
   * **도구:** `OpenJML` (`--esc` 모드, Z3 백엔드)
   * **원리:** 호어 논리(Hoare Logic) 기반의 JML 주석(`//@ requires`, `//@ ensures`, `//@ invariant`)을 코드에 명시하여, 테스트 실행 전 정적 분석 단계에서 모든 입력에 대한 사후조건 충족 여부를 수학적으로 증명한다.
3. **모델 체킹 (Model Checking)**
   * **도구:** `TLA+` (설계 명세 검증), `Java Pathfinder (JPF)` (JVM 바이트코드 검증)
   * **원리:** 멀티스레드 경합(Race Condition), 데드락(Deadlock), 비동기 메시징 순서 역전 등 동시성 영역의 모든 스레드 인터리빙(Interleaving) 상태 공간을 전수 탐색하여 시제 논리(Temporal Logic) 불변식 위반을 검출한다.

---

## 4. AI Agent 실행 및 자가 치유(Self-Healing) 파이프라인

AI 에이전트는 기능 구현 및 리팩토링 작업 시 아래 4단계 CI 검증 루프를 순차적으로 통과해야 한다.

```text
[Spec & JML 작성] ──▶ [구현 코드 생성] ──▶ [1단계: OpenJML 정적 증명]
                                                    │ (반례 발생 시 수정)
[JUnit 회귀 편입] ◀── [3단계: JBSE 경로 추론] ◀── [2단계: jqwik + Pitest]
        │                                           │ (Mutant 생존 시 보강)
        ▼
[4단계: TLA+ / JPF 동시성 검증] ──▶ [최종 PR 승인]
```

### 단계별 검증 기준 및 에이전트 대응 프로토콜

| 단계 | 검증 도구 | 검증 목표 | 실패 시 에이전트 자가 치유(Action) |
| :--- | :--- | :--- | :--- |
| **Phase 1** | `OpenJML --esc` | 핵심 도메인 불변식 및 사전/사후조건 증명 | Z3가 제시한 계약 위반 반례 입력값을 분석하여 방어 조건 또는 연산 로직 수정 |
| **Phase 2** | `jqwik` & `Pitest` | 무작위 경계값 탐색 및 테스트 커버리지 품질 검증 | `jqwik` Shrinking 최소 반례 수정 및 `Pitest` 생존 변이 라인에 대한 경계 테스트 추가 |
| **Phase 3** | `JBSE` (Z3) | 심층 분기(Branch) 도달 가능성 및 숨겨진 예외 경로 역산 | 도출된 경로 입력값을 `@ParameterizedTest` JUnit 테스트로 자동 변환하여 `src/test`에 영구 저장 |
| **Phase 4** | `TLA+` / `JPF` | 비동기/멀티스레드 상태 전이 무결성 및 교착 상태 검증 | 실패한 스레드 인터리빙 트레이스를 분석하여 락(Lock) 범위, 원자성(CAS) 또는 상태 머신 전이 수정 |

---

## 5. AI Agent 구현 지침 (AGENTS.md 표준 규칙)

에이전트가 Java 코드를 작성하거나 테스트를 생성할 때 반드시 따라야 하는 행동 강령이다.

1. **역할 분리 원칙 (Builder vs Breaker):**
   * 테스트 코드를 작성할 때는 구현 코드의 내부 분기를 그대로 따라가지 말고, **오직 요구사항 명세와 도메인 불변식만**을 기준으로 적대적(Adversarial) 테스트를 설계한다.
2. **계약 우선 명시 (Contract-First):**
   * 금융, 정산, 상태 전이 등 무결성이 요구되는 핵심 메서드에는 반드시 사전조건(`requires`), 사후조건(`ensures`), 클래스 불변식(`invariant`)을 JML 또는 명확한 Assertion으로 선행 정의한다.
3. **반례의 회귀 자산 자산화 (Counterexample Capture):**
   * `jqwik`, `JBSE`, `Jazzer` 등 탐색·추론 엔진이 발견한 모든 실패 반례(Counterexample)는 일회성 디버깅으로 소모하지 않고, 반드시 명시적인 JUnit 5 회귀 테스트 케이스로 변환하여 저장소에 커밋한다.
4. **동시성 로직 선(先) 모델링:**
   * 비동기 이벤트 루프, 분산 락, 메시지 재시도 상태 머신을 구현할 때는 코드 작성 전 상태 전이 테이블 또는 `TLA+` 명세를 먼저 검증하여 상태 누락과 교착 상태 가능성을 원천 차단한다.