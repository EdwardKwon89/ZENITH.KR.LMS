# DEF-137: `zen_error_logs` RLS 정책 오류 — ADMIN 역할도 본인 세션으로는 로그 조회 불가

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | Edward가 "10/1·10/2 오더 처리 중 오류가 있었는지 확인해달라, Admin 화면에서는 log가 조회되지 않는다"고 요청 — Aiden이 원격 DB를 service-role로 직접 조회하니 8건이 실제로 존재하는데, admin@zenith.kr 실제 세션 토큰으로 재현 테스트하니 0건으로 확인되어 발견(2026-10-02) |
| **긴급도** | High (TASK-1141/IMP-169로 구축한 "Admin이 production 오류를 직접 확인"하는 기능 전체가 실질적으로 무력화된 상태 — 데이터는 쌓이지만 관리자 본인조차 화면에서 못 봄) |
| **발견일** | 2026-10-02 (버그 자체는 테이블 생성 시점인 2026-04-29부터 잠복, 5/21 `profiles`→뷰 전환 이후 발현된 것으로 추정) |

## 현상

`/admin/error-logs` 화면에 admin@zenith.kr(role=ADMIN, status=ACTIVE, 실제 DB 확인됨)로 로그인해도 **"No results found" / Page 1 of 0**로 표시됨. 그러나 service-role 키로 `zen_error_logs`를 직접 조회하면 실제로 8건이 존재함(Resend 발송 실패, 로그인 인증 오류, 마스터 데이터 조회 오류 등).

**재현(실측)**: admin@zenith.kr의 실제 Supabase Auth 세션 토큰을 발급받아(`/auth/v1/token?grant_type=password`) 그 토큰으로 PostgREST에 직접 `zen_error_logs`를 조회 — **빈 배열 `[]`** 반환. 같은 토큰으로 `profiles` 뷰에서 본인 레코드(`id=818927aa-...`, `role=ADMIN`)는 정상 조회됨 — 즉 인증·역할 자체는 정상인데 `zen_error_logs`에 대한 RLS만 거부.

## 원인

[`supabase/migrations/20260429100000_zen_error_logs.sql`](../../supabase/migrations/20260429100000_zen_error_logs.sql)이 생성 시점(2026-04-29)에 아래 정책을 만듦:

```sql
CREATE POLICY "Admin full access on zen_error_logs"
ON zen_error_logs FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'ADMIN' OR profiles.role = 'ZENITH_SUPER_ADMIN')
  )
);
```

당시 `profiles`는 실제 테이블이었으나, [`20260521200000_imp049_merge_dual_profiles.sql`](../../supabase/migrations/20260521200000_imp049_merge_dual_profiles.sql)(M6~M7)이 `profiles` 테이블을 **삭제하고 `zen_profiles`를 가리키는 `security_invoker=true` 뷰로 대체**했다. 이 교체 이후 `zen_error_logs` 정책의 `EXISTS (SELECT 1 FROM profiles ...)` 서브쿼리가 다른 RLS 정책의 USING 절 안에서 이 뷰를 경유해 평가될 때 더 이상 정상적으로 true를 반환하지 못하는 것으로 실측 확인됨(정확한 Postgres 내부 메커니즘은 미상이나, 재현 테스트로 증상 자체는 확정).

**근거**: 동일 시기([`20260507110000_fix_rls_recursion.sql`](../../supabase/migrations/20260507110000_fix_rls_recursion.sql), [`20260506150000_add_grade_rls_policies.sql`](../../supabase/migrations/20260506150000_add_grade_rls_policies.sql))에 이미 `zen_profiles` 자체의 RLS 재귀 문제를 해결하기 위해 **테이블 조회 대신 `(auth.jwt() -> 'app_metadata' ->> 'role')` 체크로 전환**한 선례가 있다 — `zen_error_logs`의 이 정책만 그 전환에서 누락된 것으로 보인다.

## 영향 범위

- `/admin/error-logs` 화면: admin 세션으로는 **SELECT 전체 실패**(0건 표시) — TASK-1141/IMP-169로 구축한 "Admin이 production 오류를 직접 확인" 기능이 사실상 무력화
- 같은 정책이 `FOR ALL`이므로 **UPDATE(해결 처리 버튼)도 admin 세션에서는 실패할 것으로 추정**(실측은 SELECT만 확인, UPDATE는 코드 경로상 같은 정책에 걸림)
- INSERT는 별도 정책("Users can insert zen_error_logs" WITH CHECK true)이 있어 영향 없음 — 로그 **적재 자체는 정상**(오늘 8건 모두 정상 적재 확인)
- service-role 키(서버 내부용)는 RLS 우회라 영향 없음

## 권장 조치 (DoD)

1. `zen_error_logs`의 "Admin full access" 정책을 `zen_profiles`/`grade_master` 등 기존 수정 사례와 동일한 패턴(`(auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN','ZENITH_SUPER_ADMIN')`)으로 교체하는 마이그레이션 작성
2. 교체 후 admin@zenith.kr 실제 세션 토큰(또는 로컬 테스트 계정)으로 SELECT·UPDATE(해결 처리) 둘 다 재현 검증
3. 회귀 테스트 추가 — RLS 세션 시뮬레이션(`SET LOCAL role/request.jwt.claims`) 기반, 기존 `def117-agency-rls-v2.test.ts` 패턴 참고
4. `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` 갱신

## 파일 소유권 확인

`zen_error_logs` 테이블·관련 화면은 TASK-1138/1140(B_Kai, Team A) 소관 — **Team A 담당**.
