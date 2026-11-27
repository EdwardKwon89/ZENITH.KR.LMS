# TASK-B-400 — B-381 PR-3 서버 가드 AGENCY 실세션(RLS) 통합 검증

| 항목 | 내용 |
|:--|:--|
| **Issue** | #1569 (B-381 #1459 후속) |
| **브랜치** | `feature/teamb-task-b400-iss1569-pr3-agency-rls` |
| **PR** | #1572 (base `TeamB_Dev`, `Refs #1569`, `Refs #1459`) |
| **성격** | 테스트 추가 중심, **프로덕션 코드·마이그레이션 변경 0** |

## 1. 배경·범위
- PR #1549(PR-3)의 가드(`generateInvoicesForOrder` transport_mode, `finalizeDailyShipperInvoices` UPS 제외, `InvoiceGenerator` 공통 진입점)는 mock 단위 테스트만 있었고 **RLS 하 AGENCY 실세션 검증이 없었습니다**(PR-4b에서 #1569로 이월).
- 이 Task는 실DB 세션 테스트로 ① 서버 가드 ② 일괄 마감 `skippedCount`·마감 여부 ③ 생성기 공통 진입점 ④ A2 핵심 시나리오(인보이스는 보이지만 출처 오더는 보이지 않는 구성) ⑤ 단건 마감 경로를 값으로 단언하고, 재사용 테스트의 약점(오류 무시·tier/값 미단언·charges 미단언)을 보완합니다.

## 2. 산출물
- 신규 `tests/integration/task-b400-pr3-agency-rls.test.ts` (자기완결 fixture, **7건 = 5 PASS + 2 expected-fail(DEF-B-173)**)
  - AGENCY 실세션 UPS 생성 가드 거부 + 비UPS 대조군의 실제 오류 키 단언
  - AGENCY 일괄 마감 UPS `skippedCount=1`·`finalizedCount=0`·`is_finalized=false`
  - ADMIN 일괄 마감 UPS 제외 + **비UPS 대조군 정상 마감**(`finalizedCount=1`, `is_finalized=true`)
  - `InvoiceGenerator` UPS 거부(관리자 클라이언트 경로라 RLS와 무관)
  - **③ 인보이스는 보이지만 출처 오더가 보이지 않는 구성** — fail-closed 값 단언
  - **단건 마감 경로(admin·AGENCY 각 1건)** — 목표 대비 불일치로 `it.fails`(DEF-B-173)
- 보완 `tests/integration/task-b381-settlement-run-db.test.ts`
  - `Actor`에 `role`·`orgId` 추가(실패 메시지 원인 식별)
  - `count()`가 `error`를 **단언**해 음성 단언이 오류로 통과하지 않게 수정
  - tier별 `line_total`을 **126/127로 분리**, 화주 `run_amounts` tier·값 단언
  - 화주 `run_charges`의 `tier`·`amount`(3·4) 값 단언
  - `cleanup()`에 `zen_agency_shippers`·`zen_invoice_history`·생성 인보이스 정리 추가
- 회귀 항목: `docs/08_Self_Audit/Checklists/regression-items/TASK-B-400_Issue1569_pr3_agency_rls.md`

## 3. 실행 결과 (로컬)
- 신규 **5 PASS + 2 expected fail(7)**, 보완 포함 `task-b381-settlement-run-db` **13/13 PASS**.
- **가드 비활성 테스트별 실패 확인**(각 가드 1개씩 임시 비활성 → 실행 → 원복, 프로덕션 코드 변경 0):

| # | 테스트 | 대응 가드 | settlement off | findUps off | generator off |
|:-:|:--|:--|:--:|:--:|:--:|
| 1 | AGENCY UPS 생성 거부·비UPS 키 아님 | `settlement.ts` transport_mode | **FAIL** | PASS | PASS |
| 2 | AGENCY 일괄 마감 UPS 제외 | `daily-billing.ts` `findUpsInvoiceIds` | PASS | **FAIL** | PASS |
| 3 | ADMIN 일괄 마감 UPS 제외·비UPS 양성 | 동일 | PASS | **FAIL** | PASS |
| 4 | 생성기 공통 진입점 UPS 거부 | `InvoiceGenerator` | PASS | PASS | **FAIL** |
| 5 | ③ 오더 미조회 fail-closed | (가드 아님 — fail-closed 경로) | PASS | PASS | PASS |
| 6·7 | 단건 마감 경로(admin·AGENCY) | 대응 가드 없음(DEF-B-173) | — | — | — |

- 5번은 가드가 아니라 **목표 상태 2(fail-closed)** 를 검증하므로 가드 비활성과 무관하게 통과합니다. 6·7번은 차단 가드 자체가 없어 DEF로 등록했습니다.
- **③ 시나리오 결과: `finalizedCount=0`·`failedCount=1`·`skippedCount=0`·DB `is_finalized=false` — 목표 대비 일치.**
- **단건 마감 경로 결과: 목표 대비 불일치 → R-18 `DEF-B-173` 등록(수정 없음, 상세 비공개).** 테스트는 목표가 충족될 때 실패하도록 `it.fails`로 고정했습니다.
- `InvoiceGenerator`는 관리자 클라이언트로 동작해 **RLS에 의존하지 않는** 가드이며, 이 1건은 세션 RLS 검증이 아닙니다.
- `validateUserAction`은 서명된 실세션을 돌려주도록 mock하므로 **인증 가드 자체(미로그인·프로필 비활성)는 이 테스트 범위 밖**입니다.
- `npm run test:regression` — **313 files passed · 1 skipped / 2,369 passed · 2 expected fail · 16 skipped**(skip은 B-373 16건), `npm run build` SUCCESS, `tsc --noEmit` src 오류 0.

## 4. R-12 / R-21
- R-12: 코드·계약 변경 없음(테스트만). Ds-11 갱신 대상 아님.
- R-21: 역할별 정책 결과·계정·절대경로를 문서에 기재하지 않음. 통과/실패·목표 대비 일치 여부만 기록.

## 5. [발견 이슈]

| DEF# | 제목 | 긴급도 | 상세 보고서 |
|:----:|:-----|:------:|:-----------|
| DEF-B-173 | 단건 마감 경로에 UPS 인보이스 차단 없음(목표 상태 불일치) | High | `.agent/defects/DEF-B-173_UPS단건마감경로_가드없음.md` |
