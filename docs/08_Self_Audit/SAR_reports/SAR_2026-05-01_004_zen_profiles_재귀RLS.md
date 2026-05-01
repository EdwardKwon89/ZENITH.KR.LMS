# SAR (Self Audit Report) - zen_profiles RLS 재귀 무한루프 수정

## 1. 개요
- **Issue ID**: FIX-RLS-01
- **Date**: 2026-05-01
- **Author**: Riley (CPO)
- **Component**: Database RLS (`zen_profiles` 테이블)

## 2. 문제 현상
- 로컬 DB에서 `zen_profiles`에 대한 SELECT / UPDATE를 시도할 때 `ERROR: infinite recursion detected in policy for relation "zen_profiles"`가 발생함.
- 결과적으로 RLS가 활성화된 상태에서 정상적인 인증 사용자나 관리자가 본인 및 타인의 프로필 정보를 가져오지 못하고 DB 오류 발생.

## 3. 원인 분석
- `zen_profiles`의 SELECT/UPDATE 정책 조건문(`USING`)에서 `EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role = 'ADMIN')` 형태로 자기 자신의 테이블을 다시 SELECT하도록 설계됨.
- 정책 평가를 위해 레코드를 가져올 때 다시 SELECT 정책이 트리거되어 무한 재귀 호출이 발생함.

## 4. 해결 방안 (수정 내역)
- **헬퍼 함수 도입**: `public.get_my_role()`이라는 `SECURITY DEFINER` 함수를 생성.
  - 이 함수는 내부 쿼리 실행 시 RLS를 우회(보안 정의자 권한)하므로 재귀 루프를 끊어줌.
- 기존 정책을 삭제하고 재작성. (`supabase/migrations/20260501053000_fix_zen_profiles_rls.sql` 전면 수정)
  - SELECT: `USING (auth.uid() = id OR public.get_my_role() IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))`
  - UPDATE: `USING (public.get_my_role() IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))`

## 5. 검증 결과
- 수정된 migration 스크립트를 적용한 결과 오류 없이 정상 배포됨.
- E2E-01 테스트(화주 가입 -> 관리자 조회 및 승인 -> 화주 로그인) 전체 사이클 실행 시 RLS 정책으로 인한 차단이나 무한 루프 없이 정상적으로 레코드를 조회하고 업데이트함. (PASS 확인 완료)

## 6. 재발 방지 대책
- 테이블 단위 RLS 설계 시, 역할 기반 통제가 동일 테이블의 역할 컬럼을 참조하는 경우 **반드시 `SECURITY DEFINER` 헬퍼 함수 패턴**을 사용하도록 `DB 설계 가이드라인` 및 Phase 체크리스트에 반영.
