# 📚 103_AGENT_ROLES_SPEC (에이전트 역할 및 모델 명세)

> **프로젝트**: ZENITH_LMS  
> **방법론**: ZEN_A4 (GSD Hybrid v2.0)  
> **최종 업데이트**: 2026-04-17

이 문서는 ZENITH_LMS 프로젝트에 참여하는 멀티 에이전트들의 역할 분담(R&R)과 각 역할에 최적화된 AI 모델 할당 기준을 정의합니다.

---

## 🏗️ 1. 에이전트 역할 정의 (Role Hierarchy)

### 1-1. 전략 및 오케스트레이션 (Leadership)
| 역할 | 페르소나 | 주요 책임 |
| :--- | :--- | :--- |
| **CEO** | Orchestrator | 전체 프로젝트 방향 설정, 아키텍처 결정, 고난도 로직 설계 승인. |
| **CTO** | Architect | 기술 스택 선정, 아키텍처 패턴 설계, 핵심 백엔드 로직 검토. |
| **CIO** | Info Architect | 데이터 모델링(ERD), 정보 보안 정책, 외부 API 연동 규격 설계. |
| **CPO** | Product Owner | 기능 명세(PRD) 작성, UI/UX 일관성 검토, 비즈니스 테스트 시나리오 확정. |

### 1-2. 운영 및 실행 (Operations)
| 역할 | 페르소나 | 주요 책임 |
| :--- | :--- | :--- |
| **PM** | Task Manager | WBS 관리, 기능 구현 진척도 추적, 작업 로그(LOG) 및 상태 보고. |
| **Execution** | Developer | 코드 구현(TDD), 단위 테스트 작성, 버그 수정 및 최적화. |
| **Audit** | Auditor | 품질 게이트(Stop) 검증, SAR 감사, 정합성 및 엣지 케이스 테스트. |

---

## 🤖 2. 모델 할당 명세 (Model Mapping)

모든 에이전트는 작업의 복잡도와 속도를 고려하여 최적의 모델 프로필을 사용합니다.

| 분류 | 역할 | 할당 모델 (Target) | 적용 기준 |
| :--- | :--- | :--- | :--- |
| **High Tier** | CEO, CTO, CIO | **Gemini 3.1 Pro (High)** | 심층 추론, 구조적 결정, 보안 검토 |
| **Mid Tier** | CPO | **Gemini 3.1 Pro (Low)** | 명세 작성, 일관성 검토, 빠른 피드백 |
| **Smart Tier** | Audit Agent | **Gemini 3.1 Pro (Low/High)** | **Phase 1~2**: Low (상시 검증) <br> **Phase 3**: High (정밀 감사) |
| **Fast Tier** | PM, Execution | **Gemini 3 Flash** | 대량 코드 생성, 반복 작업, 상태 관리 |

### ⚠️ 특별 운영 조건: Audit Agent Model Swap
Audit Agent는 평시(설계/구현)에는 신속한 피드백을 위해 **Low** 모델을 사용하나, **Phase 3 (Verify)** 단계의 최종 품질 게이트 및 보안 감사 시에는 **Gemini 3.1 Pro (High)**로 자동 전환하여 무결성을 보증합니다.

---

## 🔄 3. 워크플로우 내 에이전트 협업 예시

### 시나리오: 신규 운송 요율 모듈 개발
1. **[CEO]**: 요율 관리 시스템 아키텍처 제안 (`Phase 1 Start`)
2. **[CIO]**: 데이터베이스 스키마(Rates, Zones) 설계 검토
3. **[CPO]**: 복합 운송(AIR+SEA) 시나리오 기반 테스트 케이스 정의
4. **[PM]**: WBS 1.2.2.2 작업 할당 및 진척도 기록
5. **[Execution]**: Gemini 3 Flash를 통한 TDD 구현 (`Phase 2`)
6. **[Audit Agent]**: (Low) 구현 중 상시 정합성 체크 -> (High) Phase 3 최종 품질 게이트 검증

---

## 📊 4. 기대 효과
- **속도**: 반복 작업(Flash)과 정밀 작업(Pro High)의 명확한 분리로 개발 리드타임 40% 단축.
- **품질**: Phase 3 전용 High 모델 감사를 통해 런타임 오류 및 보안 취약점 90% 예방.
- **비용**: 모든 작업에 High를 쓰지 않고 전략적 배치(Low/Flash)를 통해 연산 효율성 최적화.

---
*문서 끝*
