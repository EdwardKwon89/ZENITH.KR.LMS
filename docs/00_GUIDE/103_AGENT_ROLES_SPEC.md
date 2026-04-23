---
tags: ["governance"]
---

# 📚 103_AGENT_ROLES_SPEC (에이전트 역할 및 모델 명세)

> **프로젝트**: ZENITH_LMS  
> **방법론**: ZEN_A4 (GSD Hybrid v2.0)  
> **최종 업데이트**: 2026-04-23

> [!NOTE]
> 상세 R&R 및 협업 절차는 [104_MULTIAGENT_RNR_GUIDE.md](./104_MULTIAGENT_RNR_GUIDE.md)를 참조하십시오. 본 문서는 역할 요약 및 모델 할당 기준을 정의합니다.

이 문서는 ZENITH_LMS 프로젝트에 참여하는 멀티 에이전트들의 역할 분담(R&R)과 각 역할에 최적화된 AI 모델 할당 기준을 정의합니다.

## ⚠️ 필수 에이전트 준수 사항 (Mandatory Agent Mandate)
**모든 참여 에이전트는 작업을 시작하기 전 본 문서(103_AGENT_ROLES_SPEC.md)에서 할당된 본인의 R&R을 숙지하고, 작업 대상 폴더의 `000_README.md` 인덱스를 참조하여 문서화 표준을 준수해야 합니다.**

---

## 🏗️ 1. 에이전트 역할 정의 (Role Hierarchy)

### 1-0. 페르소나 이름 (확정)

| 페르소나 | 역할 | 플랫폼 |
| :--- | :--- | :--- |
| **Aiden (에이든)** | ZEN_CEO | Claude Opus 4.7 |
| **Riley (라일리)** | CPO + Header Agent | Gemini Pro High |

---

### 1-1. 전략 및 오케스트레이션 (Leadership)
| 역할 | 페르소나 | 주요 책임 |
| :--- | :--- | :--- |
| **Master** | Owner (Edward) | 전체 플랫폼 소유자. 최종 의사결정 및 시스템 운명 결정. |
| **ZEN_CEO** | Aiden (Claude Opus 4.7) | 전체 프로젝트 방향 설정, 아키텍처 결정, 에이전트 오케스트레이션. |
| **CTO** | Claude Sonnet 4.6 | 기술 스택 선정, 아키텍처 패턴 설계, Frontend Execution 겸임. |
| **CIO** | Gemini Pro High | 데이터 모델링(ERD), 정보 보안 정책, 외부 API 연동 규격 설계, **문서 무결성 감사 및 인덱스 상시 관리**. |
| **CPO** | Riley (Gemini Pro High) | **Header Agent** (Gemini 단일 창구), 기능 명세(PRD), UI/UX 일관성, 도메인 지식 관리, UAT 시나리오 확정. |

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
| **Supreme** | **Master (Edward)** | **Human** | 최종 승인 및 방향성 검수 |
| **Claude Strategic** | **ZEN_CEO (Aiden)** | **Claude Opus 4.7** | 심층 추론, 전략 결정, 에이전트 오케스트레이션 |
| **Claude Execution** | **CTO** (Frontend Execution 겸임) | **Claude Sonnet 4.6** | 기술 결정, React/Next.js 구현, 품질 게이트 |
| **Gemini Strategic** | **CPO (Riley)** — Header Agent, **CIO** | **Gemini Pro High** | 장기 컨텍스트, 도메인·정보 아키텍처, 내부 위임 총괄 |
| **Gemini Execution** | **PM**, Backend Execution, **Audit** | **Gemini Flash** | 대량 코드 생성, 반복 작업, Business QA |
| **Sub-Agent** | gsd-nyquist-auditor (Technical QA) | **Claude Haiku 4.5** | 커버리지 측정, Playwright, 자동 테스트 생성 |

### ⚠️ 특별 운영 조건: Audit Agent Model Swap
Audit Agent(Business QA)는 평시(설계/구현)에는 신속한 피드백을 위해 **Gemini Flash**를 사용하나, **Phase 3 (Verify)** 단계의 최종 품질 게이트 및 보안 감사 시에는 **Gemini Pro High**로 자동 전환하여 무결성을 보증합니다.

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

## 🔐 5. 테스트 계정 정보 (Verification Credentials)

시스템 기능 검증 및 UAT 수행을 위한 표준 테스트 계정 정보입니다.

| 구분 | 이메일 (ID) | 비밀번호 | 권한 (Role) | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **슈퍼 관리자** | `temp_admin@zenith.kr` | `admin1234` | ZENITH_SUPER_ADMIN | 시스템 전체 설정 및 마스터 관리 |
| **법인 화주** | `test_corp_001@zenith.kr` | `admin1234` | ADMIN | (주) 제니스 글로벌 소속, 오더 등록/관리 |
| **개인 화주** | `governance_master@zenith.kr`| `admin1234` | ADMIN | 거버넌스 마스터용 테스트 계정 |

> [!NOTE]
> 모든 테스트 계정의 초기 비밀번호는 `admin1234`로 설정되어 있습니다. 보안이 필요한 상용 환경 배포 시에는 반드시 변경해야 합니다.

---
*문서 끝*

