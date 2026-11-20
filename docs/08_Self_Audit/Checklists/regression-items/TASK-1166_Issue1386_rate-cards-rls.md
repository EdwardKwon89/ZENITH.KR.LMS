# [TASK-1166] DEF-153 — `zen_rate_cards` 화주 계열 원가·마진 조회 차단 (Issue #1386)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-1166 / [#1386](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1386) |
| **팀 / 작성일** | Team A / 2026-11-18 |
| **대상 모듈 (231 연동)** | `supabase/migrations/20261118100000_task1166_def153_rate_cards_safe_view.sql`, `supabase/migrations/20261118100100_task1166_def153_rate_cards_rls_policy.sql`, `src/app/actions/operations/tisa.ts` |
| **검증 차원 (231 D1~D9)** | `D3 (권한·보안), D5 (데이터 정합성)` |

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-1166-01 | 안전 뷰 `zen_rate_cards_safe` 생성 여부 | `CREATE OR REPLACE VIEW public.zen_rate_cards_safe` + `FROM public.zen_rate_cards` | `tests/unit/migrations/task1166-def153-rate-cards-rls.test.ts` | CI (vitest) |
| TC-1166-02 | 뷰 SELECT 목록에 원가·마진 컬럼 부재 | `carrier_cost`·`margin_rate`·`platform_fee_rate` 미포함, `tiers`·`currency` 포함 | 동일 | CI (vitest) |
| TC-1166-03 | 뷰 행 범위 고정 | `auth.uid()` → `zen_profiles.role` 화이트리스트 7역할 | 동일 | CI (vitest) |
| TC-1166-04 | 뷰 권한 최소화 | PUBLIC/anon/authenticated `REVOKE` 후 authenticated 에 `GRANT SELECT` | 동일 | CI (vitest) |
| TC-1166-05 | `zen_rate_cards_select` 정책 교체 | `DROP POLICY IF EXISTS` + `CREATE POLICY` | 동일 | CI (vitest) |
| TC-1166-06 | base 정책 role 목록에서 화주 계열 제외 | `SHIPPER`/`CORPORATE`/`INDIVIDUAL` 부재, 관리자 3역할 존재 | 동일 | CI (vitest) |
| TC-1166-07 | CARRIER 자기 운송사 한정 | JWT `role='CARRIER'` + `zen_carriers.org_id` 조건 | 동일 | CI (vitest) |
| TC-1166-08 | `zen_rate_cards_public` 가역 강화 | `security_invoker=on` + anon 권한 회수 | 동일 | CI (vitest) |
| TC-1166-09 | 롤백 SQL 수록 | `RESET (security_invoker)` 포함 | 동일 | CI (vitest) |
| TC-1166-10 | 안전 뷰 실제 컬럼 화이트리스트 | 원가 3종 컬럼 부재, `tiers` 존재 | 동일 | CI (vitest, DB) |
| TC-1166-11 | 미인증(anon) 권한 부재 | 안전 뷰·공개 뷰 SELECT 권한 `false` | 동일 | CI (vitest, DB) |
| TC-1166-12 | 공개 뷰 `security_invoker` 반영 | `pg_class.reloptions` 에 `security_invoker=on` | 동일 | CI (vitest, DB) |
| TC-1166-13 | 화주 세션 base 테이블 차단 | `zen_rate_cards` 조회 0행 | 동일 | CI (vitest, DB) |
| TC-1166-14 | 화주 세션 안전 뷰 조회 | 전 행 조회(기능 유지) | 동일 | CI (vitest, DB) |
| TC-1166-15 | 관리자 세션 불변 | base 테이블 전 행 조회 | 동일 | CI (vitest, DB) |
| TC-1166-16 | CARRIER 자기 운송사 행만 | 자기 org 카드 수와 일치, 타사 카드 0 | 동일 | CI (vitest, DB) |
| TC-1166-17 | DB 반영 정책 role 목록 | 화주 계열 부재, `CARRIER` 존재 | 동일 | CI (vitest, DB) |
| TC-1166-E2E-01 | 화주 경로 최적화·오더 등록 폼·오더 서비스 저장·UPS 상세 스냅샷 | 수정 전과 동일하게 동작, 원가·마진 미표시 | 수동 E2E (R-10 증적) | CI 미실행 (수동 E2E) |
| TC-1166-E2E-02 | 관리자/운송사 요율 화면 | 관리자 전 행·원가 편집, 운송사 자기 행만 | 수동 E2E (R-10 증적) | CI 미실행 (수동 E2E) |
