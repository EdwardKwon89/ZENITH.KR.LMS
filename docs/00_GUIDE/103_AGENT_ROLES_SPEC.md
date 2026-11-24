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

## 🔐 5. 테스트 계정 정보 (로컬 개발/테스트 환경 전용)

로컬 `npm run db:seed` 환경에서 기능 검증 및 UAT를 수행하기 위한 역할별 테스트 계정 구분입니다. **상용(Production) 환경에서는 사용하지 않으며, 비밀번호 리터럴은 공개 문서에 기재하지 않습니다(`scripts/seed-local.ts` 로컬 설정 참조).**

### 5-1. `npm run db:seed`로 재현 가능한 계정 (2026-07-19 검증 완료 — `scripts/seed-local.ts`, 로컬 전용)

`supabase db reset` 후 반드시 `npm run db:seed`를 실행해야 아래 로컬 계정이 생성됩니다(reset만으로는 `auth.users` 0건).

| 이메일 (ID) | 비밀번호 | 권한 (Role) | 소속 조직 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| `manager@zenith.kr` | `<로컬 시드 설정값>` | MANAGER | Zenith Logistics (PLATFORM) | |
| `operator@zenith.kr` | `<로컬 시드 설정값>` | OPERATOR | Zenith Logistics (PLATFORM) | |
| `admin@zenith.kr` | `<로컬 시드 설정값>` | ADMIN | Zenith Logistics (PLATFORM) | UAT 마스터 계정 (UAT_MASTER.md 기준) |
| `agency@zenith.kr` | `<로컬 시드 설정값>` | **AGENCY** | Zenith Agency Partners (AGENCY) | UAT-15/16/17-03/20 검증용 |
| `agency_shipper@zenith.kr` | `<로컬 시드 설정값>` | **AGENCY_SHIPPER** | Agency Shipper Co (SHIPPER) | `agency@zenith.kr` 소속 |
| `uat02_corp_shipper@zenith.kr` | `<로컬 시드 설정값>` | CORPORATE | Global Shipper Corp (SHIPPER) | UAT-17 DIRECT/PICKUP 검증용 |
| `shipper@zenith.kr` | `<로컬 시드 설정값>` | CORPORATE | Global Shipper Corp (SHIPPER) | |
| `carrier@zenith.kr` | `<로컬 시드 설정값>` | CARRIER | Fast Carrier Ltd (CARRIER) | |
| `individual@zenith.kr` | `<로컬 시드 설정값>` | INDIVIDUAL | — | |

### 5-2. ⚠️ 문서에만 존재 — 재현 스크립트 미확인 (신뢰하지 말 것)

아래 계정은 과거 특정 UAT 라운드에서 수기로 생성됐던 것으로 추정되며, `scripts/seed-local.ts` 전체 이력을 확인해도 생성 코드가 없습니다.

| 이메일 (ID) | 비밀번호 | 권한 (Role) | 비고 |
| :--- | :--- | :--- | :--- |
| `temp_admin@zenith.kr` | `<로컬 수기 설정값>` | ZENITH_SUPER_ADMIN | |
| `test_corp_001@zenith.kr` | `<로컬 수기 설정값>` | ADMIN | |
| `governance_master@zenith.kr`| `<로컬 수기 설정값>` | ADMIN | |

> [!NOTE]
> 모든 테스트 계정은 **로컬 개발 환경 전용**이며, 상용 환경에 시드하거나 사용하지 않습니다.
> **재발 방지 원칙**: 이 문서에 계정을 추가할 때는 반드시 `scripts/seed-local.ts`에도 동시에 반영한다 — 문서와 재현 스크립트가 따로 노는 것이 agency@zenith.kr 누락 사고(2026-07-19)의 근본 원인이었다.

---
*문서 끝*

