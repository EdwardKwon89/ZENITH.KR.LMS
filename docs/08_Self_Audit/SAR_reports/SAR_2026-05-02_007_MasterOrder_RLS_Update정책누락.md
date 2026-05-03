# 🐞 Self-Audit Report (SAR-007)

> **ID**: SAR_2026-05-02_007
> **문제명**: 마스터오더 그룹핑(Grouping) 시 `zen_orders` RLS UPDATE 정책 누락
> **총 테스트 케이스:** 166 Cases (RLS 보안 강화 및 트래킹 알림 포함)
> **상태**: ✅ 조치 완료
> **작성자**: Riley (Gemini)

---

## 1. 개요 (Overview)
- **발견 시점**: 2026-05-02 E2E-03 (마스터오더 그룹핑) 브라우저 테스트 중
- **현상**: 관리자(ADMIN) 권한으로 여러 하우스 오더를 선택하여 마스터 오더로 그룹핑 시도 시, `new row violates row-level security policy for table "zen_orders"` 에러 발생하며 실패함.

## 2. 원인 분석 (Root Cause)
1. **TC-ORDER-RLS-01**: zen_orders RLS UPDATE | 관리자/운영자의 마스터오더 그룹핑(UPDATE) 권한 보장 (보안 강화형) | `tests/unit/master/master_policy.test.ts`
2. **권한 제약**: 마스터오더 그룹핑은 다수의 하우스 오더를 하나의 마스터 오더에 귀속시키는 과정에서 `UPDATE` 연산이 필수적이나, RLS가 활성화된 상태에서 관리자의 수정 권한이 누락되어 데이터베이스 수준에서 거부됨.

## 3. 조치 내용 (Resolution)
1. **RLS 정책 추가**: `supabase/migrations/20260502191116_fix_e2e_03_master_grouping_rls.sql`을 통해 관리자 및 운영자 권한에 대한 `UPDATE` 정책 추가.
2. **보안 강화**: `auth.role() = 'authenticated'` 방식의 취약점을 보완하여 `public.get_my_role()` 기반의 역할 제한(ADMIN, MANAGER) 적용.
   ```sql
   CREATE POLICY "Enable update for authenticated users"
   ON public.zen_orders FOR UPDATE
   TO authenticated
   USING (public.get_my_role() IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'))
   WITH CHECK (public.get_my_role() IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'));
   ```
2. **검증**: 정책 적용 후 E2E-03 시나리오 재실행하여 그룹핑 및 마스터 오더 생성 성공 확인.

## 4. 재발 방지 대책 (Prevention)
- **가이드라인 수립**: 신규 테이블 생성 또는 컬럼 추가 시, 해당 데이터를 수정하는 행위(UPDATE)가 포함된 모든 역할을 전수 조사하여 RLS 정책을 선제적으로 수립함.
- **체크리스트 보강**: `LIVE_PHASE_2_EXECUTE.md`의 DB 보안 항목에 "연관된 모든 연산(C/R/U/D)에 대한 RLS 정책 검토" 항목을 필수 체크 사항으로 유지.

---

## 5. 관련 증적 (Evidence)
- **수정 파일**: `supabase/migrations/` 내 관련 RLS 수정 스크립트
- **테스트 결과**: `docs/99_Manual/E2E_03_Result/e2e_03_after_click.png` (마스터 오더 생성 성공 확인)
