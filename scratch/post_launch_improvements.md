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
