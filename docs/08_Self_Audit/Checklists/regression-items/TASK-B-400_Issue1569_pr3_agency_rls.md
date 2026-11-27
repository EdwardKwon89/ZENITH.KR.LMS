# [TASK-B-400] B-381 PR-3 서버 가드 AGENCY 실세션 통합 검증 (Issue #1569)

| 메타 항목 | 값 |
|:--|:--|
| **Task / Issue** | TASK-B-400 / [#1569](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1569) |
| **팀 / 작성일** | Team B / 2026-11-27 |
| **대상 모듈 (231 연동)** | `src/app/actions/finance/{settlement,daily-billing}.ts`, `src/lib/finance/settlement/invoice-generator.ts` |
| **검증 차원 (231 D1~D9)** | D1, D5 |

**2026-11-27, Dave** — PR-3 서버 가드의 실DB 세션 동작을 검증하는 통합 테스트를 추가했습니다. **프로덕션 코드·마이그레이션 변경 없음.**

| ID | 검증 내용 | 기대 결과 | 테스트 위치 |
| :-- | :-- | :-- | :-- |
| TC-B400-01 | AGENCY 실세션 UPS 생성 가드 | UPS 거부(`ups_invoice_blocked`), 비UPS 대조군은 다른 오류 키 | `tests/integration/task-b400-pr3-agency-rls.test.ts` |
| TC-B400-02 | AGENCY 일괄 마감 UPS 제외 | `skippedCount=1`·`finalizedCount=0`·`is_finalized=false` | 동일 |
| TC-B400-03 | ADMIN 일괄 마감 UPS 제외 + 비UPS 양성 | `skippedCount=1`, 비UPS `finalizedCount=1`·`is_finalized=true` | 동일 |
| TC-B400-04 | 생성기 공통 진입점 | UPS 거부(관리자 클라이언트, RLS 무관) | 동일 |
| TC-B400-05 | ③ 인보이스 조회·출처 오더 미조회 | `finalizedCount=0`, `is_finalized=false`, `failedCount` 또는 `skippedCount`로 집계 | 동일 |
| TC-B400-06 | 재사용 RLS 테스트 보강 | `count()` error 단언, tier별 값, charges tier/amount RLS | `tests/integration/task-b381-settlement-run-db.test.ts` |
| TC-B400-07 | 단건 마감 경로(admin·AGENCY) | UPS 인보이스 미마감(목표 상태) | 동일 (현재 목표 불일치 — `DEF-B-173`, `it.fails`) |

**수정 전 실패 확인(가드 비활성)**: 가드 1개씩 임시 비활성 → TC-01(settlement) / TC-02·03(findUpsInvoiceIds) / TC-04(generator)가 각각 FAIL, 원복 후 PASS. TC-05는 fail-closed 경로 검증으로 가드 비활성과 무관하게 PASS. 프로덕션 코드 변경 0.

**③ 시나리오**: `finalizedCount=0`·`failedCount=1`·`skippedCount=0`·DB `is_finalized=false` — 목표 대비 일치.

**단건 마감 경로**: 목표 대비 불일치 → R-18 `DEF-B-173` 등록(수정 없음, 상세 비공개). 목표 충족 시 `it.fails`가 실패하도록 두어 수정 누락을 감지합니다.

**회귀**: `npm run test:regression` — **313 files passed · 1 skipped / 2,369 passed · 2 expected fail · 16 skipped**(skip은 B-373), build SUCCESS.
