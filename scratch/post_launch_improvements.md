# 출시 후 개선 사항 백로그 (Post-Launch Improvement Backlog)

> 테스트 중 발견된 개선 사항을 수집합니다. 추후 별도 계획 수립 시 참조.
> 최초 작성: 2026-05-08
> 상태 일괄 갱신: 2026-05-13 (Aiden — 코드베이스 교차 검증 기반)
>
> **현황 요약**: IMP-001~011 중 **IMP-003만 미착수** (Low priority). 나머지 10개 완료.  
> **IMP-012~014**: EXP-IMP-DK (D_Kai) 2026-05-13 도출 — Aiden CONDITIONAL PASS 후 등록.  
> **IMP-015~017**: EXP-IMP-DK-ARCH (D_Kai) 2026-05-13 — 아키텍처·워크플로우 추가 도출 — Aiden CONDITIONAL PASS (W-1 IMP-016 파일 목록 수정 대기).
> **IMP-019~022**: EXP-IMP-RG (Ring 2.6 1T) 2026-05-13 도출 — Aiden CONDITIONAL PASS 대기 중.
> **IMP-023~026**: EXP-IMP-RL (Riley, Gemini) 2026-05-13 도출 — Aiden PASS 확정.
> **IMP-027~033**: EXP-IMP-BK (B_Kai) 2026-05-14 도출 — Aiden PASS 확정.
> **IMP-034~063**: AUD-2026-0514-001 (NB Kai) 2026-05-14 도출 — Aiden PASS 확정 (번호 충돌 정정: NB Kai 원번호 IMP-027~058 → IMP-034~063, 중복 2건 병합 후 30건).

---

## [IMP-001] RBAC 동적 권한 관리 시스템 구축

- **발견 경위**: Carrier 로그인 후 운임 요율 페이지 접근 불가 (권한 오류)
- **현재 상태**: 역할별 메뉴 접근 권한이 `src/lib/auth/rbac.ts` 소스 코드에 하드코딩됨
- **임시 조치 (2026-05-08)**: Carrier 허용 경로에 `/admin/rates` 추가 (rbac.ts, middleware.ts, NaviSidebar.tsx)
- **근본 문제**: 관리자가 UI를 통해 역할/ID별 메뉴 접근 권한을 동적으로 설정할 수 없음
- **목표 구현**:
  1. `zen_role_permissions` 테이블(기존 DB 스키마 존재) 활용하여 런타임 권한 로드
  2. `checkPermission()` 함수를 DB 쿼리 기반으로 교체 (메모리 상수 → DB)
  3. `/admin/governance` 또는 `/admin/permissions` 페이지 신규 개발
  4. 관리자가 역할-메뉴 매핑을 CRUD할 수 있는 UI 제공
- **관련 파일**: `src/lib/auth/rbac.ts`, `src/components/layout/NaviSidebar.tsx`, `src/middleware.ts`, `supabase/migrations/20260420063723_*.sql`
- **예상 공수**: 3~5 MD
- **우선순위**: High (당초 요구사항 미충족)
- **상태**: ✅ 완료 (AUDIT-S2 PASS 2026-05-10 — checkPermissionDB + getPermissionsByRole DB 쿼리 구현, /admin/permissions 페이지 존재 확인)

---

## [IMP-002] 운임 요율 페이지 역할별 UI 분기 처리

- **발견 경위**: IMP-001 임시 조치 후, Carrier가 요율 등록/삭제 폼까지 노출됨
- **현재 상태**: `/admin/rates` 페이지가 단일 UI로 생성/조회/삭제를 모두 표시
- **목표 구현**: 접근 역할에 따라 UI 분기
  - ADMIN/MANAGER: 현재와 동일 (전체 CRUD)
  - CARRIER: 조회 전용 (`Registered Pricing Masters` 섹션만 표시, 등록 폼 및 삭제 버튼 숨김)
- **관련 파일**: `src/app/[locale]/(admin)/rates/page.tsx`
- **예상 공수**: 0.5 MD
- **우선순위**: Medium (RLS로 실제 DB 보호는 되어 있음)
- **상태**: ✅ 완료 (FEAT-RATES, FB-017 PASS 2026-05-13 — CARRIER 배너+blur 구현 확인)

---

## [IMP-003] Next.js 16 middleware.ts → proxy.ts 마이그레이션

- **발견 경위**: PostToolUse Hook 권고 (2026-05-08)
- **현재 상태**: `src/middleware.ts` 사용 중 (Next.js 16에서 `proxy.ts`로 명칭 변경 권고됨)
- **목표 구현**: `src/proxy.ts`로 파일 이름 변경 + Node.js 런타임 설정
- **주의 사항**: 기존 미들웨어 로직(Auth Guard, Org Guard, i18n) 동작 검증 필수, 회귀 테스트 전체 재실행 필요
- **관련 파일**: `src/middleware.ts`
- **예상 공수**: 1~2 MD (회귀 테스트 포함)
- **우선순위**: Low (현재 정상 동작 중, 기능 영향 없음)

---

## [IMP-004] 사용자 정보 조회·변경 기능 구현 ← FEAT-001로 작업 착수

- **발견 경위**: 로컬 환경 테스트 중 `/mypage` 화면에서 이름·이메일·비밀번호 변경 기능 부재 확인
- **현재 상태**: `/mypage` = 지갑 대시보드만 제공. 프로필 수정·비밀번호 변경 페이지 없음
- **임시 조치**: 없음 (미구현 상태)
- **목표 구현**:
  - `/mypage/profile` — 이름 조회·수정, 이메일·역할 읽기 전용 표시
  - `/mypage/security` — 비밀번호 변경 (`supabase.auth.updateUser`)
  - `updateProfile()`, `changePassword()` 서버 액션 신규 추가
  - 사이드바 마이페이지 하위 메뉴에 두 항목 연결
- **관련 파일**: `src/app/actions/member.ts`, `src/app/[locale]/(dashboard)/mypage/`, `src/components/layout/NaviSidebar.tsx`, `messages/*.json`
- **예상 공수**: 1~2 MD
- **우선순위**: High (사용자 기본 요구사항 미충족)
- **상태**: ✅ 완료 (AUDIT-S1 PASS 2026-05-09 — /mypage/profile, /mypage/security 존재 확인)

---

## [IMP-005] 인증 - ID 찾기 화면(SCR-002) 미구현

- **발견 경위**: 2026-05-08 요구사항 준수 감사(AUD-2026-0508-001) — An_04 화면목록 SCR-002 대비 누락 확인
- **현재 상태**: `/[locale]/(auth)/find-id` 경로 페이지 없음. `findUserId()` 서버 액션 없음
- **임시 조치**: 없음 (로그인 페이지에 ID찾기 링크 미존재)
- **목표 구현**:
  1. `/[locale]/(auth)/find-id/page.tsx` — 이름 + 이메일 입력 폼
  2. `src/app/actions/auth.ts`에 `findUserId(fullName, email)` 추가
  3. `zen_profiles` 테이블 조회 후 마스킹된 이메일 반환
  4. 로그인 페이지에 "ID 찾기" 링크 추가
- **관련 파일**: `src/app/[locale]/(auth)/login/page.tsx`, `src/app/actions/auth.ts`, `zen_profiles` 테이블
- **예상 공수**: 0.5 MD
- **우선순위**: High (기본 인증 요구사항 미충족)
- **상태**: ✅ 완료 (AUDIT-S1 PASS 2026-05-09 — /find-id/page.tsx + auth.ts 구현 확인)

---

## [IMP-006] 인증 - 비밀번호 재설정 화면(SCR-003) 미구현

- **발견 경위**: 2026-05-08 요구사항 준수 감사(AUD-2026-0508-001) — An_04 화면목록 SCR-003 대비 누락 확인
- **현재 상태**: `/[locale]/(auth)/reset-password` 경로 페이지 없음. Supabase 이메일 기반 재설정 플로우 미구현
- **임시 조치**: 없음 (로그인 페이지에 비밀번호 찾기 링크 미존재)
- **목표 구현**:
  1. `/[locale]/(auth)/reset-password/page.tsx` — 이메일 입력 폼 + `supabase.auth.resetPasswordForEmail()` 호출
  2. `/[locale]/(auth)/confirm/page.tsx` — Supabase 콜백 처리 (`type=recovery`) + 새 비밀번호 입력
  3. `src/app/actions/auth.ts`에 `sendPasswordReset()` 추가
  4. 로그인 페이지에 "비밀번호 찾기" 링크 추가
- **관련 파일**: `src/app/[locale]/(auth)/login/page.tsx`, `src/app/actions/auth.ts`
- **예상 공수**: 1 MD
- **우선순위**: High (기본 인증 요구사항 미충족)
- **상태**: ✅ 완료 (AUDIT-S1 PASS 2026-05-09 — /reset-password/page.tsx + auth.ts 구현 확인)

---

## [IMP-007] 개인회원 정보수정·탈퇴 서버 액션 누락

- **발견 경위**: 2026-05-08 요구사항 준수 감사 — Fun_Detail_02 2.1.2(정보수정), 2.1.7(탈퇴) 미구현 확인
- **현재 상태**: `src/app/actions/member.ts`에 `updateProfile()`, `deleteMember()` 없음. `/mypage/profile` 페이지 없음
- **임시 조치**: 없음
- **목표 구현**:
  1. `updateProfile(payload: { full_name: string })` — `zen_profiles` UPDATE 액션
  2. `/mypage/profile` 페이지 — 정보 조회·수정 UI
  3. `deleteMember()` — Soft Delete (`deleted_at` 타임스탬프 업데이트)
  4. 탈퇴 확인 UI (마이페이지 하위)
- **관련 파일**: `src/app/actions/member.ts`, `src/app/[locale]/(dashboard)/mypage/`
- **예상 공수**: 1~1.5 MD
- **우선순위**: High (사용자 기본 요구사항 미충족)
- **상태**: ✅ 완료 (AUDIT-S1 PASS 2026-05-09 / AUDIT-S3 PASS 2026-05-11 — /mypage/profile + corporate.ts 구현 확인)

---

## [IMP-008] 법인회원 정보수정·부서관리·탈퇴 전면 미구현

- **발견 경위**: 2026-05-08 요구사항 준수 감사 — Fun_Detail_02 2.2.2~2.2.6 전체 미구현 확인 (법인회원 완성도 17%)
- **현재 상태**: 법인회원 가입(2.2.1)만 구현. 정보수정·부서관리·탈퇴 기능 없음
- **임시 조치**: 없음
- **목표 구현**:
  1. 법인정보 수정 페이지 (대표자, 주소, 연락처, 이메일)
  2. 부서 관리 페이지 (추가·수정·삭제 CRUD)
  3. 법인 탈퇴 — `zen_organizations` + 하위 프로필 전체 Soft Delete
  4. 관련 서버 액션 (`src/app/actions/organization.ts` 확장)
- **관련 파일**: `src/app/actions/organization.ts`, `src/app/[locale]/(dashboard)/mypage/`, `zen_organizations` 테이블
- **예상 공수**: 2~4 MD
- **우선순위**: High (B2B 핵심 요구사항 미충족)
- **상태**: ✅ 완료 (AUDIT-S3 PASS 2026-05-11 — /mypage/corporate + organization.ts 구현 확인)

---

## [IMP-009] NaviSidebar 메뉴 구조 오류 (중복·경로 불일치)

- **발견 경위**: 2026-05-08 요구사항 준수 감사 — 메뉴·페이지 정합 감사 에이전트 결과
- **현재 상태**:
  - `/admin/rates` 메뉴 항목이 3중 중복 정의 (Master 자식 + 독립형 2개)
  - `/order/house`, `/order/import` 둘 다 동일 경로(`/orders`) 연결 (기능 미분화)
  - `/support/page.tsx` 미존재 (부모 클릭 시 404, 자식 페이지만 있음)
- **임시 조치**: 없음
- **목표 구현**:
  1. `/admin/rates` 중복 항목 제거 (Master 자식 1개만 유지)
  2. `/order/house`, `/order/import` 경로 처리 (쿼리파라미터 분기 또는 단일 통합)
  3. `/support` 클릭 시 `/support/qna`로 리다이렉트 또는 href 수정
- **관련 파일**: `src/components/layout/NaviSidebar.tsx`
- **예상 공수**: 0.5 MD
- **우선순위**: Medium (사용자 UX 혼란)
- **상태**: ✅ 완료 추정 (AUDIT-S1 PASS 2026-05-09 — 코드 직접 확인 미수행, AUDIT 통과 기준 완료 간주)

---

## [IMP-010] 다중 RBAC 가드 혼재 및 하드코딩 역할 비교

- **발견 경위**: 2026-05-08 요구사항 준수 감사 — RBAC·Auth Guard 감사 에이전트 결과
- **현재 상태**:
  - 권한 체크 3원화: `rbac.ts` 정적 배열 / `middleware.ts` 화이트리스트 / `page.tsx` 하드코딩 문자열
  - `role === 'ADMIN'` 등 문자열 직접 비교가 6개 파일에 산재 (오타 취약, 유지보수 난이도 높음)
  - `middleware.ts`와 `rbac.ts`의 경로 목록 비동기화 (`/inventory` 등)
- **임시 조치**: 없음
- **목표 구현**:
  1. 6개 파일의 하드코딩 역할 비교 → `checkPermission()` 또는 `USER_ROLES` 상수 사용으로 통일
  2. `middleware.ts` 허용 경로를 `rbac.ts`와 동기화
  3. (IMP-001 연계) 장기적으로 DB 기반 동적 RBAC으로 전환
- **관련 파일**: `src/lib/auth/rbac.ts`, `src/middleware.ts`, `(dashboard)/settlement/page.tsx`, `(dashboard)/mypage/grade/page.tsx`, `(dashboard)/support/*.tsx`, `(dashboard)/inventory/page.tsx`
- **예상 공수**: 1~2 MD (코드 정비만, DB 전환 제외)
- **우선순위**: High (보안 취약성 및 유지보수 난이도)
- **상태**: ✅ 완료 (AUDIT-S2 PASS 2026-05-10 — role === 'ADMIN' 하드코딩 잔존 없음, USER_ROLES 상수 31개 파일 사용 확인)

---

## [IMP-011] 요율 관리 고도화 — 할증/할인 체계 + 역할별 UI 분기

- **발견 경위**: 2026-05-11 요율 페이지 구조 분석 — 현재 기본요금 + 중량구간 슬랩만 등록 가능. 할증 요금 체계 전무 확인
- **현재 상태**:
  - 할증 항목(FSC, SSC, THC, DG, PEAK 등) DB 스키마 및 UI 없음
  - `zen_rate_cards.valid_from/valid_to` DB에 존재하나 UI에서 입력 불가
  - `zen_rate_tiers.min_total_price` DB에 존재하나 UI 미구현
  - CARRIER 역할이 등록·삭제 폼까지 노출됨 (IMP-002 미처리 상태 포함)
- **목표 구현**:
  1. `zen_rate_surcharges` 테이블 신규 생성 (type, calc_type, value, currency)
  2. 요율 등록 폼에 할증/할인 항목 추가 (FSC·SSC·THC·DG·PEAK·CUSTOM)
  3. 유효기간(valid_from/valid_to) UI 입력 구현
  4. 최소 운임(min_total_price) UI 입력 구현 (rate_tiers 연동)
  5. 역할별 UI 분기: ADMIN/MANAGER → 전체 CRUD / CARRIER·OPERATOR → 조회 전용 (IMP-002 통합)
  6. 요율 목록에 할증 요약 정보 표시
- **관련 파일**:
  - `supabase/migrations/` — `zen_rate_surcharges` 마이그레이션 신규
  - `src/app/[locale]/(dashboard)/admin/rates/page.tsx`
  - `src/components/admin/RateTierEditor.tsx`
  - `src/app/actions/rates.ts` (신규 서버 액션)
- **예상 공수**: 3~4 MD
- **우선순위**: Medium (견적 엔진 정확도 직결 — 현재 Landed Cost 과소 산출 위험)
- **상태**: ✅ 완료 (FEAT-RATES PASS 2026-05-13 — rate_surcharges.sql 마이그레이션 + SurchargeEditor + CARRIER 분기 구현 확인)

---

## [IMP-012] Master/Admin 코드 관리 페이지 완전 중복

- **발견 경위**: EXP-IMP-DK GitNexus 분석 중 `master/codes/`와 `admin/codes/` 경로에서 동일 파일 발견
- **현재 상태**: 두 파일 MD5 해시 완전 일치 — 동일 UI를 두 경로에 복사
- **임시 조치**: 없음 (중복 상태 운영)
- **목표 구현**: 공통 컴포넌트 추출 + 얇은 wrapper로 축소
- **관련 파일**: `src/app/[locale]/(dashboard)/master/codes/codes-client.tsx`, `src/app/[locale]/(dashboard)/admin/codes/codes-client.tsx`
- **예상 공수**: 0.5 MD
- **우선순위**: Medium

---

## [IMP-013] console.log/console.error 직접 사용 — 로깅 유틸리티 미적용

- **발견 경위**: EXP-IMP-DK GitNexus 분석 — `grep -r "console\." src/` 결과 **53개 파일** 확인
- **현재 상태**: 53개 파일에서 console.log/error 직접 호출. 오류 추적·로그 수집 불가
- **임시 조치**: 없음
- **목표 구현**: `src/lib/logger.ts` 신규 생성 + 53개 파일 교체
- **관련 파일**: 53개 파일 + `src/lib/logger.ts` (신규)
- **예상 공수**: 2~3 MD
- **우선순위**: High

---

## [IMP-014] admin/rates/page.tsx 단일 파일 531줄 — 복잡도 집중

- **발견 경위**: EXP-IMP-DK GitNexus 분석 — `admin/rates/page.tsx` 구조 분석
- **현재 상태**: 531줄 단일 파일에 등록 폼·목록·할증·역할 분기·상태 관리 5개 관심사 혼재
- **임시 조치**: 없음
- **목표 구현**: RateForm·RateList·RateSurchargeEditor 3개 컴포넌트로 분리
- **관련 파일**: `src/app/[locale]/(dashboard)/admin/rates/page.tsx`, `src/components/admin/SurchargeEditor.tsx`, `src/components/admin/RateCardList.tsx`
- **예상 공수**: 1~1.5 MD
- **우선순위**: Low

---

## [IMP-015] middleware.ts console.log로 세션·경로 정보 프로덕션 노출

- **발견 경위**: EXP-IMP-DK-ARCH — `src/middleware.ts` L28 분석
- **현재 상태**: `console.log('[MIDDLEWARE] Entry: ' + pathname)` — 모든 요청 경로 stdout 출력
- **임시 조치**: 없음
- **목표 구현**: `logger.debug` 교체 또는 NODE_ENV 조건부 분기 (IMP-013 logger 연계)
- **관련 파일**: `src/middleware.ts`
- **예상 공수**: 0.1 MD (IMP-013과 통합 시 추가 공수 없음)
- **우선순위**: Medium

---

## [IMP-016] 서버 액션 Supabase 클라이언트 중복 생성 — 서비스 레이어 부재

- **발견 경위**: EXP-IMP-DK-ARCH — `createClient()` 57회 호출 + 7개 액션 파일 직접 DB 쿼리
- **현재 상태**: 각 서버 액션(`auth.ts`, `orders.ts`, `finance.ts`, `member.ts`, `inventory.ts`, `rates.ts`, `tracking.ts`)이 개별적으로 Supabase 클라이언트 생성 및 직접 DB 쿼리 수행
- **임시 조치**: 없음
- **목표 구현**: `src/lib/repositories/` 신설 — Repository 패턴 도입. 서버 액션은 권한 검증 + Repository 호출만 담당.
- **관련 파일**: `src/app/actions/*.ts` (7개), `src/lib/repositories/` (신규)
- **예상 공수**: 3~5 MD
- **우선순위**: Medium

---

## [IMP-017] Error Boundary 부족 — 전역 오류 처리 일원화 필요

- **발견 경위**: EXP-IMP-DK-ARCH — error boundary 파일 1개만 존재 확인
- **현재 상태**: `src/app/[locale]/(dashboard)/error.tsx` 단 1개. `(auth)`, `admin`, `master`, `orders/[orderId]` 등 주요 경로에 error boundary 없음
- **임시 조치**: 각 페이지/액션에서 개별 try-catch
- **목표 구현**: 주요 경로 세그먼트별 error.tsx 4개 추가 + 공통 ErrorFallback 컴포넌트 제작
- **관련 파일**: `src/app/[locale]/(dashboard)/error.tsx`, `src/components/ui/ErrorFallback.tsx` (신규) + 4개 error.tsx (신규)
- **예상 공수**: 1 MD
- **우선순위**: Medium

---

## [IMP-019] createOrder() 트랜잭션 부재 — 부분 실패 시 데이터 불일치 위험

- **발견 경위**: EXP-IMP-RG (Ring 2.6 1T) 코드베이스 분석 — `src/app/actions/orders.ts` 주문 생성 플로우에서 DB 트랜잭션 미사용 확인
- **현재 상태**: `createOrder()` 내 순차적 Supabase 호출 (최소 5~7회) — 원자성 보장 없음, 부분 실패 시 데이터 불일치 위험
- **임시 조치**: 없음
- **목표 구현**: Supabase RPC(`create_order_with_items`) 또는 배치 INSERT로 단일 호출 전환, 부분 실패 시 롤백 로직 추가
- **관련 파일**: `src/app/actions/orders.ts` (681줄)
- **예상 공수**: 2~3 MD (RPC 설계 + 에러 핸들링)
- **우선순위**: High

---

## [IMP-020] Feature Flags `unstable_cache` 미적용 — 매 요청 DB 직접 조회

- **발견 경위**: EXP-IMP-RG (Ring 2.6 1T) 분석 — `src/lib/params/feature-flags.ts` `isFeatureEnabled()` 호출마다 DB 쿼리 확인
- **현재 상태**: `unstable_cache()` 미사용, MAINTENANCE_MODE 체크 시 트래픽 증가에 DB 부하
- **임시 조치**: 없음
- **목표 구현**: `unstable_cache()`로 감싸거나 Edge Config/Env Var로 이전
- **관련 파일**: `src/lib/params/feature-flags.ts`
- **예상 공수**: 0.5 MD
- **우선순위**: Medium

---

## [IMP-021] 미들웨어 매 요청 DB 호출 최적화 (JWT-only 검증 + 캐시)

- **발견 경위**: EXP-IMP-RG (Ring 2.6 1T) 분석 — `src/middleware.ts` 모든 요청에서 Supabase Auth + zen_profiles JOIN 쿼리 확인
- **현재 상태**: Edge Runtime에서 매 요청마다 `updateSession()` → DB 쿼리 → 인증된 사용자 페이지 접근 시 50~150ms 추가 지연
- **임시 조치**: 없음
- **목표 구현**: `createClient()` 결과를 Request-scoped로 캐시, JWT 검증만으로 인증 처리, 프로필은 최초 로드 시만 조회
- **관련 파일**: `src/middleware.ts` (171줄)
- **예상 공수**: 1~2 MD
- **우선순위**: Medium

---

## [IMP-022] NaviSidebar Client Bundle 최적화 (아이콘 dynamic import, Framer Motion 격리)

- **발견 경위**: EXP-IMP-RG (Ring 2.6 1T) 분석 — `src/components/layout/NaviSidebar.tsx` Client Component 내 Framer Motion + Lucide 21개 아이콘 전체 번들 확인
- **현재 상태**: `"use client"` + Framer Motion + Lucide 21개 아이콘이 클라이언트 JS 번들에 포함, Hydration 비용 증가
- **임시 조치**: 없음
- **목표 구현**: 아이콘 dynamic import(`next/dynamic`), Framer Motion server-only 대안 검토, Server Component 전환 고려
- **관련 파일**: `src/components/layout/NaviSidebar.tsx`
- **예상 공수**: 1 MD
- **우선순위**: Low

---

## [IMP-023] I18n 번역 키 타입 안정성 및 번역 키 누락 방지 자동화

- **발견 경위**: Riley (Gemini) 코드 분석 — `useTranslations` 사용 시 문자열 하드코딩 확인
- **현재 상태**: `next-intl`을 사용 중이나, 번역 키가 TypeScript 타입으로 보호받지 못함
- **근본 문제**: 존재하지 않는 번역 키 호출 시 런타임 에러 또는 키 텍스트 노출 위험
- **목표 구현**: `next-intl` Type-safe navigation 설정 + 미번역 키 자동 추출 스크립트 도입
- **관련 파일**: `src/i18n.ts`, `messages/*.json`, `global.d.ts` (신규)
- **예상 공수**: 1.0 MD
- **우선순위**: Medium

---

## [IMP-024] 공통 도메인 UI 컴포넌트(Domain-Specific Common UI) 라이브러리화

- **발견 경위**: Riley (Gemini) 코드 분석 — 도메인별 유사 UI 패턴(Status Badge 등) 산재 확인
- **현재 상태**: 운송 상태 배지, 통화 표시기 등이 각 도메인 폴더에 개별 구현됨
- **근본 문제**: UI 일관성 유지 어려움 및 중복 코드 발생
- **목표 구현**: `src/components/domain/` 폴더 신설 및 공통 비즈니스 UI(ZenStatusBadge 등) 추출
- **관련 파일**: `src/components/domain/`, `src/components/ui/ZenUI.tsx`
- **예상 공수**: 2.0 MD
- **우선순위**: Medium

---

## [IMP-025] Server Actions 에러 핸들링 및 리스폰스 래퍼 표준화

- **발견 경위**: Riley (Gemini) 코드 분석 — `src/app/actions/` 하위 에러 처리 패턴 파편화 확인
- **현재 상태**: 각 서버 액션이 수동으로 `try-catch` 및 `console.error` 수행
- **근본 문제**: 일관된 클라이언트 피드백(Toast 등) 제공 및 통합 로깅 어려움
- **목표 구현**: `Result<T, E>` 패턴 래퍼 도입 및 공통 에러 핸들러/로깅 통합
- **관련 파일**: `src/app/actions/*.ts`, `src/lib/actions/action-wrapper.ts` (신규)
- **예상 공수**: 1.5 MD
- **우선순위**: High

---

## [IMP-026] Supabase RLS(Row Level Security) 정책의 비즈니스 규칙 통합

- **발견 경위**: Riley (Gemini) DB 스키마 분석 — 정책이 단순 UID 비교에 편중됨 확인
- **현재 상태**: 파트너사 데이터 격리 등 복잡한 보안 로직이 앱 코드에 의존함
- **근본 문제**: 클라이언트 직접 호출 시 비즈니스 보안 규칙 우회 가능성 존재
- **목표 구현**: 보안 로직을 SQL 함수화하여 RLS 정책에 통합, DB 레벨 보안 보장 강화
- **관련 파일**: `supabase/migrations/*.sql`
- **예상 공수**: 3.0 MD
- **우선순위**: High


---

## [IMP-027] 점검 모드 페이지 누락 — Maintenance Mode 사용자 경험 불완전

- **발견 경위**: B_Kai — `src/middleware.ts:63-75` MAINTENANCE_MODE 분기 분석 중 확인
- **현재 상태**: `/maintenance` 라우트 미존재, 점검 시 `error=maintenance` 쿼리 파라미터만 추가하여 홈으로 리다이렉트
- **임시 조치**: 없음 (홈 리다이렉트로 fallback)
- **근본 문제**: Feature Flag 토글만 있고 사용자에게 점검 안내 UI가 없음
- **목표 구현**: `src/app/[locale]/(maintenance)/page.tsx` 신규 생성, middleware 루프 방지 처리, 다국어 키 추가
- **관련 파일**: `src/app/[locale]/(maintenance)/page.tsx` (신규), `src/middleware.ts`, `messages/*.json`
- **예상 공수**: 0.5 MD
- **우선순위**: Medium

---

## [IMP-028] 통관 자동화 — UNI-PASS EDI 연동 어댑터 확장

- **발견 경위**: B_Kai — `src/lib/customs/` 구조 분석 중 ManualAdapter 단독 구현 확인
- **현재 상태**: `ICustomsAdapter` 인터페이스 설계는 있으나 `ManualAdapter` 1개(Mock 수준)만 구현됨
- **임시 조치**: 관리자 수동 declaration_no 입력 후 APPROVED 처리
- **근본 문제**: 어댑터 패턴이 설계만 있고 실제 EDI 연동 없어 물류 운영 확장 불가
- **목표 구현**: `unipass-adapter.ts` 신규 구현, `adapter-factory.ts` 동적 로딩 도입, Admin UI 어댑터 선택 드롭다운 추가
- **관련 파일**: `src/lib/customs/unipass-adapter.ts` (신규), `src/lib/customs/adapter-factory.ts` (신규), `src/lib/customs/manual-adapter.ts`
- **예상 공수**: 3~5 MD
- **우선순위**: High

---

## [IMP-029] TypeScript 타입 안전성 강화 — `any` 타입 퇴출

- **발견 경위**: B_Kai — `src/types/claims.ts` 분석 중 `order: any` 확인
- **현재 상태**: `ClaimDetail.order: any` 및 관계형 타입 불완전 정의
- **임시 조치**: 없음 (런타임 에러 가능성 내포)
- **근본 문제**: 컴파일 타임 검증 무력화, DB 스키마 변경 시 영향 범위 특정 어려움
- **목표 구현**: `ClaimDetail.order` 명시 타입 지정, `WithRelations<T, R>` 제네릭 유틸리티 신규 정의, Enum/as-const 패턴 통일
- **관련 파일**: `src/types/claims.ts`, `src/types/orders.ts`, `src/types/supabase.ts`
- **예상 공수**: 1 MD
- **우선순위**: Medium

---

## [IMP-030] 정산 엔진 단일 책임 원칙 위반 — `SettlementEngine` 책임 분할

- **발견 경위**: B_Kai — `src/lib/finance/settlement.ts` GitNexus 분석 중 확인
- **현재 상태**: `settlement.ts` 288줄 — `SettlementEngine`(L22~186)과 `InvoiceGenerator`(L188~288) 혼재, `calculateOrderCosts` 단일 메서드 120+줄
- **임시 조치**: 없음 (복잡도 누적 중)
- **근본 문제**: 슬래브 요율 계산·비용 집계·정산 검증이 단일 메서드 혼재 → 단위 테스트 작성 어려움
- **목표 구현**: `SlabRateCalculator`, `CostAggregator`, `SettlementValidator` 3개 클래스 분리, 기존 SettlementEngine은 Facade로 전환
- **관련 파일**: `src/lib/finance/settlement.ts` → `src/lib/finance/settlement/` (3개 신규)
- **예상 공수**: 2~3 MD
- **우선순위**: Medium

---

## [IMP-031] RBAC 이중 상태 잔여 정리 — `STATIC_PERMISSIONS` DB 전환 로드맵

- **발견 경위**: B_Kai — `src/lib/auth/rbac.ts` 및 `guards.ts` 분석 중 STATIC/DB 병존 확인
- **현재 상태**: `validateAdminAction()` → `checkPermission()` → `STATIC_PERMISSIONS` 1순위 사용. IMP-001(동적 RBAC) 완료에도 불구하고 주요 가드가 STATIC 경로
- **임시 조치**: 없음 (STATIC과 DB 병존, 우선순위 불명확)
- **근본 문제**: 어느 쪽이 기준인지 예측 불가, DB 권한 설정이 무시될 수 있음
- **목표 구현**: 모든 가드에 `checkPermissionDB()` 적용, STATIC_PERMISSIONS를 시드 데이터로 역할 재정의, 3개월 후 STATIC 제거 목표
- **관련 파일**: `src/lib/auth/rbac.ts`, `src/lib/auth/guards.ts`
- **예상 공수**: 1 MD
- **우선순위**: High

---

## [IMP-032] 다국어 번역 커버리지 전수 감사 및 CI 게이트 도입

- **발견 경위**: B_Kai — FB-011 반려 이력(다국어 미등록 반복) + `ORDER_STATUS_META` 한글 하드코딩 확인
- **현재 상태**: `ORDER_STATUS_META` label 필드 한글 하드코딩, `src/lib/constants.ts` UI 라벨 하드코딩, 번역 누락 자동 탐지 체계 없음
- **임시 조치**: 각 태스크 완료 시 수동 확인 (R-09)
- **근본 문제**: 신규 페이지 추가 시마다 수동 확인에 의존하여 휴먼 에러 반복 발생
- **목표 구현**: `scripts/audit-i18n.ts` 신규, `ORDER_STATUS_META` i18n 키 기반 전환, CI 게이트(`check:i18n` 누락 키 0건 미만 시 빌드 실패)
- **관련 파일**: `scripts/audit-i18n.ts` (신규), `src/types/orders.ts`, `src/lib/constants.ts`, `messages/*.json`, `package.json`
- **예상 공수**: 2 MD
- **우선순위**: High

---

## [IMP-033] Server Actions 도메인 분할 리팩토링 — 200줄 상한 적용

- **발견 경위**: B_Kai — `src/app/actions/` 파일 크기 분석 (finance.ts 733줄, orders.ts 681줄)
- **현재 상태**: `finance.ts` 733줄 (5개+ 책임 혼재), `orders.ts` 681줄 (주문 생성·수정·상태·알림 등), 18개 파일 중 5개가 400줄 초과
- **임시 조치**: 없음 (파일 분할 미진행)
- **근본 문제**: 단일 파일 내 응집도 낮음, IMP-016(Repository 패턴) 도입 전 선행 조건
- **목표 구현**: `actions/finance/` 5개 파일 분할, `actions/orders/` 4개 파일 분할, 각 파일 200줄 상한, 기존 파일은 re-export shim으로 하위 호환성 확보
- **관련 파일**: `src/app/actions/finance.ts` → 5개 신규, `src/app/actions/orders.ts` → 4개 신규
- **예상 공수**: 2~3 MD
- **우선순위**: Medium

---

## [IMP-034] `.env.local` 프로덕션 자격증명 Git 노출

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `.env.local` 파일이 `git ls-files`에 추적되어 있음
- **현재 상태**: 6개 프로덕션 자격증명 평문 노출: `SUPABASE_SERVICE_ROLE_KEY`(DB 전체접근·RLS 우회), `DATABASE_URL`(비밀번호 포함), `VERCEL_TOKEN`(배포 권한), `SUPABASE_ACCESS_TOKEN`(Supabase 관리 API), `RESEND_API_KEY`(이메일 발송), `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **임시 조치**: 즉시 모든 키 재발급 (Supabase Dashboard → Settings → API → Service Key, Vercel → Settings → Tokens, Resend → API Keys)
- **근본 문제**: `.gitignore`에 `.env*` 패턴이 있으나 Git이 이미 `.env.local`을 추적 중 (`git rm --cached` 필요)
- **목표 구현**: ① `git rm --cached .env.local`로 Git 추적 제거 ② `.gitignore`에 `.env.local` 명시 추가 ③ 모든 키 재발급 후 새 `.env.local`에 설정 ④ `.env.example`은 키 없이 포맷만 유지
- **관련 파일**: `.env.local`, `.gitignore`, `.env.example`
- **예상 공수**: 0.5 MD
- **우선순위**: **CRITICAL**

---

## [IMP-035] SECURITY DEFINER 함수 38개 권한 검증 누락

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `supabase/migrations/` 전수 분석, 38개 SQL 함수 `SECURITY DEFINER` 생성 확인
- **현재 상태**: `approve_organization()` 함수 본문에 권한 검증 코드 전무. `reject_organization()`, `request_organization_supplement()`도 `auth.users` 직접 수정 + 권한 확인 없음. `SECURITY DEFINER`로 실행되어 호출자 역할과 무관하게 postgres 권한으로 실행
- **임시 조치**: 해당 SECURITY DEFINER 함수들에 `auth.jwt()` 기반 권한 확인 로직 즉시 추가
- **근본 문제**: SECURITY DEFINER는 기본적으로 RLS를 우회하므로 함수 내부에서 명시적 권한 검증이 필수이나 누락됨
- **목표 구현**: ① 모든 SECURITY DEFINER 함수 인벤토리 정리 ② 각 함수에 권한 검증 로직 추가 ③ 불필요한 함수는 `SECURITY INVOKER`로 전환 ④ `get_my_role()` 헬퍼 재사용
- **관련 파일**: `supabase/migrations/*.sql` (38개 함수 전반)
- **예상 공수**: 2~3 MD
- **우선순위**: **CRITICAL**

---

## [IMP-036] Status Machine MANAGER 역할 누락 — 관리자 상태 변경 불가

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `src/lib/logistics/status-machine.ts` `ROLE_PERMISSIONS` 객체에서 `MANAGER` 키 확인
- **현재 상태**: `canChangeStatus()` 내 `ROLE_PERMISSIONS` 객체에 `MANAGER` 키 없음 → `ROLE_PERMISSIONS[MANAGER] = undefined` → `allowedByRole = []` → 모든 상태 전이 거부. ADMIN/ZENITH_SUPER_ADMIN은 별도 bypass 로직 동작하지만 MANAGER는 미포함
- **임시 조치**: `ROLE_PERMISSIONS.MANAGER = TRANSITION_RULES.ADMIN` 추가 (ADMIN과 동일 권한)
- **근본 문제**: Status Machine 설계 시 MANAGER 역할이 누락됨. 기존 4개 에이전트가 모두 미발견
- **목표 구현**: `ROLE_PERMISSIONS`에 `MANAGER` 키와 전이 규칙 배열 추가. MANAGER와 ADMIN 권한 차이가 있다면 별도 배열 정의
- **관련 파일**: `src/lib/logistics/status-machine.ts`
- **예상 공수**: 0.1 MD
- **우선순위**: **CRITICAL**

---

## [IMP-037] Supabase Auth 보안 설정 취약

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `supabase/config.toml` `[auth]` 섹션 분석
- **현재 상태**: `minimum_password_length = 6` (OWASP 위반), `password_requirements = ""` (복잡도 없음), `enable_confirmations = false`, `secure_password_change = false`, MFA 비활성화, Captcha 없음, `enable_signup = true` (공개 회원가입)
- **임시 조치**: 운영 환경 Supabase 프로젝트에서 즉시 설정 변경
- **목표 구현**: `minimum_password_length = 8`, `password_requirements = "lower_upper_letters_digits"`, `enable_confirmations = true`, `secure_password_change = true`, MFA TOTP 활성화, Captcha 설정
- **관련 파일**: `supabase/config.toml`
- **예상 공수**: 0.5 MD
- **우선순위**: **CRITICAL**

---

## [IMP-038] CLAIMED 정식 OrderStatus 미등록 — 상태 전이 검증 우회

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `src/app/actions/claims.ts`의 `createClaim()`에서 `OrderStatus` enum에 없는 'CLAIMED' 문자열 직접 할당 확인
- **현재 상태**: `OrderStatus` 타입에 `CLAIMED` 미등록. `claims.createClaim()`이 `'CLAIMED'` 문자열을 수동 설정하여 `updateOrderStatus()` 경유 없이 상태 변경. 감사 추적에도 CLAIMED 전이가 정식 기록되지 않을 수 있음
- **임시 조치**: 없음
- **목표 구현**: ① `OrderStatus` enum에 `CLAIMED` 등록 ② CLAIMED→RESOLVED→CLOSED 전이 규칙 Status Machine에 정의 ③ `createClaim()`에서 `checkPermission()` 및 `canChangeStatus()` 경유하도록 수정
- **관련 파일**: `src/lib/logistics/status-machine.ts`, `src/app/actions/claims.ts`, `supabase/migrations/`
- **예상 공수**: 0.5 MD
- **우선순위**: High

---

## [IMP-039] 정산 이중 실행 위험

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `src/app/actions/finance.ts`에서 `calculateSettlementAction()`과 오더 상태 RELEASED 자동 트리거 간 중복 호출 가능성 확인
- **현재 상태**: 오더 RELEASED 시 정산 자동 트리거(`generateInvoicesForOrder`). 동시에 관리자가 수동으로 `calculateSettlementAction()` 호출 가능. 중복 실행 방어 로직이 정산 내역을 덮어쓰는 결과 초래
- **임시 조치**: 없음
- **목표 구현**: ① RELEASED 자동 트리거 이후 수동 호출 차단 플래그 추가 ② `billing_status` 컬럼 활용하여 이미 정산된 오더 재정산 불가 처리 ③ 관리자 화면에 "정산 완료" 표시
- **관련 파일**: `src/app/actions/finance.ts`, `src/app/actions/orders.ts`
- **예상 공수**: 0.5 MD
- **우선순위**: High

---

## [IMP-040] 재고 불일치 (WAREHOUSED→CANCELED)

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `src/lib/logistics/inventory.ts`의 `syncInventoryFromOrder()` 상태별 분기 로직 분석
- **현재 상태**: WAREHOUSED 진입 시 `on_hand_qty` 증가 + `reserved_qty` 차감. WAREHOUSED에서 CANCELED 시 `reserved_qty`만 차감되고 `on_hand_qty`는 유지
- **임시 조치**: 없음
- **목표 구현**: WAREHOUSED 이후 CANCELED 시 `on_hand_qty`도 함께 차감하는 로직 추가. 또는 CANCELED 시점 현재 상태 기준 역연산 수행
- **관련 파일**: `src/app/actions/inventory.ts`, `src/lib/logistics/inventory.ts`
- **예상 공수**: 0.5 MD
- **우선순위**: High

---

## [IMP-041] Storage 정책 조직 멤버십 검증 부재

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `supabase/migrations/20260418200000_storage_and_approval.sql` 분석
- **현재 상태**: `business_docs` Storage 버킷 INSERT 정책이 `bucket_id = 'business_docs'` 조건만 있고 조직 멤버십 검증 없음. SELECT 정책에만 소유자 확인이 있고 INSERT/UPDATE/DELETE에는 소유자 검증 부재
- **임시 조치**: 없음
- **목표 구현**: Storage INSERT/UPDATE 정책에 `auth.uid()`와 `zen_profiles.org_id` 기반 조직 멤버십 검증 추가. 공용 버킷과 조직별 버킷 정책 분리
- **관련 파일**: `supabase/migrations/20260418200000_storage_and_approval.sql`, `supabase/migrations/20260425110000_fix_storage_rls_super_admin.sql`
- **예상 공수**: 0.5 MD
- **우선순위**: High

---

## [IMP-042] `updateOrder()` WAREHOUSED+ 상태 수정 미차단

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `src/app/actions/orders.ts` 분석, `isOrderEditable()` 함수가 `updateOrder()`에서 미호출
- **현재 상태**: `isOrderEditable()`이 WAREHOUSED/PACKED/RELEASED/IN_TRANSIT/DELIVERED/CANCELED 상태에서 `false` 반환하도록 정의되어 있으나, `updateOrder()` 액션에서 이 함수를 호출하지 않고 바로 UPDATE 실행
- **임시 조치**: 없음
- **목표 구현**: `updateOrder()` 시작 시 `isOrderEditable()` 호출하여 수정 가능 상태 검증. 수정 불가 상태면 오류 반환
- **관련 파일**: `src/app/actions/orders.ts`
- **예상 공수**: 0.3 MD
- **우선순위**: High

---

## [IMP-043] MASTERED Lock 액션별 우회 가능

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `updateOrderStatus()` 내 MASTERED 체크 코드 확인 후 타 액션 교차 검증
- **현재 상태**: `updateOrderStatus()`에서만 `master_order_id` 조회하여 MASTERED 상태 Lock 적용. `updateOrder()`, `claims.createClaim()`, `dissolveMasterOrder()` 등 다른 액션에서는 마스터 여부 확인 없음
- **임시 조치**: 없음
- **목표 구현**: ① DB 레벨 Check Constraint 추가 ② 또는 Supabase RPC로 모든 쓰기 작업을 단일 진입점으로 통일 ③ 최소한 모든 쓰기 액션에 `isMastered(orderId)` 검증 추가
- **관련 파일**: `src/app/actions/orders.ts`, `src/app/actions/claims.ts`, `supabase/migrations/`
- **예상 공수**: 1 MD
- **우선순위**: High

---

## [IMP-044] 인보이스 발행 후 비용 변경 차단 없음

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `finance.ts`의 `updateOrderCosts()`와 `issueInvoicePdf()` 간 관계 분석
- **현재 상태**: 인보이스 발행 후에도 `zen_order_costs` 데이터 수정 가능. `invoice_id IS NULL` 조건만으로 미청구 비용 식별하나, 이미 청구된 비용 변경을 물리적으로 차단하지 않음
- **임시 조치**: 없음
- **목표 구현**: `zen_order_costs`에 `invoice_id`가 설정된 레코드는 UPDATE/DELETE 차단하는 DB 트리거 또는 RLS 정책 추가. 재발행 시 기존 cost 유지 + 추가 cost 신규 생성 패턴 도입
- **관련 파일**: `src/app/actions/finance.ts`, `supabase/migrations/`
- **예상 공수**: 0.5 MD
- **우선순위**: High

---

## [IMP-045] 무제한 리스트 조회 18곳

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — 22개 서버 액션 파일 전수 분석, `.range()` / `.limit()` 사용 여부 확인
- **현재 상태**: `getClaims()`(중첩조인 4테이블), `getMasterOrders()`, `getPendingHouseOrders()`, `getTransportCosts()`, `getCostProfitStats()`, `getRevenueReport()`, `getCostReport()`, `getVesselSchedules()`, `getOrderQnaList()` 외 다수에 페이지네이션 없음. Supabase `max_rows = 1000`이 유일한 방어
- **임시 조치**: 없음
- **목표 구현**: 18곳 모두 `page`, `pageSize` 파라미터 추가, `.range((page - 1) * pageSize, page * pageSize - 1)` 적용, 전체 카운트는 별도 `.count('exact')`
- **관련 파일**: `src/app/actions/claims.ts`, `orders.ts`, `finance.ts`, `master.ts`, `statistics.ts`, `schedules.ts`, `support.ts`, `master-data.ts`
- **예상 공수**: 2~3 MD
- **우선순위**: High

---

## [IMP-046] Rate Limiting 전무

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — 서버 액션 분석 중 호출 제한 메커니즘 전무 확인
- **현재 상태**: 모든 서버 액션(`createOrder()`, `createVoc()`, `topUpWallet()`, `logClientError()`)에 Rate Limiting 전혀 없음. Supabase Auth 레벨(`sign_in_sign_ups = 30/5분`)만 존재
- **임시 조치**: 없음
- **목표 구현**: ① `@upstash/ratelimit` 또는 Next.js 미들웨어 레벨 IP 기반 Rate Limiting 도입 ② 서버 액션별 제한: Mutation 10회/분/사용자, 읽기 100회/분/사용자 ③ `topUpWallet()` 등 금융 액션 3회/분
- **관련 파일**: `src/app/actions/*.ts` (전체), `src/middleware.ts`
- **예상 공수**: 2 MD
- **우선순위**: High

---

## [IMP-047] 트랜잭션 부재 확장 (createOrder 외 전체 쓰기 작업)

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — IMP-019(`createOrder()`) 확인 후 `updateOrderStatus()`, 지갑 결제 등 타 쓰기 작업 확대 분석
- **현재 상태**: `updateOrderStatus()`에서 8회 순차 쿼리(상태변경+히스토리+인벤토리+정산+알림+트래킹)가 try-catch로만 부분 보호. `payInvoiceFromWallet()`은 인보이스 실패 시 지갑 잔액 이미 차감됨
- **임시 조치**: 없음
- **목표 구현**: ① Supabase RPC로 여러 쓰기 작업을 단일 트랜잭션으로 래핑 ② PostgreSQL `BEGIN ... COMMIT/ROLLBACK` 활용 ③ 단기: 명시적 롤백 로직을 각 단계 실패 시 추가
- **관련 파일**: `src/app/actions/orders.ts`, `src/app/actions/wallet.ts`, `supabase/migrations/`
- **예상 공수**: 3~5 MD
- **우선순위**: High

---

## [IMP-048] Mock 데이터 잔재 (프로덕션 코드)

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `src/app/[locale]/(dashboard)/dashboard/page.tsx` 분석
- **현재 상태**: 대시보드 페이지가 `MOCK_ORDERS` 배열을 사용하여 가짜 오더 데이터 표시. 실제 DB에서 조회하지 않음
- **임시 조치**: 없음
- **목표 구현**: 서버 액션 `getDashboardStats()`를 통해 실제 DB 데이터 기반으로 대시보드 렌더링. `MOCK_ORDERS` 제거
- **관련 파일**: `src/app/[locale]/(dashboard)/dashboard/page.tsx`
- **예상 공수**: 0.2 MD
- **우선순위**: Medium

---

## [IMP-049] 이중 프로필 테이블 (profiles + zen_profiles)

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `src/types/supabase.ts`와 마이그레이션 파일에서 두 테이블 공존 확인
- **현재 상태**: `profiles`(초기 스키마)와 `zen_profiles`(리팩토링) 두 테이블 공존. `updateMyProfile()`에서 두 테이블 모두 업데이트. `getCurrentUserAffiliation()`은 두 테이블 조회 후 병합
- **임시 조치**: 없음
- **목표 구현**: ① `profiles` 테이블 의존성을 모두 `zen_profiles`로 이전 ② `profiles`를 View로 전환하거나 Drop ③ 모든 RLS 정책과 서버 액션 참조를 단일 테이블로 통일
- **관련 파일**: `src/types/supabase.ts`, `src/app/actions/member.ts`, `supabase/migrations/*.sql`
- **예상 공수**: 2 MD
- **우선순위**: Medium

---

## [IMP-050] HELD→이전상태 복구 로직 부재

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `status-machine.ts`의 `canChangeStatus()`에서 HELD 전이 규칙 분석
- **현재 상태**: HELD 상태에서 REGISTERED/SCHEDULED/WAREHOUSED/PACKED/RELEASED/IN_TRANSIT 모든 전이가 허용되나, HELD 직전의 정확한 상태로 복구하는 로직 없음. 운영자가 직접 목적 상태를 선택해야 함
- **임시 조치**: 없음
- **목표 구현**: ① `order_status_history`에서 HELD 직전 상태 조회 ② HELD→이전상태 전이를 기본 복구 경로로 제안 ③ 운영자 선택 UI에 "원상복구" 자동 복구 버튼 제공
- **관련 파일**: `src/lib/logistics/status-machine.ts`, `src/app/actions/orders.ts`
- **예상 공수**: 1 MD
- **우선순위**: Medium

---

## [IMP-051] 감사 추적 누락 (마스터/인보이스/통관)

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `updateMasterOrderStatus()`, 인보이스 상태 변경, 통관 상태 변경 코드 분석
- **현재 상태**: 오더 상태 변경은 `order_status_history`에 기록되나, 마스터 오더 상태 변경은 `remarks` 필드에만 기록. 인보이스 상태 변경(UNPAID→PAID/OVERDUE)은 `updated_at`만 갱신. 통관 상태 변경 이력 테이블 없음
- **임시 조치**: 없음
- **목표 구현**: ① `zen_master_order_history` 테이블 신규 생성 ② `zen_invoice_history` 테이블 신규 생성 ③ 각 변경 시점에 트리거 또는 서버 코드에서 이력 INSERT
- **관련 파일**: `src/app/actions/orders.ts`, `src/app/actions/finance.ts`, `src/app/actions/customs.ts`, `supabase/migrations/`
- **예상 공수**: 2 MD
- **우선순위**: Medium

---

## [IMP-052] dissolveMasterOrder 부분 실패 위험

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `orders.ts`의 `dissolveMasterOrder()` 로직 분석
- **현재 상태**: 다수 House Order를 단일 쿼리(`update().eq("master_order_id", masterId)`)로 일괄 해체. 부분 실패(일부 row만 업데이트) 발생 시 불일치 상태
- **임시 조치**: 없음
- **목표 구현**: Supabase RPC로 트랜잭션 내에서 처리하거나, 각 House Order 개별 업데이트 후 결과 검증
- **관련 파일**: `src/app/actions/orders.ts`
- **예상 공수**: 1 MD
- **우선순위**: Medium

---

## [IMP-053] 지갑 결제 롤백 불완전

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `src/app/actions/wallet.ts`의 `payInvoiceFromWallet()` 분석
- **현재 상태**: 지갑 잔액 차감 → `zen_wallet_transactions` INSERT → `zen_invoices` 상태 업데이트 순차 실행. 인보이스 업데이트 실패 시 지갑 잔액은 이미 차감되었으나 인보이스는 UNPAID 상태 유지
- **임시 조치**: 없음
- **목표 구현**: Supabase RPC로 전체 결제 프로세스를 단일 트랜잭션으로 래핑. 단기: 각 단계 실패 시 이전 단계 롤백 코드 추가
- **관련 파일**: `src/app/actions/wallet.ts`
- **예상 공수**: 1 MD
- **우선순위**: Medium

---

## [IMP-054] N+1 쿼리 7곳

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — 22개 서버 액션의 Supabase 쿼리 패턴 분석
- **현재 상태**: `getOrderDetails()`: 오더(1)+패키지(1)+아이템(1)=3회. `triggerStatusChangeNotification()`: 오더조회(1)+사용자목록(1)+알림INSERT(N)+이메일INSERT(N)=2+2N회. `createVoc()`: 오더확인(1)+INSERT(1)+Admin조회(1)+알림(1)=4회
- **임시 조치**: 없음
- **목표 구현**: Supabase 그래프QL 조인(`select(*, packages:zen_order_packages(*, items:zen_order_items(*)))`)으로 1회 통합. Batch INSERT로 N회 개별 INSERT 제거
- **관련 파일**: `src/app/actions/orders.ts`, `src/app/actions/finance.ts`, `src/app/actions/notifications.ts`, `src/app/actions/voc.ts`, `src/app/actions/support.ts`
- **예상 공수**: 2 MD
- **우선순위**: Medium

---

## [IMP-055] 인덱스 누락 4종

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `supabase/migrations/` 내 CREATE INDEX 문 분석 + 주요 쿼리 패턴 크로스 체크
- **현재 상태**: `zen_profiles(org_id)` 인덱스 없음(조직별 사용자 조회 Full Scan). `zen_voc(order_id, org_id, status)` 인덱스 없음. `zen_qna(org_id, status)` 인덱스 없음. `zen_invoices(shipper_id, status, created_at)` 복합 조건 인덱스 없음
- **임시 조치**: 없음
- **목표 구현**: 위 4종 인덱스 추가 마이그레이션 작성
- **관련 파일**: `supabase/migrations/` (신규 마이그레이션 파일)
- **예상 공수**: 0.5 MD
- **우선순위**: Medium

---

## [IMP-056] 이메일 HTML 인젝션 위험

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `src/lib/notifications/email.ts` 및 `finance.ts`의 `sendTaxInvoiceEmail()` 분석
- **현재 상태**: `${orderNo}`, `${tx.tax_invoice_no}`, `${tx.total_amount}` 등이 HTML 템플릿에 직접 삽입. 오더번호에 HTML 태그 포함 시 XSS 가능. Resend API를 통해 이메일 렌더링 환경에서 스크립트 실행 가능
- **임시 조치**: 없음
- **목표 구현**: 모든 동적 값에 `escapeHtml()` 적용 또는 DOMPurify 등 HTML sanitizer 사용
- **관련 파일**: `src/lib/notifications/email.ts`, `src/app/actions/finance.ts`
- **예상 공수**: 0.3 MD
- **우선순위**: Medium

---

## [IMP-057] `zen_role_permissions` 모든 인증 사용자 SELECT 가능

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `20260509000000_fix_rbac_and_harden_rls.sql`의 `"Allow authenticated users to read role permissions"` 정책 확인
- **현재 상태**: `zen_role_permissions` 테이블에 모든 인증 사용자(`authenticated` 역할)가 SELECT 가능한 RLS 정책 존재. 하위 권한 사용자(CARRIER/INDIVIDUAL)가 시스템 전체 권한 구조를 조회 가능
- **임시 조치**: 없음
- **목표 구현**: SELECT 정책을 역할 기반으로 제한 (ADMIN/MANAGER/ZENITH_SUPER_ADMIN만 SELECT, 또는 현재 사용자 자신의 역할에 해당하는 row만 SELECT)
- **관련 파일**: `supabase/migrations/20260509000000_fix_rbac_and_harden_rls.sql`
- **예상 공수**: 0.3 MD
- **우선순위**: Medium

---

## [IMP-058] `finance.ts` 733줄 분할 (IMP-033 범위 확장)

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — 서버 액션 파일 크기 분석 (IMP-033 B_Kai와 부분 중복, finance.ts에 특화)
- **현재 상태**: `src/app/actions/finance.ts`가 733줄로 인보이스 발행·정산 생성·세금계산서·PDF 발행·리포트·엑셀 다운로드 등 6개 이상의 책임을 단일 파일에 혼재
- **임시 조치**: 없음
- **목표 구현**: `finance/invoice.ts`, `finance/settlement.ts`, `finance/tax-invoice.ts`, `finance/report.ts` 등 도메인별 4~5개 파일로 분할
- **관련 파일**: `src/app/actions/finance.ts`
- **예상 공수**: 2 MD
- **우선순위**: Medium

---

## [IMP-059] Supabase 클라이언트 중복 생성

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `createClient()` 호출 패턴 분석
- **현재 상태**: `src/utils/supabase/server.ts`의 `createClient()`가 57회 호출됨. 동일 요청 내에서 `validateUserAction()` → 내부 `createClient()` + 서버 액션 자체 `createClient()`로 2중 생성 발생
- **임시 조치**: 없음
- **목표 구현**: `React.cache()`로 `createClient()` 래핑하여 요청 스코프 내 싱글톤 보장. 또는 Request 지역 변수로 Supabase 인스턴스 전달
- **관련 파일**: `src/utils/supabase/server.ts`, `src/app/actions/*.ts`
- **예상 공수**: 1 MD
- **우선순위**: Medium

---

## [IMP-060] RETURNED 상태 모호성

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — Status Machine에서 RETURNED→WAREHOUSED 단일 전이만 존재 확인
- **현재 상태**: RETURNED 상태에서 WAREHOUSED 전이만 허용. 반송 화물의 폐기 또는 최종 취소 시나리오 미구현
- **임시 조치**: 없음
- **목표 구현**: RETURNED→DISPOSED(폐기), RETURNED→CANCELED(최종취소) 전이 규칙 추가
- **관련 파일**: `src/lib/logistics/status-machine.ts`
- **예상 공수**: 0.5 MD
- **우선순위**: Low

---

## [IMP-061] PDF 경로 충돌 위험

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `finance.ts`의 `issueInvoicePdf()` Storage 업로드 로직 분석
- **현재 상태**: 인보이스 PDF가 `invoices/{invoice_no}.pdf` 경로에 저장. 동일 인보이스 번호 동시 발행 시 Storage 파일명 충돌 가능
- **임시 조치**: 없음
- **목표 구현**: UUID 기반 파일명(`invoices/{uuid}.pdf`) + 메타데이터에 invoice_no 저장. `zen_invoice_pdf_history.version`과 조합하여 버전별 파일명 분리
- **관련 파일**: `src/app/actions/finance.ts`, `supabase/migrations/`
- **예상 공수**: 0.3 MD
- **우선순위**: Low

---

## [IMP-062] `SELECT *` 남용 112곳

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — 서버 액션 및 Server Component의 `.select("*")` 패턴 전수 분석
- **현재 상태**: 112곳에서 `.select("*")`로 불필요한 컬럼까지 조회. 필요한 컬럼보다 2~5배 많은 데이터 전송
- **임시 조치**: 없음
- **목표 구현**: 각 쿼리에서 실제 사용하는 컬럼만 `.select("col1, col2, ...")`로 명시
- **관련 파일**: `src/app/actions/*.ts` (전체), `src/components/` (Server Component 포함)
- **예상 공수**: 3 MD
- **우선순위**: Low

---

## [IMP-063] `ZenUI.tsx` 7개 컴포넌트 단일 파일

- **발견 경위**: AUD-2026-0514-001 (NB Kai) — `src/components/ui/ZenUI.tsx` 분석
- **현재 상태**: ZenCard·ZenButton·ZenAurora·ZenInput·ZenTextarea·ZenBadge·ZenSelect 7개 독립 UI 컴포넌트가 단일 파일(204줄)에 정의됨
- **임시 조치**: 없음
- **목표 구현**: `src/components/ui/` 하위에 각 컴포넌트별 개별 파일로 분할. barrel export(`index.ts`)로 import 경로 유지
- **관련 파일**: `src/components/ui/ZenUI.tsx`
- **예상 공수**: 1 MD
- **우선순위**: Low

---

## [IMP-064] API Route Handler 스택 트레이스 프로덕션 노출

- **발견 경위**: Ring (Qwen3.6) — `src/app/api/finance/export/route.ts` 전수 분석 중 L67, L90에서 `error.stack` 클라이언트 응답 포함 확인
- **현재 상태**: GET/POST handler panic 시 `error.stack` 전체가 HTTP 500 response body에 포함됨. 프로덕션 환경에서 내부 코드 구조, 파일 경로, 라이브러리 버전 등 민감 정보 노출
- **임시 조치**: 없음
- **목표 구현**: ① 프로덕션(`NODE_ENV=production`)에서는 `error.stack` 제거, 범용 메시지만 반환 ② 개발 환경에서만 스택 트레이스 포함 ③ `src/lib/errors.ts` 공통 에러 응답 헬퍼 도입
- **관련 파일**: `src/app/api/finance/export/route.ts`
- **예상 공수**: 0.2 MD
- **우선순위**: **High** (보안 정보 노출)

---

## [IMP-065] Excel Export POST 엔드포인트 인증 미적용

- **발견 경위**: Ring (Qwen3.6) — `src/app/api/finance/export/route.ts` POST handler 분석 (L71~L92)
- **현재 상태**: `POST /api/finance/export`가 인증 체크 없이 임의의 JSON 데이터를 받아 Excel 파일 생성. 인증 검증이 GET에만 존재, POST에는 전무
- **임시 조치**: 없음
- **목표 구현**: ① POST handler에도 GET과 동일한 인증·프로필 검증 로직 추가 ② 페이로드 크기 제한 ③ Rate Limiting 적용 (IMP-046 연계)
- **관련 파일**: `src/app/api/finance/export/route.ts`
- **예상 공수**: 0.3 MD
- **우선순위**: **High** (인증 우회·데이터 위조 가능)

---

## [IMP-066] HTTP Security Headers 미설정

- **발견 경위**: Ring (Qwen3.6) — `next.config.ts` 전수 분석, 보안 헤더 설정 전무 확인
- **현재 상태**: CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy 등 OWASP 권장 보안 헤더 미적용
- **임시 조치**: 없음
- **목표 구현**: ① `next.config.ts`에 `headers()` 함수 추가 ② 필수 보안 헤더 적용 (CSP, X-Frame, HSTS 등) ③ Supabase, Sentry 등 외부 도메인 CSP 예외 추가
- **관련 파일**: `next.config.ts`, `src/middleware.ts`
- **예상 공수**: 0.5 MD
- **우선순위**: **High** (OWASP 보안 헤더 미적용)

---

## [IMP-067] Server Action 입력 유효성 검증 부재 (Zod 등)

- **발견 경위**: Ring (Qwen3.6) — `src/app/actions/` 전수 분석, 6개 mutation 액션이 `payload: any` 파라미터 수신, 런타임 검증 전무
- **현재 상태**: `createVoc()`, `upsertTransportCost()`, `upsertPort()`, `upsertCommonCode()`, `updateSystemParam()`, `upsertVesselSchedule()` — 타입 안전성 없이 임의 객체 직접 DB 쿼리 사용
- **임시 조치**: 없음
- **목표 구현**: ① `zod` 도입 — 각 mutation 액션에 스키마 정의 ② `payload` 파싱 → 검증 실패 시 400 에러 반환 ③ `src/lib/validation/` 하위에 공통 스키마 정의
- **관련 파일**: `src/app/actions/voc.ts`, `finance.ts`, `master.ts`, `schedules.ts`
- **예상 공수**: 1.5 MD
- **우선순위**: **High** (데이터 무결성 위험)

---

## [IMP-068] Signup 프로필 생성 Race Condition

- **발견 경위**: Ring (Qwen3.6) — `src/app/[locale]/(auth)/login/actions.ts` signup 함수 분석 (L105)
- **현재 상태**: 회원가입 시 문서 업로드 플로우에서 `setTimeout(500)`으로 Supabase auth 트리거가 `zen_profiles` 생성을 기다림. 500ms는 환경에 따라 부족할 수 있으며, race condition으로 프로필 미생성 시 문서 업로드 silently 실패
- **임시 조치**: 없음
- **목표 구현**: ① `setTimeout` 제거 → `zen_profiles` 생성 확인 시까지 polling (최대 5초, 200ms 간격) ② 또는 Supabase Edge Function으로 auth 트리거 → 문서 업로드 직렬화 ③ 실패 시 명시적 에러 반환
- **관련 파일**: `src/app/[locale]/(auth)/login/actions.ts`
- **예상 공수**: 0.5 MD
- **우선순위**: **Medium** (간헐적 문서 업로드 실패)
