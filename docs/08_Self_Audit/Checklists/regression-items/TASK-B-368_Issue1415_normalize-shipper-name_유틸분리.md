# TASK-B-368 회귀 항목 — DEF-B-162 화주명 정규화 유틸 분리 (Issue #1415)

| 항목 | 내용 |
|:-----|:-----|
| 이슈 | #1415 (DEF-B-162, High — #1412/#1413 build 차단) |
| 담당 | Mike (Team B) |
| 변경 요지 | `normalizeShipperName`을 `'use server'` 파일(`billing-statements.ts`)에서 **순수 유틸** `src/lib/finance/billing/normalize-shipper-name.ts`로 분리 — 규칙 바이트 단위 무변경 |
| 검증 차원 (231 D1~D9) | `D1(정합성), D8(동시성 아님 — 회귀 범위는 정합·경계)` |

## 회귀 항목

| TC# | 시나리오 | 기대 | 테스트 파일 | 실행 |
|:----|:---------|:-----|:------------|:----:|
| TC-368-01 | 유틸 단위 — 공백 압축(`'A   B'`→`'a b'`)·양끝 제거·소문자 | **실제 값 단언** (소스 문자열 검사 없음) | `tests/unit/finance/task-b368-normalize-shipper-name.test.ts` | CI (vitest) |
| TC-368-02 | 한글·특수문자 유지, 전각 공백(U+3000)·NBSP·개행·탭 압축, 빈/공백만 입력 → `''` | 동일 | 동일 | CI (vitest) |
| TC-368-03 | RPC `billed_key` ADHOC 규칙(압축→trim→lower)과 동일 순서·동일 결과 | 동일 + 경계 케이스 고정 | 동일 | CI (vitest) |
| TC-368-04 | **기존 실DB ADHOC 테스트 무변경 PASS** — 후보 매칭(`'  (주)ABC   Co '` ↔ `'(주)abc co'`)·자동완성 그룹집계 | 서버·RPC 3중 일치 유지 | `tests/integration/task-b360-billing-statements.test.ts` (변경 없음) | CI (vitest) |
| TC-368-05 | **빌드 회귀**: 클라이언트 컴포넌트가 `billing-statements.ts`를 import하는 조합에서 `npm run build` 성공 | DEF-B-162 재발 방지 (회귀 테스트가 아니라 **build**에서만 잡히던 결함) | `npm run build` (CI Regression Tests 포함) | CI |

**회귀 검증 (2026-11-22)**: 유틸 단위 **8/8** + 기존 통합 **28/28** PASS · `npm run test:regression` 전체 PASS · `check:ds11`·`check:lrtm` OK.

**되돌리기 검증 (조건별, PR 본문 표에 상세 기재)**:
| 조건 | 되돌리기 내용 | 결과 |
|:--|:--|:--|
| (a) | 유틸에서 `trim()` 제거 | 단위 테스트 **FAIL** (양끝 공백 케이스) |
| (b) | 유틸에서 `toLowerCase()` 제거 | 기존 실DB ADHOC 테스트 **FAIL 여부 실측** — 결과는 PR 본문 표 기준 |
