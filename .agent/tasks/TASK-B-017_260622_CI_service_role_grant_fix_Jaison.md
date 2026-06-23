# TASK-B-017 — CI service_role GRANT 누락 migration fix

> **TASK-ID**: TASK-B-017
> **생성일**: 2026-06-22
> **발령자**: Aiden (ZEN_CEO)
> **담당 Agent**: Jaison (Claude)
> **우선순위**: P1 (CI 블로커)
> **관련 Issue**: [#74](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/74)
> **전제조건**: TASK-B-016 🔔 (PR#73 진행 중)
> **브랜치**: `feature/teamb-task-b-017-service-role-grant-fix`
> **상태**: ⬜

---

## [업무 개요]

PR#73 (TASK-B-016) CI 수정으로 Supabase 키 추출이 정상화된 후, 기존에 skip되던 테스트들이 실행되면서 **4개 테이블의 `service_role` GRANT 누락**이 확인됐습니다.

- `supabase db reset` 시 로컬 CI에서 service_role에 테이블 권한이 자동 부여되지 않음
- 각 migration 파일에 `GRANT` 구문이 없어 PostgreSQL 42501 오류 발생

**영향 범위**:
- `p6-transport-policy.test.ts` — TC-POLICY-01~07 전량 실패
- `tracking-business-qa.test.ts` — QA-02 전량 실패
- PR#66, PR#67, PR#73 CI 통과 차단

---

## [전제조건]

- TASK-B-016 🔔 (PR#73 진행 중 — 이 Task의 fix migration이 develop에 merge되면 PR#73 rebase 후 CI PASS 예상)

---

## [구현 명세]

### 수정 파일

신규 migration 파일 1개 생성:
```
supabase/migrations/YYYYMMDDHHMMSS_fix_service_role_grants.sql
```

### 내용

```sql
-- Migration: Fix missing service_role GRANTs for CI regression tests
-- Root cause: tables created without explicit GRANT to service_role
-- DEF-071 (zen_rate_cards), DEF-072 (zen_orders / zen_tracking_configs / zen_tracking_raw_logs)

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_rate_cards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_tracking_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_tracking_raw_logs TO service_role;
```

### 검증 절차

```bash
supabase db reset --yes
npm run test:regression
```

기대 결과:
- `p6-transport-policy.test.ts` TC-POLICY-01~07 **PASS**
- `tracking-business-qa.test.ts` QA-02 **PASS**

---

## [ZEN_A4 준수 사항]

- 신규 파일 1개 (migration) — 기존 소스코드 변경 없음
- 함수 없음, 길이 제한 해당 없음

---

## [설계 의견]

_(없음 — 단순 GRANT 추가, 설계 결정 불필요)_

---

## [작업 결과]

_(구현 완료 후 기재)_

| 항목 | 내용 |
|:-----|:-----|
| 코드 커밋 | TBD |
| migration 파일 | TBD |
| 회귀 결과 | TBD |
| IMP | — |

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-22 | Aiden (Claude, ZEN_CEO) | Task 발령 — DEF-071/072 기반, Issue #74 |
