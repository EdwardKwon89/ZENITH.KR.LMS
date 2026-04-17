# ZENITH_LMS 상세 WBS (Work Breakdown Structure)

> **프로젝트:** ZENITH_LMS (SNTL 통합 물류 플랫폼)
> **인프라 전략:** Separable Serverless (Vercel + Supabase)
> **문서번호:** WBS-01
> **최종 버전:** v1.0 (2026-04-16)

본 문서는 프로젝트의 핵심 업무 흐름을 기반으로 한 5단계 상세 공정표입니다. 모든 작업은 **1인 Full-stack 개발자**의 집중 개발 공수를 기준으로 산정되었습니다.

---

## 📊 WBS Summary (by Phase)

| Phase | 목표 (Goal) | 기간 (Man-Day) | 핵심 선행 조건 (Dependency) |
|:---:|:---|:---:|:---|
| **Phase 1** | **기초 인프라 및 마스터 데이터 구축** | 25 MD | 아키텍처 확정 |
| **Phase 2** | **핵심 물류 프로세스 (Order & Warehouse)** | 35 MD | Phase 1 완료 및 기준 정보 로드 |
| **Phase 3** | **물류 지능화 (Tracking & Accounting)** | 30 MD | Phase 2 완료 및 외부 API 승인 |
| **Phase 4** | **운영 최적화 (System & Support)** | 15 MD | 전체 모듈 통합 및 사용자 테스트 |

---

## 🏗️ Detailed WBS (Level 1-5)

### 1. Phase 1: Identity & Foundation (기반 구축)
> **Goal**: 보안 인증 체계를 확립하고, 모든 비즈니스 로직의 기초가 되는 마스터 데이터를 수립합니다.

#### 1.1 [Infra & DB] 기초 환경 구축 (5 MD)
- **1.1.1 프로젝트 초기화 및 CI/CD** (2 MD)
    - 1.1.1.1 Next.js (FE) & Supabase 연결 설정
    - 1.1.1.2 Vercel 배포 자동화 및 환경 변수 구성
- **1.1.2 상위 수준 DB Schema 설계** (3 MD)
    - 1.1.2.1 Auth, Profiles, Organizations 테이블 설계
    - 1.1.2.2 기본 Audit 필드(created_by, updated_at 등) 공통화

#### 1.2 [Master Data] 공통 코드 및 기준 정보 (10 MD) [최우선]
- **1.2.1 공통 코드 시스템 구현** (4 MD)
    - 1.2.1.1 국가, 항구, 화물 상태, 운송 수단 코드 정의
    - 1.2.1.2 기초 코드 관리 API (CRUD) 및 UI 구현
- **1.2.2 물류 기준 정보 모듈** (6 MD)
    - 1.2.2.1 회원 등급(Iron~Gold) 및 등급별 할인율 마스터 구축
    - 1.2.2.2 서비스별(AIR, SEA, CIR) 기본 운송 요율 테이블 설계

#### 1.3 [Identity] 인증 및 회원 관리 (10 MD)
- **1.3.1 Supabase Auth 기반 인증** (4 MD)
    - 1.3.1.1 API 명세 수립 (Auth/Login/Join) 및 Contract 확정 (1 MD)
    - 1.3.1.2 JWT 기반 회원 로그인 및 세션 관리 로직 구현 (3 MD)
- **1.3.2 회원가입 및 승인 워크플로우** (6 MD)
    - 1.3.2.1 상세 API 명세 수립 (Approval/Register) (1 MD)
    - 1.3.2.2 가입 신청 UI 및 회원 상태 전환 (is_approved) 로직 구현 (5 MD)

---

### 2. Phase 2: Core Logistics (핵심 물류 흐름)
> **Goal**: 고객의 오더가 접수되어 물류 창고에서 실물 흐름으로 이어지는 핵심 구간을 개발합니다.

#### 2.1 [Ordering] 오더 관리 시스템 (20 MD)
- **2.1.1 하우스 오더(House Order) 등록** (12 MD)
    - 2.1.1.1 API 명세 수립 (Order Create/Update) (2 MD)
    - 2.1.1.2 송하인/수하인 주소록 연동 및 오더 확정 로직 구현 (10 MD)
- **2.1.2 오더 상태 추적 및 이력 관리** (8 MD)
    - 2.1.2.1 API 명세 수립 (Status/Audit Log) (1 MD)
    - 2.1.2.2 상태값 기반 상태 천이도(Statemachine) 구현 (7 MD)

#### 2.2 [Packing] 마스터 오더 및 창고 운영 (15 MD)
- **2.2.1 마스터 오더 구성 (Packing)** (8 MD)
    - 2.2.1.1 다수 하우스 오더의 Bulk 래핑 및 마스터 번호 발급
    - 2.2.1.2 창고 입고 대기 상태 자동 전환
- **2.2.2 창고 실무 및 운송장 출력** (7 MD)
    - 2.2.2.1 바코드 스캔 기반 입/출고 확정 로직
    - 2.2.2.2 PDF 운송장(Label) 동적 생성 및 출력 엔진 연동

---

### 3. Phase 3: Intelligence & Finance (정산 및 정보 통합)
> **Goal**: 실시간 운송 상태를 통합하고, 복잡한 물류 비용을 자동 산출하여 정산 프로세스를 완결합니다.

#### 3.1 [Tracking] 운송 정보 통합 (12 MD)
- **3.1.1 외부 API 연동 아키텍처** (6 MD)
    - 3.1.1.1 항공/선사/택배 API 연동 어댑터 패턴 구현
    - 3.1.1.2 주기적 Tracking 데이터 폴링(Polling) 워커 배치
- **3.1.2 통합 가시성 강화** (6 MD)
    - 3.1.2.1 단일 오더 및 마스터 오더 단위 통합 트래킹 화면
    - 3.1.2.2 상태 변경 시 자동 알림(Notification) 엔진 연동

#### 3.2 [Finance] 정산 및 비용 관리 (18 MD)
- **3.2.1 복합 비용 정산 엔진** (10 MD)
    - 3.2.1.1 API 명세 수립 (Settlement/Invoice Logic) (2 MD)
    - 3.2.1.2 원가/요율 기반 합산 엔진 구현 (8 MD)
- **3.2.2 인보이스 및 입금 관리** (8 MD)
    - 3.2.2.1 API 명세 수립 (Invoice Print/Issue) (1 MD)
    - 3.2.2.2 PDF 청구서 자동 발행 및 수입 확정 처리 (7 MD)

---

### 4. Phase 4: Expansion & Stabilization (운영 및 최적화)
> **Goal**: 시스템의 안정성을 확보하고 사용자 지원 및 통계 기반의 의사결정을 지원합니다.

#### 4.1 [Support] 고객 만족 및 관리 (8 MD)
- **4.1.1 VOC 및 Q&A 시스템** (5 MD)
    - 4.1.1.1 오더 연계형 고객 문의 접수 및 상담 이력
- **4.1.2 시스템 모니터링 및 로깅** (3 MD)
    - 4.1.2.1 에러 로깅 서비스(Sentry 등) 연동 및 관리자 알림

#### 4.2 [Closing] 프로젝트 완료 및 인계 (7 MD)
- **4.2.1 최종 통합 테스트 및 보완** (5 MD)
    - 4.2.1.1 전 구간 End-to-End 시나리오 검증
- **4.2.2 사용자 매뉴얼 및 운영 이관** (2 MD)
    - 4.2.2.1 각 역할별(Manager, Oper, User) 가이드 작성

---

## 📝 개정 이력 (Revision History)

| 버전 | 날짜 | 작성자 | 설명 |
|:---|:---|:---|:---|
| v1.0 | 2026-04-16 | Antigravity | 초기 상세 WBS 수립 (5레벨 체계 및 Man-Day 반영) |
