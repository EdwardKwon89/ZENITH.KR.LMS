# [TASK-B-360] 청구서 서버 액션 — 후보 조회·생성·취소·발행·입금확인·조회 (Issue #1366 / TASK-B-360, 에픽 #1364)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-360 / [#1366](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1366) |
| **팀 / 작성일** | Team B / 2026-11-21 |
| **대상 모듈 (231 연동)** | `src/app/actions/finance/billing-statements.ts`, `supabase/migrations/20261120090000_task_b360_create_billing_statement_with_items.sql` |
| **검증 차원 (231 D1~D9)** | D1(정합성), D5(권한/RLS), D6(상태 전이), D8(동시성) |

**2026-11-21, Mike** — 청구서관리 ③(WBS 4.1~4.5, ⒜). 서버 액션 8종(후보조회·수기화주명·생성·취소·발행·입금확인·목록·상세) + 금액 스냅샷 단일 원천 RPC `billing_items_amounts` + 통합 생성 RPC `create_billing_statement_with_items`(헤더+항목+합계 한 트랜잭션, Q-A 확정). **전부 authenticated JWT 세션으로 검증**(service_role 미사용 — 이슈 코멘트 2). 금액은 클라이언트 값 미사용, DB 원천만(조건 4).

| ID | 테스트 항목 | 기대 결과 | 파일 경로 | 실행 구분 |
|:--|:--|:--|:--|:--:|
| TC-360-01 | 경로 ① 발행자 조회 (DRAFT 포함) + 상세 | `scope=MINE`, `status=DRAFT`, 상세 items 1건 `lineTotal=126000` (실제 DB 원천) | `tests/integration/task-b360-billing-statements.test.ts` | CI (vitest) |
| TC-360-02 | 경로 ② 청구받은 org (읽기 전용) | DRAFT 0건 → 발행 후 `scope=RECEIVED`·`ISSUED` 1건, 화주 취소 시도가 상태를 못 바꿈 | 동일 | CI (vitest) |
| TC-360-03 | 경로 ③ Admin 감독 (읽기 전용) | `scope=SUPERVISED` 1건, 발행 org 아님 → 취소 거부 `not_issuer` | 동일 | CI (vitest) |
| TC-360-04 | 타 생성자 비노출 | 목록 0건, 상세 = **미존재와 동일 응답**(`statement_not_found`) | 동일 | CI (vitest) |
| TC-360-05 | ISSUED 취소 거부 | `not_draft` + 행 1건 유지 | 동일 | CI (vitest) |
| TC-360-06 | ISSUED 재발행 거부 | `already_issued` + 상태 불변 | 동일 | CI (vitest) |
| TC-360-07 | CLOSED 재입금확인 거부 | `already_closed` + 상태 `CLOSED` 유지 | 동일 | CI (vitest) |
| TC-360-08 | DRAFT 입금확인 거부 | `not_issued` + `DRAFT` 유지 | 동일 | CI (vitest) |
| TC-360-09 | 항목 0건 발행 거부 (DB 트리거) | `issue_without_items` + `DRAFT` 유지 | 동일 | CI (vitest) |
| TC-360-10 | 입금액 불일치 시 **저장 안 됨** | `payment_amount_mismatch` + `status/paid_amount/paid_date` 전부 그대로 | 동일 | CI (vitest) |
| TC-360-11 | 전액 일치 → CLOSED 전환 | `CLOSED` + `paid_amount = total_amount` | 동일 | CI (vitest) |
| TC-360-12 | 미정산 오더 병렬 2건 | 모두 거부 + 헤더 수 불변 (부분 저장 0) | 동일 | CI (vitest) |
| TC-360-13 | **동시 중복 담기** (DoD) | 병렬 2건 → 정확히 1건 성공, 패자 `order_already_inclusive`(23505 매핑), **orphan 헤더 0·항목 1건** | 동일 | CI (vitest) |
| TC-360-14 | 후보 조회 — 기간 필수·역전 거부 + 스냅샷 금액 | `generic{DATE_RANGE_INVALID}`, 정산완료·미포함만 후보, 미정산은 `excludedUnsettled`, 금액 = DB 원천(100000/20000/5000/1000, `lineTotal=126000`, `chargeWeightKg=5`=`billingWeightKg`) | 동일 | CI (vitest) |
| TC-360-15 | 포함된 오더는 후보 제외 | 청구서 생성 후 `listBillableOrders`에서 제외 | 동일 | CI (vitest) |
| TC-360-16 | 수기 화주 정규화 **일치** 매칭 | `"  (주)ABC   Co "` ↔ `"(주)abc co"` 매칭, 등록 화주·타 대리점 혼입 0 | 동일 | CI (vitest) |
| TC-360-17 | 수기 화주명 자동완성 — 대리점 한정 | 대리점 집계 정상, Admin 호출은 `adhoc_requires_agency` 거부 | 동일 | CI (vitest) |
| TC-360-18 | 비소속 대상 거부 | 소속 링크 없는 화주 org → `target_not_allowed` | 동일 | CI (vitest) |

**회귀 검증 (2026-11-21)**: `npx vitest run tests/integration/task-b360-billing-statements.test.ts` **18/18 PASS (2회 연속 — 멱등성 확인)** · `supabase db reset --yes` 통과(마이그레이션 `20261120090000`, 번호 충돌 0) · `npm run check:ds11` OK.
**되돌리기 검증 (테스트 유효성)**: 통합 생성 RPC `DROP` → suite 전체 FAIL → `supabase db reset` 복구 → 18/18 PASS (PR 본문에 상세 기재).
**구현 중 발견·해정**: ① `zen_billing_statement_items`→헤더 FK가 2개(단일·복합)라 PostgREST embed 모호 → 상세는 복수 쿼리로 조회 ② `zen_profiles.email` UNIQUE + 고정 prefix가 이전 실행 잔여물과 충돌해 `on_auth_user_created`가 조용히 실패 → 랜덤 suffix + purge(참조 FK 순서대로) ③ ORG 대상 필터 누락 실버그 → `shipper_id`/`agency_org_id` 조건 적용.
**주의 (R-09 v3.10)**: 회귀 맵 단일 파일에 `## N.` 추가 금지 — 본 파일이 등재 단위.
