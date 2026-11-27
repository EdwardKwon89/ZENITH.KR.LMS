# TASK-B-400 — B-381 PR-3 서버 가드 AGENCY 실세션(RLS) 통합 검증

| 항목 | 내용 |
|:--|:--|
| **Issue** | #1569 (B-381 #1459 후속) |
| **브랜치** | `feature/teamb-task-b400-iss1569-pr3-agency-rls` |
| **PR** | #1572 (base `TeamB_Dev`, `Refs #1569`, `Refs #1459`) |
| **성격** | 테스트 추가 중심, **프로덕션 코드·마이그레이션 변경 0** |

## 1. 배경·범위
- PR #1549(PR-3)의 가드(`generateInvoicesForOrder` transport_mode, `finalizeDailyShipperInvoices` UPS 제외, `InvoiceGenerator` 공통 진입점)는 mock 단위 테스트만 있었고 **RLS 하 AGENCY 실세션 검증이 없었습니다**(PR-4b에서 #1569로 이월).
- 이 Task는 실DB 세션 테스트로 ① 서버 가드 ② 일괄 마감 `skippedCount`·상태 불변 ③ 생성기 공통 진입점을 값으로 단언하고, 재사용 테스트의 약점(오류 무시·tier/값 미단언·charges 미단언)을 보완합니다.

## 2. 산출물
- 신규 `tests/integration/task-b400-pr3-agency-rls.test.ts` (자기완결 fixture, 5건)
  - AGENCY 실세션 UPS 생성 가드 거부 + 비UPS가 UPS 키로 막히지 않음
  - AGENCY 일괄 마감 UPS `skippedCount=1`·UPS 인보이스 상태 불변
  - ADMIN 일괄 마감 동일 제외
  - `InvoiceGenerator` UPS 거부
  - 비소속 AGENCY 세션 우회 불가·상태 불변
- 보완 `tests/integration/task-b381-settlement-run-db.test.ts`
  - `count()`가 `error`를 **단언**해 음성 단언이 오류로 통과하지 않게 수정
  - 화주 `run_amounts` tier·line_total 값 단언
  - `run_charges` 세션 RLS(대리점/화주/비소속) 단언 추가
- 회귀 항목: `docs/08_Self_Audit/Checklists/regression-items/TASK-B-400_Issue1569_pr3_agency_rls.md`

## 3. 실행 결과 (로컬)
- 신규 **5/5 PASS**, 보완 포함 `task-b381-settlement-run-db` **13/13 PASS**.
- **수정 전(가드 비활성) 실패 확인**: 3개 가드를 임시로 비활성한 상태에서 신규 테스트 **4/5 FAIL**(가드 3종 + 생성기), 복구 후 **5/5 PASS**. 프로덕션 코드는 원복했고 변경 없음.
- RLS 아래에서 가드가 빈 결과로 우회되는 현상은 **발견되지 않았습니다**(DEF 등록 없음).
- `npm run test:regression` — **313 files passed · 1 skipped / 2,369 passed · 16 skipped**(skip은 B-373 16건), `npm run build` SUCCESS, `tsc --noEmit` src 오류 0.

## 4. R-12 / R-21
- R-12: 코드·계약 변경 없음(테스트만). Ds-11 갱신 대상 아님.
- R-21: 역할별 정책 결과·계정·절대경로를 문서에 기재하지 않음. 통과/실패만 기록.
