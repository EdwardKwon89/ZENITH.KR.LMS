# DEF-071 — zen_rate_cards service_role GRANT 누락

> **DEF-ID**: DEF-071
> **발견일**: 2026-06-22
> **발견자**: Jaison (Claude, Team B) — TASK-B-016 작업 중 Aiden PR#73 코멘트를 통해 확인
> **긴급도**: High
> **상태**: 미처리

---

## 발견 경위

TASK-B-016 CI 환경 수정 작업 중 Aiden이 PR#73에 추가 심층 분석 코멘트를 게시함.
이전에는 `.env.local` 키 파싱 실패로 `beforeAll` throw → TC-POLICY 전 7건 skip 처리되었으나,
버그 1(JWT 파싱) 수정 후 실제 테스트가 실행되면서 권한 오류가 표면화됨.

CI 에러 메시지:
```
permission denied for table zen_rate_cards
hint: "Grant the required privileges to the current role with:
      GRANT SELECT, INSERT ON public.zen_rate_cards TO service_role;"
```
PostgreSQL 오류 코드: 42501

---

## 현상

`tests/integration/p6-transport-policy.test.ts` — TC-POLICY-05/06/07 CI FAIL.
`service_role` 키로 Supabase RPC(`calculate_order_costs`)를 호출 시,
내부적으로 `zen_rate_cards` 테이블 접근 시 권한 오류 발생.

---

## 원인

`supabase/migrations/20260523130200_imp080_zen_rate_cards.sql` 마이그레이션에
`service_role` GRANT가 누락되어 있음.

RLS(Row Level Security)는 활성화되어 있으나, 테이블 레벨 권한(GRANT)이 미부여됨.
`service_role`은 RLS bypass 권한을 가지나, 테이블 레벨 GRANT가 없으면 접근 불가.

필요한 SQL:
```sql
GRANT SELECT, INSERT ON public.zen_rate_cards TO service_role;
```

---

## 영향 범위

- `p6-transport-policy.test.ts` TC-POLICY-05/06/07 (CI FAIL)
- 운영 환경에서 `calculate_order_costs` RPC 호출 시 동일 오류 가능성 있음
- `zen_rate_cards` 테이블을 `service_role`로 접근하는 모든 RPC/서버 사이드 로직

---

## 임시 조치

없음 (현재 CI에서만 노출, 운영 배포 전 수정 필요)

---

## 권장 조치

신규 마이그레이션 파일 작성:
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_fix_zen_rate_cards_grant.sql
GRANT SELECT, INSERT ON public.zen_rate_cards TO service_role;
GRANT SELECT ON public.zen_rate_cards TO authenticated;
GRANT SELECT ON public.zen_rate_cards TO anon;
```

또는 `20260523130200_imp080_zen_rate_cards.sql` 말미에 GRANT 추가
(단, 이미 배포된 마이그레이션 수정이므로 신규 마이그레이션 권장)

---

## 관련 파일

- `supabase/migrations/20260523130200_imp080_zen_rate_cards.sql` — GRANT 누락 파일
- `tests/integration/p6-transport-policy.test.ts` — 영향받는 테스트
- `.agent/tasks/TASK-B-016_260622_CI_env_fix_Jaison.md` — 발견 Task

---

## 예상 공수

Small (마이그레이션 파일 1개 작성, ~30분)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-22 | Jaison (Claude, Team B) | 최초 작성 — Aiden PR#73 코멘트 기반 |
