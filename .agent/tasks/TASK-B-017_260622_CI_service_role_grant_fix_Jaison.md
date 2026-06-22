# TASK-B-017 — CI service_role GRANT 누락 — migration fix

> **TASK-ID**: TASK-B-017
> **생성일**: 2026-06-22
> **발령자**: Aiden (Issue #74, PR#73 4차 코멘트)
> **담당 Agent**: Jaison (Claude)
> **우선순위**: High
> **관련 Issue**: [#74](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/74)
> **브랜치**: `feature/teamb-task-b-017-service-role-grant-fix`
> **상태**: 🔔

---

## [업무 개요]

CI `p6-transport-policy` + `tracking-business-qa` 테스트 실패 원인:
4개 테이블에 `service_role` GRANT가 누락되어 PostgreSQL 42501 오류 발생.

| 테이블 | 영향 테스트 | DEF |
|:-------|:-----------|:---:|
| `zen_rate_cards` | TC-POLICY-01~07 (7건) | DEF-071 |
| `zen_orders` | tracking-business-qa beforeAll | DEF-072 |
| `zen_tracking_configs` | tracking-business-qa getTrackingData | DEF-072 |
| `zen_tracking_raw_logs` | tracking-business-qa insert | DEF-072 |

신규 fix migration 1개로 일괄 해결.

---

## [전제조건]

TASK-B-016 🔔 (병행 진행 가능 — Aiden 명시)

---

## [구현 명세]

### 신규 파일
- `supabase/migrations/20260622000000_fix_service_role_grants.sql`

### 내용
```sql
-- TASK-B-017: CI service_role GRANT 누락 일괄 수정
-- DEF-071 (zen_rate_cards) + DEF-072 (zen_orders·zen_tracking_configs·zen_tracking_raw_logs)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_rate_cards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_tracking_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_tracking_raw_logs TO service_role;
```

---

## [ZEN_A4 준수 사항]

- Migration 파일 1개 추가 — 소스코드 변경 없음

---

## [DoD 체크리스트]

- [x] migration 파일 생성 및 내용 정확성 확인
- [ ] `supabase db reset` 로컬 적용 검증 (CI에서 확인 예정)
- [x] 코드 커밋 해시 기재 — `1380b90`
- [x] IMP_PROGRESS.md IMP-132 등재
- [x] ACTIVE_TASK.md 🔔 반영
- [x] PR 생성 — [PR#75](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/75) (`feature/teamb-task-b-017-service-role-grant-fix` → `develop`, Closes #74)

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 | `1380b90` — migration 파일 추가 |
| 수정 파일 | `supabase/migrations/20260622000000_fix_service_role_grants.sql` |
| IMP | IMP-132 |

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-22 | Jaison (Claude, Team B) | Task 발령 — Aiden PR#73 4차 코멘트 (Issue #74) |
