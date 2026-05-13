# EXP-IMP-DK-ARCH: D_Kai — 아키텍처·업무 흐름 IMP 추가 도출

> **수행 주체**: D_Kai (OpenCode / DeepSeek V4 Flash)
> **도구**: GitNexus 쿼리 + 파일 구조 분석 + 크로스 레퍼런스
> **일시**: 2026-05-13
> **중복 방지**: `scratch/post_launch_improvements.md` IMP-001~014 확인 완료

---

## [IMP-015] middleware.ts console.log로 세션·경로 정보 프로덕션 노출

- **발견 경위**: `src/middleware.ts` L28 분석 중 확인
- **현재 상태**: `console.log(`[MIDDLEWARE] Entry: ${pathname}`)` — 모든 요청의 경로를 콘솔에 출력. 프로덕션 환경에서도 동작 중.
- **임시 조치**: 없음 (운영 중)
- **근본 문제**: 
  - 경로 정보가 stdout으로 노출되어 로그 수집 시스템에 혼란 초래
  - IMP-013(console.log 53개 파일)과 중복되나, **middleware는 모든 요청의 진입점**이므로 영향도가 53개 파일 중 가장 큼
  - 보안 관점에서 요청 경로 패턴 노출은 정보 수집 벡터
- **목표 구현**:
  1. middleware의 `console.log` → `logger.debug`로 교체 (IMP-013 logger 구축 후 연계)
  2. 또는 `process.env.NODE_ENV === 'development'` 조건부 분기
- **관련 파일**: `src/middleware.ts`, `src/lib/logger.ts` (IMP-013)
- **예상 공수**: 0.1 MD (단독) / IMP-013에 통합 시 추가 공수 없음
- **우선순위**: Medium (정보 노출 + IMP-013과 시너지)

---

## [IMP-016] 서버 액션 Supabase 클라이언트 중복 생성 — 서비스 레이어 부재

- **발견 경위**: GitNexus 분석 중 `createClient()` 호출 패턴 확인 (`src/utils/supabase/server.ts`)
- **현재 상태**: 
  - 7개 서버 액션 파일이 각각 `createClient()`를 호출하여 Supabase 클라이언트 생성
  - `src/app/actions/auth.ts`, `orders.ts`, `finance.ts`, `member.ts`, `inventory.ts`, `rates.ts`, `tracking.ts`
  - 각 액션이 DB 쿼리를 직접 포함 — 서비스 레이어 없음
  - `src/lib/` 디렉토리에 `logistics/`, `finance/`, `customs/` 등 도메인 모듈이 있으나 서버 액션과의 인터페이스 표준화 부재
- **임시 조치**: 없음 (현재 패턴 유지)
- **근본 문제**:
  - 단위 테스트 시 Supabase 클라이언트 목(mock) 설정이 모든 액션 파일에서 중복 필요
  - DB 스키마 변경 시 모든 액션 파일을 개별 수정해야 함
  - 비즈니스 로직과 데이터 액세스가 혼재되어 재사용 불가
- **목표 구현**:
  1. `src/lib/repositories/` 디렉토리 신설 — 도메인별 Repository 패턴 도입
  2. 각 서버 액션에서 DB 쿼리를 Repository로 이전
  3. 서버 액션은 Repository 호출 + 권한 검증 + 응답 변환만 담당
- **관련 파일**: `src/app/actions/*.ts` (7개), `src/lib/repositories/` (신규)
- **예상 공수**: 3~5 MD (대규모 리팩토링)
- **우선순위**: Medium (장기적 유지보수성, 즉시 필요 없음)

---

## [IMP-017] Error Boundary 부족 — 전역 오류 처리 일원화 필요

- **발견 경위**: GitNexus 파일 구조 분석 중 error boundary 파일 확인
- **현재 상태**: 
  - `src/app/[locale]/(dashboard)/error.tsx` — 단 1개만 존재
  - 다른 경로 세그먼트(`(auth)`, `/orders/[orderId]`, `/admin/`, `/master/` 등)에 error boundary 없음
  - 각 페이지가 개별적으로 try-catch로 오류 처리 — 일관성 없음
- **임시 조치**: 각 페이지/액션에서 개별 try-catch 처리
- **근본 문제**:
  - 오류 발생 시 사용자에게 표시되는 UI가 페이지마다 상이
  - 예상치 못한 오류가 Next.js 기본 error 페이지(흰 화면 + 스택 트레이스)로 전파 가능
  - Sentry 등 오류 추적 시스템 도입 시 개별 페이지마다 설정 필요
- **목표 구현**:
  1. 주요 경로 세그먼트별 error.tsx 추가:
     - `(auth)/error.tsx` — 인증 페이지
     - `admin/error.tsx` — 관리자 페이지
     - `orders/[orderId]/error.tsx` — 주문 상세
     - `master/error.tsx` — 마스터 데이터 관리
  2. 공통 ErrorFallback 컴포넌트 `src/components/ui/ErrorFallback.tsx` 신규 생성
  3. Sentry 또는 유사 오류 추적 연동 포인트 마련
- **관련 파일**: `src/app/[locale]/(dashboard)/error.tsx`, `src/components/ui/ErrorFallback.tsx` (신규) + 4개 error.tsx (신규)
- **예상 공수**: 1 MD
- **우선순위**: Medium (사용자 경험, 프로덕션 안정성)

---

## IMP 항목 요약

| IMP | 내용 | 우선순위 | 예상 공수 | 관련 파일 |
|:---|:---|:---:|:---:|:---|
| **IMP-015** | middleware console.log 노출 | Medium | 0.1 MD | 1개 |
| **IMP-016** | 서비스 레이어 부재 + DB 클라이언트 중복 | Medium | 3~5 MD | 7개 + 신규 |
| **IMP-017** | Error Boundary 부족 (1개만 존재) | Medium | 1 MD | 1개 + 5개 신규 |

> 최소 3건 아키텍처·워크플로우 IMP 도출 완료 (R-15 형식 준수)
