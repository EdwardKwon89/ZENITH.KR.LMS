# 코드베이스 개선 사항 분석 보고서 (Riley — 2026-05-13)

> **태스크 ID**: EXP-IMP-RL  
> **분석 도구**: GitNexus, RipGrep  
> **분석 범위**: `src/`, `supabase/migrations/`  
> **준수 규정**: R-15 (Post-launch Improvements Registration)

기존 `scratch/post_launch_improvements.md`에 등록된 IMP-001~014 항목과 중복되지 않는 새로운 개선 사항 4건을 다음과 같이 도출하여 보고합니다.

---

## [IMP-015] I18n 타입 안정성 및 번역 키 누락 방지 자동화

- **발견 경위**: `src/app/[locale]/(auth)/login/page.tsx` 등에서 `useTranslations('Auth')` 사용 시 수동 문자열 참조 확인.
- **현재 상태**: `next-intl`을 사용 중이나, 번역 파일(`messages/*.json`)의 키가 소스 코드에 타입으로 정의되어 있지 않음.
- **근본 문제**: 존재하지 않는 번역 키를 호출할 경우 런타임에 에러가 발생하거나 키 텍스트가 그대로 노출되어 사용자 경험 저하.
- **목표 구현**:
  1. `next-intl`의 **Type-safe navigation** 설정을 적용하여 모든 번역 키를 TypeScript 인터페이스로 관리.
  2. `npm run i18n:check` 스크립트를 추가하여 소스 코드에서 사용 중이나 JSON 파일에 누락된 키를 자동 추출.
- **관련 파일**: `src/i18n.ts`, `messages/*.json`, `global.d.ts` (신규)
- **예상 공수**: 1.0 MD
- **우선순위**: Medium (운영 안정성 및 글로벌 확장성 대비)

---

## [IMP-016] 공통 도메인 UI 컴포넌트(Domain-Specific Common UI) 라이브러리화

- **발견 경위**: `src/components/` 하위의 `admin`, `customs`, `orders` 폴더 구조 탐색 중 유사한 배지/데이터 그리드 패턴 발견.
- **현재 상태**: 운송 상태(Status), 통화 표시, 파트너사 정보 등 도메인 개체들이 각 폴더에 산재하여 구현됨.
- **근본 문제**: 디자인 시스템의 일관성 유지가 어렵고, 상태값이 추가될 때마다 여러 파일(Enum, Style, Component)을 동시 수정해야 함.
- **목표 구현**:
  1. `src/components/domain/` 폴더를 신규 생성하여 도메인 특화 컴포넌트 표준화.
  2. `ZenStatusBadge`, `ZenCurrencyFormatter`, `PartnerSelector` 등 재사용 가능한 비즈니스 UI 추출.
  3. `USER_ROLES`와 같은 상수를 UI 레벨에서 자동 처리하는 권한 기반 컴포넌트 도입.
- **관련 파일**: `src/components/domain/`, `src/components/ui/ZenUI.tsx`
- **예상 공수**: 2.0 MD
- **우선순위**: Medium (UI/UX 일관성 및 개발 생산성)

---

## [IMP-017] Server Actions 에러 핸들링 및 리스폰스 래퍼 표준화

- **발견 경위**: `src/app/actions/auth.ts` 분석 중 각 함수마다 개별적으로 `try-catch` 및 `console.error`가 구현된 패턴 확인.
- **현재 상태**: 성공 시 `{ success: true }`, 실패 시 `{ error: '...' }` 형태의 리턴값이 수동으로 작성됨.
- **근본 문제**: 에러 로깅 방식이 파편화되어 있고, 클라이언트(UI)에서 일관된 에러 처리가 불가능함.
- **목표 구현**:
  1. `src/lib/actions/action-wrapper.ts`를 구현하여 모든 Server Action을 래핑.
  2. `Result<T, E>` 패턴을 도입하여 성공/실패 데이터를 구조화.
  3. 전역 에러 핸들러를 통해 로깅(IMP-013 연계) 및 I18n 메시지 매핑 자동화.
- **관련 파일**: `src/app/actions/*.ts`, `src/lib/actions/action-wrapper.ts` (신규)
- **예상 공수**: 1.5 MD
- **우선순위**: High (시스템 유지보수성 및 디버깅 편의성)

---

## [IMP-018] Supabase RLS(Row Level Security) 정책의 비즈니스 규칙 통합

- **발견 경위**: `supabase/migrations/` 분석 결과, 정책들이 단순한 `auth.uid()` 비교 수준에 머물러 있는 것으로 확인.
- **현재 상태**: 파트너사 간 데이터 격리 등 복잡한 보안 규칙이 애플리케이션 코드(`rbac.ts`)에만 의존하고 있음.
- **근본 문제**: 사용자가 클라이언트 API(Supabase Client)를 통해 직접 DB를 호출할 경우, 애플리케이션 코드가 강제하지 못하는 데이터 보안 사고 위험 존재.
- **목표 구현**:
  1. `check_org_access(org_id)`, `is_partner_carrier(rate_id)` 등 비즈니스 로직을 SQL 함수로 정의.
  2. 해당 함수들을 RLS 정책(`USING` 절)에 적용하여 DB 엔진 레벨에서 보안 보장.
  3. `auth.jwt()`의 커스텀 클레임을 활용하여 권한 체크 성능 최적화.
- **관련 파일**: `supabase/migrations/*.sql`, `supabase/functions/`
- **예상 공수**: 3.0 MD
- **우선순위**: High (데이터 보안 아키텍처 강화)
