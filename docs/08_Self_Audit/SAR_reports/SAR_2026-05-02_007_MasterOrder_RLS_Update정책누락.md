# SAR-2026-05-02-007: Master Order RLS Update 정책 누락

> **작성자**: Riley (Gemini)
> **날짜**: 2026-05-02 (KST)
> **관련 Task**: PH14-E2E-03 (Master Order Grouping)

## 1. 문제 현상
- **현상**: E2E-03 테스트(마스터 오더 그룹핑) 수행 중, 하우스 오더를 마스터 오더에 바인딩(UPDATE `zen_orders.master_order_id`)하는 과정에서 `Permission Denied` 오류 발생.
- **원인**: `zen_orders` 테이블에 `UPDATE` 권한에 대한 Row Level Security (RLS) 정책이 수립되어 있지 않아, `authenticated` 역할의 사용자가 데이터를 수정할 수 없었음.

## 2. 근본 원인 분석
- **정책 누락**: 초기 DB 설계 시 `zen_orders`는 생성(INSERT) 및 조회(SELECT) 위주로 정책이 수립되었으나, 마스터 오더 바인딩과 같은 수정(UPDATE) 시나리오에 대한 관리자 정책이 누락됨.
- **보안 가이드라인 미준수**: 임시 조치 과정에서 `auth.role() = 'authenticated'`와 같은 광범위한 정책을 사용하려 했으나, 이는 `CUSTOMER` 권한을 가진 사용자도 모든 오더를 수정할 수 있게 하는 보안 취약점을 야기함 (Aiden 지적 사항).

## 3. 조치 내용
- **Migration 적용**: `supabase/migrations/20260502191116_fix_e2e_03_master_grouping_rls.sql` 파일을 생성/수정하여 보안이 강화된 정책 적용.
- **정책 상세**:
  ```sql
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.zen_orders;
  DROP POLICY IF EXISTS "Admins can update orders" ON public.zen_orders;

  CREATE POLICY "Admins can update orders" ON public.zen_orders
  FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'))
  WITH CHECK (public.get_my_role() IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'));
  ```
- **검증**: SQL 쿼리를 통해 정책이 올바르게 반영되었음을 확인하고, E2E-03 시나리오 재실행 시 바인딩 성공 확인.

## 4. 재발 방지 대책
- **체크리스트 업데이트**: `LIVE_PHASE_2_EXECUTE.md` 및 `LIVE_PHASE_3_VERIFY.md`에 RLS 정책 수립 시 `UPDATE` 권한 및 역할 기반 필터링(`public.get_my_role()`) 필수 확인 항목 추가.
- **보안 검토**: 모든 신규 테이블 또는 기존 테이블의 상태 변경 로직 추가 시, 반드시 권한별 RLS 정책을 선제적으로 검토(API-First Design 준수).

## 5. 관련 문서
- [WBS_01_상세_공정표.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/docs/01_WBS/WBS_01_%EC%83%81%EC%84%B8_%EA%B3%B5%EC%A0%95%ED%91%9C.md)
- [TASK_BOARD.md](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/.agent/TASK_BOARD.md)
- [20260502191116_fix_e2e_03_master_grouping_rls.sql](file:///Users/edward.kwon/WorkSpace/ZENITH_LMS_001/supabase/migrations/20260502191116_fix_e2e_03_master_grouping_rls.sql)
