# 📘 지능형 통합 물류 플랫폼 종합 설계 가이드 (Standard Design Principles)

> **문서번호**: ZEN-DESIGN-000
> **작성일**: 2026-04-18
> **최종 버전**: v1.2
> **작성자**: ZEN_CEO (Gemini 3.1 Pro)
> **승인자**: Edward (Master)

본 문서는 **지능형 통합 물류 플랫폼(Intelligent Integrated Logistics Platform)** 개발 과정에서 결정된 주요 아키텍처 및 설계 방향성을 종합한 '설계 헌장'이다. 모든 세부 개발은 본 가이드의 원칙을 준수해야 한다.

---

## 1. 시스템 아키텍처 (Technology Stack)
- **Core Strategy**: **Separable Serverless** (독립적 서버리스)
- **Framework**: Next.js 15+ (App Router)
- **Backend / DB**: Supabase (PostgreSQL + Auth + Realtime)
- **Infrastructure**: Vercel (FE Deployment)
- **Principle**: 프런트엔드와 백엔드는 API 및 DB 레벨에서 느슨하게 결합(Loosely Coupled)되며, 언제든 인프라를 분리할 수 있는 구조를 유지한다.

---

## 2. 권한 및 라우팅 설계 (Authorization & Routing)
- **원칙**: **Orthogonal Separation** (진입로와 행위의 독립적 분리)
- **조직 타입 (Org Type)**: `PLATFORM`, `SHIPPER`, `CARRIER`로 이문화된 멀티 테넌시 포털 구조.
- **역할 (Role)**: 기능별 권한 맵(`PERMISSION_MAP`)에 따른 UI/API 제어.
- **라우팅**: 고정된 경로가 아닌 `ORG_ROUTE_MAP` 설정 기반의 다이내믹 라우팅 엔진 적용 ([상세보기](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/302_OO_PERMISSION_ROUTING_GUIDE.md)).

---

## 3. 데이터베이스 설계 표준 (Database & Master Data)
- **Master Data**: 물류의 근간이 되는 공통 코드는 `common_code_groups`와 `common_codes`를 통해 계층화하여 관리한다.
- **Multi-lingual**: 모든 마스터 데이터는 글로벌 서비스 확장을 고려하여 4개 국어(`ko`, `en`, `zh`, `ja`) 필드를 필수 포함한다.
- **Auditability**: 모든 테이블은 `created_by`, `updated_at` 등 생성/변경 이력 추적 필드를 공통 적용한다.
- **Security (RLS)**: 데이터베이스 수준에서 Row Level Security를 적용하여 타 조직의 데이터 접근을 원천 차단한다.

---

## 4. UI/UX 디자인 원칙 (Visual Excellence)
- **Design System**: 'ZenUI' 기반의 일관된 디자인 토큰 사용.
- **Aesthetics**: Glassmorphism, 유려한 그라데이션, 마이크로 애니메이션을 통한 프리미엄 경험 제공.
- **Responsiveness**: 모바일 우선(Mobile-First) 기조를 유지하되 데스크톱 물류 실무 효율성을 동시에 보장한다.

---

## 5. 개발 거버넌스 (Governance)
- **ZEN_A4 방법론**: 설계(Design) → 구현(Implement) → 검증(Verify) → 커밋(Commit)의 4단계를 철저히 준수한다.
- **Audit First**: 모든 중요 기능에는 전수 검증 결과인 UAT(User Acceptance Test) 문서가 결과물로 포함되어야 한다.

---

## 🏛️ 관련 참조 문서 리스트
1. [역할 및 권한 정의서](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/ROLE_DEFINITION.md)
2. [객체 지향 권한 설계 상세](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/00_GUIDE/302_OO_PERMISSION_ROUTING_GUIDE.md)
3. [UAT 결과 보고서 (Master Data)](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/08_Self_Audit/UAT/UAT_1.2_Result_MasterData.md)

> [!IMPORTANT]
> 본 가이드는 프로젝트 진행 상황에 따라 지속적으로 업데이트되며, 변경 시 Master와 ZEN_CEO의 상호 합의 하에 시행한다.
