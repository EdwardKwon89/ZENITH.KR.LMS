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

### 최종 GRANT 목록 (12개 테이블)

| 차수 | 테이블 | 근거 |
|:----:|:------|:----|
| 1차 | zen_rate_cards | DEF-071 |
| 1차 | zen_orders | DEF-072 |
| 1차 | zen_tracking_configs | DEF-072 |
| 1차 | zen_tracking_raw_logs | DEF-072 |
| 2차 | zen_carriers | tr_capture_order_rate_snapshot 트리거 |
| 2차 | zen_order_rate_snapshots | 트리거 INSERT |
| 2차 | zen_order_costs | calculate_order_costs 결과 저장 |
| 2차 | zen_transport_pricing_policies | calculate_order_costs 정책 조회 |
| 2차 | zen_tracking_events | tracking-business-qa |
| 3차 | zen_ports | SettlementEngine PostgREST JOIN + beforeAll 포트 조회 |
| 3차 | zen_organizations | beforeAll shipper/carrier 조회 |
| 3차 | zen_order_packages | TC-POLICY-07 패키지 weight/CBM 삽입 |

---

## [ZEN_A4 준수 사항]

- Migration 파일 1개 추가 — 소스코드 변경 없음

---

## [DoD 체크리스트]

- [x] migration 파일 생성 및 내용 정확성 확인
- [x] `supabase db reset` CI 검증 — CI Run #3 (27959291474) `Regression Tests ✅ in 5m3s` (387 passed, 0 failed)
- [x] 코드 커밋 해시 기재 — `1380b90` (1차) · `cf65d6b` (2차) · `bee20a0` (3차)
- [x] IMP_PROGRESS.md IMP-132 등재
- [x] ACTIVE_TASK.md 🔔 반영
- [x] PR 생성 — [PR#75](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/75) (`feature/teamb-task-b-017-service-role-grant-fix` → `develop`, Closes #74)

---

## [작업 결과]

| 항목 | 내용 |
|:----|:----|
| 코드 커밋 1차 | `1380b90` — 4개 테이블 migration 추가 (DEF-071/072) |
| 코드 커밋 2차 | `cf65d6b` — 5개 테이블 GRANT 추가 (트리거 체인 + tracking_events) |
| 코드 커밋 3차 | `bee20a0` — 3개 테이블 추가 (zen_ports/zen_organizations/zen_order_packages) |
| 수정 파일 | `supabase/migrations/20260622000000_fix_service_role_grants.sql` |
| CI 결과 | Run #3 (27959291474) — **387 passed, 0 failed** ✅ |
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
