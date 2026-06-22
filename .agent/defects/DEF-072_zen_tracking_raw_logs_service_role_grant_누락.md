# DEF-072 — zen_tracking_raw_logs service_role GRANT 누락

> **DEF-ID**: DEF-072
> **발견일**: 2026-06-22
> **발견자**: Jaison (Claude, Team B) — TASK-B-016 eval 수정 후 CI 결과 분석 중 확인
> **긴급도**: High
> **상태**: 미처리

---

## 발견 경위

TASK-B-016 CI JWT 파싱 수정(eval 방식) 후 CI 재실행 결과 확인.
JWT 오류(PGRST301)가 해소되어 `tracking-business-qa.test.ts`가 실제 실행되면서
이전에 JWT 오류에 가려져 있던 권한 오류가 표면화됨.

CI 에러 메시지:
```
permission denied for table zen_tracking_raw_logs
hint: "Grant the required privileges to the current role with:
      GRANT SELECT ON public.zen_tracking_raw_logs TO service_role;"
```
PostgreSQL 오류 코드: 42501

---

## 현상

`tests/integration/tracking-business-qa.test.ts` — 2건 FAIL.
`service_role` 키로 Supabase 클라이언트를 통해 `zen_tracking_raw_logs` 테이블 접근 시 권한 오류 발생.

영향 테스트:
- `should preserve raw JSON logs in zen_tracking_raw_logs` (line 89)
- `should maintain sync integrity without duplicating events` (line 110 — 이전 테스트 실패로 인한 연쇄)

---

## 원인

`zen_tracking_raw_logs` 테이블 생성 마이그레이션에 `service_role` GRANT가 누락.
RLS 활성화 여부와 무관하게, 테이블 레벨 GRANT가 없으면 `service_role` 접근 불가.

필요한 SQL:
```sql
GRANT SELECT ON public.zen_tracking_raw_logs TO service_role;
```

---

## 영향 범위

- `tracking-business-qa.test.ts` 2건 CI FAIL
- `service_role`로 `zen_tracking_raw_logs` 조회하는 서버 사이드 로직 전체
- 트래킹 로그 조회 기능 운영 환경 영향 가능성

---

## 임시 조치

없음 (현재 CI에서만 노출, 운영 배포 전 수정 필요)

---

## 권장 조치

DEF-071(`zen_rate_cards`)과 함께 GRANT 신규 마이그레이션 파일로 일괄 처리 권장:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_fix_missing_service_role_grants.sql
GRANT SELECT, INSERT ON public.zen_rate_cards TO service_role;
GRANT SELECT ON public.zen_tracking_raw_logs TO service_role;
-- 추가 누락 테이블 있을 경우 함께 처리
```

---

## 관련 파일

- `tests/integration/tracking-business-qa.test.ts` — 영향받는 테스트
- `.agent/defects/DEF-071_zen_rate_cards_service_role_grant_누락.md` — 동일 유형 선행 DEF
- `.agent/tasks/TASK-B-016_260622_CI_env_fix_Jaison.md` — 발견 Task

---

## 예상 공수

Small (DEF-071과 동일 마이그레이션 파일에 한 줄 추가, ~15분)

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-22 | Jaison (Claude, Team B) | 최초 작성 — TASK-B-016 eval 수정 후 CI 분석 중 발견 |
