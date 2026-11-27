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
| TC-B400-01 | AGENCY 실세션 UPS 생성 가드 | UPS 거부, 비UPS는 UPS 키 아님 | `tests/integration/task-b400-pr3-agency-rls.test.ts` |
| TC-B400-02 | AGENCY 일괄 마감 UPS 제외 | `skippedCount=1`, UPS 인보이스 상태 불변 | 동일 |
| TC-B400-03 | ADMIN 일괄 마감 UPS 제외 | `skippedCount=1`, 마감/실패 0 | 동일 |
| TC-B400-04 | 생성기 공통 진입점 | UPS 거부(관리자 클라이언트, RLS 무관) | 동일 |
| TC-B400-06 | 재사용 RLS 테스트 보강 | `count()` error 단언, 화주 tier/값, charges RLS | `tests/integration/task-b381-settlement-run-db.test.ts` |

**수정 전 실패 확인(가드 비활성)**: 테스트별 4/4 FAIL(settlement 가드 / findUpsInvoiceIds ×2 / 생성기) → 복구 후 4/4 PASS. RLS 빈 결과 우회는 발견되지 않았습니다(DEF 없음). 생성기 테스트는 관리자 클라이언트 경로로 RLS 무관, 인증 가드 자체는 범위 밖입니다.

**회귀**: `npm run test:regression` — **313 files passed · 1 skipped / 2,368 passed · 16 skipped**(skip은 B-373), build SUCCESS.
