# [TASK-B-359] 청구서 DB — 헤더·항목 테이블·채번 RPC·RLS·상태 전이 (Issue #1365 / TASK-B-359, 에픽 #1364)

> 구 단일 맵 §95에서 이관(2026-11-20 develop 동기화, R-09 v3.10 — 내용 변경 없음).

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-359 / [#1365](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1365) |
| **팀** | Team B |

**2026-11-19, Mike** — 청구서관리 ②(WBS 3.1~3.5). 월 차수 청구서의 DB 기반 신설: `zen_billing_statements`(헤더, `billed_party_type` ORG/ADHOC + `billed_key` GENERATED STORED 정규화 키 + 차수 유일키 `issuer+billed_key+년+월+차수`), `zen_billing_statement_items`(오더 스냅샷, `UNIQUE(order_id,tier)` + 헤더 `UNIQUE(id,tier)` 복합 FK), 월 seq 카운터 `zen_billing_statement_seq`(RLS 활성+정책 0개), 채번 RPC `create_billing_statement`(advisory lock + max round + seq 원자 증분, INVOKER/`auth.uid()` 발행자 도출) + `next_billing_statement_seq`(좁은 SECURITY DEFINER), 상태 전이·발행 후 불변· CASCADE 트리거 3종, RLS SELECT 3경로(발행자/청구받은 org ISSUED~CLOSED/Admin 대리점 감독). **서버 액션 없음(마이그레이션+RPC만).**

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-359-S1~S4 | 스키마·제약·IMMUTABLE (pg_catalog 조회) | 헤더 25/항목 11컬럼·RLS 3테이블·정책(헤더 6·항목 2·카운터 0)·트리거 3·CHECK/유일키 8종·`billed_key` GENERATED(s)·정규화 함수 provolatile=`i`·DEFINER/INVOKER 분리·anon EXECUTE 거부 | `tests/unit/migrations/taskb359-billing-statement-db.test.ts` |
| TC-359-R1~R4 | 채번 RPC — 형식·차수·정규화·조건 6 | `ST-YYYYMM-NN-SSSS` + round 1→2·seq 연속, 표기 변형 동일 키로 차수 이어짐, Admin ADHOC 거부·비연결 ORG 거부·화주 role 거부 | 동일 |
| TC-359-C1 | 채번 동시성 | 별도 커넥션 4개 병렬 RPC → round {1,2,3,4}·statement_no 4건 전부 고유 | 동일 |
| TC-359-Q1a~Q1b | 카운터 보호(조건 1) | authenticated 직접 INSERT=RLS 거부·UPDATE 0건(값 불변)·SELECT 0건, `next_billing_statement_seq` 호출은 허용(원자 증분) | 동일 |
| TC-359-RLS1~RLS9 | 조회 3경로 + 쓰기=발행자 | 발행자 DRAFT 포함 전 상태 / 타 생성자 0건(상세 포함) / 청구받은 org DRAFT 비노출·ISSUED 조회·UPDATE 0건·INSERT RLS 거부 / Admin 감독 전 상태+읽기 전용 / MANAGER 제외 / 타 org 0건 / ADHOC 타 대리점 0건·Admin 조회 가능 / 항목 헤더 종속 / 발행자 DRAFT 항목 추가 허용 | 동일 |
| TC-359-U1~U4 | 유일키·CASCADE (DoD) | `(order_id,tier)` 중복 거부, 헤더 tier≠항목 tier 복합 FK 거부, 다른 tier 허용, **항목 있는 DRAFT 헤더 삭제 성공(조건 4)→오더 재포함 가능** | 동일 |
| TC-359-ST1~ST7 | 상태 전이·발행 후 불변·전액 입금 | DRAFT→CLOSED 직행 거부·ISSUED→DRAFT 거부, 항목 0건 발행 거부, ISSUED에서 `total_amount`/`statement_no`/`tier` 수정 거부(조건 2), ISSUED 항목 INSERT/UPDATE/DELETE 거부(트리거+RLS 이중), 헤더 DELETE 거부, CLOSED `paid≠total`·NULL 거부→전액 성공(조건 3), `created_at` 항상 불변 | 동일 |

| TC-359-FX1~FX4 | PR #1397 검토 반영 — INSERT 경로 구멍 4건 | ISSUED/CLOSED 직접 헤더 INSERT RLS 거부(DRAFT 허용) / 미정산·타 대리점 오더 항목 INSERT 거부+수기 `shipper_id`·등록 `agency_org_id` 2경로 허용+order_id 변경 UPDATE 거부 / 대리점 ADMIN_TO_AGENCY·Admin AGENCY_TO_SHIPPER 거부(RPC+정책) / ADHOC 공백 이름 party_check 거부 | 동일 |

**회귀 검증 (2026-11-19, PR #1397 검토 반영 후)**: `npm run test:regression` **267 test files / 2,001 tests 전부 PASS** · `supabase db reset --yes` 통과(번호 `20261119090000` 충돌 0) · `check-ds11` OK.
**되돌리기 검증 (테스트 유효성, 검토 반영 후 재실행)**: 테이블·RPC·트리거 일괄 DROP(롤백 SQL) → suite 전체 FAIL(`relation does not exist`, 35 skipped) → `supabase db reset` 복구 → **35/35 PASS**.
**DEF-B-158 관련 주의**: `cost_settled_by` FK/CHECK 모순(이슈 #1375)과 동일 유형 재발 방지를 위해 `billed_key`(GENERATED)는 BEFORE 트리거 `NEW`에 반영되지 않는다는 실측(PostgreSQL 동작)을 트리거 주석에 기록 — 불변 검사에서 제외(UPDATE 자체가 PG가 거부).
