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


| TC-360-19 | `ADMIN_TO_AGENCY`: `metadata.agency`와 `platform` 금액이 다른 오더 → **agency 값** 단언 (80,000/16,000/4,000/800, `line_total`=100,800, 헤더 합계 일치) | 조건 4 2차 실측 정정분이 실제 RPC 경로에서 검증됨 | `tests/integration/task-b360-billing-statements.test.ts` | CI (vitest) |
| TC-360-20 | `ADMIN_TO_AGENCY`: `metadata.agency` 없는 오더 → **platform 폴백** (100,000/126,000, `chargeWeightKg=7`) | 폴백 분기 검증 | 동일 | CI (vitest) |
| TC-360-21 | `ADMIN_TO_SHIPPER`: Admin 발행 tier 서버 도출 + `shipper_id` 불일치 오더 거부 | tier=`ADMIN_TO_SHIPPER`, 불일치는 `order_not_eligible` + 헤더 잔존 1건(부분 저장 없음) | 동일 | CI (vitest) |
| TC-360-22 | RPC `agency_org_id` 자격 검증 | 대상≠오더 소속 → `order_not_eligible` + 해당 월 헤더 0건 | 동일 | CI (vitest) |
| TC-360-23 | ADHOC 생성 성공(대리점) + 비대리점 발행자 거부 | `ADHOC\|AGENCY_TO_SHIPPER` 헤더 생성 / Admin은 `adhoc_requires_agency` | 동일 | CI (vitest) |
| TC-360-24 | 통화 가드 (조건 4b) | 비 KRW 매출 → `unsupported_cost_currency` 전용 Errors 키 + **헤더 잔존 0**(트랜잭션 롤백) | 동일 | CI (vitest) |
| TC-360-25~26 | **TOCTOU — 조건부 술어 rowCount authority** | 분류 통과 후 UPDATE/DELETE가 0건이면 오류 반환(`rowCount=0` 로그) — 조건부 술어·rowCount 처리 제거 시 **FAIL** | `tests/unit/finance/task-b360-billable-limits.test.ts` | CI (vitest) |
| TC-360-27~28 | **상한 신호 (truncated)** | 오더 500건/수기 화주 1,000건 도달 시 `truncated=true` + `logger.warn`, 미만이면 `false` | 동일 | CI (vitest) |
| TC-360-29 | `paidAt` 형식 검증 + `orderIds` 중복 제거 | `YYYY-MM-DD` 아니면 generic 거부(UPDATE 미도달), 중복 id는 Set으로 제거 후 RPC에 전달 | 동일 | CI (vitest) |

| TC-360-30 | **Excel 인쇄 설정 재파싱 단언**(§8-1) — 생성 .xlsx를 exceljs로 다시 열어 시트1 `paperSize=9`+`portrait`+`fitToHeight=1`, 시트2 `paperSize=9`+`landscape`+`fitToHeight=0`, 여백(0.4/0.6/0.3)·가운데 맞춤·눈금선(시트1 화면·인쇄 숙김 / 시트2 화면 표시·인쇄 숙김)·3행 틀 고정 | 소스 문자열 검사 없이 파일 구조로만 단언 | `tests/integration/task-b360-excel-export.test.ts` | CI (vitest) |
| TC-360-31 | `Print_Titles`(상세 3행 반복)·`Print_Area`(`A1:F24` / `A1:M<행>`)·머리글(`&R<번호>` / `&L<번호>&R오더별 상세`)·바닥글(`&C페이지 &P / &N`) | 재파싱 값 단언 | 동일 | CI (vitest) |
| TC-360-32 | 값 단언(§8-2) — 상세 행 수=항목 수, 합계 행=`total_amount`, 오더·금액 셀은 **숫자**, 기준일은 **날짜 값**+`yyyy-mm-dd`(KST 달력일), 수하인·도착국가 표시 | 저장값 그대로 출력 | 동일 | CI (vitest) |
| TC-360-33 | 상세 4개 금액 열 합 = 요약 4개 금액(80,000/16,000/4,000/800 = 100,800) | 재계산 없이 저장값 대조(§1-1) | 동일 | CI (vitest) |
| TC-360-34 | 권한(§8-3) — 발행자·Admin 감독·청구받은 화주(CLOSED) **200** / 타 대리점·DRAFT 청구받은 화주·비소속 화주 **404(미존재와 동일 바디)** / 미인증 **401** | **실제 authenticated JWT 세션**(service_role 미사용) | 동일 | CI (vitest) |
| TC-360-35 | 수식 주입 방지(§8-4) — `=HYPERLINK(...)` 청구 대상명이 **문자열 셀**(`formula=undefined`) | §1-4 | 동일 | CI (vitest) |
| TC-360-36 | tier별 구성(§8-5) — `ADMIN_TO_AGENCY`=13열(지정 12+No, 화주명 포함)·`printArea A1:M`, 나머지=12열(지정 11+No)·`A1:L` | 열 정의 배열에서 열 문자 계산(하드코딩 금지) | 동일 | CI (vitest) |
| TC-360-37 | 서식(§6) — 합계 열 굵게·머리글 `#E7ECF3` 배경·정렬(좌/중앙/우)·`#,##0.00;-#,##0.00` 형식 | 재파싱 단언 | 동일 | CI (vitest) |
| TC-360-38 | **합계 불일치 → 파일 미생성**(§1-1·§8-6) — DRAFT 항목 `line_total` 조작 시 **500** + xlsx 헤더 없음 + `logger.error('total mismatch')`, 복원 시 200 | 부분 파일 금지 | 동일 | CI (vitest) |
| TC-360-39 | DRAFT 표시(§6) — 빨간 배너 `초안 — 발행 전 문서`+`[초안]` 접두 / ISSUED는 공백 / CLOSED는 입금 확인 정보 | 상태별 표시 | 동일 | CI (vitest) |
| TC-360-40 | 파일명(§2) — 금지 문자 `_` 치환·80자 제한·`filename*=UTF-8''`(RFC 5987) ASCII fallback에 금지 문자 없음 | 응답 헤더 단언 | 동일 | CI (vitest) |

| TC-360-41 | **소수 금액·중량**(PR #1411 🔴) — 줄당 10.10/20.20(합 **30.30**)·중량 0.10+0.20(**0.30**) 청구서가 **200**이고 요약 셀=10.1/20.2/30.3, 중량 문자열 `0.30 kg`(float면 `0.30000000000000004`) | 정수 분(1/100) 합산 검증 | `tests/integration/task-b360-excel-export.test.ts` | CI (vitest) |
| TC-360-42 | 합계를 **0.01만** 조작해도 500 (10.10→10.11), 복원 시 200 | 분 단위 정밀도 — `===` 부동소수 회귀 시 **FAIL**(정상 청구서가 500) | 동일 | CI (vitest) |
| TC-360-43 | 기본 입금일 **KST** — UTC 18:00(=KST 다음날 03:00)에 입금확인하면 `paid_date=2026-12-01` (UTC slice면 11-30) | PR #1410 후속 권고 2 | 동일 | CI (vitest) |
| TC-360-44 | 조회 실패 조용한 삼킴 차단 — 라벨/이력/항목 오류 각각 **500**(`LABELS_LOOKUP`/`HISTORY_LOOKUP`/`ITEMS_LOOKUP`), order 임베드 null → **500 `ORDER_EMBED_NULL`** | 빈 Map 위장 시 200 → **FAIL** | `tests/unit/finance/task-b360-excel-data.test.ts` | CI (vitest) |
| TC-360-45 | PostgREST `max_rows=1000` 잘림 방지 — 페이지가 계속 full이면 상한(10,000행)에서 **500 `LABELS_LOOKUP_LIMIT`**, 상한 전 종료 시 정상 수집 | 페이징 루프 검증 | 동일 | CI (vitest) |
| TC-360-46 | 소수 금액 단위 — 10.10+20.20이 float 비교에선 `30.299999999999997`로 헤더 30.30과 어긋나 **500** → 정수 분 비교로 200 | 🔴1 오탐 재현(fixture가 재현하지 못하면 회귀) | 동일 | CI (vitest) |
| TC-360-47 | `dateRangeError` 형식 검증 — `dateTo='abc'`·역전 기간 모두 `DATE_RANGE_INVALID` (RangeError→`UNEXPECTED` 아님) | PR #1410 후속 권고 3 | `tests/unit/finance/task-b360-billable-limits.test.ts` | CI (vitest) |

**회귀 검증 (2026-11-22, PR #1411 수정 반영 후)**: 신규 통합 **19/19** + 신규 단위 **8/8** + 기존 통합 **28/28** + 기존 단위 **10/10** = **65/65 PASS** · `npm run test:regression` 전체 PASS · `tsc` 관련 오류 0 · `check:ds11`·`check:lrtm`·`check:doc-links`·`check:audit`·`check:vendor` 전부 OK.

**회귀 검증 (2026-11-21, PR #1404 검토 반영 후)**: 통합 **24/24** + 단위 **8/8** = **32/32 PASS** · `npm run test:regression` 전체 PASS · `supabase db reset --yes` 통과(마이그레이션 `20261120090000`, 번호 충돌 0) · `check:ds11`·`check:lrtm` OK · **전체 29개 함수 50줄 초과 0개** · `tsc` 내 파일 오류 0건.
**되돌리기 검증 (조건별, PR 본문 표에 상세 기재)**:
| 조건 | 되돌리기 내용 | 결과 |
|:--|:--|:--|
| ① | `billing_items_amounts`의 `metadata.agency` 분기 제거(platform만 사용) | **FAIL** (80,000→100,000으로 대체됨) |
| ② | `cancel/issue/confirm`의 조건부 술어(`.eq('status',…)`) + `rowCount=0` 처리 제거 | **FAIL** (TOCTOU 2건 — 분류 통과 후 0건인데 성공 반환) |
| ③ | `confirmStatementPayment`의 금액 불일치 검사 제거 | **PASS (24/24+8/8)** — DB CHECK `zen_billing_statements_paid_check`가 **이중 방어** |
| ④ | RPC의 `agency_org_id` 자격 검증 제거 | **FAIL** (소속 불일치 오더 통과) |
| (참고) | 통합 RPC 2종 `DROP` | suite 전체 FAIL → `supabase db reset` 복구 → 32/32 PASS |
| **A(재측정)** | Excel 인쇄 설정 적용 2줄 제거 | **FAIL 4** (§8-1 3건 + `printArea` 1건) |
| **B(재측정)** | `totalsMatchHeader()` 비활성화 | **FAIL 3** (통합 2 + 단위 1 — 불일치가 200 통과) |
| **C(재측정)** | 헤더 미존재 404 → 500 | **FAIL 3** (존재 비노출 소실) |
| **R1** | 정수 분 합산·비교 → **float 합산 + `===`** 복원(PR #1411 🔴1·🔴2 회귀) | **FAIL 3** — 통합 2건(**정상 청구서가 500** = 지적된 오탐 재현 + 중량 `0.30000000000000004`)·단위 1건 |
| **R2** | 라벨 조회 오류를 빈 Map으로 삼킴 복원 | **FAIL 1** — 500 기대가 200 |
| **R3** | order 임베드 null 가드 제거 | **FAIL 1** — 500 기대가 200 |
| **④(PR #1410 후속)** | `lt endExclusive` → `lte <dateTo>T23:59:59+09` 변형 | **FAIL 2** — ③ 소수초(14:59:59.5Z 누락) + 월경계. ①·②은 PASS(달력일 동일) → 소수초 단언의 차별력 실측 완료 |
**구현 중 발견·해정**: ① `zen_billing_statement_items`→헤더 FK가 2개(단일·복합)라 PostgREST embed 모호 → 상세는 복수 쿼리로 조회 ② `zen_profiles.email` UNIQUE + 고정 prefix가 이전 실행 잔여물과 충돌해 `on_auth_user_created`가 조용히 실패 → 랜덤 suffix + purge(참조 FK 순서대로) ③ ORG 대상 필터 누락 실버그 → `shipper_id`/`agency_org_id` 조건 적용.
**주의 (R-09 v3.10)**: 회귀 맵 단일 파일에 `## N.` 추가 금지 — 본 파일이 등재 단위.
