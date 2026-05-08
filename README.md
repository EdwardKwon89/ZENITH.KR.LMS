# ZENITH_LMS (SNTL 통합 물류 플랫폼)

항공·해운·통관·택배를 아우르는 차세대 지능형 통합 물류 관리 플랫폼, **ZENITH_LMS** 프로젝트입니다.

---

## 🚀 1. 프로젝트 개요
ZENITH_LMS는 복잡한 글로벌 물류 프로세스를 단일 플랫폼에서 관리하기 위해 설계되었습니다. 화주(Shipper), 운송사(Carrier), 관리자(Admin) 간의 실시간 데이터 동기화와 AI 기반의 자동화된 의사결정을 지원합니다.

- **프로젝트 명**: ZENITH_LMS
- **주요 목표**: 물류 전 구간(End-to-End) 가시성 확보 및 운영 자동화
- **현재 상태**: Phase 5 (Sprint 14) 완료 - E2E 테스트 및 안정화 종료

---

## 🛠️ 2. 기술 스택
- **Frontend**: `Next.js 16 (App Router)`, `React 19`, `TypeScript`, `Vanilla CSS (Modern Layout)`
- **Backend/DB**: `Supabase (PostgreSQL)`, `Auth`, `Storage`, `Edge Functions`
- **UI/Design**: `Glassmorphism UX`, `Framer Motion`, `Lucide React`
- **PDF/문서**: `@react-pdf/renderer` (청구서·운송장 동적 생성)
- **모니터링**: `Sentry (@sentry/nextjs)` (에러 추적 및 관리자 알림)
- **이메일**: `Resend` (회원 승인 알림 등)
- **Testing**: `Playwright` (E2E), `Vitest v4` (Unit/Integration)
- **Methodology**: `ZEN_A4` (Hybrid), `rtk` (Token-optimized CLI proxy)

---

## 📚 3. 문서 상세 인덱스 (Documentation)
모든 문서는 `/docs` 폴더 내에 체계적으로 관리되고 있습니다.

### 📋 [00] 가이드 및 거버넌스 (Guides & Governance)
프로젝트 운영 표준과 개발 원칙을 정의합니다.
- [MASTER_INDEX.md](./MASTER_INDEX.md): **전체 문서의 통합 지도 (가장 먼저 참조)**
- [GEMINI.md](./GEMINI.md): Gemini 에이전트 업무 규정 및 코딩 표준 (R-01~R-14)
- [CLAUDE.md](./CLAUDE.md): Claude 에이전트 작업 가이드
- [101_ZEN_A4_METHODOLOGY.md](docs/00_GUIDE/101_ZEN_A4_METHODOLOGY.md): ZEN_A4 하이브리드 개발 방법론 상세
- [105_DOMAIN_KNOWLEDGE.md](docs/00_GUIDE/105_DOMAIN_KNOWLEDGE.md): 물류 도메인 용어 및 업무 지식 (Source of Truth)
- [206_DOCS_AND_SCRIPT_GOVERNANCE.md](docs/00_GUIDE/206_DOCS_AND_SCRIPT_GOVERNANCE.md): 문서 관리 및 스크립트 명명 규칙

### 📅 [01] 공정 및 일정 관리 (WBS)
프로젝트 진행 상황과 남은 과업을 추적합니다.
- [WBS_01_상세_공정표.md](docs/01_WBS/WBS_01_상세_공정표.md): 전체 Phase별 상세 일정 및 완료 증적
- [.planning/ROADMAP.md](.planning/ROADMAP.md): 상위 레벨 마일스톤 및 로드맵 정보

### 🔍 [02] 요구사항 및 기능 분석 (Requirements)
비즈니스 요구사항을 기술적 기능으로 구체화한 문서입니다.
- [Fun_Detail_03_오더관리.md](docs/02_Analysis/Fun_Detail_03_오더관리.md): 오더 생성, 상태 변경 로직 상세
- [Fun_Detail_07_회계_청구.md](docs/02_Analysis/Fun_Detail_07_회계_청구.md): 정산, 청구서 생성, 수익 분석 로직
- [An_01_데이터사전.md](docs/02_Analysis/An_01_데이터사전.md): 시스템에서 사용하는 전역 데이터 필드 정의

### 🎨 [03] 시스템 설계 및 API 명세 (Design)
구현을 위한 기술 설계와 API 규격서입니다.
- [Ds_11_API_상세_명세서.md](docs/03_Design/Ds_11_API_상세_명세서.md): **전체 모듈 통합 API 규격 (V2)**
- [Ds_01_화면설계_공통_컴포넌트.md](docs/03_Design/Ds_01_화면설계_공통_컴포넌트.md): UI 디자인 시스템 및 컴포넌트 설계
- [302_AUTH_GUARD_ARCHITECTURE.md](docs/03_Design/302_AUTH_GUARD_ARCHITECTURE.md): 미들웨어 기반 권한 제어(RBAC) 아키텍처

### ✅ [08] 자가 감사 및 검증 (Audit & QA)
품질 확보를 위한 테스트 결과와 오류 대응 기록입니다.
- [LIVE_REGRESSION_TEST_MAP.md](docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md): 전체 회귀 테스트 케이스 및 성공 여부 맵
- [PH14_E2E_Summary.md](docs/08_Self_Audit/Walkthroughs/PH14_E2E05_SETTLEMENT.md): 주요 기능별 실행 과정 증적 (Settlement, Tracking 등)
- [SAR_reports/](docs/08_Self_Audit/SAR_reports/): 오류 발생 원인 분석 및 재발 방지 대책 리포트

---

## ⚙️ 4. 테스트 및 개발 환경 설정 (Environment Setup)
ZENITH_LMS는 보안 및 방법론 준수를 위해 **로컬 Supabase 환경**에서의 테스트를 원칙으로 합니다.

> **`rtk`란?** 프로젝트 전용 CLI 프록시 도구입니다. `rtk <command>` 형태로 `npm`, `supabase` 등 모든 명령어를 실행하면 토큰 최적화 및 로깅이 자동 적용됩니다. 미설치 시 `rtk` 대신 원래 명령어를 직접 사용하세요.

### 1단계: 필수 도구 설치
- Node.js (v18+), npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) 설치 필수
- Docker (Supabase Local 구동용)

### 2단계: 환경 변수 설정
```bash
cp .env.example .env.local
```
`.env.local`에 아래 값을 채워 넣습니다.

| 변수명 | 설명 | 필수 |
| :--- | :--- | :---: |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ |
| `DATABASE_URL` | Supabase DB 직접 연결 URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 사이드 전용 Service Role Key | ✅ |
| `RESEND_API_KEY` | 이메일 발송 API Key (Resend) | ✅ |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry 에러 모니터링 DSN | 선택 |

### 3단계: 프로젝트 초기화
```bash
# 1. 저장소 클론 (이미 완료된 경우 생략)
# 2. 의존성 설치
rtk npm install

# 3. 로컬 Supabase 구동
rtk supabase start

# 4. DB 스키마 및 테스트 계정 시딩
rtk supabase db reset
rtk npm run db:seed
```

### 4단계: 애플리케이션 실행
```bash
# 로컬 개발 서버 실행
rtk npm run dev
```
- 접속 주소: `http://localhost:3000`

### 5단계: 테스트 실행 (Playwright)
```bash
# 전체 E2E 테스트 실행
npx playwright test

# 특정 시나리오만 실행 (예: 오더 관리)
npx playwright test tests/e2e/e2e-03-master-order.spec.ts
```

---

## ☁️ 5. 배포 (Deployment)

ZENITH_LMS는 **Vercel** 플랫폼에 배포됩니다.

```bash
# Vercel CLI를 통한 프로덕션 배포
vercel --prod
```

- Vercel 프로젝트 환경 변수에 `.env.local`의 모든 값을 동일하게 설정해야 합니다.
- `main` 브랜치 푸시 시 Vercel CI/CD가 자동으로 프로덕션 배포를 트리거합니다.
- DB 스키마 변경 시 반드시 원격 Supabase에 마이그레이션을 먼저 적용하세요: `rtk supabase db push`

---

## 📁 6. 폴더 구조 (Folder Structure)
```text
ZENITH_LMS_001/
├── .agent/              # 에이전트 작업 상태 및 TASK_BOARD 관리
├── .planning/           # 프로젝트 ROADMAP 및 CONTEXT 데이터
├── docs/                # 프로젝트 문서 저장소 (가이드, 분석, 설계, 감사)
├── messages/            # 다국어(i18n) 번역 데이터 (ko, en, zh)
├── public/              # 정적 자원 (이미지, 폰트, 리소스)
├── scripts/             # 데이터 시딩 및 유틸리티 스크립트
├── src/                 # Next.js 애플리케이션 소스 코드
│   ├── app/             # App Router 기반 페이지 및 API Route
│   ├── components/      # UI 컴포넌트 (Glassmorphism 적용)
│   ├── lib/             # API 유틸리티 및 Supabase 클라이언트
│   └── types/           # 전역 TypeScript 타입 정의
├── supabase/            # DB 마이그레이션, 시드 데이터, RLS 설정
└── tests/               # Playwright E2E 및 Vitest 단위 테스트
```

---

## 🔐 7. 테스트 계정 정보
모든 계정의 비밀번호는 `password1234`로 동일하게 설정되어 있습니다.

| 역할 (Role) | 아이디 (Email) | 설명 |
| :--- | :--- | :--- |
| **Manager** | `manager@zenith.kr` | 플랫폼 업무 총괄 및 상위 승인 권한 |
| **Operator** | `operator@zenith.kr` | 플랫폼 물류 실무 및 오더 상태 관리 |
| **Admin** | `admin@zenith.kr` | 조직(Tenant) 관리자 및 사용자/코드 관리 |
| **Shipper** | `shipper@zenith.kr` | 화주 (오더 생성 및 내역 조회) |
| **Carrier** | `carrier@zenith.kr` | 운송 파트너 (트래킹 업데이트 및 운송 실행) |
| **Individual** | `individual@zenith.kr` | 개인 화물주 (등급 승격 테스트용) |

---

## 📄 8. 거버넌스 및 준수 사항
- 모든 작업은 `ZEN_A4` 방법론에 따라 계획-실행-검증 단계를 거칩니다.
- 코드 수정 시 반드시 `npm run test:regression`을 통과해야 합니다.
- 상세한 운영 규정은 [GEMINI.md](./GEMINI.md)를 참조하십시오.

---
© 2026 ZENITH_LMS Team. All rights reserved.
