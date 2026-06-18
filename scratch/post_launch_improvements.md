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
- **우선순위**: High → **⏸ 상용 오픈 전 Sprint으로 유예 (2026-05-21 Aiden 결정)**
- **유예 사유**: 현재 내부 개발/테스트 단계 — 외부 공격자 노출 없음. 상용 오픈 직전 필수 보완 항목으로 재배치

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

---

## [IMP-069] 통관 연계 — IBC 어댑터 구현

- **발견 경위**: Aiden — An_08(통관연계 분석 보고서 v1.1) · An_09(통관연계 분석 검토보고서) 완료 후 IBC API 연동 어댑터 미구현 확인 (2026-05-21)
- **현재 상태**: `src/lib/customs/` 내 `ICustomsAdapter` 인터페이스 + `ManualAdapter`(Mock 수준)만 존재. IBC(국제 통관 대행사) 실제 연동 어댑터 없음 — 현재 관리자 수동 신고번호 입력으로 운영
- **임시 조치**: ManualAdapter로 수동 `declaration_no` 입력 후 APPROVED 처리
- **근본 문제**: An_08/An_09 분석으로 IBC API 3개 시스템(중국 포워더 shxk·IBC Air AMS·IBC eTrack) 전체 명세 확보됐으나 실제 어댑터 미구현. 어댑터 패턴(`ICustomsAdapter`)이 설계되어 있어 구조적 착수 준비는 완료됨
- **목표 구현**:
  - `src/lib/customs/ibc-adapter.ts` 신규 구현 (`ICustomsAdapter` 인터페이스 구현)
  - 중국 포워더(shxk) API 연동: `CreateOrder` + `SubmitForecast` 2단계 주문 프로세스
  - IBC Air AMS Manifest 제출: Fullman CSV 42개 필드 생성 + 비동기 이메일 결과 처리
  - IBC eTrack Polling: 3계층 이벤트 배열(`events[]` / `aams_events[]` / `vendor_events[]`) + Disposition Codes 84개 매핑
  - IBC Authority Token 인증 모듈: HEAD + Base64 + 토큰 캐싱 + 만료 시 재발급
  - `src/lib/customs/adapter-factory.ts` 동적 어댑터 로딩
  - Admin UI 어댑터 선택 드롭다운 (IBC / Manual)
- **관련 파일**: `src/lib/customs/ibc-adapter.ts` (신규), `src/lib/customs/adapter-factory.ts` (신규), `src/lib/customs/types.ts`, `src/lib/customs/manual-adapter.ts`, `docs/02_Analysis/An_08_통관연계_분석_보고서.md`, `docs/02_Analysis/An_09_통관연계_분석_검토보고서.md`, `docs/02_Analysis/R_01_통관연계_Aiden_검토요청.md`
- **착수 조건**: ① IBC Sandbox API 계정 확보 (R_01 §1-4) ② `shxk.rtb56.com` 시스템 정체 IBC 확인 (R_01 §1-1)
- **예상 공수**: 5~8 MD
- **우선순위**: **High**

---

## [IMP-070] 다중 경로 정산 연계

- **발견 경위**: Aiden — Phase 3.3 경로 선택 구현 완료 후 정산 연계 누락 확인 (2026-05-23)
- **현재 상태**: `zen_route_options`(segments JSONB) 테이블은 구현됐으나 `zen_order_costs`가 `route_option_id`를 참조하지 않고 단일 운임만 계산. 단일 carrier / 경로별 다른 carrier 케이스 모두 미지원
- **임시 조치**: 기존 단일 운임 계산 방식으로 운영
- **근본 문제**: 초기 요구사항(REQUIREMENTS.md 3.4 지능형 라우팅)에 다중 경로 배정 및 정산이 명시되었으나, Phase 3.3 경로 선택 구현 후 정산 연계가 누락된 채 완료 처리됨
- **목표 구현**: `zen_order_costs`에 `route_option_id` FK 연계 및 구간별(segment) 비용 분해 계산 구현. 단일 carrier(합산 1건) / 경로별 다른 carrier(구간별 분리) 모두 자동 판별·지원
- **관련 파일**: `supabase/migrations/` (신규 마이그레이션), `src/lib/finance/settlement/settlement.ts`, `src/lib/finance/settlement/cost-aggregator.ts`, `supabase/migrations/20260422020000_zen_finance_core.sql`, `supabase/migrations/20260424200000_zen_routing_sprint_a.sql`
- **예상 공수**: 2~3 MD
- **우선순위**: **High**
- **상태**: ✅ 완료 (2026-05-23)
- **연계 Task**: TASK-065 ✅

---

## [IMP-071] 세션 Idle Timeout 미구현

- **발견 경위**: An-10 갭 분析 재분류 — Aiden 실 누락 확인 (2026-05-23)
- **현재 상태**: proxy.ts에 idle timeout 로직 없음. Supabase JWT 기본 만료(1시간)만 존재
- **근본 문제**: 일정 시간 미활동 시 자동 로그아웃 미작동 — 보안 요구사항 미달
- **목표 구현**: proxy.ts에 마지막 활동 시각 추적(쿠키 `zen_last_activity`) + 30분 미활동 시 자동 로그아웃 redirect (`/login?reason=timeout`)
- **관련 파일**: `src/middleware.ts`, `src/lib/proxy.ts`
- **예상 공수**: 0.5일
- **우선순위**: High (P0 보안)

---

## [IMP-072] SUSPENDED 계정 처리 미구현

- **발견 경위**: An-10 갭 분析 재분류 — Aiden 실 누락 확인 (2026-05-23)
- **현재 상태**: proxy.ts에서 PENDING만 처리. SUSPENDED 상태 차단 로직 없음
- **근본 문제**: 정지된 계정이 서비스에 정상 접근 가능 — 보안 허점
- **목표 구현**: proxy.ts에서 SUSPENDED 감지 → `/ko/suspended` redirect. `src/app/[locale]/(auth)/suspended/page.tsx` 신규 생성
- **관련 파일**: `src/lib/proxy.ts`, `src/app/[locale]/(auth)/suspended/page.tsx` (신규)
- **예상 공수**: 0.5일
- **우선순위**: High (P0 보안)

---

## [IMP-078-DEFERRED] 개인정보 활용동의 — 의도적 유예 (2026-05-23 Aiden 재분류)

- **발견 경위**: An-10 갭 분析 v2.2 → Aiden 재분류 (2026-05-23) — 실 누락 항목 → **2026-05-23 Aiden 갭 재분류 시 의도적 유예로 이동 (상용 오픈 후 별도 Sprint)**
- **현재 상태**: `register/page.tsx`에 약관동의 UI 없음
- **근본 문제**: 개인정보보호법 제15조 — 수집 동의 없이 개인정보 처리 불가 (CRITICAL 법적 리스크)
- **목표 구현**: 회원가입 플로우(TYPE/ORG/INFO/DOCS/COMPLETE) 중 DOCS 단계에 약관동의 step 추가. `zen_users.terms_agreed_at TIMESTAMPTZ` 컬럼 마이그레이션. 동의 미체크 시 가입 차단.
- **관련 파일**: `src/app/[locale]/(auth)/register/page.tsx`, `supabase/migrations/` (신규)
- **예상 공수**: 1일
- **우선순위**: Critical (법률)

---

## [IMP-079-DEFERRED] SMS 인증 — 의도적 유예 (2026-05-23 Aiden 재분류)

- **발견 경위**: An-10 갭 분析 v2.2 → Aiden 재분류 (2026-05-23) — 실 누락 항목 → **2026-05-23 Aiden 갭 재분류 시 의도적 유예로 이동 (상용 오픈 후 별도 Sprint)**
- **현재 상태**: `register/page.tsx` INFO 단계에 전화번호 입력 필드·인증번호 확인 없음
- **근본 문제**: 본인확인 없이 회원가입 가능 — 허위 회원 등록 리스크
- **목표 구현**: CoolSMS(coolsms.io) API 연동 — 전화번호 입력 → OTP 6자리 발송 → 확인 플로우. Server Action `sendSmsOtp()` + `verifySmsOtp()` 구현. `zen_sms_verifications` 테이블(phone, otp_hash, expires_at, verified) 신규.
- **관련 파일**: `src/app/actions/auth.ts`, `src/app/[locale]/(auth)/register/page.tsx`, `supabase/migrations/` (신규)
- **예상 공수**: 2일
- **우선순위**: High

---

## [IMP-073] 입고 처리 전용 화면 SCR-040 미구현

- **발견 경위**: An-10 갭 分析 재분류 — Aiden 실 누락 확인 (2026-05-23)
- **현재 상태**: `/inventory` 경로로 재고 조회만 가능. 입고 수령→검수→확정 전용 워크플로우 페이지 없음
- **근본 문제**: 창고 입고 업무 처리 불가
- **목표 구현**: `src/app/[locale]/(dashboard)/warehouse/inbound/page.tsx` 신규 개발. 바코드 스캔 → 화물 조회 → 검수 메모 → 입고 확정
- **관련 파일**: `src/app/[locale]/(dashboard)/warehouse/inbound/page.tsx` (신규), `src/app/actions/warehouse.ts`
- **예상 공수**: 2일
- **우선순위**: High (P1)

---

## [IMP-074] 출고·운송장 출력 화면 SCR-041 미구현

- **발견 경위**: An-10 갭 分析 재분류 — Aiden 실 누락 확인 (2026-05-23)
- **현재 상태**: 출고 지시·운송장 PDF 출력 전용 페이지 없음
- **근본 문제**: 창고 출고 업무 처리 불가. 운송장 없이 화물 발송 불가.
- **목표 구현**: `src/app/[locale]/(dashboard)/warehouse/outbound/page.tsx` 신규 개발. 출고 지시 → 바코드 스캔 → 운송장 PDF → 출고 확정
- **관련 파일**: `src/app/[locale]/(dashboard)/warehouse/outbound/page.tsx` (신규), `src/app/actions/warehouse.ts`
- **예상 공수**: 2.5일
- **우선순위**: High (P1)

---

## [IMP-075] 오더 패킹 화면 SCR-031 미구현

- **발견 경위**: An-10 갭 分析 재분류 — Aiden 실 누락 확인 (2026-05-23)
- **현재 상태**: 마스터 오더 Packing List 출력 전용 페이지 없음
- **목표 구현**: `src/app/[locale]/(dashboard)/master-orders/[id]/packing/page.tsx` 신규 개발. House 오더 품목·수량·CBM + Packing List 인쇄 레이아웃
- **관련 파일**: `src/app/[locale]/(dashboard)/master-orders/[id]/packing/page.tsx` (신규)
- **예상 공수**: 1일
- **우선순위**: Medium (P2)

---

## [IMP-076] 특수화물 기재 미구현

- **발견 경위**: An-10 갭 分析 재분류 — Aiden 실 누락 확인 (2026-05-23)
- **현재 상태**: OrderRegistrationForm Zod 스키마에 특수화물 타입 필드 없음. zen_orders.cargo_details가 generic JSON
- **목표 구현**: zen_orders에 `special_cargo_type TEXT CHECK IN ('NONE','DANGEROUS','FROZEN','VALUABLE','USED')` 컬럼 추가. OrderRegistrationForm에 특수화물 라디오 그룹 UI 추가.
- **관련 파일**: `src/app/[locale]/(dashboard)/orders/new/OrderRegistrationForm.tsx`, `supabase/migrations/` (신규)
- **예상 공수**: 1일
- **우선순위**: Medium (P2)

---

## [IMP-077] 회원 관리 전용 화면 SCR-091 미구현

- **발견 경위**: An-10 갭 分析 재분류 — Aiden 실 누락 확인 (2026-05-23)
- **현재 상태**: /admin/organizations는 조직 승인 전용. 회원 등급·이용 제한 관리 UI 없음
- **목표 구현**: `src/app/[locale]/(dashboard)/admin/members/page.tsx` 신규 개발. 전체 회원 목록 + 등급 변경 + SUSPEND/UNSUSPEND 조작 UI
- **관련 파일**: `src/app/[locale]/(dashboard)/admin/members/page.tsx` (신규), `src/app/actions/member.ts`
- **예상 공수**: 1.5일
- **우선순위**: Medium (P2)

---

## [IMP-090] create_order_atomic RPC cargo_details 미처리 — 임시 DEFAULT 제거 필요

- **발견 경위**: UAT-02-01 DEF-022 수정 과정에서 발견 (2026-05-29, Aiden 검토)
- **현재 상태**: DEF-022 ⑤ 수정으로 `zen_orders.cargo_details` 컬럼에 `DEFAULT '{}'::jsonb` 설정(마이그레이션 `20260529122000`). `create_order_atomic` RPC가 `cargo_details`를 INSERT에 포함하지 않아 NOT NULL 위반을 회피하는 임시 조치임.
- **임시 조치**: `cargo_details DEFAULT '{}'::jsonb` (커밋 `e63832e`)
- **목표 구현**: `create_order_atomic` RPC를 수정하여 폼에서 입력된 화물 명세(품목·수량·CBM 등)를 `cargo_details` 컬럼에 올바르게 INSERT하도록 처리. 임시 DEFAULT 제거.
  - 대상 함수: `create_order_atomic` (마이그레이션 `20260523120500`)
  - `cargo_details` 파라미터 추가 + INSERT 반영
  - `OrderRegistrationForm.tsx` 폼 데이터 → RPC 파라미터 매핑 확인
- **⚠️ TASK-100 연계**: TASK-100에서 `getRouteOptions`를 `zen_order_packages` 기반으로 전환하면 `cargo_details` DEFAULT 의존성이 해소됨. TASK-100 완료 후 DEFAULT 제거 마이그레이션 포함하여 IMP-090 완료 처리.
- **관련 파일**: 
  - `supabase/migrations/20260523120500_*.sql` (create_order_atomic RPC)
  - `supabase/migrations/20260529122000_fix_cargo_details_not_null.sql` (임시 DEFAULT — 제거 대상)
  - `src/components/orders/OrderRegistrationForm.tsx`
- **예상 공수**: 0.5일
- **우선순위**: Medium (P2)

---

## [IMP-091] 운송사 Carrier Portal — 배차 수락/거부 및 상태 직접 업데이트

- **발견 경위**: DEF-030 분석 및 플랫폼 업무 흐름 설계 검토 (2026-05-29, Aiden)
- **현재 상태**: 운송사(CARRIER role)가 시스템 내 직접 액션 없음. ADMIN이 운송사를 대행하여 SCHEDULED 전이 수행. IN_TRANSIT·DELIVERED 상태 변경도 ADMIN 전속.
- **목표 구현**:
  - 운송사 전용 포털(Carrier Dashboard): 배차 요청 수신 → 수락/거부
  - 운송사가 직접 IN_TRANSIT·DELIVERED 상태 업데이트 가능
  - 수락 시 REGISTERED→SCHEDULED 자동 전이 (또는 ADMIN 최종 확인)
  - 거부 시 ADMIN에게 알림 → 대체 운송사 선정 플로우
- **관련 파일**:
  - `src/lib/logistics/status-machine.ts` (CARRIER 역할 전이 권한 확장)
  - `src/app/actions/operations/orders.ts` (배차 수락/거부 Server Action 신규)
  - `src/app/[locale]/(dashboard)/carrier/` (Carrier 전용 페이지 신규)
- **예상 공수**: 3일
- **우선순위**: Low (Phase M 대상)

---

## [IMP-094] 요율 관리 워크플로우 고도화 — 방안2 (화주·운송사·플랫폼 공동 참여)

- **발견 경위**: DEF-038 분석 및 요율 관리 UI 방안 검토 (2026-06-01, Noah). TISA 3-tier 구조 전환 완료에 따른 워크플로우 확장 검토.
- **현재 상태**: 요금 등록은 ADMIN/MANAGER 전용 (방안1). 운송사(CARRIER)는 요율을 직접 등록할 수 없고, 화주(SHIPPER)는 시스템이 자동 매칭한 기준 운임만 확인 가능.
- **목표 구현**:

  **① 운송사 자체 요율 등록**
  ├ CARRIER가 `/carrier/rates` 페이지에서 자사 요율 등록 (carrier_cost + margin)
  ├ ADMIN이 등록된 요율 검토 후 승인/반려
  ├ 승인된 요율만 Rate Match Engine에서 활성화
  └ 반려 시 수정 요청 사유와 함께 CARRIER에게 통보

  **② 화주 요율 비교·선택**
  ├ SHIPPER가 다수 운송사 요율 비교 후 선택 (현재 자동 매칭 → 수동 선택 병행)
  ├ 선택된 요율은 Order TISA Snapshot에 Override 사유 기록
  └ 장기 계약 건은 별도 협의 요율 등록 가능

  **③ 플랫폼 거버넌스**
  ├ ADMIN이 운송사별 요율 상한/하한 설정 가능 (rate floor/cap)
  ├ 플랫폼 수수료(platform_fee_rate)는 ADMIN 전용 설정 — 운송사 수정 불가
  └ 요율 변경 이력 전수 감사 추적

- **관련 파일**:
  - `src/app/[locale]/(dashboard)/carrier/rates/page.tsx` (신규 — Carrier 요율 등록 UI)
  - `src/app/[locale]/(dashboard)/admin/rates-approval/page.tsx` (신규 — ADMIN 승인 UI)
  - `src/app/actions/admin/rates.ts` (승인/반려 Server Action 확장)
  - `src/app/actions/operations/tisa.ts` (화주 요율 선택 로직)
  - `src/lib/repositories/admin.repository.ts` (방안1 선행 수정 완료 후 확장)
  - `supabase/migrations/` (zen_rate_cards status 컬럼 — PENDING/APPROVED/REJECTED)

- **선후행 관계**:
  ├ 선행: **방안1** (DEF-038) — AdminRepository TISA 3-tier 정합성 확보 필수
  ├ 선행: **DEF-039** — CARRIER RLS SELECT 허용 (운송사가 자사 요율 조회 가능해야 함)
  └ 통합: **IMP-091** (Carrier Portal) — 운송사 대시보드와 요율 관리 UI 통합 설계

- **예상 공수**: 3~5 MD (방안1 선행 완료 기준)
- **우선순위**: Medium

---

## [IMP-095] Rate Card 노선별(출발지/도착지) 매칭 누락 ✅ 완료 (2026-06-03, TASK-109)

- **발견 경위**: 2026-06-03, `/admin/rates` "Admin Area Error" 디버깅 과정에서 발견 (Noah).  
  Edward Kwon UAT 중 carrier@zenith.kr 접속 오류 신고 → 원인 분석 중 구조적 결함 확인.
- **현재 상태**:
  - `fn_get_best_matching_rate()` DB 함수가 `p_origin_port`, `p_dest_port`를 **파라미터로 받지만 WHERE절에서 미사용**
  - `TISARateMatcher.matchRateCard()` (application 레벨)도 **carrier_id + transport_mode**로만 조회
  - `AdminRepository.findRateCards()`도 port 필터 없음
  - `zen_rate_cards` 테이블에 `origin_port_id` / `dest_port_id` 컬럼 부재 (레거시 `origin_code`, `dest_code`는 `20260428235219_remote_schema.sql`에서 제거됨)
- **영향**:
  - 동일 운송사 + 동일 운송모드인 모든 노선이 **동일한 Rate Card**로 매칭됨  
    (예: ZENITH_AIR의 ICN→LAX, ICN→SFO가 같은 요율 적용)
  - 노선별 차등 요율 설정 불가 — 실제 물류 시장에서 일반적인 요구사항 미충족
- **임시 조치 (2026-06-03)**:
  - `/admin/rates` 페이지 `page.tsx` props 불일치 수정 (TISA 3-tier `carrierCost`/`marginRate`/`platformFeeRate` 미전달 → **TypeError: undefined.toFixed**)
  - TypeScript 컴파일 에러 2건 해결 (`statusFilter` 제거, `null`→`undefined`)
  - **229/229 회귀 테스트 재확인 필요**
- **목표 구현**:
  1. `zen_rate_cards`에 `origin_port_id UUID FK → zen_ports(id)`, `dest_port_id UUID FK → zen_ports(id)` 컬럼 추가
  2. 기존 데이터 마이그레이션 (port code 기준 매핑)
  3. `fn_get_best_matching_rate` WHERE절에 `origin_port_id`, `dest_port_id` 조건 추가
  4. `TISARateMatcher.matchRateCard()` 파라미터 및 쿼리 확장
  5. `AdminRepository.findRateCards()` 필터 확장
  6. `/admin/rate-cards` 폼에 출발지/도착지 선택 필드 추가
- **관련 파일**:
  - `supabase/migrations/` (신규 — `zen_rate_cards` port 컬럼 추가)
  - `src/app/actions/admin/rates.ts` (`getRateCards` port 필터)
  - `src/app/actions/admin/rate-cards.ts` (`createRateCard` port 필드)
  - `src/lib/repositories/admin.repository.ts` (`findRateCards` port 조건)
  - `src/lib/logistics/composite-pricing.ts` (`TISARateMatcher.matchRateCard` port 조건)
  - `src/app/[locale]/(dashboard)/admin/rate-cards/RateCardsTab.tsx` (UI에 port 필드)
- **선후행 관계**:
  ├ 선행: DEF-038 (TISA 3-tier 정합성) — ✅ 완료
  └ 통합: **IMP-094** (방안2) — 노선별 요율이 전제되어야 워크플로우 설계 완성
- **예상 공수**: 2~3 MD (마이그레이션 + 함수 수정 + UI)
- **우선순위**: **High** — UAT 블로커 (노선별 요율 설정 불가, 동일 운송사 모든 노선 동일 요율)

---

## [IMP-096] 요율 관리 페이지 통합 정리 (3단계 — Surcharges 이전·rate-cards 제거·transport-costs 경고)

- **발견 경위**: 2026-06-03 UAT 진행 중 Admin 요율 관련 페이지 3개 혼재 확인 (Aiden). `/admin/rates` 와 `/admin/rate-cards` 가 동일 테이블(`zen_rate_cards`) 중복 관리, `/admin/transport-costs` 가 TISA 엔진과 완전 단절됨을 발견.
- **현재 상태**:
  - `/admin/rate-cards` RateCardsTab: `zen_rate_cards` 중복 관리 (포트 매칭 필드 없음)
  - `/admin/rate-cards` **SurchargesTab**: `zen_surcharges` 의 유일한 관리 UI — TISA 엔진(`composite-pricing.ts`)이 실제 참조하는 테이블
  - `/admin/transport-costs`: `zen_transport_costs` 관리 — TISA 엔진 미참조 (레거시 단절)
- **목표 구현**:

  **1단계 — `/admin/rates` Surcharges 탭 추가**
  ├ `SurchargesTab` (`zen_surcharges` CRUD)을 `/admin/rates` 페이지로 통합
  └ TISA 엔진 연결 보존

  **2단계 — `/admin/rate-cards` 제거**
  ├ `page.tsx` → `/admin/rates` redirect 전환
  ├ NaviSidebar "요율 카드 관리" 메뉴 항목 제거
  ├ `tests/e2e/e2e-18` URL 수정 (`/rate-cards` → `/rates`)
  └ UAT-10-01 시나리오 URL 수정

  **3단계 — `/admin/transport-costs` 경고 배너**
  ├ `transport-cost-client.tsx` 상단: "이 데이터는 실제 운임 계산(TISA)에 반영되지 않습니다" 경고
  └ UAT-09-11 시나리오 비고: "TISA 미연결 — 참고용 데이터" 추가

- **관련 파일**:
  - `src/app/[locale]/(dashboard)/admin/rates/page.tsx` (탭 구조 추가)
  - `src/app/[locale]/(dashboard)/admin/rate-cards/page.tsx` (redirect 전환)
  - `src/components/layout/NaviSidebar.tsx` (메뉴 항목 제거)
  - `src/app/[locale]/(dashboard)/admin/transport-costs/transport-cost-client.tsx` (경고 배너)
  - `tests/e2e/e2e-18-packing-pricing-ratecards.spec.ts` (URL 수정 2곳)
  - `docs/91_FinalTest/UAT/UAT_10_지능형라우팅_운임.md` (URL 수정)
  - `docs/91_FinalTest/UAT/UAT_09_어드민_운영.md` (비고 추가)
- **선후행 관계**:
  ├ 선행: TASK-106 ✅ (AdminRepository TISA 3-tier 정합)
  ├ 선행: TASK-109 ✅ (IMP-095 포트 기반 매칭 — `/admin/rates` 포트 필드 완비)
  └ 후행: IMP-094 (요율 워크플로우 고도화 — 단일 진실 공급원 확립 후 설계 가능)
- **예상 공수**: 1~1.5 MD
- **우선순위**: **High** — UAT 중 운영자 혼선 유발, IMP-094 설계 전제조건

---

## IMP-107 | TISA 요율 스냅샷 강화 — WM 적용 구간 + pricing basis 저장

- **발견 경위**: TASK-122 IMP-106 완료 후 간이 테스트 중, Aiden 검토에서 스냅샷 이력 추적 부족 발견 (2026-06-08)
- **현재 상태**: `zen_order_rate_snapshots`에 `applied_unit_price`·`carrier_cost_amount`·`platform_fee_amount`만 저장. WM 방식에서 어떤 weight slab/cbm slab이 매칭됐는지, 실제 weight/cbm 값, 최종 청구 기준(WEIGHT/CBM/MIN_CHARGE/MAX_CHARGE)이 미저장.
- **임시 조치**: 없음 (이력 추적 기능 부재 상태 유지 중)
- **목표 구현**:

  **`zen_order_rate_snapshots` 컬럼 추가 (DB 마이그레이션)**
  ```sql
  applied_weight_slab_min   NUMERIC,  -- 매칭된 weight slab의 weight_min
  applied_weight_unit_price NUMERIC,  -- 해당 slab의 unit_price (kg당)
  applied_cbm_slab_min      NUMERIC,  -- 매칭된 cbm slab의 cbm_min
  applied_cbm_price         NUMERIC,  -- 해당 slab의 cbm_price (㎥당)
  applied_weight_cost       NUMERIC,  -- weight × unit_price 계산 금액
  applied_cbm_cost          NUMERIC,  -- cbm × cbm_price 계산 금액
  applied_pricing_basis     TEXT,     -- 'WEIGHT' | 'CBM' | 'MIN_CHARGE' | 'MAX_CHARGE'
  tiers_snapshot            JSONB     -- 적용 시점 tiers 전체 객체 (요율 변경 후 재현용)
  ```

  **`tr_capture_order_rate_snapshot` 트리거 및 `calculate_order_costs` 함수 업데이트**
  - 스냅샷 저장 시 위 컬럼에 매칭 결과 기록
  - WM 방식: weight_cost vs cbm_cost vs min_charge vs max_charge 비교 후 basis 결정

  **`applied_pricing_basis` 판정 로직**
  ```
  WEIGHT     — weight_cost ≥ cbm_cost AND weight_cost ≥ min_charge
  CBM        — cbm_cost > weight_cost AND cbm_cost ≥ min_charge
  MIN_CHARGE — max(weight_cost, cbm_cost) < min_charge (하한선 발동)
  MAX_CHARGE — max(weight_cost, cbm_cost) > max_charge (상한선 발동, IMP-108 선행 후)
  ```

- **관련 파일**:
  - `supabase/migrations/` (신규 마이그레이션)
  - `src/app/actions/operations/tisa.ts`
  - `src/app/actions/admin/rates.ts`
- **선후행 관계**:
  ├ 선행: IMP-108 (max_charge 필드 추가 — MAX_CHARGE basis 판정 전제)
  └ 독립: IMP-106 ✅ 완료
- **예상 공수**: 0.5~1 MD
- **우선순위**: **Medium** — 기능 영향 없음, 이력 추적·분쟁 대응 강화

---

## IMP-108 | 요율 Slab max_charge 상한선 필드 + platform_fee_amount 재정의

- **발견 경위**: TASK-122 IMP-106 Carrier Cost 제거 후 간이 테스트 검토 중, platform_fee_amount 계산 단절 및 max_charge 부재 발견 (2026-06-08)
- **현재 상태**:
  1. `platform_fee_amount` 계산 공식: `carrier_cost * platform_fee_rate / 100` → IMP-106으로 신규 Rate Card에 `carrier_cost=NULL` 저장 시 `platform_fee_amount=NULL` 발생
  2. Slab 구조에 `min_charge`(하한선)만 있고 `max_charge`(상한선) 미존재 — 계약상 운임 상한 설정 불가
- **임시 조치**: 없음 (platform_fee_amount=NULL 상태 유지 중)
- **목표 구현**:

  **1단계 — Slab 구조에 max_charge 추가**
  ```typescript
  export interface WeightSlab {
    weight_min: number;
    unit_price: number;
    min_charge: number;   // 하한선 (필수)
    max_charge?: number;  // 상한선 (선택)
  }
  export interface CbmSlab {
    cbm_min: number;
    cbm_price: number;
    min_charge: number;
    max_charge?: number;
  }
  ```
  - `RateTierEditor.tsx` UI에 max_charge 선택 입력 필드 추가
  - DB 마이그레이션: `tiers` JSONB 스키마 변경 (기존 데이터 하위 호환)

  **2단계 — platform_fee_amount 계산 재정의**
  ```sql
  -- 현재 (carrier_cost 기반, IMP-106 이후 NULL 반환)
  CASE WHEN rc.carrier_cost IS NOT NULL THEN rc.carrier_cost * rc.platform_fee_rate / 100.0 END

  -- 개선 (slab unit_price 기반)
  CASE WHEN rc.platform_fee_rate IS NOT NULL
    THEN ROUND(
      (rc.tiers->'weight_slabs'->0->>'unit_price')::DECIMAL * rc.platform_fee_rate / 100.0
    , 2)
  END
  ```
  - `fn_get_best_matching_rate` 모든 overload 업데이트
  - `calculate_order_costs` 반영

  **3단계 — WM 계산 로직에 max_charge cap 적용**
  ```
  total = CLAMP(max(weight_cost, cbm_cost), min=min_charge, max=max_charge)
  ```

- **관련 파일**:
  - `src/components/admin/RateTierEditor.tsx`
  - `supabase/migrations/` (fn 업데이트 + tiers 스키마)
  - `src/lib/logistics/rate-engine.ts`
  - `src/lib/finance/settlement/slab-rate-calculator.ts`
  - `src/app/actions/operations/tisa.ts`
- **선후행 관계**:
  ├ 선행: IMP-106 ✅ (Slab 구조 개편 완료)
  └ 후행: IMP-107 (max_charge basis 판정 전제)
- **예상 공수**: 1~1.5 MD
- **우선순위**: **High** — platform_fee_amount=NULL로 신규 Rate Card 수수료 계산 단절

---

## [IMP-109] Rate Card 버전 관리 — Pri/Snd + version_no 도입

- **발견 경위**: DEF-054 분석 중 식별 — `updateRateCard` in-place UPDATE로 Order 요금 소급 변동 위험
- **현재 상태**:
  - Order snapshot은 `rate_card_id`(Snd UUID)로 참조하나, `updateRateCard`가 기존 row를 덮어씀
  - `version_no`는 snapshot에 컬럼만 존재하고 항상 1로 하드코딩
  - 개정 이력 추적 수단 없음 (supersede 전환 시 CREATE TIME만으로 추적)
- **목표 구현**:
  1. `zen_rate_cards`에 `pri_id UUID NOT NULL DEFAULT gen_random_uuid()`, `superseded_at TIMESTAMPTZ`, `version_no INT` 컬럼 추가
  2. `createRateCard`: `pri_id` 신규 생성, `version_no=1`
  3. `updateRateCard`: in-place UPDATE → supersede + INSERT 전환 (`pri_id` 유지, `version_no+1`)
  4. `supersede`: 기존 row `is_active=false`, `superseded_at=now()`, 새 row `is_active=true`
  5. `pri_id` + `version_no`로 전체 개정 이력 조회 가능
- **관련 파일**:
  - `src/lib/repositories/admin.repository.ts`
  - `src/app/actions/admin/rates.ts`
  - `src/app/actions/operations/tisa.ts` (version_no 하드코딩 제거)
  - `supabase/migrations/` (DDL 컬럼 추가)
- **선후행 관계**: DEF-054 A안 선행 완료 필요 (TASK-127)
- **예상 공수**: 1~2 MD
- **우선순위**: Medium (post-Go-Live)

---

## [IMP-123] 브랜치 교차 오염 방지 — R-17 착수 절차 강화 + pre-commit hook

- **발견 경위**: Issue #31 (B_Kai 보고) — TASK-151 커밋이 Riley 브랜치(`feature/ups-spr07-riley-e2e-uat-spec`)에 오염된 사건에서 도출. Edward 확인 2026-06-18.
- **현재 상태**:
  - 모든 Agent가 동일 Local Workspace(`/Users/edward.kwon/WorkSpace/ZENITH_LMS_001`) 공유
  - 착수 전 `git checkout feature/[본인 브랜치]` 단계가 R-17 절차에 명시되지 않음
  - 타 Agent 브랜치 checkout 상태에서 커밋 시 cross-branch 오염 발생 가능
- **임시 조치**: TASK-156 발령 (B_Kai 브랜치 오염 복구), GOV_COMMON.md R-17 §0 신설
- **구현 완료** (2026-06-18, Aiden):
  1. **GOV_COMMON.md R-17 §0 신설** — 착수 절차 최상위에 Git 동기화 5단계 추가:
     `fetch → checkout develop → pull → checkout 본인 브랜치 → rebase`
  2. **pre-commit hook Agent Tag ↔ 브랜치 검증** — `.git/hooks/pre-commit` 에 추가:
     - `[B_Kai]` 커밋은 `bkai` 브랜치에서만 허용
     - `[D_Kai]` 커밋은 `dkai` 브랜치에서만 허용
     - `[Riley]/[Gemini]` 커밋은 `riley` 브랜치에서만 허용
     - `[Claude]/[Aiden]` 커밋은 전체 브랜치 허용 (거버넌스 작업)
- **git worktree 방안 기각**: Agent가 자신의 worktree 경로를 자동 판별하는 메커니즘 부재. 관리 부담 과도. Edward 승인.
- **관련 파일**: `GOV_COMMON.md` (R-17 §0), `.git/hooks/pre-commit`, `GOV_COMMON.md` (v2.2 개정 이력)
- **관련 이슈**: GitHub Issue #31
- **예상 공수**: ✅ 완료 (0.5 MD)
- **우선순위**: High → **완료**
